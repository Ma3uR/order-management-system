"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/shared/ui/card"
import { PlusCircle, Search, ChevronRight, ChevronLeft, FilterIcon } from 'lucide-react'
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/app/components/shared/ui/dialog"

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
    active?: string
    archived?: string
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
    apply?: string
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
  const [pageSize, setPageSize] = useState(itemsPerPage)
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
  // Add mobile filter dialog state
  const [showMobileFilters, setShowMobileFilters] = useState(false);

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
          status: orderToArchive.status,
          source: orderToArchive.source || '',
          fullName: orderToArchive.fullName,
          phoneNumber: orderToArchive.phoneNumber,
          orderNumber: orderToArchive.orderNumber,
          deliveryMethod: orderToArchive.deliveryMethod,
          products: (orderToArchive.products || []) as Array<{ title: string; quantity: number; price: number }>,
          numberOfItems: orderToArchive.numberOfItems,
          amount: orderToArchive.amount,
          currency: orderToArchive.currency,
          paymentMethod: orderToArchive.paymentMethod,
          notes: orderToArchive.notes,
          mergeStatus: orderToArchive.mergeStatus,
          mergedWithOrderId: orderToArchive.mergedWithOrderId,
          originalOrders: null,
          mergeSource: orderToArchive.mergeSource,
          archived: true,
          productionCost: orderToArchive.productionCost,
          deliveryPostNumber: orderToArchive.deliveryPostNumber,
          marketplaceIds: orderToArchive.marketplaceIds
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
          status: orderToRestore.status,
          source: orderToRestore.source || '',
          fullName: orderToRestore.fullName,
          phoneNumber: orderToRestore.phoneNumber,
          orderNumber: orderToRestore.orderNumber,
          deliveryMethod: orderToRestore.deliveryMethod,
          products: (orderToRestore.products || []) as Array<{ title: string; quantity: number; price: number }>,
          numberOfItems: orderToRestore.numberOfItems,
          amount: orderToRestore.amount,
          currency: orderToRestore.currency,
          paymentMethod: orderToRestore.paymentMethod,
          notes: orderToRestore.notes,
          mergeStatus: orderToRestore.mergeStatus,
          mergedWithOrderId: orderToRestore.mergedWithOrderId,
          originalOrders: null,
          mergeSource: orderToRestore.mergeSource,
          archived: false,
          productionCost: orderToRestore.productionCost,
          deliveryPostNumber: orderToRestore.deliveryPostNumber,
          marketplaceIds: orderToRestore.marketplaceIds
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
          marketplaceCode = status.marketplace_code;
          marketplaceUpdateFn = () => setEpicentrStatus(order.orderNumber, marketplaceCode!);
          break;
        case 'gfzk8nxfokgu9ku': // PromUa
          marketplaceCode = status.marketplace_code;
          marketplaceUpdateFn = () => setPromuaStatus(order.orderNumber, marketplaceCode!);
          break;
        case '4tvf116a5aitwmb': // Rozetka
          marketplaceCode = status.marketplace_code;
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
        status: statusId,
        source: order.source || '',
        fullName: order.fullName,
        phoneNumber: order.phoneNumber,
        orderNumber: order.orderNumber,
        deliveryMethod: order.deliveryMethod,
        products: validProducts,
        numberOfItems: validProducts.reduce((sum, p) => sum + p.quantity, 0),
        amount: validProducts.reduce((sum, p) => sum + (p.quantity * p.price), 0),
        currency: order.currency,
        paymentMethod: order.paymentMethod,
        notes: order.notes,
        mergeStatus: order.mergeStatus || OrdersMergeStatusOptions.none,
        mergedWithOrderId: order.mergedWithOrderId,
        originalOrders: Array.isArray(order.originalOrders) ? order.originalOrders : null,
        mergeSource: order.mergeSource,
        archived: order.archived,
        productionCost: order.productionCost || 0,
        deliveryPostNumber: order.deliveryPostNumber,
        marketplaceIds: order.marketplaceIds
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
  const totalPages = Math.ceil(filteredOrders.length / pageSize)
  const startIndex = (currentPage - 1) * pageSize
  const endIndex = startIndex + pageSize
  const currentOrders = filteredOrders.slice(startIndex, endIndex)

  // Handler for page size change
  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setCurrentPage(1); // Reset to first page when changing page size
  };

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
      await Promise.all(orders.map(order => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { invoice_data, ...orderData } = order;
        return updateOrder(order.id, {
          ...orderData,
          source: order.source || '',
          products: (order.products || []) as Array<{ title: string; quantity: number; price: number }>,
          originalOrders: (order.originalOrders || []) as string[],
          mergeStatus: OrdersMergeStatusOptions.rejected
        });
      }))
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
      
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { invoice_data: _primaryInvoice, ...primaryOrderDataClean } = primaryOrderData;
      const mergedOrder = {
        ...primaryOrderDataClean,  // Now contains all fields except ID and invoice_data
        source: primaryOrderData.source || '',
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
      await Promise.all(orders.map(order => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { invoice_data, ...orderData } = order;
        return updateOrder(order.id, {
          ...orderData,
          source: order.source || '',
          products: (order.products as Array<{ title: string; quantity: number; price: number }>) || [],
          originalOrders: null,
          archived: true,
          mergeStatus: OrdersMergeStatusOptions.merged,
          mergedWithOrderId: newOrder.data?.id || ''
        });
      }));

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
    <div className="space-y-4 sm:space-y-6">
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

      {/* Mobile Filters Dialog */}
      <Dialog 
        open={showMobileFilters} 
        onOpenChange={setShowMobileFilters} 
      >
        <DialogContent 
          className="fixed inset-x-0 bottom-0 top-auto rounded-t-lg rounded-b-none max-h-[90vh] sm:max-w-[425px] sm:rounded-lg sm:bottom-auto sm:top-auto sm:inset-x-auto overflow-hidden border border-border"
        >
          <DialogHeader className="pb-2 border-b">
            <DialogTitle>{translations.filters}</DialogTitle>
          </DialogHeader>
          <ScrollArea className="p-4 max-h-[60vh] sm:max-h-[70vh] overflow-y-auto">
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
              isMobile={true}
            />
          </ScrollArea>
          <div className="flex justify-end gap-2 pt-4 border-t mt-2 px-4 pb-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowMobileFilters(false)}>
              {translations.cancel || 'Cancel'}
            </Button>
            <Button
              size="sm" 
              onClick={() => setShowMobileFilters(false)}>
              {translations.apply || 'Apply'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      
      <Toaster richColors />

      <div className={cn(
        "flex flex-col md:flex-row gap-4 md:gap-6 p-0 md:p-1",
        pageSize <= 10 ? "min-h-[70vh]" : ""
      )}>
        {/* Main Orders List Card - Full width on mobile, 75% on desktop */}
        <Card className={cn(
          "transition-all duration-300 ease-in-out w-full flex flex-col",
          !isCollapsed && "md:flex-[3]"
        )}>
          <CardHeader className="px-3 py-3 md:p-6 flex-shrink-0">
            <CardTitle className="text-lg md:text-xl mb-2 md:mb-4">{translations.title}</CardTitle>
            
            {/* Mobile Actions - shown only on mobile */}
            <div className="flex gap-2 mb-3 md:hidden">
              <Button 
                className="flex-1"
                size="sm"
                onClick={() => setIsCreateModalOpen(true)}
              >
                <PlusCircle className="mr-2 h-4 w-4" />
                {translations.createNewOrder}
              </Button>
              
              <Button
                className="flex-1"
                size="sm"
                variant="outline"
                onClick={() => setFilters(prev => ({ ...prev, archived: !prev.archived }))}
              >
                {filters.archived ? translations.active || 'Active' : translations.archived || 'Archived'}
              </Button>
            </div>
            
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={translations.filterOrdersPlaceholder}
                  value={filterText}
                  onChange={(e) => setFilterText(e.target.value)}
                  className="pl-8 text-sm h-9"
                />
              </div>
              <Button 
                variant="outline" 
                size="icon" 
                className="h-9 w-9 md:hidden"
                onClick={() => setShowMobileFilters(true)}
              >
                <FilterIcon className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="px-2 sm:px-4 md:px-6 pb-4 flex-grow">
            {/* Single scrollable container without nesting */}
            <div className={cn(
              "w-full",
              pageSize <= 10 ? "max-h-[calc(100vh-20rem)] overflow-auto" : ""
            )}>
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
            </div>
            
            {filteredOrders.length > 0 && (
              <div className="mt-4">
                <OrderPagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                  startIndex={startIndex}
                  endIndex={Math.min(endIndex, filteredOrders.length)}
                  totalItems={filteredOrders.length}
                  translations={translations}
                  pageSize={pageSize}
                  onPageSizeChange={handlePageSizeChange}
                  pageSizeOptions={[10, 20, 50, 100]}
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Sidebar Card - Hidden on mobile, 25% width on desktop */}
        <div className="relative hidden md:flex">
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
            "transition-all duration-300 ease-in-out flex flex-col",
            isCollapsed ? "w-0 opacity-0 overflow-hidden" : "w-80 opacity-100"
          )}>
            <CardHeader className="flex-shrink-0">
              <CardTitle>{translations.actionsAndStatistics}</CardTitle>
            </CardHeader> 
            <CardContent className="flex flex-col flex-grow pb-4">
              <div className="flex flex-col h-full">
                <Button 
                  className="w-full hover:bg-accent"
                  size="lg"
                  variant="ghost"
                  onClick={() => setIsCreateModalOpen(true)}
                >
                  <PlusCircle className="mr-2 h-4 w-4" />
                  {translations.createNewOrder}
                </Button>

                <Separator className="my-4" />

                <OrderStats 
                  orders={orders as (OrdersResponse & { expand?: { currency?: CurrencyResponse }})[]} 
                  translations={translations} 
                />

                <Separator className="my-4" />

                <div className={cn(
                  "pr-2",
                  pageSize <= 10 ? "max-h-[calc(100vh-32rem)] overflow-auto" : ""
                )}>
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
                </div>
                
                <Separator className="my-4" />
                
                <div className="mt-auto">
                  <MarketplaceSync onSyncComplete={async () => {
                    const result = await getOrders();
                    if (result.data) {
                      setOrders(result.data as OrdersResponse[]);
                    }
                  }} />
                </div>
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
                source: orderData.source || selectedOrder.source || '',
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
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { invoice_data, ...orderDataClean } = orderData;
            const formData: OrderFormData = {
              ...orderDataClean,
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
