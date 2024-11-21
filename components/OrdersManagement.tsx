"use client"

import { useState, useEffect, useCallback } from 'react'
import axios from 'axios'
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
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
  products: Record<string, unknown>
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
  currency?: {
    id: string;
    code: string;
    symbol: string;
  };
  createdAt: string
  updatedAt: string
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

const OrdersManagement: React.FC<OrdersManagementProps> = ({ translations, initialOrders }) => {
  const [orders, setOrders] = useState<Order[]>([])
  const [isClient, setIsClient] = useState(false)
  const [filterText, setFilterText] = useState("")
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [newOrder, setNewOrder] = useState<Partial<Order>>({
    orderNumber: '',
    source: '',
    deliveryMethod: { id: '', name: '' },
    deliveryPostNumber: '',
    phoneNumber: '',
    fullName: '',
    products: {},
    numberOfItems: 0,
    paymentMethod: { id: '', name: '' },
    amount: 0,
    status: { id: '', name: 'Being processed by manager', color: 'yellow' },
  })
  const [deliveryMethods, setDeliveryMethods] = useState<DeliveryMethod[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [deliveryMethod, setDeliveryMethod] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>('');

  const fetchDeliveryMethods = useCallback(async () => {
    try {
      const response = await axios.get('/api/delivery-methods');
      setDeliveryMethods(response.data);
    } catch (error) {
      console.error('Error fetching delivery methods:', error);
    }
  }, []);

  const fetchPaymentMethods = useCallback(async () => {
    try {
      const response = await axios.get('/api/payment-methods');
      setPaymentMethods(response.data);
    } catch (error) {
      console.error('Error fetching payment methods:', error);
    }
  }, []);

  useEffect(() => {
    setOrders(initialOrders);
    setIsClient(true);
    fetchDeliveryMethods();
    fetchPaymentMethods();
  }, [initialOrders, fetchDeliveryMethods, fetchPaymentMethods]);

  useEffect(() => {
    console.log('Current delivery methods:', deliveryMethods);
    console.log('Current payment methods:', paymentMethods);
  }, [deliveryMethods, paymentMethods]);

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

  const handleEditOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Submitting edit form...', selectedOrder);
    
    if (!selectedOrder?.id || selectedOrder.id === 'null') {
      console.error('Invalid order ID:', selectedOrder?.id);
      return;
    }

    try {
      const orderId = selectedOrder.status?.id || selectedOrder.id;
      console.log('Sending update request for order:', orderId);
      
      const response = await axios.put(`/api/orders/${orderId}`, {
        status: {
          name: selectedOrder.status?.name || 'Being processed by manager'
        }
      });
      
      console.log('Update response:', response.data);
      
      if (response.data) {
        setOrders(prevOrders => 
          prevOrders.map(order => 
            order.id === orderId ? response.data : order
          )
        );
        setIsEditModalOpen(false);
      }
    } catch (error) {
      console.error('Error updating order:', error);
      alert('Error updating order');
    }
  };

  const handleDeleteOrder = async (orderId: string) => {
    if (window.confirm(translations.deleteConfirmation)) {
      try {
        await axios.delete(`/api/orders/${orderId}`)
        setOrders(orders.filter(order => order.id !== orderId))
      } catch (error) {
        console.error('Error deleting order:', error)
        alert(translations.deleteError)
      }
    }
  }

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

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const response = await axios.post('/api/orders', newOrder)
      const createdOrder = response.data
      setOrders([...orders, createdOrder])
      setIsCreateModalOpen(false)
      resetNewOrderForm()
    } catch (error) {
      console.error('Error creating order:', error)
      if (axios.isAxiosError(error) && error.response?.data?.error) {
        alert(`Error creating order: ${error.response.data.error}`);
      } else {
        alert('Error creating order');
      }
    }
  }

  const resetNewOrderForm = () => {
    setNewOrder({
      orderNumber: '',
      source: '',
      deliveryMethod: { id: '', name: '' },
      deliveryPostNumber: '',
      phoneNumber: '',
      fullName: '',
      products: {},
      numberOfItems: 0,
      paymentMethod: { id: '', name: '' },
      amount: 0,
      status: { id: '', name: 'Being processed by manager', color: 'yellow' },
    });
  };

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
                  <p className="text-2xl font-bold">${totalAmount.toFixed(2)}</p>
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
                            variant={
                              order.status && order.status.name === 'Delivered' 
                                ? 'default' 
                                : 'secondary'
                            }
                          >
                            {order.status ? translateStatus(order.status.name) : ''}
                          </Badge>
                        </TableCell>
                        <TableCell>${order.amount.toFixed(2)}</TableCell>
                        <TableCell>{new Date(order.createdAt).toLocaleString()}</TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button variant="default" size="sm" onClick={() => {
                              setSelectedOrder(order)
                              setIsDetailsModalOpen(true)
                            }}>
                              {translations.details}
                            </Button>
                            <Button 
                              variant="default" 
                              size="sm" 
                              onClick={() => {
                                console.log('Original order:', order);
                                const orderToEdit = {
                                  ...order,
                                  id: order.id,
                                  deliveryMethod: {
                                    id: order.deliveryMethod?.id || '',
                                    name: order.deliveryMethod?.name || ''
                                  },
                                  paymentMethod: {
                                    id: order.paymentMethod?.id || '',
                                    name: order.paymentMethod?.name || ''
                                  },
                                  status: {
                                    id: order.status?.id || '',
                                    name: order.status?.name || 'Being processed by manager',
                                    color: order.status?.color || ''
                                  }
                                };
                                console.log('Setting selected order:', orderToEdit);
                                setSelectedOrder(orderToEdit);
                                setIsEditModalOpen(true);
                              }}
                            >
                              {translations.edit}
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
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 items-center gap-4">
                <Label>{translations.orderNumber}</Label>
                <Input value={selectedOrder.orderNumber} readOnly />
              </div>
              <div className="grid grid-cols-2 items-center gap-4">
                <Label>{translations.fullName}</Label>
                <Input value={selectedOrder.fullName} readOnly />
              </div>
              <div className="grid grid-cols-2 items-center gap-4">
                <Label>{translations.status}</Label>
                <Badge 
                  variant={
                    selectedOrder.status?.name === 'Delivered' 
                      ? 'default' 
                      : 'secondary'
                  }
                >
                  {selectedOrder.status ? translateStatus(selectedOrder.status.name) : ''}
                </Badge>
              </div>
              <div className="grid grid-cols-2 items-center gap-4">
                <Label>{translations.amount}</Label>
                <Input value={`$${selectedOrder.amount.toFixed(2)}`} readOnly />
              </div>
              <div className="grid grid-cols-2 items-center gap-4">
                <Label>{translations.source}</Label>
                <Input value={selectedOrder.source} readOnly />
              </div>
              <div className="grid grid-cols-2 items-center gap-4">
                <Label>{translations.deliveryMethod}</Label>
                <Input value={selectedOrder.deliveryMethod?.name || ''} readOnly />
              </div>
              <div className="grid grid-cols-2 items-center gap-4">
                <Label>{translations.phoneNumber}</Label>
                <Input value={selectedOrder.phoneNumber} readOnly />
              </div>
              <div className="grid grid-cols-2 items-center gap-4">
                <Label>{translations.products}</Label>
                <Textarea 
                  value={typeof selectedOrder.products === 'object' 
                    ? JSON.stringify(selectedOrder.products, null, 2) 
                    : selectedOrder.products} 
                  readOnly 
                />
              </div>
              <div className="grid grid-cols-2 items-center gap-4">
                <Label>{translations.numberOfItems}</Label>
                <Input value={selectedOrder.numberOfItems.toString()} readOnly />
              </div>
              <div className="grid grid-cols-2 items-center gap-4">
                <Label>{translations.paymentMethod}</Label>
                <Input value={selectedOrder.paymentMethod?.name || ''} readOnly />
              </div>
              <div className="grid grid-cols-2 items-center gap-4">
                <Label>{translations.createdAt}</Label>
                <Input value={new Date(selectedOrder.createdAt).toLocaleString()} readOnly />
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Order Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{translations.editOrder}</DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                handleEditOrder(e);
              }} 
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label htmlFor="status">{translations.status}</Label>
                <Select
                  value={selectedOrder.status?.name || ''}
                  onValueChange={(value) => {
                    console.log('Selected new status:', value);
                    setSelectedOrder(prev => {
                      if (!prev) return null;
                      return {
                        ...prev,
                        status: {
                          id: prev.status?.id || '',
                          name: value,
                          color: prev.status?.color || ''
                        }
                      };
                    });
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue>
                      {selectedOrder.status ? translateStatus(selectedOrder.status.name) : translations.selectStatus}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Being processed by manager">
                      {translations.statuses.beingProcessed}
                    </SelectItem>
                    <SelectItem value="Shipped">
                      {translations.statuses.shipped}
                    </SelectItem>
                    <SelectItem value="Delivered">
                      {translations.statuses.delivered}
                    </SelectItem>
                    <SelectItem value="Cancelled">
                      {translations.statuses.cancelled}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button 
                type="submit" 
                className="w-full"
              >
                {translations.updateOrder}
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Order Modal */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="sm:max-w-[625px] bg-white">
          <DialogHeader>
            <DialogTitle>{translations.createNewOrder}</DialogTitle>
            <DialogDescription>
              {translations.createNewOrderDescription}
            </DialogDescription>
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
              <Label htmlFor="products">{translations.products}</Label>
              <Textarea
                id="products"
                name="products"
                value={typeof newOrder.products === 'string' 
                  ? newOrder.products 
                  : JSON.stringify(newOrder.products, null, 2)}
                onChange={(e) => {
                  try {
                    const parsed = JSON.parse(e.target.value);
                    setNewOrder(prev => ({ ...prev, products: parsed }));
                  } catch {
                    setNewOrder(prev => ({ ...prev, products: {} }));
                  }
                }}
                placeholder={`${translations.products} (JSON format)`}
                required
              />
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
