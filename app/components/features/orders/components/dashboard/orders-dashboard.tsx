"use client"

import { useState, useMemo, useEffect, useRef } from "react"
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
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/shared/ui/card"
import { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/app/components/shared/ui/sheet"
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
import { OrdersResponse, SourcesResponse, StatusResponse, OrdersMergeStatusOptions, OrdersMergeSourceOptions, Collections } from "@/app/types/pocketbase-types"
import { getOrders, getSettings } from '@/app/[locale]/orders/actions/orders'
import pb from '@/app/lib/pocketbase'
import type { RecordSubscription } from 'pocketbase'
import { toast, Toaster } from 'sonner'

// Helper function to format currency
const formatCurrency = (amount: number, currencyCode: string) => {
  const validCurrencyCodes = ["USD", "EUR", "UAH"]; // Add more valid codes as needed
  const defaultCurrency = "UAH"; // Fallback to UAH if the currency code is invalid

  const code = validCurrencyCodes.includes(currencyCode) ? currencyCode : defaultCurrency;
  return amount.toLocaleString("uk-UA", { style: "currency", currency: code });
};

export function OrdersDashboard() {
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
        setOrders(ordersResult.data as OrdersResponse[])
      } catch (error) {
        setError(error instanceof Error ? error.message : "Failed to fetch data")
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [])

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
                    setOrders(prev => [newOrder, ...prev]);
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
        return matchesStatus && matchesSource && matchesText && matchesArchived
      })
      .sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime())
  }, [orders, filters, searchTerm])

  // Sort orders based on sorting state
  const sortedOrders = useMemo(() => {
    if (!sorting) return filteredOrders
    return [...filteredOrders].sort((a, b) => {
      let valA: unknown = a[sorting.id as keyof OrdersResponse]
      let valB: unknown = b[sorting.id as keyof OrdersResponse]
      
      // Handle different data types properly
      if (sorting.id === 'created') {
        valA = new Date(valA as string).getTime()
        valB = new Date(valB as string).getTime()
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
        status: newStatusId,
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

      console.log(`🔄 Updating order ${orderId} status to ${newStatusId}`);
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
    navigator.clipboard
      .writeText(text)
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

  const handleOpenMergeModal = () => {
    setIsConfirmMergeModalOpen(true)
  }

  const handleKeepSeparate = () => {
    setPotentialMergeOrders([]) // Clear detected merges, effectively dismissing the notification
    // TODO: Potentially mark these orders as "reviewed for merge" in backend to not show again immediately
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
        <div className="text-lg">Loading orders...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg text-red-500">Error: {error}</div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-900/30">
      <Toaster richColors />
      {/* Header Section */}
      <header className="bg-card shadow-sm p-4 md:p-6 sticky top-0 z-40">
        <div className="container mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">Orders Management</h1>
            <Button onClick={handleCreateNewOrder} className="bg-primary hover:bg-primary/90 text-white">
              <PlusCircle className="mr-2 h-5 w-5" />
              Create New Order
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {/* Quick Stats Cards */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalOrders}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Amount</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {totalAmount.toLocaleString("uk-UA", { style: "currency", currency: "UAH" })}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Orders</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{activeOrders}</div>
              </CardContent>
            </Card>
            <Card className="md:col-span-2 lg:col-span-1">
              {" "}
              {/* Search Bar takes remaining space or full on smaller lg */}
              <CardContent className="p-0 h-full flex items-center">
                <div className="relative w-full h-full">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Search by order #, customer, product..."
                    className="w-full h-full pl-10 text-base border-0 focus-visible:ring-0 focus-visible:ring-offset-0 rounded-md"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-auto p-4 md:p-6">
        {" "}
        {/* Changed to overflow-auto */}
        <div className="container mx-auto h-full">
          {" "}
          {/* Removed flex gap-6 */}
          {/* Potential Merge Notification */}
          {potentialMergeOrders.length > 0 && (
            <PotentialMergeNotification
              detectedOrdersCount={potentialMergeOrders.length}
              onMergeClick={handleOpenMergeModal}
              onKeepSeparateClick={handleKeepSeparate}
            />
          )}
          {/* Table Controls Bar */}
          <div className="mb-4 flex justify-end">
            <Sheet open={isFiltersSidebarOpen} onOpenChange={setIsFiltersSidebarOpen}>
              <SheetTrigger asChild>
                <Button variant="outline">
                  <Filter className="mr-2 h-4 w-4" />
                  Filters
                  {activeFilterCount > 0 && (
                    <Badge variant="destructive" className="ml-2 rounded-full px-1.5 py-0.5 text-xs">
                      {activeFilterCount}
                    </Badge>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-full sm:max-w-xs p-0">
                <SheetHeader className="p-6 pb-0">
                  <SheetTitle>Filters</SheetTitle>
                </SheetHeader>
                <div className="p-6 space-y-6 overflow-y-auto h-[calc(100vh-120px)]">
                  {/* Status Filter */}
                  <div>
                    <Label className="text-sm font-medium">Status</Label>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="w-full justify-between mt-1">
                          <span>
                            {filters.status.length > 0 ? `${filters.status.length} selected` : "Select status"}
                          </span>
                          <ChevronDown className="h-4 w-4 opacity-50" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="w-[--radix-dropdown-menu-trigger-width]">
                        {statuses.map((status) => (
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
                            <Badge className={`${status.color} text-white mr-2 text-xs`}>{status.name}</Badge>
                          </DropdownMenuCheckboxItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  {/* Source Filter */}
                  <div>
                    <Label className="text-sm font-medium">Source/Marketplace</Label>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="w-full justify-between mt-1">
                          <span>
                            {filters.source.length > 0 ? `${filters.source.length} selected` : "Select source"}
                          </span>
                          <ChevronDown className="h-4 w-4 opacity-50" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="w-[--radix-dropdown-menu-trigger-width]">
                        {sources.map((source) => (
                          <DropdownMenuCheckboxItem
                            key={source.id}
                            checked={filters.source.includes(source.id)}
                            onCheckedChange={(checked) => {
                              setFilters((prev) => ({
                                ...prev,
                                source: checked
                                  ? [...prev.source, source.id]
                                  : prev.source.filter((sId) => sId !== source.id),
                              }))
                            }}
                          >
                            <Badge className={`${source.color || "bg-gray-500"} text-white mr-2 text-xs`}>
                              {source.name}
                            </Badge>
                          </DropdownMenuCheckboxItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {/* Date Range Filter */}
                  <div>
                    <Label className="text-sm font-medium">Date Range</Label>
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
                            <span>Pick a date range</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
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
                    <Label className="text-sm font-medium">Amount Range</Label>
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
                <SheetFooter className="p-6 pt-0">
                  <Button variant="outline" onClick={handleResetFilters} className="w-full">
                    Reset Filters
                  </Button>
                </SheetFooter>
              </SheetContent>
            </Sheet>
          </div>
          {/* Orders Table Area */}
          <div className="bg-card shadow-lg rounded-lg overflow-hidden flex flex-col">
            {paginatedOrders.length > 0 ? (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {/* Define Table Columns */}
                        {["orderNumber", "fullName", "phoneNumber", "status", "amount", "source", "created"].map(
                          (colId) => (
                            <TableHead
                              key={colId}
                              onClick={() => handleSort(colId)}
                              className="cursor-pointer hover:bg-muted/50"
                            >
                              <div className="flex items-center gap-1">
                                {colId.charAt(0).toUpperCase() + colId.slice(1).replace(/([A-Z])/g, " $1")}{" "}
                                {/* Format title */}
                                {sorting?.id === colId &&
                                  (sorting.desc ? (
                                    <ChevronDown className="h-4 w-4" />
                                  ) : (
                                    <ChevronUp className="h-4 w-4" />
                                  ))}
                              </div>
                            </TableHead>
                          ),
                        )}
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedOrders.map((order) => {
                        const status = statuses.find(s => s.id === order.status)
                        const source = sources.find(s => s.id === order.source)
                        return (
                          <TableRow
                            key={order.id}
                            className="hover:bg-muted/50 cursor-pointer"
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
                                  <DropdownMenuContent align="end">
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
                                    className={`${status?.color || "bg-muted"} text-white text-xs cursor-pointer hover:opacity-80`}
                                    variant="default"
                                  >
                                    {status?.name || "Unknown"}
                                  </Badge>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="start">
                                  {statuses.map((sOpt) => (
                                    <DropdownMenuItem
                                      key={sOpt.id}
                                      onClick={() => handleStatusChange(order.id, sOpt.id)}
                                    >
                                      <Badge className={`${sOpt.color} text-white mr-2 text-xs`}>{sOpt.name}</Badge>
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
                                className={`${source?.color || "bg-muted"} text-white text-xs`}
                                variant="default"
                              >
                                {source?.name || "Unknown"}
                              </Badge>
                            </TableCell>
                            <TableCell>{format(new Date(order.created), "MMM d, yyyy HH:mm")}</TableCell>
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
                      Showing {pagination.pageIndex * pagination.pageSize + 1}-
                      {Math.min((pagination.pageIndex + 1) * pagination.pageSize, sortedOrders.length)} of{" "}
                      {sortedOrders.length} orders
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
                        Previous
                      </Button>
                      <span className="text-sm text-muted-foreground">
                        Page {pagination.pageIndex + 1} of {totalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPagination((p) => ({ ...p, pageIndex: p.pageIndex + 1 }))}
                        disabled={pagination.pageIndex >= totalPages - 1}
                        className="h-8"
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-10">
                <Search className="h-16 w-16 text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold text-foreground mb-2">No Orders Found</h3>
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
          sources={sources.map(s => ({
            id: s.id,
            name: s.name || '',
            color: s.color
          }))}
          onSave={async (updatedOrder) => {
            console.log("🔄 Saving order to database:", updatedOrder)
            try {
              userActionRef.current = updatedOrder.id;
              
              // Prepare order data using the same pattern as OrdersManagement
              const orderData = {
                status: updatedOrder.status,
                orderNumber: updatedOrder.orderNumber,
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
                mergeStatus: (updatedOrder.mergeStatus as OrdersMergeStatusOptions) || OrdersMergeStatusOptions.none,
                mergedWithOrderId: updatedOrder.mergedWithOrderId || '',
                originalOrders: updatedOrder.originalOrders || null,
                mergeSource: (updatedOrder.mergeSource as OrdersMergeSourceOptions) || OrdersMergeSourceOptions.none,
                archived: updatedOrder.archived || false,
                productionCost: updatedOrder.productionCost || 0,
                marketplaceIds: updatedOrder.marketplaceIds || '',
              }
              
              console.log("🔄 Updating order in database with data:", orderData)
              
              // Use server action like in OrdersManagement
              const result = await updateOrder(updatedOrder.id, orderData)
              
              if (result.error) {
                throw new Error(result.error)
              }
              
              console.log("✅ Order saved to database successfully:", result.data)
              
              // Update local state
              setOrders(prevOrders => 
                prevOrders.map(o => o.id === updatedOrder.id ? result.data! : o) as OrdersResponse[]
              );
              
              setIsOrderModalOpen(false)
              console.log("✅ Order modal closed, UI updated")
              
              return result.data
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
          created: o.created,
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
