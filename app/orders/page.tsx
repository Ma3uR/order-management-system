'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface Order {
  id: number;
  orderNumber: string;
  fullName: string;
  status: string;
  amount: number;
  createdAt: string;
  source: string;
  deliveryMethod: string;
  deliveryPostNumber: string;
  phoneNumber: string;
  products: string;
  numberOfItems: number;
  paymentMethod: string;
}

export default function OrdersManagement() {
  const [filterText, setFilterText] = useState("")
  const [orders, setOrders] = useState<Order[]>([])
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [newOrderData, setNewOrderData] = useState({
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
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const response = await axios.get('/api/orders');
      setOrders(response.data);
    } catch (error) {
      console.error('Error fetching orders:', error);
    }
  };

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await axios.post('/api/orders', {
        ...newOrderData,
        products: newOrderData.products ? JSON.parse(newOrderData.products) : [],
        numberOfItems: Number(newOrderData.numberOfItems),
        amount: Number(newOrderData.amount),
      });
      console.log('Order created:', response.data);
      setIsCreateModalOpen(false);
      fetchOrders();
    } catch (error) {
      console.error('Error creating order:', error.response?.data || error.message);
      alert(`Error creating order: ${error.response?.data?.details || error.message}`);
    }
  };

  const handleEditOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;
    try {
      const response = await axios.put(`/api/orders/${selectedOrder.id}`, selectedOrder);
      console.log('Order updated:', response.data);
      setIsEditModalOpen(false);
      fetchOrders();
    } catch (error) {
      console.error('Error updating order:', error.response?.data || error.message);
      alert(`Error updating order: ${error.response?.data?.details || error.message}`);
    }
  };

  const handleDeleteOrder = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this order?')) {
      try {
        await axios.delete(`/api/orders/${id}`);
        fetchOrders();
      } catch (error) {
        console.error('Error deleting order:', error.response?.data || error.message);
        alert(`Error deleting order: ${error.response?.data?.details || error.message}`);
      }
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setNewOrderData({ ...newOrderData, [name]: value });
  };

  const handleEditInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setSelectedOrder(prev => prev ? { ...prev, [name]: value } : null);
  };

  const handleSelectChange = (name: string, value: string) => {
    setNewOrderData({ ...newOrderData, [name]: value });
  };

  const handleEditSelectChange = (name: string, value: string) => {
    setSelectedOrder(prev => prev ? { ...prev, [name]: value } : null);
  };

  const filteredOrders = orders.filter(order => 
    order.orderNumber.toLowerCase().includes(filterText.toLowerCase()) ||
    order.fullName.toLowerCase().includes(filterText.toLowerCase()) ||
    order.status.toLowerCase().includes(filterText.toLowerCase())
  )

  const totalAmount = orders.reduce((sum, order) => sum + order.amount, 0)

  return (
    <div className="min-h-screen bg-white text-black p-8">
      <h1 className="text-4xl font-bold mb-8">Orders Management</h1>
      
      <div className="grid gap-8 mb-8 md:grid-cols-3">
        <Card className="border border-gray-200 shadow-md">
          <CardHeader>
            <CardTitle className="text-xl font-semibold">Total Amount (All Orders)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">${totalAmount.toFixed(2)}</p>
          </CardContent>
        </Card>
        
        <Card className="border border-gray-200 shadow-md">
          <CardHeader>
            <CardTitle className="text-xl font-semibold">Filter Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <Input 
              placeholder="Filter orders..."
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              className="bg-white text-black border-gray-300 focus:border-black focus:ring-black"
            />
          </CardContent>
        </Card>

        <Card className="border border-gray-200 shadow-md">
          <CardHeader>
            <CardTitle className="text-xl font-semibold">Create New Order</CardTitle>
          </CardHeader>
          <CardContent>
            <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
              <DialogTrigger asChild>
                <Button className="w-full">Create New Order</Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px] bg-white text-black">
                <DialogHeader>
                  <DialogTitle>Create New Order</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreateOrder} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="orderNumber">Order Number</Label>
                      <Input 
                        id="orderNumber" 
                        name="orderNumber" 
                        value={newOrderData.orderNumber} 
                        onChange={handleInputChange} 
                        required 
                        className="bg-white text-black border-gray-300 focus:border-black focus:ring-black"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="source">Source</Label>
                      <Input 
                        id="source" 
                        name="source" 
                        value={newOrderData.source} 
                        onChange={handleInputChange} 
                        required 
                        className="bg-white text-black border-gray-300 focus:border-black focus:ring-black"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="deliveryMethod">Delivery Method</Label>
                    <Select 
                      name="deliveryMethod" 
                      value={newOrderData.deliveryMethod} 
                      onValueChange={(value) => handleSelectChange("deliveryMethod", value)}
                    >
                      <SelectTrigger className="w-full bg-white text-black border-gray-300 focus:border-black focus:ring-black">
                        <SelectValue placeholder="Select Delivery Method" />
                      </SelectTrigger>
                      <SelectContent className="bg-white text-black">
                        <SelectItem value="Ukrposhta">Ukrposhta</SelectItem>
                        <SelectItem value="Nova Poshta">Nova Poshta</SelectItem>
                        <SelectItem value="Parcel Locker">Parcel Locker</SelectItem>
                        <SelectItem value="Rozetka">Rozetka</SelectItem>
                        <SelectItem value="Mist Express">Mist Express</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="deliveryPostNumber">Delivery Post Number</Label>
                    <Input 
                      id="deliveryPostNumber" 
                      name="deliveryPostNumber" 
                      value={newOrderData.deliveryPostNumber} 
                      onChange={handleInputChange}
                      className="bg-white text-black border-gray-300 focus:border-black focus:ring-black"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="phoneNumber">Phone Number</Label>
                      <Input 
                        id="phoneNumber" 
                        name="phoneNumber" 
                        value={newOrderData.phoneNumber} 
                        onChange={handleInputChange} 
                        required
                        className="bg-white text-black border-gray-300 focus:border-black focus:ring-black"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="fullName">Full Name</Label>
                      <Input 
                        id="fullName" 
                        name="fullName" 
                        value={newOrderData.fullName} 
                        onChange={handleInputChange} 
                        required
                        className="bg-white text-black border-gray-300 focus:border-black focus:ring-black"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="products">Products</Label>
                    <Textarea 
                      id="products" 
                      name="products" 
                      value={newOrderData.products} 
                      onChange={handleInputChange} 
                      placeholder='[{"name": "Product 1", "quantity": 2}]'
                      className="bg-white text-black border-gray-300 focus:border-black focus:ring-black"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="numberOfItems">Number of Items</Label>
                      <Input 
                        id="numberOfItems" 
                        name="numberOfItems" 
                        type="number" 
                        value={newOrderData.numberOfItems} 
                        onChange={handleInputChange} 
                        required
                        className="bg-white text-black border-gray-300 focus:border-black focus:ring-black"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="paymentMethod">Payment Method</Label>
                      <Select 
                        name="paymentMethod" 
                        value={newOrderData.paymentMethod} 
                        onValueChange={(value) => handleSelectChange("paymentMethod", value)}
                      >
                        <SelectTrigger className="w-full bg-white text-black border-gray-300 focus:border-black focus:ring-black">
                          <SelectValue placeholder="Select Payment Method" />
                        </SelectTrigger>
                        <SelectContent className="bg-white text-black">
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
                    <Label htmlFor="amount">Amount</Label>
                    <Input 
                      id="amount" 
                      name="amount" 
                      type="number" 
                      value={newOrderData.amount} 
                      onChange={handleInputChange} 
                      required
                      className="bg-white text-black border-gray-300 focus:border-black focus:ring-black"
                    />
                  </div>

                  <Button type="submit" className="w-full bg-black text-white hover:bg-gray-800">Create Order</Button>
                </form>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      </div>

      <Card className="border border-gray-200 shadow-md">
        <CardHeader>
          <CardTitle className="text-xl font-semibold">Orders</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-100">
                <TableHead className="font-semibold">Order Number</TableHead>
                <TableHead className="font-semibold">Full Name</TableHead>
                <TableHead className="font-semibold">Status</TableHead>
                <TableHead className="font-semibold">Amount</TableHead>
                <TableHead className="font-semibold">Created At</TableHead>
                <TableHead className="font-semibold">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrders.map((order) => (
                <TableRow key={order.id} className="border-b border-gray-200">
                  <TableCell className="font-medium">{order.orderNumber}</TableCell>
                  <TableCell>{order.fullName}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="bg-gray-100 text-black border-gray-300">
                      {order.status}
                    </Badge>
                  </TableCell>
                  <TableCell>${order.amount.toFixed(2)}</TableCell>
                  <TableCell>{new Date(order.createdAt).toLocaleString()}</TableCell>
                  <TableCell>
                    <Button onClick={() => { setSelectedOrder(order); setIsDetailsModalOpen(true); }} className="mr-2">
                      Details
                    </Button>
                    <Button onClick={() => { setSelectedOrder(order); setIsEditModalOpen(true); }} className="mr-2">
                      Edit
                    </Button>
                    <Button onClick={() => handleDeleteOrder(order.id)} variant="destructive">
                      Delete
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Details Modal */}
      <Dialog open={isDetailsModalOpen} onOpenChange={setIsDetailsModalOpen}>
        <DialogContent className="sm:max-w-[425px] bg-white text-black">
          <DialogHeader>
            <DialogTitle>Order Details</DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4">
              <p><strong>Order Number:</strong> {selectedOrder.orderNumber}</p>
              <p><strong>Full Name:</strong> {selectedOrder.fullName}</p>
              <p><strong>Status:</strong> {selectedOrder.status}</p>
              <p><strong>Amount:</strong> ${selectedOrder.amount.toFixed(2)}</p>
              <p><strong>Source:</strong> {selectedOrder.source}</p>
              <p><strong>Delivery Method:</strong> {selectedOrder.deliveryMethod}</p>
              <p><strong>Delivery Post Number:</strong> {selectedOrder.deliveryPostNumber}</p>
              <p><strong>Phone Number:</strong> {selectedOrder.phoneNumber}</p>
              {/* Products information is now hidden */}
              {/* TODO: Implement proper product display after marketplace integration */}
              <p><strong>Number of Items:</strong> {selectedOrder.numberOfItems}</p>
              <p><strong>Payment Method:</strong> {selectedOrder.paymentMethod}</p>
              <p><strong>Created At:</strong> {new Date(selectedOrder.createdAt).toLocaleString()}</p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-[425px] bg-white text-black">
          <DialogHeader>
            <DialogTitle>Edit Order</DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <form onSubmit={handleEditOrder} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select 
                  name="status" 
                  value={selectedOrder.status} 
                  onValueChange={(value) => handleEditSelectChange("status", value)}
                >
                  <SelectTrigger className="w-full bg-white text-black border-gray-300 focus:border-black focus:ring-black">
                    <SelectValue placeholder="Select Status" />
                  </SelectTrigger>
                  <SelectContent className="bg-white text-black">
                    <SelectItem value="Being processed by manager">Being processed by manager</SelectItem>
                    <SelectItem value="Shipped">Shipped</SelectItem>
                    <SelectItem value="Delivered">Delivered</SelectItem>
                    <SelectItem value="Cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {/* Add more editable fields as needed */}
              <Button type="submit" className="w-full bg-black text-white hover:bg-gray-800">Update Order</Button>
            </form>
          )}
        </DialogContent>
      </Dialog>

    </div>
  )
}
