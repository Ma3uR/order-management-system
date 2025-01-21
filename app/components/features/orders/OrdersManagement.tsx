"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/shared/ui/card"
import { PlusCircle, Search, ChevronRight, ChevronLeft } from 'lucide-react'
import pb from '@/app/lib/pocketbase'
import type { RecordSubscription } from 'pocketbase'
import { RozetkaSync } from "@/app/components/features/sync/RozetkaSync"
import { OrderStats } from "./components/OrderStats"
import { OrderFilters, FilterOptions } from "./components/OrderFilters"
import { OrderList } from "./components/OrderList"
import { OrderDetails } from "./components/OrderDetails"
import { OrderCreate } from "./components/OrderCreate"
import { OrderPagination } from "./components/OrderPagination"
import { Input } from "@/app/components/shared/ui/input"
import { Button } from "@/app/components/shared/ui/button"
import { Separator } from "@/app/components/shared/ui/separator"
import { ScrollArea } from "@/app/components/shared/ui/scroll-area"
import { cn } from "@/app/lib/utils"
import { toast, Toaster } from 'sonner'
import { 
  OrdersResponse, 
  SourcesResponse, 
  StatusResponse, 
  DeliveryOptionsResponse, 
  PaymentMethodsResponse, 
  CurrencyResponse 
} from '@/app/types/pocketbase-types'
import { 
  getOrders, 
  createOrder, 
  updateOrder, 
  deleteOrder,
  getSettings 
} from '@/app/[locale]/orders/actions/orders'
import { OrderFormData } from '@/app/lib/validations/orders'

interface OrdersManagementProps {
  translations: {
    title: string
    totalAmount: string
    totalOrders: string
    filterOrders: string
    filterOrdersPlaceholder: string
    createNewOrder: string
    backToDashboard: string
    filters: string
    status: string
    selectStatus: string
    all: string
    amountRange: string
    resetFilters: string
    // List view translations
    orderNumber: string
    fullName: string
    amount: string
    createdAt: string
    actions: string
    actionsAndStatistics: string
    details: string
    delete: string
    deleteConfirmation: string
    // Pagination translations
    showing: string
    of: string
    results: string
    previous: string
    next: string
    // Order details translations
    orderDetails: string
    editOrder: string
    source: string
    selectSource: string
    deliveryMethod: string
    selectDeliveryMethod: string
    deliveryPostNumber: string
    phoneNumber: string
    paymentMethod: string
    selectPaymentMethod: string
    notes: string
    notesPlaceholder: string
    blacklistedCustomerWarning: string
    products: string
    addProduct: string
    product: string
    quantity: string
    price: string
    totalItems: string
    updateOrder: string
    dateRange: string
    selectDateRange: string
  }
  initialOrders: OrdersResponse[]
  itemsPerPage?: number
}

export function OrdersManagement({ translations, initialOrders, itemsPerPage = 10 }: OrdersManagementProps) {
  const [orders, setOrders] = useState<OrdersResponse[]>(initialOrders)
  const [isClient, setIsClient] = useState(false)
  const [filterText, setFilterText] = useState("")
  const [debouncedFilterText, setDebouncedFilterText] = useState("")
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<OrdersResponse | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [sources, setSources] = useState<SourcesResponse[]>([])
  const [statuses, setStatuses] = useState<StatusResponse[]>([])
  const [deliveryMethods, setDeliveryMethods] = useState<DeliveryOptionsResponse[]>([])
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodsResponse[]>([])
  const [defaultCurrency, setDefaultCurrency] = useState<CurrencyResponse | null>(null)
  const [filters, setFilters] = useState<FilterOptions>({
    status: '',
    dateRange: { from: null, to: null },
    minAmount: undefined,
    maxAmount: undefined
  })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Keep track of whether the current user initiated the change
  const userActionRef = useRef<string | null>(null);

  // Add debounced search effect
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedFilterText(filterText);
    }, 300);

    return () => clearTimeout(timer);
  }, [filterText]);

  // Initial data fetching
  useEffect(() => {
    let isSubscribed = true;

    const fetchData = async () => {
      try {
        setIsLoading(true);
        const result = await getSettings();
        if (!result.data || result.error) {
          throw new Error(result.error || 'Failed to fetch settings');
        }

        if (!isSubscribed) return;

        const {
          deliveryMethods,
          paymentMethods,
          defaultCurrency,
          statuses,
          sources
        } = result.data;

        setDeliveryMethods(deliveryMethods);
        setPaymentMethods(paymentMethods);
        setDefaultCurrency(defaultCurrency);
        setStatuses(statuses);
        setSources(sources);
        setIsClient(true);
      } catch (error) {
        console.error('Error in fetchData:', error);
        setError(error instanceof Error ? error.message : 'Unknown error');
        // Set default values for all states
        setDeliveryMethods([]);
        setPaymentMethods([]);
        setDefaultCurrency(null);
        setStatuses([]);
        setSources([{
          id: 'default',
          name: 'Default',
          color: '#CBD5E1',
          created: new Date().toISOString(),
          updated: new Date().toISOString(),
          collectionId: 'sources',
          collectionName: 'sources'
        } as SourcesResponse]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();

    return () => {
      isSubscribed = false;
    };
  }, []);

  // Modify the delete handler to use server action
  const handleDeleteOrder = async (orderId: string) => {
    try {
      userActionRef.current = orderId;
      const result = await deleteOrder(orderId);
      if (result.error) {
        throw new Error(result.error);
      }
      setOrders(prevOrders => prevOrders.filter(o => o.id !== orderId));
      toast.success("Order deleted successfully");
    } catch (error) {
      console.error('Error deleting order:', error);
      toast.error("Failed to delete order. Please try again.");
      userActionRef.current = null;
    }
  };

  // Modify the status change handler to use server action
  const handleStatusChange = async (orderId: string, statusId: string) => {
    try {
      userActionRef.current = orderId;
      const order = orders.find(o => o.id === orderId);
      if (!order) throw new Error('Order not found');

      // Validate products before update
      if (!Array.isArray(order.products) || order.products.length === 0) {
        throw new Error('Invalid products data');
      }

      const validProducts = (order.products as Array<{ 
        title?: string; 
        name?: string; 
        quantity: number; 
        price: number 
      }>).map(p => {
        // Ensure we have a valid title
        if (!p.title && (p.name || p.title)) {
          return {
            title: (p.name || p.title) as string,
            quantity: p.quantity || 0,
            price: p.price || 0
          };
        }
        // Keep existing product data if it's valid
        return {
          title: p.title as string,
          quantity: p.quantity,
          price: p.price
        };
      }).filter(p => p.title && p.title.length > 0); // Filter out any products with empty titles

      if (validProducts.length === 0) {
        throw new Error('No valid products found');
      }

      // Only update the status and include validated products
      const result = await updateOrder(orderId, {
        ...order,
        status: statusId,
        products: validProducts
      });

      if (result.error) {
        throw new Error(result.error);
      }

      // Update local state if successful
      setOrders(prevOrders => 
        prevOrders.map(o => o.id === orderId ? { ...o, status: statusId } : o)
      );
      toast.success("Order status updated successfully");
    } catch (error) {
      console.error('Error updating order status:', error);
      toast.error(error instanceof Error ? error.message : "Failed to update order status");
    } finally {
      userActionRef.current = null;
    }
  };

  // Modify the real-time subscription effect to use server action for refreshing data
  useEffect(() => {
    let isSubscribed = true;
    const setupSubscription = async () => {
      try {
        const subscription = await pb.collection('orders').subscribe<OrdersResponse>('*', async (e: RecordSubscription<OrdersResponse>) => {
          const isUserAction = userActionRef.current === e.record.id;
          const record = e.record;
          
          switch (e.action) {
            case 'delete':
              if (!isUserAction && isSubscribed) {
                toast.info("Order Deleted", {
                  description: `Order ${record.orderNumber} was deleted by another user`
                });
                setOrders(prev => prev.filter(o => o.id !== record.id));
              }
              break;
            case 'update':
              if (!isUserAction && isSubscribed) {
                try {
                  // Fetch the single updated record with expanded data
                  const updatedOrder = await pb.collection('orders').getOne<OrdersResponse>(record.id, {
                    expand: 'currency,status,source'
                  });
                  if (isSubscribed) {
                    setOrders(prev => prev.map(o => o.id === record.id ? updatedOrder : o));
                    toast.info("Order Updated", {
                      description: `Order ${record.orderNumber} was updated by another user`
                    });
                  }
                } catch (error: unknown) {
                  // Ignore autocancelled requests
                  if (error instanceof Error && !error.message?.includes('autocancelled')) {
                    console.error('Error fetching updated order:', error);
                  }
                }
              }
              break;
            case 'create':
              if (!isUserAction && isSubscribed) {
                try {
                  // Fetch the single new record with expanded data
                  const newOrder = await pb.collection('orders').getOne<OrdersResponse>(record.id, {
                    expand: 'currency,status,source'
                  });
                  if (isSubscribed) {
                    setOrders(prev => [newOrder, ...prev]);
                    toast.info("New Order", {
                      description: `Order ${record.orderNumber} was created`
                    });
                  }
                } catch (error: unknown) {
                  // Ignore autocancelled requests
                  if (error instanceof Error && !error.message?.includes('autocancelled')) {
                    console.error('Error fetching new order:', error);
                  }
                }
              }
              break;
          }
          
          // Reset the user action flag
          if (isSubscribed) {
            userActionRef.current = null;
          }
        });

        return () => {
          subscription();
        };
      } catch (error: unknown) {
        if (error instanceof Error && !error.message?.includes('autocancelled')) {
          console.error('Error setting up real-time subscription:', error);
        }
      }
    };

    const unsubscribe = setupSubscription();

    return () => {
      isSubscribed = false;
      unsubscribe?.then(unsub => unsub?.());
    };
  }, []);

  // Filter orders based on search and filters
  const filteredOrders = orders.filter(order => {
    let matches = true;

    // Text search filter
    if (debouncedFilterText) {
      const searchTerm = debouncedFilterText.toLowerCase();
      const expandedSource = (order.expand as { source?: SourcesResponse })?.source;
      matches = matches && (
        order.orderNumber?.toLowerCase().includes(searchTerm) ||
        order.fullName?.toLowerCase().includes(searchTerm) ||
        order.phoneNumber?.toLowerCase().includes(searchTerm) ||
        order.deliveryPostNumber?.toLowerCase().includes(searchTerm) ||
        expandedSource?.name?.toLowerCase().includes(searchTerm) ||
        (Array.isArray(order.products) && (order.products as { name: string }[]).some(product => 
          product?.name?.toLowerCase().includes(searchTerm)
        ))
      );
    }

    // Status filter
    if (filters.status) {
      matches = matches && order.status === filters.status;
    }

    // Amount range filter
    if (filters.minAmount !== undefined) {
      matches = matches && order.amount >= filters.minAmount;
    }
    if (filters.maxAmount !== undefined) {
      matches = matches && order.amount <= filters.maxAmount;
    }

    // Date range filter
    if (filters.dateRange.from || filters.dateRange.to) {
      const orderDate = new Date(order.created);
      orderDate.setHours(0, 0, 0, 0); // Normalize to start of day

      if (filters.dateRange.from) {
        const fromDate = new Date(filters.dateRange.from);
        fromDate.setHours(0, 0, 0, 0);
        matches = matches && orderDate >= fromDate;
      }
      if (filters.dateRange.to) {
        const toDate = new Date(filters.dateRange.to);
        toDate.setHours(23, 59, 59, 999);
        matches = matches && orderDate <= toDate;
      }
    }

    return matches;
  }).sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime()); // Sort by created date, newest first

  // Calculate pagination
  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentOrders = filteredOrders.slice(startIndex, endIndex)

  if (isLoading) return <div>Loading...</div>
  if (error) return <div>Error: {error}</div>

  if (!isClient) {
    return null
  }

  return (
    <div className="flex gap-6 p-1">
      <Toaster richColors />
      {/* Main Orders List Card - 75% width */}
      <Card className={cn(
        "transition-all duration-300 ease-in-out",
        isCollapsed ? "flex-1" : "flex-[3]",
      )}>
        <CardHeader>
          <CardTitle>{translations.title}</CardTitle>
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={translations.filterOrdersPlaceholder}
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              className="pl-8"
            />
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[calc(100vh-12rem)]">
            <OrderList
              orders={currentOrders}
              onViewDetails={(order) => {
                setSelectedOrder(order);
                setIsDetailsModalOpen(true);
              }}
              onDeleteOrder={handleDeleteOrder}
              onStatusChange={handleStatusChange}
              translations={translations}
              statuses={statuses}
              translateStatus={(status) => status}
            />
          </ScrollArea>
          
          {filteredOrders.length > 0 && (
            <div className="mt-4">
              <OrderPagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                startIndex={startIndex}
                endIndex={endIndex}
                totalItems={filteredOrders.length}
                translations={translations}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sidebar Card - 25% width */}
      <div className="relative flex">
        <div
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={cn(
            "absolute -left-3 h-full w-1.5 bg-border hover:bg-primary/50 cursor-pointer transition-colors group flex items-center justify-center",
            "after:absolute after:w-6 after:h-12 after:bg-border/10 after:left-0 after:top-1/2 after:-translate-y-1/2 after:rounded-md after:transition-colors",
            "hover:after:bg-primary/20"
          )}
        >
          <div className="relative z-10 bg-background rounded-full p-0.5 shadow-sm">
            {isCollapsed ? 
              <ChevronLeft className="h-3 w-3 text-muted-foreground group-hover:text-primary" /> : 
              <ChevronRight className="h-3 w-3 text-muted-foreground group-hover:text-primary" />
            }
          </div>
        </div>

        <Card className={cn(
          "transition-all duration-300 ease-in-out h-[calc(100vh--6rem)]",
          isCollapsed ? "w-0 opacity-0 overflow-hidden" : "w-80 opacity-100"
        )}>
          <CardHeader>
            <CardTitle>{translations.actionsAndStatistics}</CardTitle>
          </CardHeader> 
          <CardContent className="flex flex-col h-[calc(100%-5rem)]">
          <div className="pt-6 mt-auto">
              <RozetkaSync onSyncComplete={async () => {
                const result = await getOrders();
                if (result.data) {
                  setOrders(result.data);
                }
              }} />
            </div>
            <div className="space-y-6 flex-1">
              <Button 
                className="w-full hover:bg-accent"
                size="lg"
                variant="ghost"
                onClick={() => setIsCreateModalOpen(true)}
              >
                <PlusCircle className="mr-2 h-4 w-4" />
                {translations.createNewOrder}
              </Button>

              <Separator />

              <OrderStats 
                orders={orders as (OrdersResponse & { expand?: { currency?: CurrencyResponse }})[]} 
                translations={translations} 
              />

              <Separator />

              <ScrollArea className="flex-1">
                <OrderFilters
                  filters={filters}
                  onFiltersChange={setFilters}
                  statuses={statuses}
                  translations={translations}
                  maxAmount={Math.max(...orders.map(order => order.amount), 5000)}
                  translateStatus={(status) => status}
                />
              </ScrollArea>
            </div>

            
          </CardContent>
        </Card>
      </div>

      <OrderDetails
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        order={selectedOrder}
        onUpdate={async (orderId, orderData) => {
          try {
            if (!selectedOrder) return;
            userActionRef.current = orderId;

            // Validate and transform products
            type ProductData = {
              title?: string;
              name?: string;
              quantity: number;
              price: number;
            };

            type ValidProduct = {
              title: string;
              quantity: number;
              price: number;
            };

            const products: ValidProduct[] = ((orderData.products || selectedOrder.products) as ProductData[]).map((p) => ({
              title: p.title || p.name || '',
              quantity: Math.max(1, p.quantity || 1),
              price: Math.max(0, p.price || 0)
            })).filter(p => p.title && p.title.length > 0);

            if (products.length === 0) {
              throw new Error("At least one valid product is required");
            }

            // Calculate totals
            const numberOfItems = products.reduce((sum, p) => sum + p.quantity, 0);
            const amount = products.reduce((sum, p) => sum + (p.quantity * p.price), 0);

            // Ensure all required fields are present
            const updatePayload = {
              status: orderData.status || selectedOrder.status,
              orderNumber: orderData.orderNumber || selectedOrder.orderNumber,
              source: orderData.source || selectedOrder.source,
              deliveryMethod: orderData.deliveryMethod || selectedOrder.deliveryMethod,
              phoneNumber: orderData.phoneNumber || selectedOrder.phoneNumber,
              fullName: orderData.fullName || selectedOrder.fullName,
              paymentMethod: orderData.paymentMethod || selectedOrder.paymentMethod,
              products,
              numberOfItems,
              amount,
              currency: orderData.currency || selectedOrder.currency,
              created: orderData.created || selectedOrder.created,
              notes: orderData.notes,
              deliveryPostNumber: orderData.deliveryPostNumber
            };

            const result = await updateOrder(orderId, updatePayload);

            if (result.error) {
              throw new Error(result.error);
            }

            if (result.data) {
              setOrders(prevOrders => 
                prevOrders.map(o => o.id === orderId ? result.data! : o)
              );
              setIsDetailsModalOpen(false);
              toast.success("Order updated successfully");
            }
          } catch (error) {
            console.error('Error updating order:', error);
            toast.error(error instanceof Error ? error.message : "Failed to update order. Please try again.");
          } finally {
            userActionRef.current = null;
          }
        }}
        onStatusChange={handleStatusChange}
        translations={translations}
        translateStatus={(status) => status}
      />

      <OrderCreate
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={async (orderData: Partial<OrdersResponse>, productInputs) => {
          const formData: OrderFormData = {
            ...orderData,
            status: orderData.status || '',
            orderNumber: orderData.orderNumber || '',
            source: orderData.source || '',
            deliveryMethod: orderData.deliveryMethod || '',
            phoneNumber: orderData.phoneNumber || '',
            fullName: orderData.fullName || '',
            paymentMethod: orderData.paymentMethod || '',
            products: productInputs.map(p => ({
              title: p.title,
              quantity: p.quantity,
              price: p.price
            })),
            numberOfItems: productInputs.reduce((sum, p) => sum + p.quantity, 0),
            amount: productInputs.reduce((sum, p) => sum + (p.quantity * p.price), 0),
            currency: orderData.currency || defaultCurrency?.id || '',
            notes: orderData.notes,
            deliveryPostNumber: orderData.deliveryPostNumber
          };

          const result = await createOrder(formData);
          if (result.error) {
            toast.error("Failed to create order. Please try again.");
            return;
          }
          setOrders(prev => [result.data!, ...prev]);
          setIsCreateModalOpen(false);
          toast.success("Order created successfully");
        }}
        translations={translations}
        deliveryMethods={deliveryMethods}
        paymentMethods={paymentMethods}
        sources={sources}
        defaultCurrency={defaultCurrency}
      />
    </div>
  )
}
