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
import pb  from '@/lib/pocketbase'
import { Slider } from "@/components/ui/slider"
import { StatusSelect } from "@/components/StatusSelect"
import { cn } from "@/lib/utils"

interface Product {
  name: string;
  quantity: number;
  price: number;
}

interface Order {
  id: string
  orderNumber: string
  source: string
  sourceId?: string
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
  sourceName?: string
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
    selectSource: string
    sourceRequired: string
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

interface Source {
  id: string;
  name: string;
  url?: string;
  created: string;
  updated: string;
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

function getMonthlyStats(orders: Order[]) {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
  const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;

  const currentMonthOrders = orders.filter(order => {
    const orderDate = new Date(order.createdAt);
    return orderDate.getMonth() === currentMonth && orderDate.getFullYear() === currentYear;
  });

  const lastMonthOrders = orders.filter(order => {
    const orderDate = new Date(order.createdAt);
    return orderDate.getMonth() === lastMonth && orderDate.getFullYear() === lastMonthYear;
  });

  const currentMonthAmount = currentMonthOrders.reduce((sum, order) => sum + order.amount, 0);
  const lastMonthAmount = lastMonthOrders.reduce((sum, order) => sum + order.amount, 0);
  
  const amountChange = lastMonthAmount === 0 
    ? 100 
    : ((currentMonthAmount - lastMonthAmount) / lastMonthAmount) * 100;

  const orderCountChange = lastMonthOrders.length === 0 
    ? 100 
    : ((currentMonthOrders.length - lastMonthOrders.length) / lastMonthOrders.length) * 100;

  // Get daily data for the current month's graph
  const dailyAmounts = new Array(31).fill(0);
  const dailyOrders = new Array(31).fill(0);

  currentMonthOrders.forEach(order => {
    const day = new Date(order.createdAt).getDate() - 1;
    dailyAmounts[day] += order.amount;
    dailyOrders[day] += 1;
  });

  // Compress the daily data into 6 points for the graph
  const compressData = (data: number[]) => {
    const result = new Array(6).fill(0);
    const pointSize = Math.ceil(data.length / 6);
    
    for (let i = 0; i < 6; i++) {
      const start = i * pointSize;
      const end = Math.min(start + pointSize, data.length);
      const slice = data.slice(start, end);
      result[i] = slice.reduce((sum, val) => sum + val, 0) / slice.length;
    }
    
    return result;
  };

  return {
    currentMonthAmount,
    amountChange,
    amountChangePositive: amountChange >= 0,
    orderCountChange,
    orderCountChangePositive: orderCountChange >= 0,
    graphDataAmount: compressData(dailyAmounts),
    graphDataOrders: compressData(dailyOrders)
  };
}

interface ProductInput {
  title: string;
  quantity: number;
  price: number;
}

// Add this interface for validation errors
interface ValidationErrors {
  orderNumber?: string;
  source?: string;
  deliveryMethod?: string;
  deliveryPostNumber?: string;
  phoneNumber?: string;
  products?: string;
  paymentMethod?: string;
  fullName?: string;
  submit?: string;
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
    sourceId: '',
    deliveryMethod: { id: '', name: '' },
    deliveryPostNumber: '',
    phoneNumber: '',
    fullName: '',
    products: [],
    paymentMethod: { id: '', name: '' },
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
  const [sources, setSources] = useState<Source[]>([]);
  const [productInputs, setProductInputs] = useState<ProductInput[]>([
    { title: '', quantity: 1, price: 0 }
  ]);
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});

  const fetchSources = async () => {
    try {
      const response = await fetch('/api/sources');
      if (!response.ok) throw new Error('Failed to fetch sources');
      const data = await response.json();
      setSources(data);
    } catch (error) {
      console.error('Error fetching sources:', error);
    }
  };

  useEffect(() => {
    let isSubscribed = true;
    const abortController = new AbortController();
    const subscriptions: (() => void)[] = [];

    const fetchData = async () => {
      try {
        if (isSubscribed) {
          setOrders(initialOrders.map(order => ({
            ...order,
            sourceName: sources.find(s => s.id === order.source)?.name || ''
          })));
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

        // Fetch sources separately
        await fetchSources();

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

        // Subscribe to sources collection
        const unsubSources = await pb.collection('sources').subscribe('*', (e) => {
          if (!isSubscribed) return;
          if (e.action === 'create') {
            setSources(prev => [...prev, e.record as unknown as Source]);
          } else if (e.action === 'delete') {
            setSources(prev => prev.filter(s => s.id !== e.record.id));
          }
        });
        subscriptions.push(unsubSources);

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

  const stats = getMonthlyStats(orders);

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
    const { name, value } = e.target;
    setNewOrder(prev => ({ ...prev, [name]: value }));
    setValidationErrors(prev => ({ ...prev, [name]: undefined }));
  };

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

  // Add validation function
  const validateOrder = (): boolean => {
    const errors: ValidationErrors = {};
    let isValid = true;

    if (!newOrder.orderNumber?.trim()) {
      errors.orderNumber = 'Order number is required';
      isValid = false;
    }

    if (!newOrder.sourceId) {
      errors.source = 'Please select a source';
      isValid = false;
    }

    if (!newOrder.deliveryMethod?.id) {
      errors.deliveryMethod = 'Please select a delivery method';
      isValid = false;
    }

    if (!newOrder.phoneNumber?.match(/^\+?[0-9]{10,15}$/)) {
      errors.phoneNumber = 'Phone number must be between 10 and 15 digits';
      isValid = false;
    }

    if (!newOrder.fullName?.trim()) {
      errors.fullName = 'Full name is required';
      isValid = false;
    }

    if (!productInputs.length || !productInputs.some(p => p.title && p.quantity > 0 && p.price > 0)) {
      errors.products = 'At least one valid product is required';
      isValid = false;
    }

    if (!newOrder.paymentMethod?.id) {
      errors.paymentMethod = 'Please select a payment method';
      isValid = false;
    }

    if (newOrder.deliveryPostNumber) {
      const postNumber = parseInt(newOrder.deliveryPostNumber);
      if (isNaN(postNumber) || !Number.isInteger(postNumber) || postNumber <= 0) {
        errors.deliveryPostNumber = 'Post number must be a positive integer';
        isValid = false;
      }
    }

    setValidationErrors(errors);
    return isValid;
  };

  // Update the handleCreateOrder function
  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Clear any previous validation errors
    setValidationErrors({});
    
    if (!validateOrder()) {
      return;
    }

    try {
      // Calculate totals from product inputs
      const totalItems = productInputs.reduce((sum, p) => sum + p.quantity, 0);
      const totalAmount = productInputs.reduce((sum, p) => sum + (p.quantity * p.price), 0);

      const orderData = {
        orderNumber: newOrder.orderNumber || '',
        source: newOrder.sourceId,
        deliveryMethod: newOrder.deliveryMethod?.id,
        deliveryPostNumber: newOrder.deliveryPostNumber || '',
        phoneNumber: newOrder.phoneNumber || '',
        fullName: newOrder.fullName || '',
        products: productInputs.map(p => ({
          name: p.title,
          quantity: p.quantity,
          price: p.price
        })),
        numberOfItems: totalItems,
        paymentMethod: newOrder.paymentMethod?.id,
        amount: totalAmount,
        status: statuses[0]?.id, // Get default status
        currency: defaultCurrency?.id || ''
      };

      const record = await pb.collection('orders').create(orderData);
      const createdOrder = await pb.collection('orders').getOne(record.id, {
        expand: 'deliveryMethod,paymentMethod,status,currency'
      });

      setOrders([...orders, createdOrder as unknown as Order]);
      setValidationErrors({}); // Clear validation errors on success
      setIsCreateModalOpen(false);
      resetNewOrderForm();
      // Also reset product inputs
      setProductInputs([{ title: '', quantity: 1, price: 0 }]);
    } catch (error) {
      console.error('Error creating order:', error);
      setValidationErrors({
        submit: 'Error creating order: ' + (error as Error).message
      });
    }
  };

  const resetNewOrderForm = () => {
    setNewOrder({
      orderNumber: '',
      source: '',
      sourceId: '',
      deliveryMethod: { id: '', name: '' },
      deliveryPostNumber: '',
      phoneNumber: '',
      fullName: '',
      products: [],
      paymentMethod: { id: '', name: '' },
      status: { id: '', name: 'Being processed by manager', color: 'yellow' },
      currency: { id: '', code: '', symbol: '' },
    });
    setProductInputs([{ title: '', quantity: 1, price: 0 }]);
    setValidationErrors({}); // Clear all validation errors
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

  // Add a debug log when sources state changes
  useEffect(() => {
    console.log('Current sources state:', sources);
  }, [sources]);

  const handleStatusChange = async (orderId: string, statusId: string) => {
    try {
      const response = await axios.put(`/api/orders/${orderId}`, {
        statusId: statusId
      });
      
      if (response.data) {
        setOrders(prevOrders => 
          prevOrders.map(o => 
            o.id === orderId ? response.data : o
          )
        );
      }
    } catch (error) {
      console.error('Error updating order:', error);
      alert('Error updating order');
    }
  };

  const handleProductInputChange = (index: number, field: keyof ProductInput, value: string) => {
    setProductInputs(prev => {
      const updated = [...prev];
      if (field === 'quantity' || field === 'price') {
        updated[index][field] = Math.max(0, Number(value));
      } else {
        updated[index][field] = value;
      }
      return updated;
    });

    // Clear product validation error when user makes changes
    setValidationErrors(prev => ({ ...prev, products: undefined }));

    // Update newOrder with calculated values
    const totalItems = productInputs.reduce((sum, product) => sum + product.quantity, 0);
    const totalAmount = productInputs.reduce((sum, product) => sum + (product.quantity * product.price), 0);
    
    setNewOrder(prev => ({
      ...prev,
      products: productInputs.map(p => ({
        name: p.title,
        quantity: p.quantity,
        price: p.price
      })),
      numberOfItems: totalItems,
      amount: totalAmount
    }));
  };

  const addProductInput = () => {
    setProductInputs(prev => [...prev, { title: '', quantity: 1, price: 0 }]);
  };

  const removeProductInput = (index: number) => {
    if (productInputs.length > 1) {
      setProductInputs(prev => prev.filter((_, i) => i !== index));
    }
  };

  if (!isClient) {
    return null
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <div className="space-y-4">
        <Header translations={translations} />
        
        <div className="grid gap-4 md:grid-cols-3 sm:grid-cols-1">
          <div className="md:col-span-1 col-span-full">
            <StatsCard
              title={translations.totalAmount}
              value={`${orders[0]?.currency?.symbol || '€'}${stats.currentMonthAmount.toFixed(2)}`}
              change={{ 
                value: `${stats.amountChange >= 0 ? '+' : ''}${stats.amountChange.toFixed(1)}%`,
                positive: stats.amountChangePositive 
              }}
              data={stats.graphDataAmount}
            />
          </div>
          <div className="space-y-4 md:col-span-1 col-span-full">
            <StatsCard
              title="Total Orders"
              value={orders.length.toString()}
              change={{ 
                value: `${stats.orderCountChange >= 0 ? '+' : ''}${stats.orderCountChange.toFixed(1)}%`,
                positive: stats.orderCountChangePositive 
              }}
              data={stats.graphDataOrders}
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
          statuses={statuses}
          onStatusChange={handleStatusChange}
          translateStatus={translateStatus}
          getContrastColor={getContrastColor}
        />
      </div>

      {/* Create Order Modal */}
      <Dialog 
        open={isCreateModalOpen} 
        onOpenChange={(open) => {
          setIsCreateModalOpen(open);
          if (!open) {
            resetNewOrderForm();
          }
        }}
      >
        <DialogContent className="sm:max-w-[600px] bg-background border-border max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold leading-none tracking-tight">
              {translations.createNewOrder}
            </DialogTitle>
            <p className="text-sm text-muted-foreground">
              {translations.orderDetails}
            </p>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto pr-2">
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className={cn(validationErrors.orderNumber && "text-destructive")}>
                    {translations.orderNumber}
                  </Label>
                  <div className="space-y-2">
                    <Input
                      name="orderNumber"
                      value={newOrder.orderNumber}
                      onChange={(e) => {
                        handleInputChange(e);
                        setValidationErrors(prev => ({ ...prev, orderNumber: undefined }));
                      }}
                      className={cn(validationErrors.orderNumber && "border-destructive")}
                      placeholder={translations.orderNumber}
                    />
                    {validationErrors.orderNumber && (
                      <p className="text-sm text-destructive">{validationErrors.orderNumber}</p>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className={cn(validationErrors.source && "text-destructive")}>
                    {translations.source}
                  </Label>
                  <div className="space-y-2">
                    <Select
                      value={newOrder.sourceId || ''}
                      onValueChange={(value) => {
                        const selectedSource = sources.find(s => s.id === value);
                        setNewOrder(prev => ({
                          ...prev,
                          sourceId: value,
                          source: selectedSource?.name || ''
                        }));
                        setValidationErrors(prev => ({ ...prev, source: undefined }));
                      }}
                    >
                      <SelectTrigger className={cn(
                        "w-full bg-background/60 border border-input",
                        validationErrors.source && "border-destructive"
                      )}>
                        <SelectValue placeholder={translations.selectSource} />
                      </SelectTrigger>
                      <SelectContent className="bg-background/95 border border-input shadow-md backdrop-blur supports-[backdrop-filter]:bg-background/60 dark:bg-gray-800">
                        {sources.map(source => (
                          <SelectItem
                            key={source.id}
                            value={source.id}
                            className="text-foreground dark:text-white hover:bg-accent focus:bg-accent focus:text-accent-foreground"
                          >
                            {source.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {validationErrors.source && (
                      <p className="text-sm text-destructive">{validationErrors.source}</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label className={cn(validationErrors.deliveryMethod && "text-destructive")}>
                  {translations.deliveryMethod}
                </Label>
                <div className="space-y-2">
                  <Select
                    value={newOrder.deliveryMethod?.id}
                    onValueChange={(value) => {
                      const method = deliveryMethods.find(m => m.id === value);
                      setNewOrder(prev => ({
                        ...prev,
                        deliveryMethod: method
                      }));
                      setValidationErrors(prev => ({ ...prev, deliveryMethod: undefined }));
                    }}
                  >
                    <SelectTrigger className={cn(
                      "w-full bg-background/60 border border-input",
                      validationErrors.deliveryMethod && "border-destructive"
                    )}>
                      <SelectValue placeholder={translations.selectDeliveryMethod} />
                    </SelectTrigger>
                    <SelectContent className="bg-background/95 border border-input shadow-md backdrop-blur supports-[backdrop-filter]:bg-background/60 dark:bg-gray-800">
                      {deliveryMethods.map(method => (
                        <SelectItem 
                          key={method.id} 
                          value={method.id}
                          className="text-foreground dark:text-white hover:bg-accent focus:bg-accent focus:text-accent-foreground"
                        >
                          {method.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {validationErrors.deliveryMethod && (
                    <p className="text-sm text-destructive">{validationErrors.deliveryMethod}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label className={cn(validationErrors.deliveryPostNumber && "text-destructive")}>
                  {translations.deliveryPostNumber}
                </Label>
                <div className="space-y-2">
                  <Input
                    name="deliveryPostNumber"
                    type="number"
                    value={newOrder.deliveryPostNumber || ''}
                    onChange={(e) => {
                      handleInputChange(e);
                      setValidationErrors(prev => ({ ...prev, deliveryPostNumber: undefined }));
                    }}
                    placeholder={translations.deliveryPostNumber}
                    className={cn(
                      "bg-background border-input",
                      validationErrors.deliveryPostNumber && "border-destructive"
                    )}
                    min="1"
                    step="1"
                    onKeyDown={(e) => {
                      // Prevent decimal point and negative numbers
                      if (e.key === '.' || e.key === '-' || e.key === 'e') {
                        e.preventDefault();
                      }
                    }}
                  />
                  {validationErrors.deliveryPostNumber && (
                    <p className="text-sm text-destructive">{validationErrors.deliveryPostNumber}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className={cn(validationErrors.phoneNumber && "text-destructive")}>
                    {translations.phoneNumber}
                  </Label>
                  <div className="space-y-2">
                    <Input
                      name="phoneNumber"
                      value={newOrder.phoneNumber}
                      onChange={handleInputChange}
                      placeholder={translations.phoneNumber}
                      className={cn(
                        "bg-background border-input",
                        validationErrors.phoneNumber && "border-destructive"
                      )}
                    />
                    {validationErrors.phoneNumber && (
                      <p className="text-sm text-destructive">{validationErrors.phoneNumber}</p>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className={cn(validationErrors.fullName && "text-destructive")}>
                    {translations.fullName}
                  </Label>
                  <div className="space-y-2">
                    <Input
                      name="fullName"
                      value={newOrder.fullName}
                      onChange={handleInputChange}
                      placeholder={translations.fullName}
                      className={cn(
                        "bg-background border-input",
                        validationErrors.fullName && "border-destructive"
                      )}
                    />
                    {validationErrors.fullName && (
                      <p className="text-sm text-destructive">{validationErrors.fullName}</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <Label className={cn(validationErrors.products && "text-destructive")}>
                    {translations.products}
                  </Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addProductInput}
                    className="h-8 bg-background/60 border border-input hover:bg-accent flex items-center"
                  >
                    <PlusCircle className="h-4 w-4 mr-2" />
                    Add Product
                  </Button>
                </div>
                
                <div className={cn(
                  "rounded-md border border-border overflow-hidden",
                  validationErrors.products && "border-destructive"
                )}>
                  {/* Table Header */}
                  <div className="grid grid-cols-[2fr,1fr,1fr,auto] gap-2 p-3 bg-muted/30 border-b border-border">
                    <div className="text-sm font-medium text-foreground">Product</div>
                    <div className="text-sm font-medium text-foreground">Quantity</div>
                    <div className="text-sm font-medium text-foreground">Price</div>
                    <div></div>
                  </div>
                  
                  {/* Table Body */}
                  <div className="divide-y divide-border bg-background/40">
                    {productInputs.map((product, index) => (
                      <div key={index} className="grid grid-cols-[2fr,1fr,1fr,auto] gap-2 p-3 items-center hover:bg-muted/20">
                        <Input
                          placeholder="Product name"
                          value={product.title}
                          onChange={(e) => handleProductInputChange(index, 'title', e.target.value)}
                          className="bg-background border-input focus:bg-background"
                        />
                        <Input
                          type="number"
                          min="1"
                          placeholder="Qty"
                          value={product.quantity}
                          onChange={(e) => handleProductInputChange(index, 'quantity', e.target.value)}
                          className="bg-background border-input focus:bg-background"
                        />
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="Price"
                          value={product.price}
                          onChange={(e) => handleProductInputChange(index, 'price', e.target.value)}
                          className="bg-background border-input focus:bg-background"
                        />
                        {productInputs.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeProductInput(index)}
                            className="h-8 w-8 p-0 hover:bg-destructive/20 hover:text-destructive"
                          >
                            ×
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
                {validationErrors.products && (
                  <p className="text-sm text-destructive">{validationErrors.products}</p>
                )}

                {/* Totals */}
                <div className="grid grid-cols-2 gap-4 mt-4 bg-muted/20 p-4 rounded-md border border-border">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-foreground">{translations.numberOfItems}</Label>
                    <Input
                      type="number"
                      value={productInputs.reduce((sum, p) => sum + p.quantity, 0)}
                      readOnly
                      className="bg-background/60 border-input focus:bg-background"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-foreground">{translations.amount}</Label>
                    <Input
                      type="number"
                      value={productInputs.reduce((sum, p) => sum + (p.quantity * p.price), 0)}
                      readOnly
                      className="bg-background/60 border-input focus:bg-background"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label className={cn(validationErrors.paymentMethod && "text-destructive")}>
                  {translations.paymentMethod}
                </Label>
                <div className="space-y-2">
                  <Select
                    value={newOrder.paymentMethod?.id}
                    onValueChange={(value) => {
                      const method = paymentMethods.find(m => m.id === value);
                      setNewOrder(prev => ({
                        ...prev,
                        paymentMethod: method
                      }));
                      setValidationErrors(prev => ({ ...prev, paymentMethod: undefined }));
                    }}
                  >
                    <SelectTrigger className={cn(
                      "w-full bg-background border-input",
                      validationErrors.paymentMethod && "border-destructive"
                    )}>
                      <SelectValue placeholder={translations.selectPaymentMethod} />
                    </SelectTrigger>
                    <SelectContent className="bg-background/95 border border-input shadow-md backdrop-blur supports-[backdrop-filter]:bg-background/60 dark:bg-gray-800">
                      {paymentMethods.map(method => (
                        <SelectItem 
                          key={method.id} 
                          value={method.id}
                          className="text-foreground dark:text-white hover:bg-accent focus:bg-accent focus:text-accent-foreground"
                        >
                          {method.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {validationErrors.paymentMethod && (
                    <p className="text-sm text-destructive">{validationErrors.paymentMethod}</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="flex flex-col gap-4 mt-4 border-t pt-4">
            {validationErrors.submit && (
              <p className="text-sm text-destructive text-center">{validationErrors.submit}</p>
            )}
            <Button 
              type="submit" 
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={handleCreateOrder}
              disabled={!!validationErrors.submit}
            >
              {translations.createNewOrder}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
                  pattern="^[A-Za-zА-Яа-ІїЇєЄ\s'-]+$"
                  title="Full name can only contain letters, spaces, hyphens, and apostrophes"
                  required
                />
              </div>

              <div className="grid grid-cols-2 items-center gap-4">
                <Label>{translations.status}</Label>
                <StatusSelect
                  status={selectedOrder?.status}
                  statuses={statuses}
                  onStatusChange={(statusId) => handleStatusChange(selectedOrder!.id, statusId)}
                  translateStatus={translateStatus}
                  getContrastColor={getContrastColor}
                />
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
                <Select
                  value={selectedOrder.source || ''}
                  onValueChange={(value) => {
                    const selectedSource = sources.find(s => s.id === value);
                    setSelectedOrder({
                      ...selectedOrder,
                      source: value,
                      sourceName: selectedSource?.name || ''
                    });
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={translations.selectSource}>
                      {sources.find(s => s.id === selectedOrder.source)?.name || selectedOrder.sourceName}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="bg-background/95 border border-input shadow-md backdrop-blur supports-[backdrop-filter]:bg-background/60 dark:bg-gray-800">
                    {sources.map(source => (
                      <SelectItem 
                        key={source.id} 
                        value={source.id}
                      >
                        {source.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                  <SelectContent className="bg-background/95 border border-input shadow-md backdrop-blur supports-[backdrop-filter]:bg-background/60 dark:bg-gray-800">
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
                  <SelectContent className="bg-background/95 border border-input shadow-md backdrop-blur supports-[backdrop-filter]:bg-background/60 dark:bg-gray-800">
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
    </div>
  )
}

export default OrdersManagement
