"use client"

import { useState } from "react"
import { ProductsTool } from "./products/assembled/index"
import { Button } from "@/app/components/shared/ui/button"

interface OrdersBeingAssembledData {
  ordersCount: number;
  orders: Array<{
    id: string;
    orderNumber: string;
    createdAt: string;
    customer: string;
    phoneNumber: string;
    products: Array<{ name: string; quantity: number; price?: number }>;
  }>;
  productsCount: number;
  products: Array<{
    name: string;
    quantity: number;
  }>;
}

export function TestProductsTool() {
  const [isLoading, setIsLoading] = useState(false)
  const [productsData, setProductsData] = useState<OrdersBeingAssembledData | null>(null)

  const handleGetProducts = async () => {
    setIsLoading(true)
    try {
      // This would be replaced with actual API call in production
      // Simulating API call with timeout
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Example data with the new structure
      setProductsData({
        ordersCount: 4,
        orders: [
          {
            id: "1",
            orderNumber: "ORD-001",
            createdAt: new Date().toISOString(),
            customer: "John Doe",
            phoneNumber: "+380123456789",
            products: [
              { name: "Blue T-Shirt", quantity: 2, price: 350 },
              { name: "Red Cap", quantity: 1, price: 200 }
            ]
          },
          {
            id: "2",
            orderNumber: "ORD-002",
            createdAt: new Date().toISOString(),
            customer: "Jane Smith",
            phoneNumber: "+380987654321",
            products: [
              { name: "Black Jeans", quantity: 1, price: 800 },
              { name: "White Sneakers", quantity: 1, price: 1200 }
            ]
          },
          {
            id: "3",
            orderNumber: "ORD-003",
            createdAt: new Date().toISOString(),
            customer: "Bob Johnson",
            phoneNumber: "+380555666777",
            products: [
              { name: "Green Hoodie", quantity: 1, price: 600 },
              { name: "Yellow Socks", quantity: 3, price: 150 }
            ]
          },
          {
            id: "4",
            orderNumber: "ORD-004",
            createdAt: new Date().toISOString(),
            customer: "Alice Brown",
            phoneNumber: "+380111222333",
            products: [
              { name: "Blue T-Shirt", quantity: 10, price: 350 },
              { name: "Red Cap", quantity: 4, price: 200 },
              { name: "Black Jeans", quantity: 7, price: 800 },
              { name: "White Sneakers", quantity: 2, price: 1200 },
              { name: "Green Hoodie", quantity: 6, price: 600 },
              { name: "Yellow Socks", quantity: 12, price: 150 }
            ]
          }
        ],
        productsCount: 6,
        products: [
          { name: "Blue T-Shirt", quantity: 12 },
          { name: "Red Cap", quantity: 5 },
          { name: "Black Jeans", quantity: 8 },
          { name: "White Sneakers", quantity: 3 },
          { name: "Green Hoodie", quantity: 7 },
          { name: "Yellow Socks", quantity: 15 },
        ]
      })
    } catch (error) {
      console.error("Error fetching products:", error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">Products Being Assembled</h2>
        <Button onClick={handleGetProducts} disabled={isLoading}>
          {isLoading ? "Loading..." : "Get Products"}
        </Button>
      </div>
      
      {productsData ? (
        <ProductsTool 
          data={productsData} 
          isLoading={isLoading} 
        />
      ) : (
        <div className="text-center p-8 bg-gray-50 rounded-lg">
          <p className="text-gray-500">Click the button to load products</p>
        </div>
      )}
    </div>
  )
} 