"use client"

import { useState, useEffect } from 'react'
import axios from 'axios'
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PlusCircle, Search, RefreshCw, ArrowLeft } from "lucide-react"
import Link from "next/link"

interface Order {
  id: number
  orderNumber: string
  source: string
  deliveryMethod: string
  deliveryPostNumber: string | null
  phoneNumber: string
  fullName: string
  products: string
  numberOfItems: number
  paymentMethod: string
  amount: number
  status: string
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
    selectDeliveryMethod: string;
    selectPaymentMethod: string;
    createNewOrderDescription: string; // Add this line
    backToDashboard: string; // Add this line
  }
  initialOrders: Order[]
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
    deliveryMethod: '',
    deliveryPostNumber: '',
    phoneNumber: '',
    fullName: '',
    products: '',
    numberOfItems: 0,
    paymentMethod: '',
    amount: 0,
    status: 'Being processed by manager',
  })

  useEffect(() => {
    setOrders(initialOrders)
    setIsClient(true)
  }, [initialOrders])

  const filteredOrders = orders.filter(order => 
    order.orderNumber.toLowerCase().includes(filterText.toLowerCase()) ||
    order.fullName.toLowerCase().includes(filterText.toLowerCase()) ||
    order.status.toLowerCase().includes(filterText.toLowerCase())
  )

  const totalAmount = orders.reduce((sum, order) => sum + order.amount, 0)

  const translateStatus = (status: string) => {
    const statusKey = status.toLowerCase().replace(/ /g, '') as keyof typeof translations.statuses
    return translations.statuses[statusKey] || status
  }

  const handleEditOrder = async (e: React.FormEvent) => {
    e.preventDefault()
    if (selectedOrder) {
      try {
        await axios.put(`/api/orders/${selectedOrder.id}`, selectedOrder)
        setOrders(orders.map(order => order.id === selectedOrder.id ? selectedOrder : order))
        setIsEditModalOpen(false)
      } catch (error) {
        console.error('Error updating order:', error)
        alert('Error updating order')
      }
    }
  }

  const handleDeleteOrder = async (orderId: number) => {
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
    setNewOrder(prev => ({ ...prev, [name]: value }))
  }

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
      alert('Error creating order')
    }
  }

  const resetNewOrderForm = () => {
    setNewOrder({
      orderNumber: '',
      source: '',
      deliveryMethod: '',
      deliveryPostNumber: '',
      phoneNumber: '',
      fullName: '',
      products: '',
      numberOfItems: 0,
      paymentMethod: '',
      amount: 0,
      status: 'Being processed by manager',
    })
  }

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
      <Tabs defaultValue="orders" className="space-y-4">
        <TabsList>
          <TabsTrigger value="orders">Orders</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>
        <TabsContent value="orders" className="space-y-4">
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
                        <Badge variant={order.status === 'Delivered' ? 'default' : 'secondary'}>
                          {translateStatus(order.status)}
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
                          <Button variant="default" size="sm" onClick={() => {
                            setSelectedOrder(order)
                            setIsEditModalOpen(true)
                          }}>
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
                <Badge variant={selectedOrder.status === 'Delivered' ? 'default' : 'secondary'}>
                  {translateStatus(selectedOrder.status)}
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
                <Input value={selectedOrder.deliveryMethod} readOnly />
              </div>
              <div className="grid grid-cols-2 items-center gap-4">
                <Label>{translations.phoneNumber}</Label>
                <Input value={selectedOrder.phoneNumber} readOnly />
              </div>
              <div className="grid grid-cols-2 items-center gap-4">
                <Label>{translations.products}</Label>
                <Textarea value={selectedOrder.products} readOnly />
              </div>
              <div className="grid grid-cols-2 items-center gap-4">
                <Label>{translations.numberOfItems}</Label>
                <Input value={selectedOrder.numberOfItems.toString()} readOnly />
              </div>
              <div className="grid grid-cols-2 items-center gap-4">
                <Label>{translations.paymentMethod}</Label>
                <Input value={selectedOrder.paymentMethod} readOnly />
              </div>
              <div className="grid grid-cols-2 items-center gap-4">
                <Label>{translations.createdAt}</Label>
                <Input value={new Date(selectedOrder.createdAt).toLocaleString()} readOnly />
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{translations.editOrder}</DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <form onSubmit={handleEditOrder} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="status">{translations.status}</Label>
                <Select
                  value={selectedOrder.status}
                  onValueChange={(value: string) => setSelectedOrder({ ...selectedOrder, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={translations.selectStatus || 'Select Status'} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Being processed by manager">{translations.statuses.beingProcessed}</SelectItem>
                    <SelectItem value="Shipped">{translations.statuses.shipped}</SelectItem>
                    <SelectItem value="Delivered">{translations.statuses.delivered}</SelectItem>
                    <SelectItem value="Cancelled">{translations.statuses.cancelled}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" className="w-full">{translations.updateOrder}</Button>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Order Modal */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="sm:max-w-[625px]">
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
                name="deliveryMethod"
                value={newOrder.deliveryMethod}
                onValueChange={(value: string) => handleSelectChange("deliveryMethod", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={translations.selectDeliveryMethod || 'Select Delivery Method'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Ukrposhta">{translations.deliveryMethods.ukrposhta}</SelectItem>
                  <SelectItem value="Nova Poshta">{translations.deliveryMethods.novaPoshta}</SelectItem>
                  <SelectItem value="Parcel Locker">{translations.deliveryMethods.parcelLocker}</SelectItem>
                  <SelectItem value="Rozetka">{translations.deliveryMethods.rozetka}</SelectItem>
                  <SelectItem value="Mist Express">{translations.deliveryMethods.mistExpress}</SelectItem>
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
                value={newOrder.products}
                onChange={handleInputChange}
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
                  name="paymentMethod"
                  value={newOrder.paymentMethod}
                  onValueChange={(value: string) => handleSelectChange("paymentMethod", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={translations.selectPaymentMethod || 'Select Payment Method'} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Cash on delivery">Cash on delivery</SelectItem>
                    <SelectItem value="Bank Account">Bank Account</SelectItem>
                    <SelectItem value="Card">Card</SelectItem>
                    <SelectItem value="Kasta">Kasta</SelectItem>
                    <SelectItem value="EVO">EVO</SelectItem>
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
