"use client"

import { useState, useEffect } from "react"
import { Header } from "./header"
import { StatsCard } from "./stats-card"
import { OrdersTable } from "./orders-table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { PlusCircle, Search, ArrowLeft } from 'lucide-react'
import Link from "next/link"
import axios from 'axios'
import pb from '@/lib/pocketbase'
import { Slider } from "@/components/ui/slider"

interface Product {
  name: string;
  quantity: number;
  price: number;
}

interface Order {
  id: string
  orderNumber: string
  source: string
  deliveryMethod?: {
    id: string;
    name: string;
  };
  deliveryPostNumber: string | null
  phoneNumber: string
  fullName: string
  products: Product[]
  numberOfItems: number
  paymentMethod?: {
    id: string;
    name: string;
  };
  amount: number
  status?: {
    id: string;
    name: string;
    color: string;
  };
  currency: {
    id: string;
    code: string;
    symbol: string;
  };
  createdAt: string
  updatedAt: string
  productsText: string
}

interface OrdersManagementProps {
  translations: {
    title: string
    totalAmount: string
    filterOrders: string
    filterOrdersPlaceholder: string
    createNewOrder: string
    orders: string
    orderNumber: string
    fullName: string
    status: string
    amount: string
    createdAt: string
    actions: string
    details: string
    edit: string
    delete: string
    deleteConfirmation: string
    deleteError: string
    orderDetails: string
    source: string
    deliveryMethod: string
    deliveryPostNumber: string
    phoneNumber: string
    products: string
    numberOfItems: string
    paymentMethod: string
    editOrder: string
    selectStatus: string
    updateOrder: string
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
    selectDeliveryMethod: string
    selectPaymentMethod: string
    createNewOrderDescription: string
    backToDashboard: string
  }
  initialOrders: Order[]
}

interface DeliveryMethod {
  id: string;
  name: string;
}

interface PaymentMethod {
  id: string;
  name: string;
}

interface Currency {
  id: string;
  code: string;
  name: string;
  symbol: string;
  isDefault: boolean;
}

interface Status {
  id: string;
  name: string;
  color: string;
  priority: number;
}

function getContrastColor(hexcolor: string): string {
  // Remove the hash if it exists
  const hex = hexcolor.replace('#', '');
  
  // Convert hex to RGB
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  
  // Calculate luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  
  // Return black or white based on luminance
  return luminance > 0.5 ? '#000000' : '#ffffff';
}

interface OrderData {
  orderNumber: string;
  source: string;
  deliveryMethod: string;
  deliveryPostNumber: string;
  phoneNumber: string;
  fullName: string;
  products: Product[];
  numberOfItems: number;
  paymentMethod: string;
  amount: number;
  status: string;
  currency: string;
}

interface FilterOptions {
  status?: string;
  dateRange?: {
    from: Date | null;
    to: Date | null;
  };
  minAmount?: number;
  maxAmount?: number;
}

export function OrdersManagement({ translations, initialOrders }: OrdersManagementProps) {
  const [orders, setOrders] = useState<Order[]>(initialOrders)
  const [isClient, setIsClient] = useState(false)
  const [filterText, setFilterText] = useState("")
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [newOrder, setNewOrder] = useState<Partial<Order>>({
    orderNumber: '',
    source: '',
    deliveryMethod: { id: '', name: '' },
    deliveryPostNumber: '',
    phoneNumber: '',
    fullName: '',
    products: [],
    numberOfItems: 0,
    paymentMethod: { id: '', name: '' },
    amount: 0,
    status: { id: '', name: 'Being processed by manager', color: 'yellow' },
    currency: { id: '', code: '', symbol: '' },
    productsText: '',
  })
  const [deliveryMethods, setDeliveryMethods] = useState<DeliveryMethod[]>([])
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
  const [deliveryMethod, setDeliveryMethod] = useState<string>('')
  const [paymentMethod, setPaymentMethod] = useState<string>('')
  const [defaultCurrency, setDefaultCurrency] = useState<Currency | null>(null)
  const [statuses, setStatuses] = useState<Status[]>([])
  const [editingStatusOrder, setEditingStatusOrder] = useState<Order | null>(null)
  const [filters, setFilters] = useState<FilterOptions>({
    status: undefined,
    dateRange: { from: null, to: null },
    minAmount: undefined,
    maxAmount: undefined
  });

  useEffect(() => {
    let isSubscribed = true;
    const abortController = new AbortController();
    const subscriptions: (() => void)[] = [];

    const fetchData = async () => {
      try {
        if (isSubscribed) {
          setOrders(initialOrders);
          setIsClient(true);
        }

        // Fetch all required data in parallel with abort signal
        const [deliveryMethods, paymentMethods, defaultCurrency, statuses] = await Promise.all([
          pb.collection('delivery_options').getFullList<DeliveryMethod>({ $autoCancel: false }),
          pb.collection('payment_options').getFullList<PaymentMethod>({ $autoCancel: false }),
          pb.collection('currency_options').getFirstListItem<Currency>('isDefault=true', { $autoCancel: false }),
          pb.collection('status_options').getFullList<Status>({ $autoCancel: false })
        ]);

        if (!isSubscribed) return;

        setDeliveryMethods(deliveryMethods);
        setPaymentMethods(paymentMethods);
        setDefaultCurrency(defaultCurrency);
        setStatuses(statuses);

        // Set up realtime subscriptions
        const unsubOrders = await pb.collection('orders').subscribe('*', async (e) => {
          if (!isSubscribed) return;
          
          if (e.action === 'create') {
            try {
              const record = await pb.collection('orders').getOne(e.record.id, {
                expand: 'deliveryMethod,paymentMethod,status,currency',
                $autoCancel: false
              });
              setOrders(prev => [...prev, record as unknown as Order]);
            } catch (error) {
              console.error('Error fetching created order:', error);
            }
          } else if (e.action === 'update') {
            try {
              const record = await pb.collection('orders').getOne(e.record.id, {
                expand: 'deliveryMethod,paymentMethod,status,currency',
                $autoCancel: false
              });
              setOrders(prev => prev.map(order => 
                order.id === record.id ? (record as unknown as Order) : order
              ));
            } catch (error) {
              console.error('Error fetching updated order:', error);
            }
          } else if (e.action === 'delete') {
            setOrders(prev => prev.filter(order => order.id !== e.record.id));
          }
        });
        subscriptions.push(unsubOrders);

        // Subscribe to other collections
        const unsubDelivery = await pb.collection('delivery_options').subscribe('*', (e) => {
          if (!isSubscribed) return;
          if (e.action === 'create') {
            setDeliveryMethods(prev => [...prev, e.record as unknown as DeliveryMethod]);
          } else if (e.action === 'delete') {
            setDeliveryMethods(prev => prev.filter(dm => dm.id !== e.record.id));
          }
        });
        subscriptions.push(unsubDelivery);

        const unsubPayment = await pb.collection('payment_options').subscribe('*', (e) => {
          if (!isSubscribed) return;
          if (e.action === 'create') {
            setPaymentMethods(prev => [...prev, e.record as unknown as PaymentMethod]);
          } else if (e.action === 'delete') {
            setPaymentMethods(prev => prev.filter(pm => pm.id !== e.record.id));
          }
        });
        subscriptions.push(unsubPayment);

        const unsubStatus = await pb.collection('status_options').subscribe('*', (e) => {
          if (!isSubscribed) return;
          if (e.action === 'create' || e.action === 'update') {
            setStatuses(prev => {
              const newStatuses = prev.filter(s => s.id !== e.record.id);
              return [...newStatuses, e.record as unknown as Status].sort((a, b) => a.priority - b.priority);
            });
          } else if (e.action === 'delete') {
            setStatuses(prev => prev.filter(s => s.id !== e.record.id));
          }
        });
        subscriptions.push(unsubStatus);

      } catch (error) {
        if (isSubscribed) {
          console.error('Error fetching data:', error);
        }
      }
    };

    fetchData();

    return () => {
      isSubscribed = false;
      abortController.abort();
      
      // Clean up all subscriptions
      subscriptions.forEach(unsubscribe => {
        try {
          unsubscribe();
        } catch (error) {
          console.error('Error unsubscribing:', error);
        }
      });
    };
  }, [initialOrders]);

  useEffect(() => {
    console.log('Current delivery methods:', deliveryMethods);
    console.log('Current payment methods:', paymentMethods);
  }, [deliveryMethods, paymentMethods]);

  const totalAmount = orders.reduce((sum, order) => sum + order.amount, 0)
  const monthlyData = [4200, 4500, 4800, 4600, 4400, 4700]
  const orderData = [10, 15, 8, 12, 9, 11]
  const customerData = [120, 140, 160, 155, 170, 180]

  const filteredOrders = orders.filter(order => {
    let matches = true;

    // Filter by status
    if (filters.status && order.status?.id !== filters.status) {
      matches = false;
    }

    // Filter by date range
    if (filters.dateRange?.from || filters.dateRange?.to) {
      const orderDate = new Date(order.createdAt);
      if (filters.dateRange.from && orderDate < filters.dateRange.from) {
        matches = false;
      }
      if (filters.dateRange.to && orderDate > filters.dateRange.to) {
        matches = false;
      }
    }

    // Filter by amount range
    if (filters.minAmount && order.amount < filters.minAmount) {
      matches = false;
    }
    if (filters.maxAmount && order.amount > filters.maxAmount) {
      matches = false;
    }

    return matches;
  });

  const translateStatus = (status: string | undefined) => {
    if (!status) return '';
    const statusKey = status.toLowerCase().replace(/ /g, '') as keyof typeof translations.statuses;
    return translations.statuses[statusKey] || status;
  }

  const handleDeleteOrder = async (orderId: string) => {
    if (window.confirm(translations.deleteConfirmation)) {
      try {
        await pb.collection('orders').delete(orderId);
        setOrders(orders.filter(order => order.id !== orderId));
      } catch (error) {
        console.error('Error deleting order:', error);
        alert(translations.deleteError);
      }
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setNewOrder(prev => ({ ...prev, [name]: value }))
  }

  const handleSelectChange = (name: string, value: string) => {
    if (name === 'deliveryMethod') {
      setDeliveryMethod(value);
      const selectedMethod = deliveryMethods.find(method => method.id === value);
      if (selectedMethod) {
        setNewOrder(prev => ({
          ...prev,
          deliveryMethod: { id: selectedMethod.id, name: selectedMethod.name }
        }));
      }
    } else if (name === 'paymentMethod') {
      setPaymentMethod(value);
      const selectedMethod = paymentMethods.find(method => method.id === value);
      if (selectedMethod) {
        setNewOrder(prev => ({
          ...prev,
          paymentMethod: { id: selectedMethod.id, name: selectedMethod.name }
        }));
      }
    }
  };

  const handleProductsTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNewOrder(prev => ({
      ...prev,
      productsText: e.target.value
    }));
  };

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    if (!newOrder.deliveryMethod?.id || 
        !newOrder.paymentMethod?.id || 
        !newOrder.productsText || 
        !statuses[0]?.id) {
      alert('Please fill in all required fields: Delivery Method, Payment Method, Products, and Status');
      return;
    }

    try {
      const orderData: OrderData = {
        orderNumber: newOrder.orderNumber || '',
        source: newOrder.source || '',
        deliveryMethod: newOrder.deliveryMethod.id,  // Now guaranteed to exist
        deliveryPostNumber: newOrder.deliveryPostNumber || '',
        phoneNumber: newOrder.phoneNumber || '',
        fullName: newOrder.fullName || '',
        products: newOrder.productsText.split('\n')  // Parse products immediately
          .filter(line => line.trim())
          .map(line => {
            const [name, quantity = "1", price = "0"] = line.split(',').map(s => s.trim());
            return { name, quantity: parseInt(quantity) || 1, price: parseFloat(price) || 0 };
          }),
        numberOfItems: Number(newOrder.numberOfItems) || 0,
        paymentMethod: newOrder.paymentMethod.id,    // Now guaranteed to exist
        amount: Number(newOrder.amount) || 0,
        status: statuses[0].id,                      // Now guaranteed to exist
        currency: defaultCurrency?.id || ''
      };

      const record = await pb.collection('orders').create(orderData);
      const createdOrder = await pb.collection('orders').getOne(record.id, {
        expand: 'deliveryMethod,paymentMethod,status,currency'
      });

      setOrders([...orders, createdOrder as unknown as Order]);
      setIsCreateModalOpen(false);
      resetNewOrderForm();
    } catch (error) {
      console.error('Error creating order:', error);
      alert('Error creating order: ' + (error as Error).message);
    }
  };

  const resetNewOrderForm = () => {
    setNewOrder({
      orderNumber: '',
      source: '',
      deliveryMethod: { id: '', name: '' },
      deliveryPostNumber: '',
      phoneNumber: '',
      fullName: '',
      products: [],
      numberOfItems: 0,
      paymentMethod: { id: '', name: '' },
      amount: 0,
      status: { id: '', name: 'Being processed by manager', color: 'yellow' },
      currency: { id: '', code: '', symbol: '' },
      productsText: '',
    });
  };

  useEffect(() => {
    const connectRealtime = async () => {
      try {
        await pb.collection('orders').subscribe('*', (e) => {
          if (e.action === 'create') {
            setOrders(prev => [...prev, e.record as unknown as Order]);
          } else if (e.action === 'update') {
            setOrders(prev => prev.map(order => 
              order.id === e.record.id ? (e.record as unknown as Order) : order
            ));
          } else if (e.action === 'delete') {
            setOrders(prev => prev.filter(order => order.id !== e.record.id));
          }
        });
      } catch (error) {
        console.error('Realtime connection error:', error);
        // Try to reconnect after 5 seconds
        setTimeout(connectRealtime, 5000);
      }
    };

    connectRealtime();

    return () => {
      pb.collection('orders').unsubscribe();
    };
  }, []);

  // Add this function to format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Calculate max amount from orders for slider
  const maxPossibleAmount = Math.max(...orders.map(order => order.amount), 5000);

  if (!isClient) {
    return null
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <div className="space-y-4">
        <Header translations={translations} />
        
        <div className="grid gap-4 md:grid-cols-3">
          <StatsCard
            title={translations.totalAmount}
            value={`€${totalAmount.toFixed(2)}`}
            change={{ value: "+1.25%", positive: true }}
            data={orderData}
          />
          <div className="space-y-4">
            <StatsCard
              title="Total Orders"
              value={orders.length.toString()}
              change={{ value: "+2.5%", positive: true }}
              data={orderData}
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
          </div>
          <Card className="bg-background/60 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">Filters</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs font-medium">Status</Label>
                <Select
                  value={filters.status}
                  onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}
                >
                  <SelectTrigger className="w-full bg-background/60">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All</SelectItem>
                    {statuses.map(status => (
                      <SelectItem 
                        key={status.id} 
                        value={status.id}
                        style={{
                          backgroundColor: status.color,
                          color: getContrastColor(status.color)
                        }}
                      >
                        {translateStatus(status.name)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label className="text-xs font-medium">Amount Range</Label>
                  <span className="text-xs text-muted-foreground">
                    {formatCurrency(filters.minAmount || 0)} - {formatCurrency(filters.maxAmount || maxPossibleAmount)}
                  </span>
                </div>
                <Slider
                  min={0}
                  max={maxPossibleAmount}
                  step={100}
                  value={[filters.minAmount || 0, filters.maxAmount || maxPossibleAmount]}
                  onValueChange={([min, max]) => {
                    setFilters(prev => ({
                      ...prev,
                      minAmount: min,
                      maxAmount: max
                    }));
                  }}
                  className="mt-2"
                />
              </div>

              <Button 
                variant="outline" 
                onClick={() => setFilters({
                  status: undefined,
                  dateRange: { from: null, to: null },
                  minAmount: undefined,
                  maxAmount: undefined
                })}
                className="w-full text-xs bg-background/60"
              >
                Reset Filters
              </Button>
            </CardContent>
          </Card>
        </div>

        <OrdersTable
          orders={filteredOrders}
          onViewDetails={(order) => {
            setSelectedOrder(order as unknown as Order)
            setIsDetailsModalOpen(true)
          }}
          onDeleteOrder={handleDeleteOrder}
          translations={translations}
        />
      </div>

      {/* Create Order Modal */}
      {isCreateModalOpen && (
        <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
          <DialogContent className="sm:max-w-[600px] bg-background border-border">
            <DialogHeader>
              <DialogTitle className="text-lg font-semibold leading-none tracking-tight">
                {translations.createNewOrder}
              </DialogTitle>
              <p className="text-sm text-muted-foreground">
                {translations.orderDetails}
              </p>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm">{translations.orderNumber}</Label>
                  <Input
                    name="orderNumber"
                    value={newOrder.orderNumber}
                    onChange={handleInputChange}
                    placeholder={translations.orderNumber}
                    className="bg-background border-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">{translations.source}</Label>
                  <Input
                    name="source"
                    value={newOrder.source}
                    onChange={handleInputChange}
                    placeholder={translations.source}
                    className="bg-background border-input"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm">{translations.deliveryMethod}</Label>
                <Select
                  value={newOrder.deliveryMethod?.id}
                  onValueChange={(value) => {
                    const method = deliveryMethods.find(m => m.id === value);
                    setNewOrder(prev => ({
                      ...prev,
                      deliveryMethod: method
                    }));
                  }}
                >
                  <SelectTrigger className="w-full bg-background border-input">
                    <SelectValue placeholder={translations.selectDeliveryMethod} />
                  </SelectTrigger>
                  <SelectContent>
                    {deliveryMethods.map(method => (
                      <SelectItem 
                        key={method.id} 
                        value={method.id}
                        className="text-foreground"
                      >
                        {method.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm">{translations.deliveryPostNumber}</Label>
                <Input
                  name="deliveryPostNumber"
                  value={newOrder.deliveryPostNumber}
                  onChange={handleInputChange}
                  placeholder={translations.deliveryPostNumber}
                  className="bg-background border-input"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm">{translations.phoneNumber}</Label>
                  <Input
                    name="phoneNumber"
                    value={newOrder.phoneNumber}
                    onChange={handleInputChange}
                    placeholder={translations.phoneNumber}
                    className="bg-background border-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">{translations.fullName}</Label>
                  <Input
                    name="fullName"
                    value={newOrder.fullName}
                    onChange={handleInputChange}
                    placeholder={translations.fullName}
                    className="bg-background border-input"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm">{translations.products}</Label>
                <textarea
                  value={newOrder.productsText || ''}
                  onChange={(e) => setNewOrder(prev => ({ ...prev, productsText: e.target.value }))}
                  placeholder="Product Name 1, 2, 19.99&#10;Product Name 2, 1, 29.99"
                  rows={4}
                  className="w-full min-h-[100px] rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
                <p className="text-xs text-muted-foreground">
                  Enter each product on a new line in format: name, quantity, price
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm">{translations.numberOfItems}</Label>
                  <Input
                    type="number"
                    name="numberOfItems"
                    value={newOrder.numberOfItems}
                    onChange={handleInputChange}
                    min="1"
                    className="bg-background border-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">{translations.paymentMethod}</Label>
                  <Select
                    value={newOrder.paymentMethod?.id}
                    onValueChange={(value) => {
                      const method = paymentMethods.find(m => m.id === value);
                      setNewOrder(prev => ({
                        ...prev,
                        paymentMethod: method
                      }));
                    }}
                  >
                    <SelectTrigger className="w-full bg-background border-input">
                      <SelectValue placeholder={translations.selectPaymentMethod} />
                    </SelectTrigger>
                    <SelectContent>
                      {paymentMethods.map(method => (
                        <SelectItem 
                          key={method.id} 
                          value={method.id}
                          className="text-foreground"
                        >
                          {method.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm">{translations.amount}</Label>
                <Input
                  type="number"
                  name="amount"
                  value={newOrder.amount}
                  onChange={handleInputChange}
                  min="0"
                  step="0.01"
                  className="bg-background border-input"
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                onClick={handleCreateOrder}
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {translations.createNewOrder}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Details Modal */}
      <Dialog open={isDetailsModalOpen} onOpenChange={setIsDetailsModalOpen}>
        <DialogContent className="sm:max-w-[625px] dark:bg-gray-800 dark:border-gray-700">
          <DialogHeader>
            <DialogTitle className="dark:text-white">{translations.orderDetails}</DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <form onSubmit={async (e) => {
              e.preventDefault();
              try {
                const response = await axios.put(`/api/orders/${selectedOrder.id}`, selectedOrder);
                if (response.data) {
                  setOrders(prevOrders => 
                    prevOrders.map(o => o.id === selectedOrder.id ? response.data : o)
                  );
                  setIsDetailsModalOpen(false);
                }
              } catch (error) {
                console.error('Error updating order:', error);
                alert('Error updating order');
              }
            }} 
            className="grid gap-4 py-4"
            >
              <div className="grid grid-cols-2 items-center gap-4">
                <Label>{translations.orderNumber}</Label>
                <Input 
                  value={selectedOrder.orderNumber} 
                  onChange={(e) => setSelectedOrder({
                    ...selectedOrder,
                    orderNumber: e.target.value
                  })}
                  pattern="^[A-Za-z0-9\-]+$"
                  title="Order number can only contain letters, numbers, and hyphens"
                  required
                />
              </div>

              <div className="grid grid-cols-2 items-center gap-4">
                <Label>{translations.fullName}</Label>
                <Input 
                  value={selectedOrder.fullName} 
                  onChange={(e) => setSelectedOrder({
                    ...selectedOrder,
                    fullName: e.target.value
                  })}
                  pattern="^[A-Za-zА-Яа-яІїЇєЄ\s'-]+$"
                  title="Full name can only contain letters, spaces, hyphens, and apostrophes"
                  required
                />
              </div>

              <div className="grid grid-cols-2 items-center gap-4">
                <Label>{translations.status}</Label>
                <Badge 
                  style={{ 
                    backgroundColor: selectedOrder.status?.color?.startsWith('#') 
                      ? selectedOrder.status.color 
                      : '#cbd5e1',
                    color: getContrastColor(selectedOrder.status?.color || '#cbd5e1'),
                    padding: '0.5rem 0.75rem',
                    borderRadius: '0.375rem',
                    cursor: 'pointer'
                  }}
                  onClick={() => setEditingStatusOrder(selectedOrder)}
                >
                  {selectedOrder.status ? translateStatus(selectedOrder.status.name) : ''}
                </Badge>
              </div>

              <div className="grid grid-cols-2 items-center gap-4">
                <Label>{translations.amount}</Label>
                <Input 
                  type="number"
                  value={selectedOrder.amount} 
                  onChange={(e) => setSelectedOrder({
                    ...selectedOrder,
                    amount: parseFloat(e.target.value)
                  })}
                  min="0"
                  step="0.01"
                  required
                />
              </div>

              <div className="grid grid-cols-2 items-center gap-4">
                <Label>{translations.source}</Label>
                <Input 
                  value={selectedOrder.source} 
                  onChange={(e) => setSelectedOrder({
                    ...selectedOrder,
                    source: e.target.value
                  })}
                  required
                />
              </div>

              <div className="grid grid-cols-2 items-center gap-4">
                <Label>{translations.deliveryMethod}</Label>
                <Select
                  value={selectedOrder.deliveryMethod?.id}
                  onValueChange={(value) => {
                    const method = deliveryMethods.find(m => m.id === value);
                    setSelectedOrder({
                      ...selectedOrder,
                      deliveryMethod: method
                    });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue>{selectedOrder.deliveryMethod?.name}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {deliveryMethods.map((method) => {
                      const uniqueKey = `delivery-${method.id}-${method.name}`;
                      return (
                        <SelectItem key={uniqueKey} value={method.id} className="text-black">
                          {method.name}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 items-center gap-4">
                <Label>{translations.phoneNumber}</Label>
                <Input 
                  value={selectedOrder.phoneNumber} 
                  onChange={(e) => setSelectedOrder({
                    ...selectedOrder,
                    phoneNumber: e.target.value
                  })}
                  pattern="^\+?[0-9]{10,15}$"
                  title="Phone number must be between 10 and 15 digits, optionally starting with +"
                  required
                />
              </div>

              <div className="grid grid-cols-2 items-center gap-4">
                <Label>{translations.products}</Label>
                <Textarea 
                  value={typeof selectedOrder.products === 'object' 
                    ? JSON.stringify(selectedOrder.products, null, 2) 
                    : selectedOrder.products
                  } 
                  onChange={(e) => {
                    try {
                      const products = JSON.parse(e.target.value);
                      setSelectedOrder({
                        ...selectedOrder,
                        products
                      });
                    } catch (error) {
                      // Don't update if JSON is invalid
                      console.error('Invalid JSON:', error);
                    }
                  }}
                  required
                />
              </div>

              <div className="grid grid-cols-2 items-center gap-4">
                <Label>{translations.numberOfItems}</Label>
                <Input 
                  type="number"
                  value={selectedOrder.numberOfItems} 
                  onChange={(e) => setSelectedOrder({
                    ...selectedOrder,
                    numberOfItems: parseInt(e.target.value)
                  })}
                  min="1"
                  required
                />
              </div>

              <div className="grid grid-cols-2 items-center gap-4">
                <Label>{translations.paymentMethod}</Label>
                <Select
                  value={selectedOrder.paymentMethod?.id}
                  onValueChange={(value) => {
                    const method = paymentMethods.find(m => m.id === value);
                    setSelectedOrder({
                      ...selectedOrder,
                      paymentMethod: method
                    });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue>{selectedOrder.paymentMethod?.name}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {paymentMethods.map(method => {
                      const uniqueKey = `payment-${method.id}-${method.name}`;
                      return (
                        <SelectItem key={uniqueKey} value={method.id}>
                          {method.name}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 items-center gap-4">
                <Label>{translations.createdAt}</Label>
                <Input value={new Date(selectedOrder.createdAt).toLocaleString()} readOnly />
              </div>

              <DialogFooter>
                <Button type="submit">{translations.updateOrder}</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Status Edit Modal */}
      {editingStatusOrder && (
        <Dialog open={true} onOpenChange={() => setEditingStatusOrder(null)}>
          <DialogContent className="sm:max-w-[425px] dark:bg-gray-800 dark:border-gray-700">
            <DialogHeader>
              <DialogTitle className="dark:text-white">{translations.editOrder}</DialogTitle>
            </DialogHeader>
            <div className="space-y-2">
              <Label htmlFor="status">{translations.status}</Label>
              <Select
                value={editingStatusOrder?.status?.name || ''}
                onValueChange={async (value) => {
                  try {
                    const selectedStatus = statuses.find(s => s.name === value);
                    if (!selectedStatus) return;

                    const response = await axios.put(`/api/orders/${editingStatusOrder.id}`, {
                      statusId: selectedStatus.id
                    });
                    
                    if (response.data) {
                      setOrders(prevOrders => 
                        prevOrders.map(o => 
                          o.id === editingStatusOrder.id ? response.data : o
                        )
                      );
                      setEditingStatusOrder(null);
                    }
                  } catch (error) {
                    console.error('Error updating order:', error);
                    alert('Error updating order');
                  }
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue>
                    {editingStatusOrder?.status ? translateStatus(editingStatusOrder.status.name) : translations.selectStatus}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {statuses.map(status => {
                    const uniqueKey = `status-${status.id}-${status.name}`;
                    return (
                      <SelectItem 
                        key={uniqueKey} 
                        value={status.name}
                        style={{
                          backgroundColor: status.color,
                          color: getContrastColor(status.color)
                        }}
                      >
                        {translateStatus(status.name)}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}

export default OrdersManagement
