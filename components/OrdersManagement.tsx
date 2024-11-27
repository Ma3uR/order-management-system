"use client"

import { useState, useEffect } from 'react'
import axios from 'axios'
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { PlusCircle, Search, RefreshCw, ArrowLeft } from "lucide-react"
import Link from "next/link"
import pb from '@/lib/pocketbase'

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

const OrdersManagement: React.FC<OrdersManagementProps> = ({ translations, initialOrders }) => {
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

  useEffect(() => {
    let isSubscribed = true;
    const subscriptions: (() => void)[] = [];

    const fetchData = async () => {
      try {
        // Set initial orders from props and client state
        if (isSubscribed) {
          setOrders(initialOrders);
          setIsClient(true);
        }

        // Fetch all required data in parallel
        const [deliveryMethods, paymentMethods, defaultCurrency, statuses] = await Promise.all([
          pb.collection('delivery_options').getFullList<DeliveryMethod>(),
          pb.collection('payment_options').getFullList<PaymentMethod>(),
          pb.collection('currency_options').getFirstListItem<Currency>('isDefault=true'),
          pb.collection('status_options').getFullList<Status>()
        ]);

        if (!isSubscribed) return;

        setDeliveryMethods(deliveryMethods);
        setPaymentMethods(paymentMethods);
        setDefaultCurrency(defaultCurrency);
        setStatuses(statuses);

        // Set up realtime subscriptions
        const unsubOrders = await pb.collection('orders').subscribe('*', async (e) => {
          if (!isSubscribed) return;
          
          const record = e.action !== 'delete' ? await pb.collection('orders').getOne(e.record.id, {
            expand: 'deliveryMethod,paymentMethod,status,currency'
          }) : null;

          if (e.action === 'create' && record) {
            setOrders(prev => [...prev, record as unknown as Order]);
          } else if (e.action === 'update' && record) {
            setOrders(prev => prev.map(order => 
              order.id === record.id ? (record as unknown as Order) : order
            ));
          } else if (e.action === 'delete') {
            setOrders(prev => prev.filter(order => order.id !== e.record.id));
          }
        });
        subscriptions.push(unsubOrders);

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

  useEffect(() => {
    const fetchDefaultCurrency = async () => {
      try {
        const record = await pb.collection('currency_options').getFirstListItem<Currency>('isDefault=true');
        setDefaultCurrency(record);
      } catch (error) {
        console.error('Error fetching default currency:', error);
      }
    };
    fetchDefaultCurrency();
  }, []);

  useEffect(() => {
    const fetchStatuses = async () => {
      try {
        const records = await pb.collection('status_options').getFullList<Status>();
        setStatuses(records);
      } catch (error) {
        console.error('Error fetching statuses:', error);
      }
    };
    fetchStatuses();
  }, []);

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [deliveryMethods, paymentMethods, defaultCurrency, statuses] = await Promise.all([
          pb.collection('delivery_options').getFullList<DeliveryMethod>(),
          pb.collection('payment_options').getFullList<PaymentMethod>(),
          pb.collection('currency_options').getFirstListItem<Currency>('isDefault=true'),
          pb.collection('status_options').getFullList<Status>()
        ]);

        setDeliveryMethods(deliveryMethods);
        setPaymentMethods(paymentMethods);
        setDefaultCurrency(defaultCurrency);
        setStatuses(statuses);
      } catch (error) {
        console.error('Error fetching initial data:', error);
      }
    };

    fetchInitialData();
  }, []);

  const filteredOrders = orders.filter(order => 
    order.orderNumber.toLowerCase().includes(filterText.toLowerCase()) ||
    order.fullName.toLowerCase().includes(filterText.toLowerCase()) ||
    (order.status?.name?.toLowerCase() || '').includes(filterText.toLowerCase())
  )

  const totalAmount = orders.reduce((sum, order) => sum + order.amount, 0)

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

  const StatusEditDialog = ({ order, onClose }: { order: Order, onClose: () => void }) => (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{translations.editOrder}</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="status">{translations.status}</Label>
          <Select
            value={order.status?.name || ''}
            onValueChange={async (value) => {
              try {
                const selectedStatus = statuses.find(s => s.name === value);
                if (!selectedStatus) return;

                const response = await axios.put(`/api/orders/${order.id}`, {
                  statusId: selectedStatus.id
                });
                
                if (response.data) {
                  setOrders(prevOrders => 
                    prevOrders.map(o => 
                      o.id === order.id ? response.data : o
                    )
                  );
                  onClose();
                }
              } catch (error) {
                console.error('Error updating order:', error);
                alert('Error updating order');
              }
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue>
                {order.status ? translateStatus(order.status.name) : translations.selectStatus}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {statuses.map(status => (
                <SelectItem 
                  key={status.id} 
                  value={status.name}
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
      </DialogContent>
    </Dialog>
  );

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

  if (!isClient) {
    return null // or a loading spinner
  }

  return (
    <div className="min-h-screen bg-white text-black p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">{translations.title}</h1>
        <Link href="/dashboard" passHref>
          <Button variant="outline" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {translations.backToDashboard}
          </Button>
        </Link>
      </div>
      <Tabs defaultValue="orders">
        <TabsList>
          <TabsTrigger value="orders">Orders</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>
        <TabsContent value="orders">
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>{translations.totalAmount}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">
                    {defaultCurrency?.symbol || ''}{totalAmount.toFixed(2)}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>{translations.filterOrders}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex space-x-2">
                    <Input
                      placeholder={translations.filterOrdersPlaceholder}
                      value={filterText}
                      onChange={(e) => setFilterText(e.target.value)}
                      className="flex-grow"
                    />
                    <Button variant="outline" size="icon">
                      <Search className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>{translations.createNewOrder}</CardTitle>
                </CardHeader>
                <CardContent>
                  <Button onClick={() => setIsCreateModalOpen(true)} className="w-full">
                    <PlusCircle className="mr-2 h-4 w-4" /> {translations.createNewOrder}
                  </Button>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle>{translations.orders}</CardTitle>
                <Button variant="outline" size="sm">
                  <RefreshCw className="mr-2 h-4 w-4" /> Refresh
                </Button>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{translations.orderNumber}</TableHead>
                      <TableHead>{translations.fullName}</TableHead>
                      <TableHead>{translations.status}</TableHead>
                      <TableHead>{translations.amount}</TableHead>
                      <TableHead>{translations.createdAt}</TableHead>
                      <TableHead>{translations.actions}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredOrders.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell className="font-medium">{order.orderNumber}</TableCell>
                        <TableCell>{order.fullName}</TableCell>
                        <TableCell>
                          <Badge 
                            style={{ 
                              backgroundColor: order.status?.color?.startsWith('#') 
                                ? order.status.color 
                                : '#cbd5e1',
                              color: getContrastColor(order.status?.color || '#cbd5e1'),
                              padding: '0.5rem 0.75rem',
                              borderRadius: '0.375rem',
                              cursor: 'pointer'
                            }}
                            onClick={() => setEditingStatusOrder(order)}
                          >
                            {order.status ? translateStatus(order.status.name) : ''}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {order.currency.symbol}{order.amount.toFixed(2)}
                        </TableCell>
                        <TableCell>{new Date(order.createdAt).toLocaleString()}</TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button variant="default" size="sm" onClick={() => {
                              setSelectedOrder(order)
                              setIsDetailsModalOpen(true)
                            }}>
                              {translations.details}
                            </Button>
                            <Button variant="default" size="sm" onClick={() => handleDeleteOrder(order.id)}>
                              {translations.delete}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        <TabsContent value="analytics">
          {/* Add analytics content here */}
          <Card>
            <CardHeader>
              <CardTitle>Analytics</CardTitle>
            </CardHeader>
            <CardContent>
              <p>Analytics content goes here...</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Details Modal */}
      <Dialog open={isDetailsModalOpen} onOpenChange={setIsDetailsModalOpen}>
        <DialogContent className="sm:max-w-[625px]">
          <DialogHeader>
            <DialogTitle>{translations.orderDetails}</DialogTitle>
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
                  pattern="^[A-Za-zА-Яа-яіІїЇєЄ\s'-]+$"
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
                    {deliveryMethods.map(method => (
                      <SelectItem key={method.id} value={method.id}>
                        {method.name}
                      </SelectItem>
                    ))}
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
                    {paymentMethods.map(method => (
                      <SelectItem key={method.id} value={method.id}>
                        {method.name}
                      </SelectItem>
                    ))}
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

      {editingStatusOrder && (
        <StatusEditDialog 
          order={editingStatusOrder} 
          onClose={() => setEditingStatusOrder(null)} 
        />
      )}

      {/* Create Order Modal */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="sm:max-w-[625px]" aria-describedby="order-dialog-description">
          <DialogHeader>
            <DialogTitle>{translations.createNewOrder}</DialogTitle>
            <p id="order-dialog-description" className="text-sm text-gray-500">
              {translations.createNewOrderDescription || 'Fill in the order details below'}
            </p>
          </DialogHeader>
          <form onSubmit={handleCreateOrder} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="orderNumber">{translations.orderNumber}</Label>
                <Input
                  id="orderNumber"
                  name="orderNumber"
                  value={newOrder.orderNumber}
                  onChange={handleInputChange}
                  placeholder={translations.orderNumber}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="source">{translations.source}</Label>
                <Input
                  id="source"
                  name="source"
                  value={newOrder.source}
                  onChange={handleInputChange}
                  placeholder={translations.source}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="deliveryMethod">{translations.deliveryMethod}</Label>
              <Select
                value={deliveryMethod}
                onValueChange={(value) => handleSelectChange("deliveryMethod", value)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue>
                    {deliveryMethod 
                      ? deliveryMethods.find(m => m.id === deliveryMethod)?.name 
                      : translations.selectDeliveryMethod}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {deliveryMethods.map((method) => (
                    <SelectItem key={method.id} value={method.id}>
                      {method.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="deliveryPostNumber">{translations.deliveryPostNumber}</Label>
              <Input
                id="deliveryPostNumber"
                name="deliveryPostNumber"
                value={newOrder.deliveryPostNumber || ''}
                onChange={handleInputChange}
                placeholder={translations.deliveryPostNumber}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phoneNumber">{translations.phoneNumber}</Label>
                <Input
                  id="phoneNumber"
                  name="phoneNumber"
                  type="tel"
                  value={newOrder.phoneNumber}
                  onChange={handleInputChange}
                  placeholder={translations.phoneNumber}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fullName">{translations.fullName}</Label>
                <Input
                  id="fullName"
                  name="fullName"
                  value={newOrder.fullName}
                  onChange={handleInputChange}
                  placeholder={translations.fullName}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="productsText">{translations.products}</Label>
              <Textarea
                id="productsText"
                name="productsText"
                value={newOrder.productsText || ''}
                onChange={handleProductsTextChange}
                placeholder={`Product Name 1, 2, 19.99
Product Name 2, 1, 29.99
Product Name 3, 3, 9.99`}
                required
              />
              <p className="text-sm text-gray-500">
                Enter each product on a new line in format: name, quantity, price
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="numberOfItems">{translations.numberOfItems}</Label>
                <Input
                  id="numberOfItems"
                  name="numberOfItems"
                  type="number"
                  value={newOrder.numberOfItems?.toString()}
                  onChange={handleInputChange}
                  placeholder={translations.numberOfItems}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="paymentMethod">{translations.paymentMethod}</Label>
                <Select
                  value={paymentMethod}
                  onValueChange={(value) => handleSelectChange("paymentMethod", value)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue>
                      {paymentMethod 
                        ? paymentMethods.find(m => m.id === paymentMethod)?.name 
                        : translations.selectPaymentMethod}
                      </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {paymentMethods.map((method) => (
                      <SelectItem key={method.id} value={method.id}>
                        {method.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">{translations.amount}</Label>
              <Input
                id="amount"
                name="amount"
                type="number"
                value={newOrder.amount?.toString()}
                onChange={handleInputChange}
                placeholder={translations.amount}
                required
              />
            </div>

            <DialogFooter>
              <Button type="submit">{translations.createNewOrder}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default OrdersManagement
