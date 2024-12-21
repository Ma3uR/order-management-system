"use client"

import { useState, useEffect } from "react"
import { useTranslations } from 'next-intl';
import { Header } from "./header"
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card"
import { Button } from "@/app/components/ui/button"
import { ArrowLeft, PlusCircle } from 'lucide-react'
import Link from "next/link"
import pb from '@/app/lib/pocketbase'
import { Footer } from "./footer"
import { RozetkaSync } from "@/app/components/RozetkaSync"
import { OrderStats } from "./orders/OrderStats"
import { OrderSearch } from "./orders/OrderSearch"
import { OrderFilters, FilterOptions } from "./orders/OrderFilters"
import { OrderList } from "./orders/OrderList"
import { OrderDetails } from "./orders/OrderDetails"
import { OrderCreate } from "./orders/OrderCreate"
import { OrderPagination } from "./orders/OrderPagination"
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
        const promises = [
          pb.collection('delivery_options').getFullList<DeliveryOptionsResponse>(),
          pb.collection('payment_options').getFullList<PaymentOptionsResponse>(),
          pb.collection('currency_options').getFirstListItem<CurrencyOptionsResponse>('isDefault=true'),
          pb.collection('status_options').getFullList<StatusOptionsResponse>(),
          pb.collection('sources').getFullList<SourcesResponse>()
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
                setSources(result.value as SourcesResponse[]);
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
                setSources([]);
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
        setSources([]);
        setIsClient(true);
      }
    };

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
              pb.collection('orders').getFullList({
                sort: '-created',
                expand: 'deliveryMethod,paymentMethod,status,currency,source'
              }).then(records => {
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
            await pb.collection('orders').delete(orderId);
            setOrders(prevOrders => prevOrders.filter(o => o.id !== orderId));
          }}
          onStatusChange={async (orderId, statusId) => {
            const updated = await pb.collection('orders').update<OrdersResponse>(orderId, { status: statusId });
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
            const updated = await pb.collection('orders').update<OrdersResponse>(orderId, orderData);
            setOrders(prevOrders => 
              prevOrders.map(o => o.id === orderId ? updated : o)
            );
            setIsDetailsModalOpen(false);
          }}
          onStatusChange={async (orderId, statusId) => {
            const updated = await pb.collection('orders').update<OrdersResponse>(orderId, { status: statusId });
            setOrders(prevOrders => prevOrders.map(o => o.id === orderId ? updated : o));
          }}
          translations={translations}
          translateStatus={(status) => status}
        />

        <OrderCreate
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onSubmit={async (orderData) => {
            const newOrder = await pb.collection('orders').create<OrdersResponse>(orderData);
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
