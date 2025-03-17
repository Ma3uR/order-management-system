"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/shared/ui/card"
import { PlusCircle, Search, ChevronRight, ChevronLeft } from 'lucide-react'
import pb from '@/app/lib/pocketbase'
import type { RecordSubscription } from 'pocketbase'
import { MarketplaceSync } from '@/app/components/features/sync/MarketplaceSync'
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
import { cn, showConfirmDialog } from "@/app/lib/utils"
import { toast, Toaster } from 'sonner'
import { 
  OrdersResponse, 
  SourcesResponse, 
  StatusResponse, 
  DeliveryOptionsResponse, 
  PaymentMethodsResponse, 
  CurrencyResponse,
  OrdersMergeStatusOptions,
  OrdersMergeSourceOptions
} from '@/app/types/pocketbase-types'
import { getSettings } from '@/app/[locale]/orders/actions/orders'
import { getOrders, updateOrder, createOrder } from '@/app/[locale]/orders/actions/orders'
import { OrderFormData } from '@/app/lib/validations/orders'
import { setOrderStatus as setEpicentrStatus } from '@/app/actions/epicentr'
import { setOrderStatus as setPromuaStatus } from '@/app/actions/prom-ua'
import { setOrderStatus as setRozetkaStatus } from '@/app/actions/rozetka'
import { MergeNotification } from "./components/MergeNotification"
import { MergeConfirmationDialog } from "./components/MergeConfirmationDialog"

// import { MergedOrderView } from "./components/MergedOrderView"

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
    dateRange: string
    selectDateRange: string
    resetFilters: string
    orderNumber: string
    fullName: string
    amount: string
    createdAt: string
    actions: string
    actionsAndStatistics: string
    details: string
    delete: string
    deleteConfirmation: string
    orderDetails: string
    source: string
    deliveryMethod: string
    deliveryPostNumber: string
    phoneNumber: string
    products: string
    numberOfItems: string
    paymentMethod: string
    editOrder: string
    updateOrder: string
    productionCost: string
    statuses: {
      beingProcessed: string
      shipped: string
      delivered: string
      cancelled: string
    }
    deliveryMethods: {
      ukrposhta: string
      novaPoshta: string
      parcelLocker: string
      rozetka: string
      mistExpress: string
    }
    createNewOrderDescription: string
    selectDeliveryMethod: string
    selectPaymentMethod: string
    selectSource: string
    sourceRequired: string
    blacklistedCustomerWarning: string
    notes: string
    notesPlaceholder: string
    showing: string
    of: string
    results: string
    previous: string
    next: string
    page: string
    addProduct: string
    productName: string
    quantity: string
    price: string
    product: string
    totalItems: string
    mergeStatus: string
    selectMergeStatus: string
    mergeNotification: {
      title: string
      description: string
      phoneMatch: string
      nameMatch: string
      confirmButton: string
      rejectButton: string
    }
    mergeConfirmation: string
    mergeDescription: string
    mergeReview: string
    keepSeparate: string
    mergeSuccess: string
    mergeError: string
    mergedOrderSummary: string
    ordersFromSource: (number: string, source: string) => Promise<string>
    ordersCombined: (count: number) => Promise<string>
    originalOrders: string
    mergeRejected: string
    mergeRejectionError: string
    cancel: string
    confirm: string
  }
  initialOrders: OrdersResponse[]
  itemsPerPage?: number
}

export function OrdersManagement({ translations, initialOrders, itemsPerPage = 10 }: OrdersManagementProps) {
  const [orders, setOrders] = useState<OrdersResponse[]>(initialOrders)
  const [isClient, setIsClient] = useState(false)
  const [filterText, setFilterText] = useState("")
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
    mergeStatus: undefined,
    dateRange: { from: null, to: null },
    amountRange: { min: 0, max: 0 },
    archived: false
  })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [potentialMerges, setPotentialMerges] = useState<OrdersResponse[]>([])
  const [showMergeDialog, setShowMergeDialog] = useState(false)
  const [ordersToMerge, setOrdersToMerge] = useState<OrdersResponse[]>([])
  // Keep track of whether the current user initiated the change
  const userActionRef = useRef<string | null>(null);

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

        const response = await getOrders();
        if (response.data) {
          // Sort orders by creation date before setting state
          const sortedOrders = [...response.data].sort((a, b) => 
            new Date(b.created).getTime() - new Date(a.created).getTime()
          );
          setOrders(sortedOrders as OrdersResponse[]);
          
          // Find status with lowest priority
          const lowestPriorityStatus = statuses.reduce((lowest, current) => 
            (current.priority || 0) < (lowest.priority || 0) ? current : lowest
          );
          
          // Check for potential merges among unprocessed orders
          const unprocessedOrders = sortedOrders.filter(order => 
            order.mergeStatus === OrdersMergeStatusOptions.none && 
            order.status === lowestPriorityStatus.id
          );
          
          const { merges } = findPotentialMerges(unprocessedOrders as OrdersResponse[]);
          if (merges.length > 0) {
            setPotentialMerges(merges);
          }
        }
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
    if (await showConfirmDialog(translations.deleteConfirmation)) {
      try {
        const orderToArchive = orders.find(o => o.id === orderId)!;
        await updateOrder(orderId, {
          ...orderToArchive,
          products: (orderToArchive.products || []) as Array<{ title: string; quantity: number; price: number }>,
          originalOrders: null,
          archived: true
        });
        setOrders(prev => prev.filter(order => order.id !== orderId));
        toast.success("Order archived successfully");
      } catch (error: unknown) {
        if (error instanceof Error) {
          toast.error(error.message);
        } else {
          toast.error("Failed to process order");
        }
      }
    }
  };

  // Add restore handler
  const handleRestoreOrder = async (orderId: string) => {
    if (await showConfirmDialog("Are you sure you want to restore this order?")) {
      try {
        const orderToRestore = orders.find(o => o.id === orderId)!;
        await updateOrder(orderId, {
          ...orderToRestore,
          products: (orderToRestore.products || []) as Array<{ title: string; quantity: number; price: number }>,
          originalOrders: null,
          archived: false
        });
        setOrders(prev => prev.map(order => 
          order.id === orderId ? { ...order, archived: false } : order
        ));
        toast.success("Order restored successfully");
      } catch (error: unknown ) {
        if (error instanceof Error) {
          toast.error(error.message);
        } else {
          toast.error("Failed to restore order");
        }
      }
    }
  };

  // Modify the status change handler to use server action
  const handleStatusChange = async (orderId: string, statusId: string) => {
    try {
      userActionRef.current = orderId;
      const order = orders.find(o => o.id === orderId);
      if (!order) throw new Error('Order not found');

      // Get the status to find the marketplace-specific code
      const status = statuses.find(s => s.id === statusId);
      if (!status) throw new Error('Status not found');

      // Get the marketplace-specific code based on the source
      let marketplaceCode: string | undefined;
      let marketplaceUpdateFn;

      switch (order.source) {
        case 'pj9sejm9vqtu8xq': // Epicentr
          marketplaceCode = status.epicentrCode;
          marketplaceUpdateFn = () => setEpicentrStatus(order.orderNumber, marketplaceCode!);
          break;
        case 'gfzk8nxfokgu9ku': // PromUa
          marketplaceCode = status.promuaCode;
          marketplaceUpdateFn = () => setPromuaStatus(order.orderNumber, marketplaceCode!);
          break;
        case '4tvf116a5aitwmb': // Rozetka
          marketplaceCode = status.rozetkaCode;
          marketplaceUpdateFn = () => setRozetkaStatus(order.orderNumber, marketplaceCode!);
          break;
      }

      // If we have a marketplace code and update function, update the marketplace first
      if (marketplaceCode && marketplaceUpdateFn) {
        const marketplaceResult = await marketplaceUpdateFn();
        if (marketplaceResult.error) {
          throw new Error(`Failed to update marketplace status: ${marketplaceResult.error}`);
        }
        if (!marketplaceResult.data) {
          throw new Error('Failed to update marketplace status: No confirmation from marketplace');
        }
        toast.info(`Marketplace status updated successfully`);
      }

      // Only proceed with app update if marketplace update was successful or if no marketplace update was needed
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
        if (!p.title && (p.name || p.title)) {
          return {
            title: (p.name || p.title) as string,
            quantity: p.quantity || 0,
            price: p.price || 0
          };
        }
        return {
          title: p.title as string,
          quantity: p.quantity,
          price: p.price
        };
      }).filter(p => p.title && p.title.length > 0);

      if (validProducts.length === 0) {
        throw new Error('No valid products found');
      }

      // Update local database
      const updatePayload = {
        ...order,
        status: statusId,
        products: validProducts,
        numberOfItems: validProducts.reduce((sum, p) => sum + p.quantity, 0),
        amount: validProducts.reduce((sum, p) => sum + (p.quantity * p.price), 0),
        originalOrders: Array.isArray(order.originalOrders) ? order.originalOrders : null,
        mergeStatus: order.mergeStatus || OrdersMergeStatusOptions.none,
        productionCost: order.productionCost || 0
      };

      const result = await updateOrder(orderId, updatePayload);

      if (result.error) {
        throw new Error(result.error);
      }

      // Update local state if successful
      setOrders(prevOrders => 
        prevOrders.map(o => o.id === orderId ? result.data! : o) as OrdersResponse[]
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
                    // Insert the new order at the beginning since it's the newest
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
  const filteredOrders = useMemo(() => {
    return orders
      .filter(order => {
        const matchesStatus = !filters.status || order.status === filters.status
        const matchesMergeStatus = filters.mergeStatus === undefined || order.mergeStatus === filters.mergeStatus
        const matchesText = !filterText || 
          order.orderNumber.toLowerCase().includes(filterText.toLowerCase()) ||
          order.fullName.toLowerCase().includes(filterText.toLowerCase()) ||
          (order.products && JSON.stringify(order.products).toLowerCase().includes(filterText.toLowerCase()))
        const matchesArchived = order.archived === filters.archived;
        const matchesSource = !filters.source || order.source === filters.source;
        
        return matchesStatus && matchesMergeStatus && matchesText && matchesArchived && matchesSource
      })
      .sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime()) // Sort by creation date, newest first
  }, [orders, filters, filterText])

  // Calculate pagination
  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentOrders = filteredOrders.slice(startIndex, endIndex)

  // Add merge handling functions
  const findPotentialMerges = (orders: OrdersResponse[]) => {
    console.log('Starting findPotentialMerges with orders:', orders.map(o => ({
      id: o.id,
      orderNumber: o.orderNumber,
      phoneNumber: o.phoneNumber,
      fullName: o.fullName,
      status: o.status,
      mergeStatus: o.mergeStatus
    })));

    const phoneMap = new Map<string, OrdersResponse[]>();
    const nameMap = new Map<string, OrdersResponse[]>();

    // First pass: group orders by phone number and name
    orders.forEach(order => {
      if (order.phoneNumber?.trim()) {
        const normalizedPhone = order.phoneNumber.trim().replace(/[^0-9+]/g, '');
        if (normalizedPhone) {
          console.log('Processing phone number:', {
            original: order.phoneNumber,
            normalized: normalizedPhone,
            orderNumber: order.orderNumber
          });
          const existing = phoneMap.get(normalizedPhone) || [];
          phoneMap.set(normalizedPhone, [...existing, order]);
        }
      }
      if (order.fullName?.trim()) {
        const normalizedName = order.fullName.trim().toLowerCase();
        const existing = nameMap.get(normalizedName) || [];
        nameMap.set(normalizedName, [...existing, order]);
      }
    });

    console.log('Phone number groups:', Array.from(phoneMap.entries()).map(([phone, orders]) => ({
      phone,
      orderCount: orders.length,
      orderNumbers: orders.map(o => o.orderNumber)
    })));

    // Check phone numbers first (higher priority)
    const phoneMatches = Array.from(phoneMap.values()).find(phoneOrders => phoneOrders.length > 1);
    if (phoneMatches) {
      console.log('Found phone matches:', phoneMatches.map(o => ({
        orderNumber: o.orderNumber,
        phoneNumber: o.phoneNumber,
        status: o.status,
        mergeStatus: o.mergeStatus
      })));
      phoneMatches.forEach((order: OrdersResponse) => {
        order.mergeSource = OrdersMergeSourceOptions.phone;
      });
      return { merges: phoneMatches, conflicts: {} };
    }

    // Then check names if no phone matches found
    const nameMatches = Array.from(nameMap.values()).find(nameOrders => nameOrders.length > 1);
    if (nameMatches) {
      console.log('Found name matches:', nameMatches.map(o => ({
        orderNumber: o.orderNumber,
        fullName: o.fullName,
        status: o.status,
        mergeStatus: o.mergeStatus
      })));
      nameMatches.forEach((order: OrdersResponse) => {
        order.mergeSource = OrdersMergeSourceOptions.name;
      });
      return { merges: nameMatches, conflicts: {} };
    }

    console.log('No matches found');
    return { merges: [], conflicts: {} };
  }

  const handleMergeConfirm = (orders: OrdersResponse[]) => {
    setOrdersToMerge(orders)
    setShowMergeDialog(true)
  }

  const handleMergeReject = async (orders: OrdersResponse[]) => {
    try {
      await Promise.all(orders.map(order => 
        updateOrder(order.id, {
          ...order,
          products: (order.products || []) as Array<{ title: string; quantity: number; price: number }>,
          originalOrders: (order.originalOrders || []) as string[],
          mergeStatus: OrdersMergeStatusOptions.rejected
        })
      ))
      setPotentialMerges([])
      toast.success(translations.mergeRejected)
    } catch (error) {
      console.error('Error rejecting merge:', error)
      toast.error(translations.mergeRejectionError)
    }
  }

  const handleMergeComplete = async (orders: OrdersResponse[], resolvedConflicts: Record<string, string>) => {
    try {
      const primaryOrder = orders[0];
      // Destructure to remove ID from copied data
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { id: _id, ...primaryOrderData } = primaryOrder;
      
      const mergedOrder = {
        ...primaryOrderData,  // Now contains all fields except ID
        ...resolvedConflicts,
        marketplaceIds: orders.map(o => o.marketplaceIds).filter(Boolean).join(','),
        mergeStatus: OrdersMergeStatusOptions.none,
        originalOrders: orders.map(o => o.id),
        numberOfItems: orders.reduce((sum, o) => sum + o.numberOfItems, 0),
        amount: orders.reduce((sum, o) => sum + o.amount, 0),
        products: orders.reduce<Array<{ title: string; quantity: number; price: number }>>((all, o) => 
          [...all, ...((o.products || []) as Array<{ title: string; quantity: number; price: number }>)], 
          []
        )
      };

      const newOrder = await createOrder(mergedOrder);

      // Update original orders with archive flag
      await Promise.all(orders.map(order => 
        updateOrder(order.id, {
          ...order,
          products: (order.products as Array<{ title: string; quantity: number; price: number }>) || [],
          originalOrders: null,
          archived: true,
          mergeStatus: OrdersMergeStatusOptions.merged,
          mergedWithOrderId: newOrder.data?.id || ''
        })
      ));

      setShowMergeDialog(false);
      setPotentialMerges([]);
      toast.success(translations.mergeSuccess);
    } catch (error) {
      console.error('Error completing merge:', error);
      toast.error(translations.mergeError);
    }
  };

  const handleToggleArchived = () => {
    setFilters(prev => ({ ...prev, archived: !prev.archived }));
  };

  if (isLoading) return <div>Loading...</div>
  if (error) return <div>Error: {error}</div>

  if (!isClient) {
    return null
  }

  return (
    <div className="space-y-8">
      {/* Add MergeNotification */}
      {potentialMerges.length > 0 && (
        <MergeNotification
          orders={potentialMerges}
          onConfirm={handleMergeConfirm}
          onReject={handleMergeReject}
        />
      )}

      {/* Add MergeConfirmationDialog */}
      <MergeConfirmationDialog
        isOpen={showMergeDialog}
        orders={ordersToMerge}
        onClose={() => setShowMergeDialog(false)}
        onConfirm={(orders, resolvedConflicts) => handleMergeComplete(orders, resolvedConflicts)}
        translations={{
          ordersFromSource: translations.ordersFromSource,
          mergeConfirmation: translations.mergeConfirmation,
          mergeDescription: translations.mergeDescription,
          mergedOrderSummary: translations.mergedOrderSummary,
          totalItems: translations.totalItems,
          totalAmount: translations.totalAmount,
          cancel: translations.cancel || 'Cancel',
          confirm: translations.confirm || 'Confirm'
        }}
      />

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
                onRestoreOrder={handleRestoreOrder}
                showRestore={filters.archived}
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
                <MarketplaceSync onSyncComplete={async () => {
                  const result = await getOrders();
                  if (result.data) {
                    setOrders(result.data as OrdersResponse[]);
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
                    onFilterChange={setFilters}
                    onReset={() => setFilters({
                      status: '',
                      mergeStatus: undefined,
                      dateRange: { from: null, to: null },
                      amountRange: { min: 0, max: 0 },
                      archived: false
                    })}
                    statuses={statuses}
                    sources={sources}
                    translations={{
                      filters: translations.filters,
                      status: translations.status,
                      selectStatus: translations.selectStatus,
                      all: translations.all,
                      amountRange: translations.amountRange,
                      resetFilters: translations.resetFilters,
                      dateRange: translations.dateRange,
                      selectDateRange: translations.selectDateRange,
                      mergeStatus: translations.mergeStatus,
                      selectMergeStatus: translations.selectMergeStatus,
                      selectSource: translations.selectSource
                    }}
                    onToggleArchived={handleToggleArchived}
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
                deliveryPostNumber: orderData.deliveryPostNumber,
                mergeStatus: OrdersMergeStatusOptions.none,
                originalOrders: null,
                mergeSource: OrdersMergeSourceOptions.phone,
                productionCost: orderData.productionCost || selectedOrder.productionCost
              };

              const result = await updateOrder(orderId, updatePayload);

              if (result.error) {
                throw new Error(result.error);
              }

              if (result.data) {
                setOrders(prevOrders => 
                  prevOrders.map(o => o.id === orderId ? result.data! : o) as OrdersResponse[]
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
              deliveryPostNumber: orderData.deliveryPostNumber,
              mergeStatus: OrdersMergeStatusOptions.none,
              originalOrders: null,
              mergeSource: OrdersMergeSourceOptions.phone
            };

            const result = await createOrder(formData);
            if (result.error) {
              toast.error("Failed to create order. Please try again.");
              return;
            }
            
            // Update orders list with new order and sort by creation date
            const updatedOrders = [result.data!, ...orders].sort((a, b) => 
              new Date(b.created).getTime() - new Date(a.created).getTime()
            );
            setOrders(updatedOrders as OrdersResponse[]);
            
            // Find status with lowest priority
            const lowestPriorityStatus = statuses.reduce((lowest, current) => 
              (!current.priority || !lowest.priority || current.priority < lowest.priority) ? current : lowest
            );

            // Check for potential merges among unprocessed orders with the same status
            const ordersToCheck = updatedOrders.filter(order => {
              const matchesStatus = order.status === lowestPriorityStatus.id;
              const isUnprocessed = order.mergeStatus === OrdersMergeStatusOptions.none || !order.mergeStatus;
              
              return matchesStatus && isUnprocessed;
            });
            
            const { merges } = findPotentialMerges(ordersToCheck as OrdersResponse[]);
            if (merges.length > 0) {
              setPotentialMerges(merges);
            }

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
    </div>
  )
}
