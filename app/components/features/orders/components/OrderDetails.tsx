import { useState, useEffect, useRef, useMemo } from 'react';
import { OrdersMergeSourceOptions, OrdersMergeStatusOptions, OrdersResponse } from '@/app/types/pocketbase-types';
import { Input } from "@/app/components/shared/ui/input";
import { Button } from "@/app/components/shared/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/shared/ui/select";
import { Textarea } from "@/app/components/shared/ui/textarea";
import { OrderProducts } from './OrderProducts';
import { useEntities } from '@/app/hooks/useEntities';
import { StatusSelect } from "@/app/components/shared/ui/StatusSelect";
import { UtilityService } from '@/app/services/utilityService';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { orderSchema, OrderFormData } from '@/app/lib/validations/orders';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/app/components/shared/ui/form";
import { Alert, AlertDescription } from "@/app/components/shared/ui/alert";
import pb from '@/app/lib/pocketbase.client';
import { Toaster, toast } from 'sonner';
import { Dialog, DialogTitle, DialogHeader, DialogContent } from '@/app/components/shared/ui/dialog';
import { NovaPoshtaModal } from './nova-poshta-modal';
import { Truck, Trash2, FileText } from 'lucide-react';
import { deleteInternetDocument } from '@/app/[locale]/orders/actions/nova-poshta';
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/shared/ui/card";

interface OrderDetailsProps {
  isOpen: boolean;
  onClose: () => void;
  order: OrdersResponse | null;
  onUpdate: (orderId: string, orderData: Partial<OrdersResponse>) => Promise<void>;
  onStatusChange: (orderId: string, statusId: string) => Promise<void>;
  translations: {
    orderDetails: string;
    editOrder: string;
    orderNumber: string;
    source: string;
    selectSource: string;
    deliveryMethod: string;
    selectDeliveryMethod: string;
    deliveryPostNumber: string;
    phoneNumber: string;
    fullName: string;
    paymentMethod: string;
    selectPaymentMethod: string;
    notes: string;
    notesPlaceholder: string;
    blacklistedCustomerWarning: string;
    products: string;
    addProduct: string;
    product: string;
    quantity: string;
    price: string;
    totalItems: string;
    totalAmount: string;
    status: string;
    createdAt: string;
    updateOrder: string;
    productionCost: string;
  };
  translateStatus: (status: string) => string;
}

// Define interface for the Nova Poshta invoice data
interface NovaPoshtaInvoiceData {
  Ref: string;
  CostOnSite?: string | number;
  EstimatedDeliveryDate?: string;
  IntDocNumber: string;
  TypeDocument?: string;
  [key: string]: string | number | boolean | null | undefined;
}

export function OrderDetails({
  isOpen,
  onClose,
  order,
  onUpdate,
  onStatusChange,
  translations,
  translateStatus
}: OrderDetailsProps) {
  const { deliveryMethods, paymentMethods, sources, statuses, isLoading } = useEntities();
  const [isBlacklisted] = useState<boolean>(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeletingTtn, setIsDeletingTtn] = useState(false);
  const userActionRef = useRef<string | null>(null);
  const [isNovaPoshtaModalOpen, setIsNovaPoshtaModalOpen] = useState(false);

  // Filter statuses based on order's source
  const filteredStatuses = useMemo(() => {
    if (!order || !statuses || statuses.length === 0) return statuses;
    
    // First, try to get statuses that match the order's source
    const sourceSpecificStatuses = statuses.filter(status => status.source === order.source);
    
    // If we have source-specific statuses, use only those
    if (sourceSpecificStatuses.length > 0) {
      return sourceSpecificStatuses;
    }
    
    // Fallback 1: try app-specific statuses (no source)
    const appStatuses = statuses.filter(status => !status.source || status.source === '');
    if (appStatuses.length > 0) {
      return appStatuses;
    }
    
    // Fallback 2: if nothing else works, return all statuses
    return statuses;
  }, [statuses, order]);

  const form = useForm<OrderFormData>({
    resolver: zodResolver(orderSchema),
    defaultValues: {
      orderNumber: '',
      source: '',
      status: '',
      deliveryMethod: '',
      deliveryPostNumber: '',
      phoneNumber: '',
      fullName: '',
      paymentMethod: '',
      notes: '',
      products: [],
      numberOfItems: 0,
      amount: 0,
      productionCost: 0,
    },
  });

  useEffect(() => {
    if (order) {
      const orderProducts = (order.products as Array<{ title?: string; name?: string; quantity: number; price: number }>).map(p => ({
        title: p.title || p.name || '',
        quantity: Math.max(1, p.quantity || 0),
        price: Math.max(0, p.price || 0)
      })).filter(p => p.title && p.title.length > 0);

      form.reset({
        orderNumber: order.orderNumber,
        source: order.source,
        status: order.status,
        deliveryMethod: order.deliveryMethod,
        deliveryPostNumber: order.deliveryPostNumber || '',
        phoneNumber: order.phoneNumber,
        fullName: order.fullName,
        paymentMethod: order.paymentMethod,
        notes: order.notes || '',
        products: orderProducts,
        numberOfItems: order.numberOfItems,
        amount: order.amount,
        productionCost: order.productionCost || 0,
        mergeStatus: order.mergeStatus || OrdersMergeStatusOptions.none,
        mergeSource: order.mergeSource || OrdersMergeSourceOptions.none,
      });
    }
  }, [order, form]);

  // Subscribe to real-time updates
  useEffect(() => {
    if (!order || !isOpen) return;

    let unsubscribe: (() => void) | undefined;

    const setupSubscription = async () => {
      try {
        unsubscribe = await pb.collection('orders').subscribe<OrdersResponse>(order.id, (e) => {
          if (e.action === 'update') {
            // Skip if this is our own update
            if (userActionRef.current === order.id) {
              return;
            }

            // Update the form with new data
            const updatedOrder = e.record;
            const orderProducts = (updatedOrder.products as Array<{ title?: string; name?: string; quantity: number; price: number }>).map(p => ({
              title: p.title || p.name || '',
              quantity: Math.max(1, p.quantity || 0),
              price: Math.max(0, p.price || 0)
            })).filter(p => p.title && p.title.length > 0);

            form.reset({
              orderNumber: updatedOrder.orderNumber,
              source: updatedOrder.source,
              status: updatedOrder.status,
              deliveryMethod: updatedOrder.deliveryMethod,
              deliveryPostNumber: updatedOrder.deliveryPostNumber || '',
              phoneNumber: updatedOrder.phoneNumber,
              fullName: updatedOrder.fullName,
              paymentMethod: updatedOrder.paymentMethod,
              notes: updatedOrder.notes || '',
              products: orderProducts,
              numberOfItems: updatedOrder.numberOfItems,
              amount: updatedOrder.amount,
              productionCost: updatedOrder.productionCost || 0,
              mergeStatus: updatedOrder.mergeStatus || OrdersMergeStatusOptions.none,
              mergeSource: updatedOrder.mergeSource || OrdersMergeSourceOptions.none,
            });

            toast.info("Order Updated", {
              description: "The order has been updated by another user.",
            });
          }
        }, {
          expand: 'currency,status,source'
        });
        
        console.log('Subscribed to order updates:', order.id);
      } catch (error) {
        console.error('Error subscribing to order updates:', error);
      }
    };

    // Setup subscription immediately
    setupSubscription();

    // Cleanup subscription when component unmounts or order/isOpen changes
    return () => {
      if (unsubscribe) {
        unsubscribe();
        console.log('Unsubscribed from order updates:', order.id);
      }
    };
  }, [order, isOpen, form]); // Added order to dependencies

  const onSubmit = async (data: OrderFormData) => {
    if (!order) return;

    try {
        setIsUpdating(true);
        userActionRef.current = order.id;

        
        const updateData = {
            ...data,
            productionCost: Number(data.productionCost),
            // Ensure we include all required fields
            currency: order.currency,
            mergeStatus: order.mergeStatus,
            mergeSource: order.mergeSource
        };
        
        await onUpdate(order.id, updateData);
        onClose();
    } catch (error) {
        toast.error("Update failed", {
            description: error instanceof Error ? error.message : "Please try again"
        });
    } finally {
        setIsUpdating(false);
        userActionRef.current = null;
    }
  };

  const handleTtnCreated = async (ttnNumber: string, documentRef: string, invoiceData: NovaPoshtaInvoiceData) => {
    if (!order) return;
    
    try {
        setIsUpdating(true);
        userActionRef.current = order.id;
        
        console.log('TTN created with data:', {
          ttnNumber,
          documentRef,
          invoiceData
        });
        
        // Make sure we create a proper invoice_data object that matches the expected format
        const updateData = {
            ...order,
            deliveryPostNumber: ttnNumber,
            invoice_data: {
              Ref: documentRef,
              IntDocNumber: ttnNumber,
              CostOnSite: invoiceData.CostOnSite,
              EstimatedDeliveryDate: invoiceData.EstimatedDeliveryDate,
              TypeDocument: invoiceData.TypeDocument || 'InternetDocument'
            }
        };
        
        console.log('Updating order with:', JSON.stringify(updateData, null, 2));
        
        await onUpdate(order.id, updateData);
        toast.success("TTN number saved successfully");
    } catch (error) {
        toast.error("Failed to save TTN number", {
            description: error instanceof Error ? error.message : "Please try again"
        });
    } finally {
        setIsUpdating(false);
        userActionRef.current = null;
    }
  };

  const handleDeleteTtn = async () => {
    if (!order || !order.invoice_data) return;
    
    try {
        setIsDeletingTtn(true);
        userActionRef.current = order.id;
        
        // Get the documentRef from the invoice_data
        const invoice = order.invoice_data as NovaPoshtaInvoiceData;
        const documentRef = invoice.Ref;
        
        // Call the server action to delete the TTN
        const result = await deleteInternetDocument(documentRef);
        
        if (result.error) {
            throw new Error(result.error);
        }
        
        // If the TTN was deleted successfully, update the order
        const updateData = {
            ...order,
            deliveryPostNumber: '', // Clear the TTN number
            invoice_data: null // Clear the invoice data
        };
        
        await pb.collection('orders').update(order.id, updateData);
        toast.success("TTN deleted successfully");
    } catch (error) {
        toast.error("Failed to delete TTN", {
            description: error instanceof Error ? error.message : "Please try again"
        });
    } finally {
        setIsDeletingTtn(false);
        userActionRef.current = null;
    }
  };

  const isNovaPoshtaDelivery = () => {
    if (!order || !deliveryMethods) return false;
    const method = deliveryMethods.find(m => m.id === order.deliveryMethod);
    return method?.name === "Новая Почта" || method?.name === "Nova Poshta";
  };

  // Add console.log to check order data before modal opens
  useEffect(() => {
    if (order && isNovaPoshtaModalOpen) {
      console.log('Order data for Nova Poshta Modal:', order, 'Order ID:', order.id);
    }
  }, [order, isNovaPoshtaModalOpen]);

  // Add a function to render invoice details
  const renderInvoiceDetails = () => {
    console.log("Rendering invoice details, order:", order);
    
    if (!order) return null;

    try {
      // Handle different possible formats of invoice_data
      let invoice;
      
      if (order.invoice_data) {
        console.log("Invoice data exists:", order.invoice_data);
        
        // Check if it's a string (JSON string)
        if (typeof order.invoice_data === 'string') {
          try {
            invoice = JSON.parse(order.invoice_data);
            console.log("Parsed invoice data from string:", invoice);
          } catch (e) {
            console.error("Failed to parse invoice_data string:", e);
            return null;
          }
        } else {
          // It's already an object
          invoice = order.invoice_data as NovaPoshtaInvoiceData;
          console.log("Using invoice data as object:", invoice);
        }
      } else {
        console.log("No invoice data found in order");
        return null;
      }
      
      // Safety check to ensure required properties exist
      if (!invoice || !invoice.IntDocNumber) {
        console.log("Invalid invoice data format, missing required properties");
        return null;
      }
      
      return (
        <Card className="mt-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-md flex items-center">
              <FileText className="h-4 w-4 mr-2" />
              Nova Poshta Invoice Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <div className="font-semibold">TTN Number:</div>
                <div>{invoice.IntDocNumber}</div>
              </div>
              <div>
                <div className="font-semibold">Estimated Delivery:</div>
                <div>{invoice.EstimatedDeliveryDate || 'N/A'}</div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <div className="font-semibold">Cost:</div>
                <div>{invoice.CostOnSite ? `${invoice.CostOnSite} UAH` : 'N/A'}</div>
              </div>
              <div>
                <div className="font-semibold">Type:</div>
                <div>{invoice.TypeDocument || 'InternetDocument'}</div>
              </div>
            </div>
            <div className="pt-2">
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={handleDeleteTtn}
                disabled={isDeletingTtn}
                className="w-full"
              >
                {isDeletingTtn ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent mr-2"></div>
                ) : (
                  <Trash2 className="h-4 w-4 mr-2" />
                )}
                Delete TTN
              </Button>
            </div>
          </CardContent>
        </Card>
      );
    } catch (error) {
      console.error("Error rendering invoice details:", error);
      return null;
    }
  };

  // Debug log for invoice_data
  useEffect(() => {
    if (order) {
      console.log('Order object:', JSON.stringify(order, null, 2));
      console.log('Has invoice_data?', order.hasOwnProperty('invoice_data'));
      console.log('invoice_data:', order.invoice_data);
      console.log('invoice_data type:', order.invoice_data ? typeof order.invoice_data : 'null/undefined');
      
      // Try to access nested properties safely
      if (order.invoice_data && typeof order.invoice_data === 'object') {
        console.log('invoice_data keys:', Object.keys(order.invoice_data));
      }
    }
  }, [order]);

  if (isLoading || !order) return null;

  return (
    <>
      <Toaster richColors />
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[600px] bg-background border-border max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold leading-none tracking-tight">
              {translations.orderDetails}
            </DialogTitle>
            <p className="text-sm text-muted-foreground">
              {translations.editOrder}
            </p>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={async (e) => {
              e.preventDefault();
              console.log('Form submit event triggered');
              const formData = form.getValues();
              console.log('Form values:', formData);
              await onSubmit(formData);
            }} className="flex-1 overflow-hidden flex flex-col">
              <div className="flex-1 overflow-y-auto pr-2">
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="orderNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{translations.orderNumber}</FormLabel>
                          <FormControl>
                            <Input {...field} readOnly />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="source"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{translations.source}</FormLabel>
                          <Select
                            value={field.value}
                            onValueChange={field.onChange}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder={translations.selectSource} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {sources.map(source => (
                                <SelectItem key={source.id} value={source.id}>
                                  {source.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="status"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{translations.status}</FormLabel>
                          <FormControl>
                            <StatusSelect
                              status={field.value ? { 
                                id: field.value,
                                name: filteredStatuses.find(s => s.id === field.value)?.name || '',
                                color: filteredStatuses.find(s => s.id === field.value)?.color || '#000000'
                              } : undefined}
                              statuses={filteredStatuses}
                              onStatusChange={(statusId) => {
                                field.onChange(statusId);
                                if (!order) return Promise.resolve();
                                return onStatusChange(order.id, statusId);
                              }}
                              translateStatus={translateStatus}
                              getContrastColor={UtilityService.getContrastColor}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="deliveryMethod"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{translations.deliveryMethod}</FormLabel>
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={translations.selectDeliveryMethod} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {deliveryMethods.map(method => (
                              <SelectItem key={method.id} value={method.id}>
                                {method.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="deliveryPostNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{translations.deliveryPostNumber}</FormLabel>
                          <div className="flex gap-2">
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="phoneNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{translations.phoneNumber}</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Render Nova Poshta invoice details if available */}
                  {order?.invoice_data ? (
                    <>{renderInvoiceDetails()}</>
                  ) : null}

                  <FormField
                    control={form.control}
                    name="fullName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{translations.fullName}</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="products"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{translations.products}</FormLabel>
                        <FormControl>
                          <OrderProducts
                            products={field.value}
                            onChange={(products) => {
                              field.onChange(products);
                              const totalItems = products.reduce((sum: number, p) => sum + (p.quantity || 0), 0);
                              const totalAmount = products.reduce((sum: number, p) => sum + ((p.quantity || 0) * (p.price || 0)), 0);
                              form.setValue('numberOfItems', totalItems);
                              form.setValue('amount', totalAmount);
                            }}
                            translations={translations}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="productionCost"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{translations.productionCost}</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            {...field}
                            value={field.value || ''}
                            onChange={(e) => {
                              const value = e.target.value ? Number(e.target.value) : 0;
                              console.log('Input change value:', value);
                              field.onChange(value);
                            }}
                            className={form.formState.errors.productionCost ? "border-destructive" : ""}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {isBlacklisted && (
                    <Alert variant="destructive">
                      <AlertDescription>
                        {translations.blacklistedCustomerWarning}
                      </AlertDescription>
                    </Alert>
                  )}

                  <FormField
                    control={form.control}
                    name="paymentMethod"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{translations.paymentMethod}</FormLabel>
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                          disabled={isBlacklisted}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={translations.selectPaymentMethod} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {paymentMethods
                              .filter(method => !isBlacklisted || method.name.toLowerCase().includes('prepayment'))
                              .map(method => (
                                <SelectItem key={method.id} value={method.id}>
                                  {method.name}
                                </SelectItem>
                              ))
                            }
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{translations.notes}</FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            placeholder={translations.notesPlaceholder}
                            className="min-h-[100px]"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Add Nova Poshta TTN button if delivery method is Nova Poshta */}
                  {isNovaPoshtaDelivery() && (
                    <div className="mt-2">
                      <Button 
                        type="button" 
                        onClick={() => setIsNovaPoshtaModalOpen(true)}
                        className="w-full"
                        variant="outline"
                      >
                        <Truck className="mr-2 h-4 w-4" />
                        Create Nova Poshta TTN
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-2 py-4 px-2 border-t border-border bg-background mt-auto">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  disabled={isUpdating}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isUpdating || !form.formState.isDirty}
                >
                  {isUpdating ? "Updating..." : translations.updateOrder}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Nova Poshta Modal */}
      {order && (
        <NovaPoshtaModal
          open={isNovaPoshtaModalOpen}
          onOpenChange={setIsNovaPoshtaModalOpen}
          order={{
            id: order.id,
            customerName: order.fullName,
            customerPhone: order.phoneNumber,
            customerEmail: '',
            totalAmount: order.amount,
            deliveryPostNumber: order.deliveryPostNumber || ''
          }}
          onTtnCreated={handleTtnCreated}
        />
      )}
    </>
  );
} 