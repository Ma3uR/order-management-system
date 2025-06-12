"use client"

import * as React from "react"
import { useTranslations } from "next-intl"
import { ProductCollection, type Product } from "./product-collection"

type OldProduct = {
  name: string
  quantity: number
}

type ProductBeingAssembledProps = {
  products: OldProduct[]
  ordersCount: number
  isLoading?: boolean
}

export function ProductsBeingAssembled({ products, ordersCount, isLoading = false }: ProductBeingAssembledProps) {
  const t = useTranslations("Dashboard")

  // Convert old product format to new format with IDs
  const convertedProducts: Product[] = products.map((product, index) => ({
    id: `product-${index}`,
    name: product.name,
    quantity: product.quantity,
    // You can add category based on some logic if needed
    // For example, grouping by first letter
    category: product.name.charAt(0).toUpperCase()
  }))

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-32 bg-card rounded-lg shadow-sm border p-4">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  return (
    <ProductCollection 
      products={convertedProducts} 
      title={t("productsBeingAssembled")} 
      orderCount={ordersCount} 
      isCompact={false} 
    />
  )
} 