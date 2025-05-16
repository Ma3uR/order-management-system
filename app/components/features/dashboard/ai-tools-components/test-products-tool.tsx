"use client"

import { useState, useEffect } from "react"
import { ProductsTool } from "./products/index"
import { Button } from "@/app/components/shared/ui/button"

export function TestProductsTool() {
  const [isLoading, setIsLoading] = useState(false)
  const [productsData, setProductsData] = useState<{
    products: Array<{ name: string; quantity: number }>
    ordersCount: number
  } | null>(null)

  const handleGetProducts = async () => {
    setIsLoading(true)
    try {
      // This would be replaced with actual API call in production
      // Simulating API call with timeout
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Example data
      setProductsData({
        products: [
          { name: "Blue T-Shirt", quantity: 12 },
          { name: "Red Cap", quantity: 5 },
          { name: "Black Jeans", quantity: 8 },
          { name: "White Sneakers", quantity: 3 },
          { name: "Green Hoodie", quantity: 7 },
          { name: "Yellow Socks", quantity: 15 },
        ],
        ordersCount: 4
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
          products={productsData.products} 
          ordersCount={productsData.ordersCount} 
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