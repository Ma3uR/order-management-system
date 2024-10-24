'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select } from "@/components/ui/select"

interface Order {
  id: number;
  orderNumber: string;
  source: string;
  deliveryMethod: string;
  deliveryPostNumber: string | null;
  phoneNumber: string;
  fullName: string;
  products: string;
  numberOfItems: number;
  paymentMethod: string;
  amount: number;
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface OrdersManagementProps {
  translations: {
    title: string;
    totalAmount: string;
    filterOrders: string;
    filterOrdersPlaceholder: string;
    createNewOrder: string;
    orders: string;
    orderNumber: string;
    fullName: string;
    status: string;
    amount: string;
    createdAt: string;
    actions: string;
    details: string;
    edit: string;
    delete: string;
    deleteConfirmation: string;
    deleteError: string; // Add this line
    orderDetails: string;
    source: string;
    deliveryMethod: string;
    deliveryPostNumber: string;
    phoneNumber: string;
    products: string;
    numberOfItems: string;
    paymentMethod: string;
    editOrder: string;
    selectStatus: string;
    updateOrder: string;
    statuses: {
      beingProcessed: string;
      shipped: string;
      delivered: string;
      cancelled: string;
    };
    deliveryMethods: {
      ukrposhta: string;
      novaPoshta: string;
      parcelLocker: string;
      rozetka: string;
      mistExpress: string;
    };
  };
  initialOrders: Order[];
}

const OrdersManagement: React.FC<OrdersManagementProps> = ({ translations, initialOrders }) => {
  const [orders, setOrders] = useState<Order[]>([])
  const [isClient, setIsClient] = useState(false)
  const [filterText, setFilterText] = useState("")
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)

  useEffect(() => {
    setOrders(initialOrders);
    setIsClient(true);
  }, [initialOrders]);

  const filteredOrders = orders.filter(order => 
    order.orderNumber.toLowerCase().includes(filterText.toLowerCase()) ||
    order.fullName.toLowerCase().includes(filterText.toLowerCase()) ||
    order.status.toLowerCase().includes(filterText.toLowerCase())
  )

  const totalAmount = orders.reduce((sum, order) => sum + order.amount, 0)

  const translateStatus = (status: string) => {
    const statusKey = status.toLowerCase().replace(/ /g, '') as keyof typeof translations.statuses;
    return translations.statuses[statusKey] || status;
  };

  const handleEditOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedOrder) {
      setOrders(orders.map(order => order.id === selectedOrder.id ? selectedOrder : order));
      setIsEditModalOpen(false);
    }
  };

  const handleDeleteOrder = async (orderId: number) => {
    if (window.confirm(translations.deleteConfirmation)) {
      try {
        await axios.delete(`/api/orders/${orderId}`);
        setOrders(orders.filter(order => order.id !== orderId));
      } catch (error) {
        console.error('Error deleting order:', error);
        alert(translations.deleteError);
      }
    }
  };

  const handleEditSelectChange = (field: string, value: string) => {
    if (selectedOrder) {
      setSelectedOrder({ ...selectedOrder, [field]: value });
    }
  };

  if (!isClient) {
    return null; // or a loading spinner
  }

  return (
    <div className="min-h-screen bg-white text-black p-8">
      <h1 className="text-3xl font-bold mb-6">{translations.title}</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
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
            <Input
              placeholder={translations.filterOrdersPlaceholder}
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              className="bg-white text-black border-gray-300"
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{translations.createNewOrder}</CardTitle>
          </CardHeader>
          <CardContent>
            <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white">
              {translations.createNewOrder}
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-white">
        <CardHeader>
          <CardTitle>{translations.orders}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-100">
                  <TableHead className="font-semibold">{translations.orderNumber}</TableHead>
                  <TableHead className="font-semibold">{translations.fullName}</TableHead>
                  <TableHead className="font-semibold">{translations.status}</TableHead>
                  <TableHead className="font-semibold">{translations.amount}</TableHead>
                  <TableHead className="font-semibold">{translations.createdAt}</TableHead>
                  <TableHead className="font-semibold">{translations.actions}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.map((order) => (
                  <TableRow key={order.id}>
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
                      <div className="flex space-x-2">
                        <Button 
                          onClick={() => {
                            setSelectedOrder(order);
                            setIsDetailsModalOpen(true);
                          }} 
                          className="bg-blue-500 text-white hover:bg-blue-600"
                        >
                          {translations.details}
                        </Button>
                        <Button 
                          onClick={() => {
                            setSelectedOrder(order);
                            setIsEditModalOpen(true);
                          }} 
                          className="bg-green-500 text-white hover:bg-green-600"
                        >
                          {translations.edit}
                        </Button>
                        <Button 
                          onClick={() => handleDeleteOrder(order.id)} 
                          className="bg-red-500 text-white hover:bg-red-600"
                        >
                          {translations.delete}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Details Modal */}
      <Dialog open={isDetailsModalOpen} onOpenChange={setIsDetailsModalOpen}>
        <DialogContent className="sm:max-w-[625px] bg-white text-black">
          <DialogHeader>
            <DialogTitle>{translations.orderDetails}</DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="font-bold">{translations.orderNumber}</Label>
                  <p>{selectedOrder.orderNumber}</p>
                </div>
                <div>
                  <Label className="font-bold">{translations.fullName}</Label>
                  <p>{selectedOrder.fullName}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="font-bold">{translations.status}</Label>
                  <Badge variant="outline" className="bg-gray-100 text-black border-gray-300">
                    {selectedOrder.status}
                  </Badge>
                </div>
                <div>
                  <Label className="font-bold">{translations.amount}</Label>
                  <p>${selectedOrder.amount.toFixed(2)}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="font-bold">{translations.source}</Label>
                  <p>{selectedOrder.source}</p>
                </div>
                <div>
                  <Label className="font-bold">{translations.deliveryMethod}</Label>
                  <p>{selectedOrder.deliveryMethod}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="font-bold">{translations.deliveryPostNumber}</Label>
                  <p>{selectedOrder.deliveryPostNumber}</p>
                </div>
                <div>
                  <Label className="font-bold">{translations.phoneNumber}</Label>
                  <p>{selectedOrder.phoneNumber}</p>
                </div>
              </div>
              <div>
                <Label className="font-bold">{translations.products}</Label>
                <Textarea 
                  value={selectedOrder.products}
                  readOnly
                  className="mt-1 h-32 bg-gray-50"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="font-bold">{translations.numberOfItems}</Label>
                  <p>{selectedOrder.numberOfItems}</p>
                </div>
                <div>
                  <Label className="font-bold">{translations.paymentMethod}</Label>
                  <p>{selectedOrder.paymentMethod}</p>
                </div>
              </div>
              <div>
                <Label className="font-bold">{translations.createdAt}</Label>
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
            <DialogTitle>{translations.editOrder}</DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <form onSubmit={handleEditOrder} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="status">{translations.status}</Label>
                <Select 
                  name="status" 
                  value={selectedOrder.status} 
                  onChange={(e) => handleEditSelectChange("status", e.target.value)}
                >
                  <option value="" disabled>{translations.selectStatus}</option>
                  <option value="Being processed by manager">{translations.statuses.beingProcessed}</option>
                  <option value="Shipped">{translations.statuses.shipped}</option>
                  <option value="Delivered">{translations.statuses.delivered}</option>
                  <option value="Cancelled">{translations.statuses.cancelled}</option>
                </Select>
              </div>
              {/* Add more editable fields as needed */}
              <Button type="submit" className="w-full bg-black text-white hover:bg-gray-800">{translations.updateOrder}</Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default OrdersManagement;
