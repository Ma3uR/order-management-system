import { useState, useEffect } from 'react';
import { OrdersResponse } from '@/app/types/pocketbase-types';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/app/components/shared/ui/dialog";
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
import pb from '@/app/lib/pocketbase';
import { Toaster, toast } from 'sonner';

type Status = {
  id: string;
  name: string;
  color: string;
};

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
  };
  translateStatus: (status: string) => string;
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
      created: new Date().toISOString(),
    },
  });

  useEffect(() => {
    if (order) {
      const orderProducts = (order.products as Array<{ name: string; quantity: number; price: number }>).map(p => ({
        title: p.name,
        quantity: p.quantity,
        price: p.price
      }));

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
        created: order.created
      });
    }
  }, [order, form]);

  // Subscribe to real-time updates
  useEffect(() => {
    if (!order || !isOpen) return;

    let unsubscribe: (() => void) | undefined;

    const setupSubscription = async () => {
      try {
        unsubscribe = await pb.collection('orders').subscribe(order.id, (e) => {
          if (e.action === 'update' && !isUpdating) {
            // Update the form with new data
            const updatedOrder = e.record as OrdersResponse;
            const orderProducts = (updatedOrder.products as Array<{ name: string; quantity: number; price: number }>).map(p => ({
              title: p.name,
              quantity: p.quantity,
              price: p.price
            }));

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
              created: updatedOrder.created
            });

            toast("Order Updated", {
              description: "The order has been updated by another user.",
            });
          }
        });
        console.log('Subscribed to order updates:', order.id);
      } catch (error) {
        console.error('Error subscribing to order updates:', error);
      }
    };

    setupSubscription();

    return () => {
      if (unsubscribe) {
        unsubscribe();
        console.log('Unsubscribed from order updates:', order.id);
      }
    };
  }, [order, form, isOpen, isUpdating]);

  const onSubmit = async (data: OrderFormData) => {
    if (!order) return;

    try {
      setIsUpdating(true);
      const updateData: Partial<OrdersResponse> = {
        orderNumber: data.orderNumber,
        source: data.source,
        status: data.status,
        deliveryMethod: data.deliveryMethod,
        deliveryPostNumber: data.deliveryPostNumber,
        phoneNumber: data.phoneNumber,
        fullName: data.fullName,
        paymentMethod: data.paymentMethod,
        notes: data.notes,
        products: data.products.map(p => ({
          name: p.title,
          quantity: p.quantity,
          price: p.price
        })),
        numberOfItems: data.numberOfItems,
        amount: data.amount
      };

      await onUpdate(order.id, updateData);
      onClose();
      
      toast.success("Success", {
        description: "Order updated successfully",
      });
    } catch (error) {
      console.error('Error updating order:', error);
      toast.error("Error", {
        description: "Failed to update order. Please try again.",
      });
    } finally {
      setIsUpdating(false);
    }
  };

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
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 overflow-y-auto pr-2">
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
                              name: statuses.find(s => s.id === field.value)?.name || '',
                              color: statuses.find(s => s.id === field.value)?.color || '#000000'
                            } : undefined}
                            statuses={statuses as Status[]}
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

                  <FormField
                    control={form.control}
                    name="created"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{translations.createdAt}</FormLabel>
                        <FormControl>
                          <Input
                            value={new Date(field.value).toLocaleString()}
                            readOnly
                          />
                        </FormControl>
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
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
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
              </div>

              <DialogFooter>
                <Button type="submit" className="w-full">
                  {translations.updateOrder}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
} 