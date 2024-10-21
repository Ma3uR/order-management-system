'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
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

interface OrdersManagementProps {
  t: (key: string) => string;
}

const OrdersManagement: React.FC<OrdersManagementProps> = ({ t }) => {
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setNewOrderData({ ...newOrderData, [name]: value });
  };

  const handleSelectChange = (name: string, value: string) => {
    setNewOrderData({ ...newOrderData, [name]: value });
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
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Error creating order:', errorMessage);
      alert(`Error creating order: ${errorMessage}`);
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
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Error updating order:', errorMessage);
      alert(`Error updating order: ${errorMessage}`);
    }
  };

  const handleDeleteOrder = async (id: number) => {
    if (window.confirm(t('deleteConfirmation'))) {
      try {
        await axios.delete(`/api/orders/${id}`);
        fetchOrders();
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error('Error deleting order:', errorMessage);
        alert(`Error deleting order: ${errorMessage}`);
      }
    }
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

  const translateStatus = (status: string) => {
    const statusKey = status.toLowerCase().replace(/ /g, '');
    return t(`statuses.${statusKey}`);
  };

  return (
    <div className="min-h-screen bg-white text-black p-8">
      <h1 className="text-4xl font-bold mb-8">{t('title')}</h1>
      
      <div className="grid gap-8 mb-8 md:grid-cols-3">
        <Card className="border border-gray-200 shadow-md">
          <CardHeader>
            <CardTitle className="text-xl font-semibold">{t('totalAmount')}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">${totalAmount.toFixed(2)}</p>
          </CardContent>
        </Card>
        
        <Card className="border border-gray-200 shadow-md">
          <CardHeader>
            <CardTitle className="text-xl font-semibold">{t('filterOrders')}</CardTitle>
          </CardHeader>
          <CardContent>
            <Input 
              placeholder={t('filterOrdersPlaceholder')}
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              className="bg-white text-black border-gray-300 focus:border-black focus:ring-black"
            />
          </CardContent>
        </Card>

        <Card className="border border-gray-200 shadow-md">
          <CardHeader>
            <CardTitle className="text-xl font-semibold">{t('createNewOrder')}</CardTitle>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setIsCreateModalOpen(true)} className="w-full">
              {t('createNewOrder')}
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card className="border border-gray-200 shadow-md">
        <CardHeader>
          <CardTitle className="text-xl font-semibold">{t('orders')}</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-100">
                <TableHead className="font-semibold">{t('orderNumber')}</TableHead>
                <TableHead className="font-semibold">{t('fullName')}</TableHead>
                <TableHead className="font-semibold">{t('status')}</TableHead>
                <TableHead className="font-semibold">{t('amount')}</TableHead>
                <TableHead className="font-semibold">{t('createdAt')}</TableHead>
                <TableHead className="font-semibold">{t('actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrders.map((order) => (
                <TableRow key={order.id} className="border-b border-gray-200">
                  <TableCell className="font-medium">{order.orderNumber}</TableCell>
                  <TableCell>{order.fullName}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="bg-gray-100 text-black border-gray-300">
                      {translateStatus(order.status)}
                    </Badge>
                  </TableCell>
                  <TableCell>${order.amount.toFixed(2)}</TableCell>
                  <TableCell>{new Date(order.createdAt).toLocaleString()}</TableCell>
                  <TableCell>
                    <Button onClick={() => { setSelectedOrder(order); setIsDetailsModalOpen(true); }} className="mr-2">
                      {t('details')}
                    </Button>
                    <Button onClick={() => { setSelectedOrder(order); setIsEditModalOpen(true); }} className="mr-2">
                      {t('edit')}
                    </Button>
                    <Button onClick={() => handleDeleteOrder(order.id)} variant="destructive">
                      {t('delete')}
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
        <DialogContent className="sm:max-w-[625px] bg-white text-black">
          <DialogHeader>
            <DialogTitle>{t('orderDetails')}</DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="font-bold">{t('orderNumber')}</Label>
                  <p>{selectedOrder.orderNumber}</p>
                </div>
                <div>
                  <Label className="font-bold">{t('fullName')}</Label>
                  <p>{selectedOrder.fullName}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="font-bold">{t('status')}</Label>
                  <Badge variant="outline" className="bg-gray-100 text-black border-gray-300">
                    {selectedOrder.status}
                  </Badge>
                </div>
                <div>
                  <Label className="font-bold">{t('amount')}</Label>
                  <p>${selectedOrder.amount.toFixed(2)}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="font-bold">{t('source')}</Label>
                  <p>{selectedOrder.source}</p>
                </div>
                <div>
                  <Label className="font-bold">{t('deliveryMethod')}</Label>
                  <p>{selectedOrder.deliveryMethod}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="font-bold">{t('deliveryPostNumber')}</Label>
                  <p>{selectedOrder.deliveryPostNumber}</p>
                </div>
                <div>
                  <Label className="font-bold">{t('phoneNumber')}</Label>
                  <p>{selectedOrder.phoneNumber}</p>
                </div>
              </div>
              <div>
                <Label className="font-bold">{t('products')}</Label>
                <Textarea 
                  value={selectedOrder.products}
                  readOnly
                  className="mt-1 h-32 bg-gray-50"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="font-bold">{t('numberOfItems')}</Label>
                  <p>{selectedOrder.numberOfItems}</p>
                </div>
                <div>
                  <Label className="font-bold">{t('paymentMethod')}</Label>
                  <p>{selectedOrder.paymentMethod}</p>
                </div>
              </div>
              <div>
                <Label className="font-bold">{t('createdAt')}</Label>
                <p>{new Date(selectedOrder.createdAt).toLocaleString()}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-[425px] bg-white text-black">
          <DialogHeader>
            <DialogTitle>{t('editOrder')}</DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <form onSubmit={handleEditOrder} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="status">{t('status')}</Label>
                <Select 
                  name="status" 
                  value={selectedOrder.status} 
                  onValueChange={(value) => handleEditSelectChange("status", value)}
                >
                  <SelectTrigger className="w-full bg-white text-black border-gray-300 focus:border-black focus:ring-black">
                    <SelectValue placeholder={t('selectStatus')} />
                  </SelectTrigger>
                  <SelectContent className="bg-white text-black">
                    <SelectItem value="Being processed by manager">{t('statuses.beingProcessed')}</SelectItem>
                    <SelectItem value="Shipped">{t('statuses.shipped')}</SelectItem>
                    <SelectItem value="Delivered">{t('statuses.delivered')}</SelectItem>
                    <SelectItem value="Cancelled">{t('statuses.cancelled')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {/* Add more editable fields as needed */}
              <Button type="submit" className="w-full bg-black text-white hover:bg-gray-800">{t('updateOrder')}</Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default OrdersManagement;
