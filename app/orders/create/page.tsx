'use client';

import { useState } from 'react';
import axios from 'axios';
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"

export default function CreateOrder() {
  const [orderData, setOrderData] = useState({
    orderNumber: '',
    source: '',
    deliveryMethod: '',
    deliveryPostNumber: '', // Changed from branchNumber
    phoneNumber: '',
    fullName: '',
    products: '',
    numberOfItems: 0,
    paymentMethod: '',
    amount: 0,
    status: 'Being processed by manager',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setOrderData({ ...orderData, [name]: value });
  };

  const handleSelectChange = (name: string, value: string) => {
    setOrderData({ ...orderData, [name]: value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await axios.post('/api/orders', {
        ...orderData,
        products: JSON.parse(orderData.products),
        numberOfItems: Number(orderData.numberOfItems),
        amount: Number(orderData.amount),
      });
      console.log('Order created:', response.data);
      alert('Order created successfully');
      // Reset form or redirect
    } catch (error) {
      console.error('Error creating order:', error.response?.data || error.message);
      alert(`Error creating order: ${error.response?.data?.details || error.message}`);
    }
  };

  return (
    <div className="min-h-screen bg-white text-black">
      {/* Remove the duplicate navigation menu */}
      
      <main className="container mx-auto px-4 py-8">
        <Card className="max-w-2xl mx-auto border border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-2xl font-bold">Create New Order</CardTitle>
            <CardDescription>Fill in the details to create a new order</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="orderNumber" className="text-sm font-medium">Order Number</Label>
                  <Input 
                    id="orderNumber" 
                    name="orderNumber" 
                    value={orderData.orderNumber} 
                    onChange={handleChange} 
                    placeholder="Enter order number" 
                    required 
                    className="bg-white text-black border-gray-300 focus:border-black focus:ring-black" 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="source" className="text-sm font-medium">Source</Label>
                  <Input 
                    id="source" 
                    name="source" 
                    value={orderData.source} 
                    onChange={handleChange} 
                    placeholder="Enter source" 
                    required 
                    className="bg-white text-black border-gray-300 focus:border-black focus:ring-black" 
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="deliveryMethod" className="text-sm font-medium">Delivery Method</Label>
                <Select name="deliveryMethod" value={orderData.deliveryMethod} onValueChange={(value) => handleSelectChange("deliveryMethod", value)} required>
                  <SelectTrigger className="w-full bg-white text-black border border-gray-300 focus:border-black focus:ring-1 focus:ring-black">
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
                <Label htmlFor="deliveryPostNumber" className="text-sm font-medium">Number of delivery post</Label>
                <Input 
                  id="deliveryPostNumber" 
                  name="deliveryPostNumber" 
                  value={orderData.deliveryPostNumber} 
                  onChange={handleChange} 
                  placeholder="Enter number of delivery post" 
                  className="bg-white text-black border-gray-300 focus:border-black focus:ring-black" 
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phoneNumber" className="text-sm font-medium">Phone Number</Label>
                  <Input 
                    id="phoneNumber" 
                    name="phoneNumber" 
                    type="tel" 
                    value={orderData.phoneNumber} 
                    onChange={handleChange} 
                    placeholder="Enter phone number" 
                    required 
                    className="bg-white text-black border-gray-300 focus:border-black focus:ring-black" 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fullName" className="text-sm font-medium">Full Name</Label>
                  <Input 
                    id="fullName" 
                    name="fullName" 
                    value={orderData.fullName} 
                    onChange={handleChange} 
                    placeholder="Enter full name" 
                    required 
                    className="bg-white text-black border-gray-300 focus:border-black focus:ring-black" 
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="products" className="text-sm font-medium">Products (JSON format)</Label>
                <Textarea 
                  id="products" 
                  name="products" 
                  value={orderData.products} 
                  onChange={handleChange} 
                  placeholder="Enter products in JSON format" 
                  required 
                  className="bg-white text-black border-gray-300 focus:border-black focus:ring-black" 
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="numberOfItems" className="text-sm font-medium">Number of Items</Label>
                  <Input 
                    id="numberOfItems" 
                    name="numberOfItems" 
                    type="number" 
                    value={orderData.numberOfItems} 
                    onChange={handleChange} 
                    placeholder="Enter number of items" 
                    required 
                    className="bg-white text-black border-gray-300 focus:border-black focus:ring-black" 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="paymentMethod" className="text-sm font-medium">Payment Method</Label>
                  <Select name="paymentMethod" value={orderData.paymentMethod} onValueChange={(value) => handleSelectChange("paymentMethod", value)} required>
                    <SelectTrigger className="w-full bg-white text-black border border-gray-300 focus:border-black focus:ring-1 focus:ring-black">
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
                <Label htmlFor="amount" className="text-sm font-medium">Amount</Label>
                <Input 
                  id="amount" 
                  name="amount" 
                  type="number" 
                  value={orderData.amount} 
                  onChange={handleChange} 
                  placeholder="Enter amount" 
                  required 
                  className="bg-white text-black border-gray-300 focus:border-black focus:ring-black" 
                />
              </div>
            </form>
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full bg-black text-white hover:bg-gray-800" onClick={handleSubmit}>Create Order</Button>
          </CardFooter>
        </Card>
      </main>
    </div>
  )
}
