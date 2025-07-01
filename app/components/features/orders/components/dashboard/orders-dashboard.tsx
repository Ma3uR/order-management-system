"use client"

import { useState, useMemo, useEffect, useRef } from "react"
import { useTranslations } from 'next-intl'
import { Button } from "@/app/components/shared/ui/button"
import { Input } from "@/app/components/shared/ui/input"
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/app/components/shared/ui/table"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
} from "@/app/components/shared/ui/dropdown-menu"
import { Badge } from "@/app/components/shared/ui/badge"
import { Card, CardContent } from "@/app/components/shared/ui/card"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/app/components/shared/ui/select"
import { Slider } from "@/app/components/shared/ui/slider"
import { Switch } from "@/app/components/shared/ui/switch"
import { Label } from "@/app/components/shared/ui/label"
import {
  PlusCircle,
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
  MoreHorizontal,
  Archive,
  Phone,
  MessageSquare,
  Send,
  Eye,
  X,
} from "lucide-react"
import { OrderDetailsModal } from "@/app/components/features/orders/components/dashboard/order-details-modal"
import { updateOrder } from '@/app/[locale]/orders/actions/orders'
import { PotentialMergeNotification } from "@/app/components/features/orders/components/dashboard/potential-merge-notification"
import { ConfirmOrderMergeModal } from "@/app/components/features/orders/components/dashboard/confirm-order-merge-modal"
import { format } from "date-fns"
import { Popover, PopoverTrigger, PopoverContent } from "@/app/components/shared/ui/popover"
import { Calendar } from "@/app/components/shared/ui/calendar"
import { CalendarIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { Stats } from "@/app/components/shared/ui/stats-section"
import { OrdersRecord, OrdersResponse, SourcesResponse, StatusResponse, OrdersMergeStatusOptions, OrdersMergeSourceOptions, Collections } from "@/app/types/pocketbase-types"
import { getOrders, getSettings } from '@/app/[locale]/orders/actions/orders'
import pb from '@/app/lib/pocketbase'
import type { RecordSubscription } from 'pocketbase'
import { toast, Toaster } from 'sonner'
import { detectPotentialMerges, PotentialMerge, DEFAULT_MERGE_CONFIG } from '@/app/lib/mergeDetection'

// Helper function to format currency
const formatCurrency = (amount: number, currencyCode: string) => {
  const validCurrencyCodes = ["USD", "EUR", "UAH"]; // Add more valid codes as needed
  const defaultCurrency = "UAH"; // Fallback to UAH if the currency code is invalid

  const code = validCurrencyCodes.includes(currencyCode) ? currencyCode : defaultCurrency;
  return amount.toLocaleString("uk-UA", { style: "currency", currency: code });
};

// Helper function to get source color
const getSourceColor = (sourceId: string) => {
  const sourceColors: Record<string, string> = {
    '4tvf116a5aitwmb': '#10B981', // Rozetka - Green
    'gfzk8nxfokgu9ku': '#8B5CF6', // Prom.ua - Purple
    'pj9sejm9vqtu8xq': '#6B7280', // Epicentr - Gray
  };
  return sourceColors[sourceId] || '#6B7280'; // Default gray
};

export function OrdersDashboard() {
  const t = useTranslations('Orders')
  const tDashboard = useTranslations('Dashboard')
  const [searchTerm, setSearchTerm] = useState("")
  const [filters, setFilters] = useState({
    status: [] as string[],
    source: [] as string[],
    dateRange: undefined as { from?: Date; to?: Date } | undefined,
    amountRange: [0, 1000] as [number, number],
    showArchived: false,
  })
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 })
  const [sorting, setSorting] = useState<{ id: string; desc: boolean } | undefined>(undefined)
  const [isFiltersSidebarOpen, setIsFiltersSidebarOpen] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<OrdersResponse | null>(null)
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false)
  const [potentialMergeOrders, setPotentialMergeOrders] = useState<OrdersResponse[]>([])
  const [isConfirmMergeModalOpen, setIsConfirmMergeModalOpen] = useState(false)
  const [potentialMerges, setPotentialMerges] = useState<PotentialMerge[]>([])
  const [dismissedMerges, setDismissedMerges] = useState<Set<string>>(new Set())
  const [copyNotification, setCopyNotification] = useState<{
    message: string
    rowId: string
    columnId: string
    key: number
  } | null>(null)
  const [statuses, setStatuses] = useState<StatusResponse[]>([])
  const [sources, setSources] = useState<SourcesResponse[]>([])
  const [orders, setOrders] = useState<OrdersResponse[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Keep track of whether the current user initiated the change
  const userActionRef = useRef<string | null>(null);

  // Declare copyTimeoutId in the component's scope
  const copyTimeoutIdRef = useRef<NodeJS.Timeout | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Function to detect potential merges and update state
  const detectAndUpdateMerges = (ordersList: OrdersResponse[]) => {
    try {
      console.log('🔍 [OrdersDashboard] Running merge detection on orders');
      
      // Only run detection if we have statuses loaded
      if (statuses.length === 0) {
        console.log('🔍 [OrdersDashboard] Skipping merge detection - statuses not loaded yet');
        return;
      }
      
      const detectedMerges = detectPotentialMerges(ordersList, statuses, DEFAULT_MERGE_CONFIG);
      
      // Filter out dismissed merges
      const activeMerges = detectedMerges.filter(merge => {
        const mergeId = merge.orders.map(o => o.id).sort().join('-');
        return !dismissedMerges.has(mergeId);
      });
      
      setPotentialMerges(activeMerges);
      
      // Update the legacy potentialMergeOrders for backward compatibility
      if (activeMerges.length > 0) {
        // Flatten all orders from all merges
        const allMergeOrders = activeMerges.flatMap(merge => merge.orders);
        setPotentialMergeOrders(allMergeOrders);
        
        console.log(`📋 [OrdersDashboard] Found ${activeMerges.length} potential merges involving ${allMergeOrders.length} orders`);
      } else {
        setPotentialMergeOrders([]);
        console.log('✅ [OrdersDashboard] No potential merges detected');
      }
    } catch (error) {
      console.error('❌ [OrdersDashboard] Error during merge detection:', error);
    }
  };

  // Fetch data on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true)
        const settingsResult = await getSettings()
        if (settingsResult.error) throw new Error(settingsResult.error)
        const { statuses, sources } = settingsResult.data || { statuses: [], sources: [] }
        setStatuses(statuses)
        setSources(sources)

        const ordersResult = await getOrders()
        if (ordersResult.error) throw new Error(ordersResult.error)
        const ordersData = ordersResult.data as OrdersResponse[]
        setOrders(ordersData)
        
        // Run merge detection on initial data load
        detectAndUpdateMerges(ordersData)
      } catch (error) {
        setError(error instanceof Error ? error.message : "Failed to fetch data")
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [])

  // Re-run merge detection when statuses are loaded or updated
  useEffect(() => {
    if (statuses.length > 0 && orders.length > 0) {
      console.log('🔍 [OrdersDashboard] Statuses loaded, re-running merge detection');
      detectAndUpdateMerges(orders);
    }
  }, [statuses, orders.length])

  // Real-time subscription effect
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
                setOrders(prev => {
                  const newOrders = prev.filter(o => o.id !== record.id);
                  // Re-run merge detection after order deletion
                  detectAndUpdateMerges(newOrders);
                  return newOrders;
                });
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
                    setOrders(prev => {
                      const newOrders = prev.map(o => o.id === record.id ? updatedOrder : o);
                      // Re-run merge detection after order update
                      detectAndUpdateMerges(newOrders);
                      return newOrders;
                    });
                    toast.info("Order Updated", {
                      description: `Order ${record.orderNumber} was updated by another user`
                    });
                  }
                } catch (error: unknown) {
                  // Ignore autocancelled requests
                  if (error instanceof Error && !error.message?.includes('autocancelled')) {
                    console.error('🔔 Error fetching updated order:', error);
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
                    setOrders(prev => {
                      const newOrders = [newOrder, ...prev];
                      // Re-run merge detection after new order creation
                      detectAndUpdateMerges(newOrders);
                      return newOrders;
                    });
                    toast.info("New Order", {
                      description: `Order ${record.orderNumber} was created`
                    });
                  }
                } catch (error: unknown) {
                  // Ignore autocancelled requests
                  if (error instanceof Error && !error.message?.includes('autocancelled')) {
                    console.error('🔔 Error fetching new order:', error);
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
          console.error('🔔 Error setting up real-time subscription:', error);
        }
      }
    };

    const unsubscribe = setupSubscription();

    return () => {
      isSubscribed = false;
      unsubscribe?.then(unsub => unsub?.());
    };
  }, [])

  // Filter orders based on search and filters
  const filteredOrders = useMemo(() => {
    return orders
      .filter(order => {
        const matchesStatus = filters.status.length === 0 || filters.status.includes(order.status)
        const matchesSource = filters.source.length === 0 || filters.source.includes(order.source || '')
        const matchesText = !searchTerm || 
          order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
          order.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (order.products && JSON.stringify(order.products).toLowerCase().includes(searchTerm.toLowerCase()))
        const matchesArchived = order.archived === filters.showArchived
        
        // Date range filter
        const matchesDateRange = !filters.dateRange || (!filters.dateRange.from && !filters.dateRange.to) || (() => {
          const orderDate = new Date(order.created_at_marketplace || order.created)
          const fromMatch = !filters.dateRange.from || orderDate >= filters.dateRange.from
          const toMatch = !filters.dateRange.to || orderDate <= filters.dateRange.to
          return fromMatch && toMatch
        })()
        
        // Amount range filter
        const matchesAmountRange = order.amount >= filters.amountRange[0] && order.amount <= filters.amountRange[1]
        
        return matchesStatus && matchesSource && matchesText && matchesArchived && matchesDateRange && matchesAmountRange
      })
      .sort((a, b) => new Date(b.created_at_marketplace || b.created).getTime() - new Date(a.created_at_marketplace || a.created).getTime())
  }, [orders, filters, searchTerm])

  // Sort orders based on sorting state
  const sortedOrders = useMemo(() => {
    if (!sorting) return filteredOrders
    return [...filteredOrders].sort((a, b) => {
      let valA: unknown = a[sorting.id as keyof OrdersResponse]
      let valB: unknown = b[sorting.id as keyof OrdersResponse]
      
      // Handle different data types properly
      if (sorting.id === 'created') {
        valA = new Date((a.created_at_marketplace || a.created) as string).getTime()
        valB = new Date((b.created_at_marketplace || b.created) as string).getTime()
      } else if (sorting.id === 'amount') {
        valA = Number(valA) || 0
        valB = Number(valB) || 0
      } else if (typeof valA === 'string' && typeof valB === 'string') {
        valA = valA.toLowerCase()
        valB = valB.toLowerCase()
      }
      
      if ((valA as unknown as number) < (valB as unknown as number)) return sorting.desc ? 1 : -1
      if ((valA as unknown as number) > (valB as unknown as number)) return sorting.desc ? -1 : 1
      return 0
    })
  }, [filteredOrders, sorting])

  // Pagination
  const paginatedOrders = useMemo(() => {
    const start = pagination.pageIndex * pagination.pageSize
    const end = start + pagination.pageSize
    return sortedOrders.slice(start, end)
  }, [sortedOrders, pagination])

  const totalPages = Math.ceil(filteredOrders.length / pagination.pageSize)

  // Quick Stats Calculation
  const totalOrders = orders.length
  const totalAmount = orders.reduce((sum, order) => sum + order.amount, 0)
  const activeOrders = orders.filter(
    order => !statuses.find(s => s.id === order.status)?.name.match(/Delivered|Cancelled|Returned/i) && !order.archived
  ).length

  // Filter statuses based on selected sources
  const filteredStatuses = useMemo(() => {
    if (filters.source.length === 0) {
      // If no source is selected, show all statuses
      return statuses
    }
    
    // Filter statuses to only show those that belong to the selected sources
    return statuses.filter(status => {
      // Check if the status has a source property and if it matches any selected source
      const statusSource = status.source
      if (statusSource) {
        return filters.source.includes(statusSource)
      }
      // If status doesn't have a source (general status), show it
      return true
    })
  }, [statuses, filters.source])

  const activeFilterCount = useMemo(() => {
    let count = 0
    if (filters.status.length > 0) count++
    if (filters.source.length > 0) count++
    if (filters.dateRange?.from || filters.dateRange?.to) count++ // Check if dateRange has values
    if (filters.amountRange[0] !== 0 || filters.amountRange[1] !== 1000) count++
    if (filters.showArchived) count++
    return count
  }, [filters])

  const handleSort = (columnId: string) => {
    if (sorting?.id === columnId) {
      setSorting({ id: columnId, desc: !sorting.desc })
    } else {
      setSorting({ id: columnId, desc: false })
    }
  }

  const handleCreateNewOrder = () => {
    const newOrderTemplate: OrdersResponse = {
      id: "", // Empty string for new orders
      orderNumber: "",
      fullName: "",
      phoneNumber: "",
      status: statuses[0].id,
      amount: 0,
      source: sources[0].id,
      created: new Date().toISOString(),
      deliveryMethod: "Nova Poshta",
      paymentMethod: "Card",
      products: [],
      numberOfItems: 0,
      currency: "w34c15gjkvpsesg",
      archived: false,
      mergeStatus: OrdersMergeStatusOptions.none,
      mergeSource: OrdersMergeSourceOptions.none,
      updated: new Date().toISOString(),
      collectionId: Collections.Orders,
      collectionName: Collections.Orders,
    }
    setSelectedOrder(newOrderTemplate)
    setIsOrderModalOpen(true)
  }

  const handleOpenDetailsModal = (order: OrdersResponse) => {
    setSelectedOrder(order)
    setIsOrderModalOpen(true)
  }

  const handleStatusChange = async (orderId: string, newStatusId: string) => {
    try {
      userActionRef.current = orderId;
      const order = orders.find(o => o.id === orderId);
      if (!order) throw new Error('Order not found');

      // Store previous status for cancellation notification
      const previousStatusId = order.status;

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

      // Prepare update payload
      const updatePayload = {
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

      console.log(`🔄 Updating order ${orderId} status to ${newStatusId} with marketplace sync`);
      
      // Import the marketplace sync function
      const { updateOrderStatusWithSync } = await import('@/app/actions/marketplace-status-sync');
      
      // Update with marketplace sync
      const result = await updateOrderStatusWithSync(orderId, newStatusId, updatePayload);

      if (!result.success) {
        throw new Error(result.error || 'Failed to update order status');
      }

      // Update local state if successful
      setOrders(prevOrders => 
        prevOrders.map(o => o.id === orderId ? result.data! : o) as OrdersResponse[]
      );

      // Check for cancellation notification
      try {
        const { processCancellationNotification } = await import('@/app/lib/services/cancellation-notifications');
        const cancellationResult = await processCancellationNotification(
          orderId,
          previousStatusId,
          newStatusId,
          result.data!
        );

        if (cancellationResult.notificationSent) {
          console.log(`🚫 Cancellation notification sent for order ${order.orderNumber}`);
        } else if (cancellationResult.reason) {
          console.log(`🚫 Cancellation notification skipped for order ${order.orderNumber}: ${cancellationResult.reason}`);
        }

        if (cancellationResult.error) {
          console.warn(`⚠️ Cancellation notification failed for order ${order.orderNumber}:`, cancellationResult.error);
        }
      } catch (cancellationError) {
        console.warn('⚠️ Error processing cancellation notification:', cancellationError);
        // Don't fail the main operation if cancellation notification fails
      }

      // Show appropriate success message
      if (result.error) {
        // Partial success - local update worked but marketplace sync failed
        toast.warning(`Status updated locally, but marketplace sync failed: ${result.error}`);
      } else {
        // Full success
        toast.success("Order status updated and synced to marketplace successfully");
      }
    } catch (error) {
      console.error('❌ Error updating order status:', error);
      toast.error(error instanceof Error ? error.message : "Failed to update order status");
    } finally {
      userActionRef.current = null;
    }
  }

  const handleArchiveOrder = async (orderId: string) => {
    try {
      userActionRef.current = orderId;
      const order = orders.find(o => o.id === orderId);
      if (!order) throw new Error('Order not found');

      const updatePayload = {
        status: order.status,
        source: order.source || '',
        fullName: order.fullName,
        phoneNumber: order.phoneNumber,
        orderNumber: order.orderNumber,
        deliveryMethod: order.deliveryMethod,
        products: (order.products || []) as Array<{ title: string; quantity: number; price: number }>,
        numberOfItems: order.numberOfItems,
        amount: order.amount,
        currency: order.currency,
        paymentMethod: order.paymentMethod,
        notes: order.notes,
        mergeStatus: order.mergeStatus || OrdersMergeStatusOptions.none,
        mergedWithOrderId: order.mergedWithOrderId,
        originalOrders: Array.isArray(order.originalOrders) ? order.originalOrders : null,
        mergeSource: order.mergeSource,
        archived: true, // Archive the order
        productionCost: order.productionCost || 0,
        deliveryPostNumber: order.deliveryPostNumber,
        marketplaceIds: order.marketplaceIds
      };

      console.log(`🗄️ Archiving order ${orderId}`);
      const result = await updateOrder(orderId, updatePayload);

      if (result.error) {
        throw new Error(result.error);
      }

      // Update local state if successful
      setOrders(prevOrders => 
        prevOrders.map(o => o.id === orderId ? result.data! : o) as OrdersResponse[]
      );
      toast.success("Order archived successfully");
    } catch (error) {
      console.error('❌ Error archiving order:', error);
      toast.error(error instanceof Error ? error.message : "Failed to archive order");
    } finally {
      userActionRef.current = null;
    }
  }

  const handleResetFilters = () => {
    setFilters({
      status: [],
      source: [],
      dateRange: undefined, // Ensure this is reset
      amountRange: [0, 1000],
      showArchived: false,
    })
  }

  // Replace existing copyToClipboard function
  const copyToClipboard = (text: string, message: string, rowId: string, columnId: string) => {
    if (copyTimeoutIdRef.current) {
      clearTimeout(copyTimeoutIdRef.current)
    }

    // Fallback function for when clipboard API is not available
    const fallbackCopy = (text: string) => {
      const textArea = document.createElement('textarea')
      textArea.value = text
      textArea.style.position = 'fixed'
      textArea.style.left = '-999999px'
      textArea.style.top = '-999999px'
      document.body.appendChild(textArea)
      textArea.focus()
      textArea.select()
      
      try {
        const successful = document.execCommand('copy')
        document.body.removeChild(textArea)
        return Promise.resolve(successful)
      } catch (err) {
        document.body.removeChild(textArea)
        return Promise.reject(err)
      }
    }

    // Use modern clipboard API if available, otherwise fallback
    const copyPromise = navigator.clipboard && navigator.clipboard.writeText 
      ? navigator.clipboard.writeText(text)
      : fallbackCopy(text)

    copyPromise
      .then(() => {
        setCopyNotification({ message, rowId, columnId, key: Date.now() })
        copyTimeoutIdRef.current = setTimeout(() => {
          setCopyNotification(null)
        }, 2000) // Hide after 2 seconds
      })
      .catch((err) => {
        console.error("Failed to copy:", err)
        setCopyNotification({ message: "Failed to copy!", rowId, columnId, key: Date.now() })
        copyTimeoutIdRef.current = setTimeout(() => {
          setCopyNotification(null)
        }, 2000)
      })
  }

  const handleKeepSeparate = () => {
    // Mark all current potential merges as dismissed
    const newDismissedMerges = new Set(dismissedMerges);
    potentialMerges.forEach(merge => {
      const mergeId = merge.orders.map(o => o.id).sort().join('-');
      newDismissedMerges.add(mergeId);
    });
    
    setDismissedMerges(newDismissedMerges);
    setPotentialMergeOrders([]); // Clear detected merges, effectively dismissing the notification
    setPotentialMerges([]); // Clear the detailed merge data
    
    console.log(`✅ [OrdersDashboard] Dismissed ${potentialMerges.length} potential merges`);
  }

  const handleConfirmMerge = (ordersToMerge: { id: string; orderNumber: string; fullName: string; phoneNumber: string; status: string; amount: number; source: string; created: string }[]) => {
    // TODO: Implement actual merge logic (API call)
    // 1. Create a new merged order.
    // 2. Archive or mark original orders as merged.
    // 3. Update UI (refetch orders or update MOCK_ORDERS).
    console.log(
      "Confirming merge for orders:",
      ordersToMerge.map((o) => o.orderNumber),
    )
    alert(`Merging ${ordersToMerge.length} orders. Implement actual logic.`)
    setPotentialMergeOrders([]) // Clear after attempting merge
    setIsConfirmMergeModalOpen(false)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg">{t('loadingOrders')}</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg text-red-500">{t('loadingFailed')}: {error}</div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen">
      <Toaster richColors />

      {/* Main Content Area */}
      <main className="flex-1 p-4 md:p-6 bg-background">
        <div className="container mx-auto">
          {/* Search and Create Button */}
          <div className="flex items-center gap-4 mb-6">
            <Card className="flex-1">
              <CardContent className="p-0 h-12 flex items-center">
                <div className="relative w-full h-full">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder={t('filterOrdersPlaceholder')}
                    className="w-full h-full pl-10 text-sm border-0 focus-visible:ring-0 focus-visible:ring-offset-0 rounded-md"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>
            <Button onClick={handleCreateNewOrder}>
              <PlusCircle className="mr-2 h-4 w-4" />
              {t('createNewOrder')}
            </Button>
          </div>
          <Stats 
            stats={[
              {
                value: totalOrders.toString(),
                change: "+12%",
                changeType: 'positive',
                label: t('totalOrders')
              },
              {
                value: formatCurrency(totalAmount, "UAH"),
                change: "+8.5%",
                changeType: 'positive',
                label: t('totalAmount')
              },
              {
                value: activeOrders.toString(),
                change: "-2%",
                changeType: 'negative',
                label: t('activeOrders')
              },
              {
                value: Math.round(totalAmount / totalOrders || 0).toString() + " UAH",
                change: "+5%",
                changeType: 'positive',
                label: tDashboard('averageOrderValue.title')
              }
            ]}
          />
          
          {/* Potential Merge Notification */}
          {potentialMergeOrders.length > 0 && (
            <PotentialMergeNotification
              detectedOrdersCount={potentialMergeOrders.length}
              potentialMerges={potentialMerges}
              onKeepSeparateClick={handleKeepSeparate}
            />
          )}
          {/* Table Controls Bar */}
          <div className="mb-4 flex justify-end">
            {/* Custom Filters Sidebar */}
            <div className="relative">
              <Button variant="outline" onClick={() => setIsFiltersSidebarOpen(!isFiltersSidebarOpen)} className="border-border">
                <Filter className="mr-2 h-4 w-4" />
                {t('filters')}
                {activeFilterCount > 0 && (
                  <Badge variant="destructive" className="ml-2 rounded-full px-1.5 py-0.5 text-xs">
                    {activeFilterCount}
                  </Badge>
                )}
              </Button>
              
              {/* Custom Sidebar - No Radix Sheet */}
              {isFiltersSidebarOpen && (
                <>
                  {/* Transparent Backdrop */}
                  <div 
                    className="fixed inset-0 bg-transparent z-[999997]"
                    onClick={() => setIsFiltersSidebarOpen(false)}
                  />
                  
                  {/* Sidebar Content */}
                  <div className="fixed inset-y-0 right-0 h-full w-full sm:max-w-xs bg-white dark:bg-slate-800 shadow-lg z-[999998]">
                    <div className="flex flex-col h-full">
                      <div className="p-6 pb-4">
                        <div className="flex items-center justify-between">
                          <h2 className="text-lg font-semibold">{t('filters')}</h2>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => setIsFiltersSidebarOpen(false)}
                            className="h-6 w-6"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="p-6 space-y-6 overflow-y-auto flex-1">
                        {/* Status Filter */}
                        <div>
                          <Label className="text-sm font-medium">{t('status')}</Label>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="outline" className="w-full justify-between mt-1">
                                <span>
                                  {filters.status.length > 0 ? `${filters.status.length} selected` : t('selectStatus')}
                                </span>
                                <ChevronDown className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="w-[--radix-dropdown-menu-trigger-width] z-[999999]">
                              {filteredStatuses.map((status) => (
                                <DropdownMenuCheckboxItem
                                  key={status.id}
                                  checked={filters.status.includes(status.id)}
                                  onCheckedChange={(checked) => {
                                    setFilters((prev) => ({
                                      ...prev,
                                      status: checked
                                        ? [...prev.status, status.id]
                                        : prev.status.filter((sId) => sId !== status.id),
                                    }))
                                  }}
                                >
                                  <Badge 
                                    className="text-white mr-2 text-xs"
                                    style={{
                                      backgroundColor: status.color,
                                      borderColor: status.color
                                    }}
                                  >
                                    {status.name}
                                  </Badge>
                                </DropdownMenuCheckboxItem>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                        {/* Source Filter */}
                        <div>
                          <Label className="text-sm font-medium">{t('source')}</Label>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="outline" className="w-full justify-between mt-1">
                                <span>
                                  {filters.source.length > 0 ? `${filters.source.length} selected` : t('selectSource')}
                                </span>
                                <ChevronDown className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="w-[--radix-dropdown-menu-trigger-width] z-[999999]">
                              {sources.map((source) => (
                                <DropdownMenuCheckboxItem
                                  key={source.id}
                                  checked={filters.source.includes(source.id)}
                                  onCheckedChange={(checked) => {
                                    setFilters((prev) => {
                                      const newSources = checked
                                        ? [...prev.source, source.id]
                                        : prev.source.filter((sId) => sId !== source.id)
                                      
                                      // Clear status filters that are no longer valid for the new source selection
                                      const validStatuses = statuses.filter(status => {
                                        const statusSource = status.source
                                        if (statusSource) {
                                          return newSources.includes(statusSource)
                                        }
                                        // Keep general statuses (those without a source)
                                        return true
                                      }).map(s => s.id)
                                      
                                      const filteredStatusSelections = prev.status.filter(statusId => 
                                        validStatuses.includes(statusId)
                                      )
                                      
                                      return {
                                        ...prev,
                                        source: newSources,
                                        status: filteredStatusSelections
                                      }
                                    })
                                  }}
                                >
                                  <Badge 
                                    className="text-white mr-2 text-xs"
                                    style={{
                                      backgroundColor: getSourceColor(source.id),
                                      borderColor: getSourceColor(source.id)
                                    }}
                                  >
                                    {source.name}
                                  </Badge>
                                </DropdownMenuCheckboxItem>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>

                        {/* Date Range Filter */}
                        <div>
                          <Label className="text-sm font-medium">{t('dateRange')}</Label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                id="date"
                                variant={"outline"}
                                className={cn(
                                  "w-full justify-start text-left font-normal mt-1",
                                  !filters.dateRange && "text-muted-foreground",
                                )}
                              >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {filters.dateRange?.from ? (
                                  filters.dateRange.to ? (
                                    <>
                                      {format(filters.dateRange.from, "LLL dd, y")} -{" "}
                                      {format(filters.dateRange.to, "LLL dd, y")}
                                    </>
                                  ) : (
                                    format(filters.dateRange.from, "LLL dd, y")
                                  )
                                ) : (
                                  <span>{t('selectDateRange')}</span>
                                )}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0 z-[999999]" align="start">
                              <Calendar
                                initialFocus
                                mode="range"
                                defaultMonth={filters.dateRange?.from}
                                selected={filters.dateRange?.from ? filters.dateRange as { from: Date; to?: Date } : undefined}
                                onSelect={(range) => {
                                  setFilters((prev) => ({ ...prev, dateRange: range || undefined }))
                                }}
                                numberOfMonths={2}
                              />
                            </PopoverContent>
                          </Popover>
                        </div>

                        {/* Amount Range Slider */}
                        <div>
                          <Label className="text-sm font-medium">{t('amountRange')}</Label>
                          <Slider
                            min={0}
                            max={1000} // TODO: Set max dynamically based on data
                            step={10}
                            value={filters.amountRange}
                            onValueChange={(value) =>
                              setFilters((prev) => ({ ...prev, amountRange: value as [number, number] }))
                            }
                            className="mt-2"
                          />
                          <div className="flex justify-between text-xs text-muted-foreground mt-1">
                            <span>{filters.amountRange[0]} UAH</span>
                            <span>{filters.amountRange[1]} UAH</span>
                          </div>
                        </div>
                        {/* Archive Toggle */}
                        <div className="flex items-center justify-between pt-2">
                          <Label htmlFor="show-archived" className="text-sm font-medium">
                            Show Archived Orders
                          </Label>
                          <Switch
                            id="show-archived"
                            checked={filters.showArchived}
                            onCheckedChange={(checked) => setFilters((prev) => ({ ...prev, showArchived: checked }))}
                          />
                        </div>
                      </div>
                      
                      {/* Footer */}
                      <div className="p-6 pt-4 mt-auto">
                        <Button variant="outline" onClick={handleResetFilters} className="w-full">
                          {t('resetFilters')}
                        </Button>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
          {/* Orders Table Area */}
          <div className="bg-card shadow-lg rounded-lg flex flex-col">
            {paginatedOrders.length > 0 ? (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {/* Define Table Columns */}
                        {[
                          { id: "orderNumber", label: t('orderNumber') },
                          { id: "fullName", label: t('fullName') },
                          { id: "phoneNumber", label: t('phoneNumber') },
                          { id: "status", label: t('status') },
                          { id: "amount", label: t('amount') },
                          { id: "source", label: t('source') },
                          { id: "created", label: t('createdAt') }
                        ].map(
                          (col) => (
                            <TableHead
                              key={col.id}
                              onClick={() => handleSort(col.id)}
                              className="cursor-pointer hover:bg-muted"
                            >
                              <div className="flex items-center gap-1">
                                {col.label}
                                {sorting?.id === col.id &&
                                  (sorting.desc ? (
                                    <ChevronDown className="h-4 w-4" />
                                  ) : (
                                    <ChevronUp className="h-4 w-4" />
                                  ))}
                              </div>
                            </TableHead>
                          ),
                        )}
                        <TableHead>{t('actions')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedOrders.map((order) => {
                        const status = statuses.find(s => s.id === order.status)
                        const source = sources.find(s => s.id === order.source)
                        return (
                          <TableRow
                            key={order.id}
                            className="hover:bg-muted cursor-pointer"
                            onClick={(e) => {
                              // Only trigger row copy if the click is not on an interactive element or a specific copyable span
                              const target = e.target as HTMLElement
                              if (
                                target.closest('[data-no-row-click="true"]') ||
                                target.closest('[data-copy-target="true"]')
                              ) {
                                return
                              }
                              copyToClipboard(
                                order.orderNumber,
                                `Order #${order.orderNumber} copied!`,
                                order.id,
                                "orderNumber_row",
                              )
                            }}
                          >
                            <TableCell className="relative">
                              <span
                                data-copy-target="true"
                                className="cursor-pointer hover:underline"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  copyToClipboard(
                                    order.orderNumber,
                                    `#${order.orderNumber} copied!`,
                                    order.id,
                                    "orderNumber",
                                  )
                                }}
                              >
                                #{order.orderNumber}
                              </span>
                              {copyNotification &&
                                copyNotification.rowId === order.id &&
                                (copyNotification.columnId === "orderNumber" ||
                                  copyNotification.columnId === "orderNumber_row") && (
                                  <Badge
                                    key={copyNotification.key}
                                    variant="outline"
                                    className="absolute left-1/2 -translate-x-1/2 top-[-20px] whitespace-nowrap bg-green-100 dark:bg-green-800 dark:text-green-200 text-green-700 text-xs animate-fadeInThenOutQuick"
                                  >
                                    {copyNotification.message}
                                  </Badge>
                                )}
                            </TableCell>
                            <TableCell className="relative">
                              <span
                                data-copy-target="true"
                                className="cursor-pointer hover:underline"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  copyToClipboard(order.fullName, `${order.fullName} copied!`, order.id, "fullName")
                                }}
                              >
                                {order.fullName}
                              </span>
                              {copyNotification &&
                                copyNotification.rowId === order.id &&
                                copyNotification.columnId === "fullName" && (
                                  <Badge
                                    key={copyNotification.key}
                                    variant="outline"
                                    className="absolute left-1/2 -translate-x-1/2 top-[-20px] whitespace-nowrap bg-green-100 dark:bg-green-800 dark:text-green-200 text-green-700 text-xs animate-fadeInThenOutQuick"
                                  >
                                    {copyNotification.message}
                                  </Badge>
                                )}
                            </TableCell>
                            <TableCell className="relative">
                              <div className="flex items-center gap-2" data-no-row-click="true">
                                <span
                                  data-copy-target="true"
                                  className="cursor-pointer hover:underline"
                                  onClick={() => {
                                    copyToClipboard(
                                      order.phoneNumber,
                                      `${order.phoneNumber} copied!`,
                                      order.id,
                                      "phoneNumber",
                                    )
                                  }}
                                >
                                  {order.phoneNumber}
                                </span>
                                {copyNotification &&
                                  copyNotification.rowId === order.id &&
                                  copyNotification.columnId === "phoneNumber" && (
                                    <Badge
                                      key={copyNotification.key}
                                      variant="outline"
                                      className="ml-1 bg-green-100 dark:bg-green-800 dark:text-green-200 text-green-700 text-xs animate-fadeInThenOutQuick"
                                    >
                                      {copyNotification.message}
                                    </Badge>
                                  )}
                                {/* DropdownMenu for phone actions remains the same */}
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-7 w-7">
                                      <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="!z-[999999]">
                                    <DropdownMenuItem
                                      onClick={() => (window.location.href = `tel:${order.phoneNumber}`)}
                                    >
                                      <Phone className="mr-2 h-4 w-4" /> Call
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() =>
                                        window.open(
                                          `viber://chat?number=${order.phoneNumber.replace(/\+/g, "")}`,
                                          "_blank",
                                        )
                                      }
                                    >
                                      <MessageSquare className="mr-2 h-4 w-4" /> Viber
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() =>
                                        window.open(`https://t.me/+${order.phoneNumber.replace(/\+/g, "")}`, "_blank")
                                      }
                                    >
                                      <Send className="mr-2 h-4 w-4" /> Telegram
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </TableCell>
                            <TableCell data-no-row-click="true">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Badge
                                    className="text-white text-xs cursor-pointer hover:brightness-110 hover:shadow-md transition-all"
                                    variant="default"
                                    style={{
                                      backgroundColor: status?.color || '#6b7280',
                                      borderColor: status?.color || '#6b7280'
                                    }}
                                  >
                                    {status?.name || "Unknown"}
                                  </Badge>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent 
                                  align="start" 
                                  side="bottom"
                                  sideOffset={4}
                                  className="!z-[999999]"
                                  avoidCollisions={true}
                                  collisionPadding={10}
                                >
                                  {(() => {
                                    // Get statuses that match the order's source
                                    const sourceSpecificStatuses = statuses.filter(sOpt => {
                                      return sOpt.source === order.source
                                    });
                                    
                                    // If we have source-specific statuses, use only those
                                    if (sourceSpecificStatuses.length > 0) {
                                      return sourceSpecificStatuses;
                                    }
                                    
                                    // Fallback: if no source-specific statuses exist, show general statuses (those without source relation)
                                    return statuses.filter(sOpt => {
                                      return !sOpt.source
                                    });
                                  })().map((sOpt) => (
                                    <DropdownMenuItem
                                      key={sOpt.id}
                                      onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        handleStatusChange(order.id, sOpt.id);
                                      }}
                                      className="cursor-pointer"
                                    >
                                      <Badge 
                                        className="text-white mr-2 text-xs" 
                                        style={{
                                          backgroundColor: sOpt.color,
                                          borderColor: sOpt.color
                                        }}
                                      >
                                        {sOpt.name}
                                      </Badge>
                                    </DropdownMenuItem>
                                  ))}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                            <TableCell>
                              {formatCurrency(order.amount, order.currency)}
                            </TableCell>
                            <TableCell>
                              <Badge
                                className="text-white text-xs"
                                variant="default"
                                style={{
                                  backgroundColor: getSourceColor(source?.id || ''),
                                  borderColor: getSourceColor(source?.id || '')
                                }}
                              >
                                {source?.name || "Unknown"}
                              </Badge>
                            </TableCell>
                            <TableCell>{(() => {
                              const dateValue = order.created_at_marketplace || order.created;
                              const dateObj = new Date(dateValue);
                              console.log(`🔍 Order ${order.orderNumber}:`, {
                                raw: dateValue,
                                dateObj: dateObj.toISOString(),
                                formatted: format(dateObj, "MMM d, yyyy HH:mm:ss")
                              });
                              return format(dateObj, "MMM d, yyyy HH:mm");
                            })()}</TableCell>
                            <TableCell data-no-row-click="true">
                              <div className="flex items-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => handleOpenDetailsModal(order)}
                                >
                                  <Eye className="h-4 w-4" />
                                  <span className="sr-only">Details</span>
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => handleArchiveOrder(order.id)}
                                >
                                  <Archive className="h-4 w-4" />
                                  <span className="sr-only">Archive</span>
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
                {/* Pagination Controls */}
                <div className="p-4 border-t border-border mt-auto">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                      {t('showing')} {pagination.pageIndex * pagination.pageSize + 1}-
                      {Math.min((pagination.pageIndex + 1) * pagination.pageSize, sortedOrders.length)} {t('of')}{" "}
                      {sortedOrders.length} {t('orders')}
                    </div>
                    <div className="flex items-center gap-2">
                      <Select
                        value={String(pagination.pageSize)}
                        onValueChange={(value) =>
                          setPagination((prev) => ({ ...prev, pageSize: Number(value), pageIndex: 0 }))
                        }
                      >
                        <SelectTrigger className="w-[70px] h-8 text-xs">
                          <SelectValue placeholder="Rows" />
                        </SelectTrigger>
                        <SelectContent>
                          {[10, 25, 50, 100].map((size) => (
                            <SelectItem key={size} value={String(size)} className="text-xs">
                              {size}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPagination((p) => ({ ...p, pageIndex: p.pageIndex - 1 }))}
                        disabled={pagination.pageIndex === 0}
                        className="h-8"
                      >
                        {t('previous')}
                      </Button>
                      <span className="text-sm text-muted-foreground">
                        {t('page')} {pagination.pageIndex + 1} {t('of')} {totalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPagination((p) => ({ ...p, pageIndex: p.pageIndex + 1 }))}
                        disabled={pagination.pageIndex >= totalPages - 1}
                        className="h-8"
                      >
                        {t('next')}
                      </Button>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-10">
                <Search className="h-16 w-16 text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold text-foreground mb-2">{t('noOrders')}</h3>
                <p className="text-sm text-muted-foreground">Try adjusting your search or filters.</p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Order Details Modal */}
      {selectedOrder && (
        <OrderDetailsModal
          isOpen={isOrderModalOpen}
          onClose={() => setIsOrderModalOpen(false)}
          order={selectedOrder ? {
            ...selectedOrder,
            source: selectedOrder.source || '',
            archived: selectedOrder.archived || false,
            originalOrders: Array.isArray(selectedOrder.originalOrders) ? selectedOrder.originalOrders : undefined,
            products: (selectedOrder.products as Array<{ title?: string; name?: string; quantity: number; price: number }>).map((p) => ({
              title: p.title || p.name || '',
              quantity: p.quantity || 0,
              price: p.price || 0
            }))
          } : null}
          statusOptions={statuses}
          sources={sources as SourcesResponse[]}
          onSave={async (updatedOrder: OrdersRecord) => {
            const orderId = selectedOrder?.id;
            console.log("🔄 Saving order to database:", updatedOrder)
            try {
              userActionRef.current = orderId;
              
              // Check if status has changed to determine if we need marketplace sync
              const currentOrder = orders.find(o => o.id === orderId) as OrdersResponse;
              const statusChanged = currentOrder && currentOrder.status !== updatedOrder.status;
              
              // Prepare order data using the same pattern as OrdersManagement
              const orderData = {
                orderNumber: updatedOrder.orderNumber,
                status: updatedOrder.status,
                source: updatedOrder.source || '',
                deliveryMethod: updatedOrder.deliveryMethod,
                deliveryPostNumber: updatedOrder.deliveryPostNumber || '',
                phoneNumber: updatedOrder.phoneNumber,
                fullName: updatedOrder.fullName,
                paymentMethod: updatedOrder.paymentMethod,
                products: updatedOrder.products as Array<{ title: string; quantity: number; price: number }>,
                numberOfItems: updatedOrder.numberOfItems,
                amount: updatedOrder.amount,
                currency: updatedOrder.currency,
                notes: updatedOrder.notes || '',
                mergeStatus: updatedOrder.mergeStatus || OrdersMergeStatusOptions.none,
                mergedWithOrderId: updatedOrder.mergedWithOrderId || '',
                originalOrders: Array.isArray(updatedOrder.originalOrders) ? updatedOrder.originalOrders : null,
                mergeSource: updatedOrder.mergeSource || OrdersMergeSourceOptions.none,
                archived: updatedOrder.archived || false,
                productionCost: updatedOrder.productionCost || 0,
                marketplaceIds: updatedOrder.marketplaceIds || ''
              } as const;
              
              console.log(`🔄 Updating order in database with data (status changed: ${statusChanged}):`, orderData)
              
              if (statusChanged) {
                // Status changed - use marketplace sync
                console.log("🔄 Status changed, using marketplace sync");
                const { updateOrderStatusWithSync } = await import('@/app/actions/marketplace-status-sync');
                const result = await updateOrderStatusWithSync(orderId, updatedOrder.status, orderData);
                
                if (!result.success) {
                  throw new Error(result.error || 'Failed to update order');
                }
                
                // Update local state
                setOrders(prevOrders => 
                  prevOrders.map(o => o.id === orderId ? result.data! : o) as OrdersResponse[]
                );
                
                // Show appropriate success message
                if (result.error) {
                  toast.warning(`Order updated locally, but marketplace sync failed: ${result.error}`);
                } else {
                  toast.success("Order updated and synced to marketplace successfully");
                }
              } else {
                // No status change - use regular update
                console.log("🔄 No status change, using regular update");
                const result = await updateOrder(orderId, orderData);
                
                if (result.error) {
                  throw new Error(result.error);
                }
                
                // Update local state
                setOrders(prevOrders => 
                  prevOrders.map(o => o.id === orderId ? result.data! : o) as OrdersResponse[]
                );
                
                toast.success("Order updated successfully");
              }
              
              console.log("✅ Order saved to database successfully")
              
              setIsOrderModalOpen(false)
              console.log("✅ Order modal closed, UI updated")
            } catch (error) {
              console.error("❌ Failed to save order to database:", error)
              throw error // This will be caught by the modal's error handling
            } finally {
              userActionRef.current = null;
            }
          }}
        />
      )}

      {/* Confirm Order Merge Modal */}
      <ConfirmOrderMergeModal
        isOpen={isConfirmMergeModalOpen}
        onClose={() => setIsConfirmMergeModalOpen(false)}
        ordersToMerge={potentialMergeOrders.map(o => ({
          id: o.id,
          orderNumber: o.orderNumber,
          fullName: o.fullName,
          phoneNumber: o.phoneNumber,
          status: o.status,
          amount: o.amount,
          source: o.source || '',
          created: o.created_at_marketplace || o.created,
          products: (o.products as Array<{ title: string; quantity: number; price: number }>) || [],
          numberOfItems: o.numberOfItems || 0,
          currency: o.currency || ''
        }))}
        sources={sources.map(s => ({
          id: s.id,
          name: s.name || '',
          color: s.color
        }))}
        onConfirmMerge={handleConfirmMerge}
      />
    </div>
  )
}
