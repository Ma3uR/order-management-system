"use client"

import { useTranslations } from "next-intl"
import { ProductCollection, type Product } from "./product-collection"

type ProductToolProps = {
  products: Product[]
  title?: string
  subtitle?: string
  orderCount?: number
  isLoading?: boolean
}

export function ProductTool({ products, title, subtitle, orderCount, isLoading = false }: ProductToolProps) {
  const t = useTranslations("Dashboard")
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-32 bg-white rounded-lg shadow-sm border p-4">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  return (
    <ProductCollection 
      products={products} 
      title={title || t("productsToCollect")} 
      subtitle={subtitle}
      orderCount={orderCount} 
      isCompact={true} 
    />
  )
} 