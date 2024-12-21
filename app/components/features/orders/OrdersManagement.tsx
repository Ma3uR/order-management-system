"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/shared/ui/card"
import { Button } from "@/app/components/shared/ui/button"
import { ArrowLeft, PlusCircle } from 'lucide-react'
import Link from "next/link"
import pb, { authenticatedCall, authenticateAdmin } from '@/app/lib/pocketbase'
import { Footer } from "../../layouts/footer"
import { RozetkaSync } from "@/app/components/features/sync/RozetkaSync"
import { OrderStats } from "./components/OrderStats"
import { OrderSearch } from "./components/OrderSearch"
import { OrderFilters, FilterOptions } from "./components/OrderFilters"
import { OrderList } from "./components/OrderList"
import { OrderDetails } from "./components/OrderDetails"
import { OrderCreate } from "./components/OrderCreate"
import { OrderPagination } from "./components/OrderPagination"
import { 
  OrdersResponse, 
  SourcesResponse, 
  StatusOptionsResponse, 
  DeliveryOptionsResponse, 
  PaymentOptionsResponse, 
  CurrencyOptionsResponse 
} from '@/app/types/pocketbase-types'

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
  const [statuses, setStatuses] = useState<StatusOptionsResponse[]>([])
  const [deliveryMethods, setDeliveryMethods] = useState<DeliveryOptionsResponse[]>([])
  const [paymentMethods, setPaymentMethods] = useState<PaymentOptionsResponse[]>([])
  const [defaultCurrency, setDefaultCurrency] = useState<CurrencyOptionsResponse | null>(null)
  const [filters, setFilters] = useState<FilterOptions>({
    status: '',
    dateRange: { from: null, to: null },
    minAmount: undefined,
    maxAmount: undefined
  })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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

    const initializeAdmin = async () => {
      try {
        setIsLoading(true)
        await authenticateAdmin()
        // Continue with your orders fetching logic here
      } catch (err) {
        setError('Failed to authenticate admin')
        console.error('Authentication error:', err)
      } finally {
        setIsLoading(false)
      }
    }

    const fetchData = async () => {
      try {
        const promises = [
          authenticatedCall(() => pb.collection('delivery_options').getFullList<DeliveryOptionsResponse>()),
          authenticatedCall(() => pb.collection('payment_options').getFullList<PaymentOptionsResponse>()),
          authenticatedCall(async () => {
            const currencies = await pb.collection('currency_options').getFullList<CurrencyOptionsResponse>();
            return currencies.find(c => c.isDefault) || currencies[0] || { code: 'UAH', symbol: '₴', isDefault: true };
          }),
          authenticatedCall(() => pb.collection('status_options').getFullList<StatusOptionsResponse>()),
          authenticatedCall(() => pb.collection('sources').getFullList<SourcesResponse>())
        ];

        const results = await Promise.allSettled(promises);
        
        if (!isSubscribed) return;

        results.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            switch(index) {
              case 0:
                setDeliveryMethods(result.value as DeliveryOptionsResponse[]);
                break;
              case 1:
                setPaymentMethods(result.value as PaymentOptionsResponse[]);
                break;
              case 2:
                setDefaultCurrency(result.value as CurrencyOptionsResponse);
                break;
              case 3:
                setStatuses(result.value as StatusOptionsResponse[]);
                break;
              case 4:
                const sourcesData = result.value as SourcesResponse[];
                if (sourcesData.length === 0) {
                  setSources([{
                    id: 'default',
                    name: 'Default',
                    color: '#CBD5E1',
                    created: new Date().toISOString(),
                    updated: new Date().toISOString(),
                    collectionId: 'sources',
                    collectionName: 'sources'
                  } as SourcesResponse]);
                } else {
                  setSources(sourcesData);
                }
                break;
            }
          } else {
            console.error(`Error fetching data for index ${index}:`, result.reason);
            // Set default values for failed fetches
            switch(index) {
              case 0:
                setDeliveryMethods([]);
                break;
              case 1:
                setPaymentMethods([]);
                break;
              case 2:
                setDefaultCurrency(null);
                break;
              case 3:
                setStatuses([]);
                break;
              case 4:
                setSources([{
                  id: 'default',
                  name: 'Default',
                  color: '#CBD5E1',
                  created: new Date().toISOString(),
                  updated: new Date().toISOString(),
                  collectionId: 'sources',
                  collectionName: 'sources'
                } as SourcesResponse]);
                break;
            }
          }
        });

        setIsClient(true);
      } catch (error) {
        console.error('Error in fetchData:', error);
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
        setIsClient(true);
      }
    };

    initializeAdmin()
    fetchData();

    return () => {
      isSubscribed = false;
    };
  }, []);

  // Filter orders based on search and filters
  const filteredOrders = orders.filter(order => {
    let matches = true;

    if (debouncedFilterText) {
      const searchTerm = debouncedFilterText.toLowerCase();
      const expandedSource = (order.expand as { source?: SourcesResponse })?.source;
      matches = order.orderNumber.toLowerCase().includes(searchTerm) ||
        order.fullName.toLowerCase().includes(searchTerm) ||
        order.phoneNumber.toLowerCase().includes(searchTerm) ||
        order.deliveryPostNumber?.toLowerCase().includes(searchTerm) ||
        expandedSource?.name?.toLowerCase().includes(searchTerm) ||
        (Array.isArray(order.products) && (order.products as { name: string }[]).some(product => 
          product.name.toLowerCase().includes(searchTerm)
        ));
    }

    if (filters.status && order.status !== filters.status) {
      matches = false;
    }

    if (filters.minAmount && order.amount < filters.minAmount) {
      matches = false;
    }

    if (filters.maxAmount && order.amount > filters.maxAmount) {
      matches = false;
    }

    return matches;
  });

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
    <div className="flex flex-col min-h-screen">
      <main className="flex-1 container mx-auto p-4 md:p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Link href="/dashboard" className="flex items-center text-sm">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="mr-2 h-4 w-4" />
                {translations.backToDashboard}
              </Button>
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <RozetkaSync onSyncComplete={() => {
              authenticatedCall(() => 
                pb.collection('orders').getFullList({
                  sort: '-created',
                  expand: 'deliveryMethod,paymentMethod,status,currency,source'
                })
              ).then(records => {
                setOrders(records as OrdersResponse[]);
              });
            }} />
          </div>
        </div>

        <OrderStats 
          orders={orders as (OrdersResponse & { expand?: { currency?: CurrencyOptionsResponse }})[]} 
          translations={translations} 
        />

        <Card 
          className="bg-background/60 backdrop-blur supports-[backdrop-filter]:bg-background/60 hover:bg-accent/50 transition-colors cursor-pointer" 
          onClick={() => setIsCreateModalOpen(true)}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {translations.createNewOrder}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center py-2">
              <PlusCircle className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center space-x-2 mb-4">
          <OrderSearch
            value={filterText}
            onChange={setFilterText}
            placeholder={translations.filterOrdersPlaceholder}
          />
        </div>

        <OrderFilters
          filters={filters}
          onFiltersChange={setFilters}
          statuses={statuses}
          translations={translations}
          maxAmount={Math.max(...orders.map(order => order.amount), 5000)}
          translateStatus={(status) => status}
        />

        <OrderList
          orders={currentOrders}
          onViewDetails={(order) => {
            setSelectedOrder(order);
            setIsDetailsModalOpen(true);
          }}
          onDeleteOrder={async (orderId) => {
            await authenticatedCall(() => pb.collection('orders').delete(orderId));
            setOrders(prevOrders => prevOrders.filter(o => o.id !== orderId));
          }}
          onStatusChange={async (orderId, statusId) => {
            const updated = await authenticatedCall(() => 
              pb.collection('orders').update<OrdersResponse>(orderId, { status: statusId })
            );
            setOrders(prevOrders => prevOrders.map(o => o.id === orderId ? updated : o));
          }}
          translations={translations}
          statuses={statuses}
          translateStatus={(status) => status}
        />

        {filteredOrders.length > 0 && (
          <OrderPagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            startIndex={startIndex}
            endIndex={endIndex}
            totalItems={filteredOrders.length}
            translations={translations}
          />
        )}

        <OrderDetails
          isOpen={isDetailsModalOpen}
          onClose={() => setIsDetailsModalOpen(false)}
          order={selectedOrder}
          onUpdate={async (orderId, orderData) => {
            const updated = await authenticatedCall(() => 
              pb.collection('orders').update<OrdersResponse>(orderId, orderData)
            );
            setOrders(prevOrders => 
              prevOrders.map(o => o.id === orderId ? updated : o)
            );
            setIsDetailsModalOpen(false);
          }}
          onStatusChange={async (orderId, statusId) => {
            const updated = await authenticatedCall(() => 
              pb.collection('orders').update<OrdersResponse>(orderId, { status: statusId })
            );
            setOrders(prevOrders => prevOrders.map(o => o.id === orderId ? updated : o));
          }}
          translations={translations}
          translateStatus={(status) => status}
        />

        <OrderCreate
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onSubmit={async (orderData) => {
            const newOrder = await authenticatedCall(() => 
              pb.collection('orders').create<OrdersResponse>(orderData)
            );
            setOrders(prev => [...prev, newOrder]);
            setIsCreateModalOpen(false);
          }}
          translations={translations}
          deliveryMethods={deliveryMethods}
          paymentMethods={paymentMethods}
          sources={sources}
          defaultCurrency={defaultCurrency}
        />
      </main>
      <Footer />
    </div>
  )
}
