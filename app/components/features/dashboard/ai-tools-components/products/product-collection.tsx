"use client"

import { useState } from "react"
import { Search, Download, X, ChevronDown, ChevronUp, ShoppingBag } from "lucide-react"
import { Button } from "@/app/components/shared/ui/button"
import { Input } from "@/app/components/shared/ui/input"
import { Badge } from "@/app/components/shared/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/app/components/shared/ui/dialog"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/app/components/shared/ui/collapsible"
import { ScrollArea } from "@/app/components/shared/ui/scroll-area"
import { cn } from "@/app/lib/utils"
import { useTranslations } from "next-intl"

export type Product = {
  id: string
  name: string
  quantity: number
  category?: string
  sku?: string
  price?: number
  currency?: string
}

type ProductCollectionProps = {
  products: Product[]
  title?: string
  subtitle?: string
  orderCount?: number
  isCompact?: boolean
}

export function ProductCollection({
  products,
  title,
  subtitle,
  orderCount,
  isCompact = false,
}: ProductCollectionProps) {
  const t = useTranslations("Dashboard")
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [searchTerm, _setSearchTerm] = useState("")
  const [isFullViewOpen, setIsFullViewOpen] = useState(false)

  // Group products by category
  const groupedProducts = products.reduce(
    (acc, product) => {
      const category = product.category || t("uncategorized")
      if (!acc[category]) {
        acc[category] = []
      }
      acc[category].push(product)
      return acc
    },
    {} as Record<string, Product[]>,
  )

  // Filter products based on search term - used by full view
  /* eslint-disable @typescript-eslint/no-unused-vars */
  const filteredGroups = Object.entries(groupedProducts).reduce(
    (acc, [category, categoryProducts]) => {
      const filtered = categoryProducts.filter((product) =>
        product.name.toLowerCase().includes(searchTerm.toLowerCase()),
      )
      if (filtered.length > 0) {
        acc[category] = filtered
      }
      return acc
    },
    {} as Record<string, Product[]>,
  )
  /* eslint-enable @typescript-eslint/no-unused-vars */

  // Calculate total products
  const totalProducts = products.reduce((sum, product) => sum + product.quantity, 0)

  // Generate subtitle if not provided
  const defaultTitle = title || t("productsBeingAssembled")
  const generatedSubtitle =
    subtitle ||
    t("productCollectionSubtitle", {
      count: products.length,
      items: totalProducts,
      orderCount: orderCount || 0,
    })

  // Download as CSV
  const downloadCsv = () => {
    const headers = [t("category"), t("productName"), t("quantity"), "SKU"]
    const csvRows = [headers.join(",")]

    Object.entries(groupedProducts).forEach(([category, categoryProducts]) => {
      categoryProducts.forEach((product) => {
        const row = [`"${category}"`, `"${product.name}"`, product.quantity, product.sku ? `"${product.sku}"` : ""]
        csvRows.push(row.join(","))
      })
    })

    const csvContent = csvRows.join("\n")
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.setAttribute("href", url)
    link.setAttribute("download", "products-to-collect.csv")
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Compact view for chat
  if (isCompact) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-4">
        <div className="flex justify-between items-center mb-3">
          <div>
            <h3 className="font-medium flex items-center gap-2">
              <ShoppingBag className="h-4 w-4" />
              {defaultTitle}
            </h3>
            <p className="text-sm text-gray-500">{generatedSubtitle}</p>
          </div>
          <Dialog open={isFullViewOpen} onOpenChange={setIsFullViewOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                {t("viewAll")}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] max-h-[80vh]">
              <DialogHeader>
                <DialogTitle>{defaultTitle}</DialogTitle>
              </DialogHeader>
              <div className="mt-2">
                <FullProductView products={products} subtitle={generatedSubtitle} onDownload={downloadCsv} />
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Preview of first few products */}
        <div className="space-y-2">
          {Object.entries(groupedProducts)
            .slice(0, 1)
            .map(([category, categoryProducts]) => (
              <div key={category}>
                <div className="text-sm font-medium text-gray-500 mb-1">{category}</div>
                {categoryProducts.slice(0, 2).map((product) => (
                  <div key={product.id} className="flex justify-between items-center py-1 border-b">
                    <span className="text-sm truncate" style={{ maxWidth: "70%" }}>
                      {product.name}
                    </span>
                    <Badge variant="outline">{t("quantityPcs", { count: product.quantity })}</Badge>
                  </div>
                ))}
                {categoryProducts.length > 2 && (
                  <div className="text-xs text-gray-500 mt-1">
                    {t("moreProducts", { count: categoryProducts.length - 2 })}
                  </div>
                )}
              </div>
            ))}
          {Object.keys(groupedProducts).length > 1 && (
            <div className="text-xs text-gray-500 mt-1">
              {t("moreCategories", { count: Object.keys(groupedProducts).length - 1 })}
            </div>
          )}
        </div>
      </div>
    )
  }

  // Full view (used both standalone and in dialog)
  return <FullProductView products={products} subtitle={generatedSubtitle} onDownload={downloadCsv} />
}

function FullProductView({
  products,
  subtitle,
  onDownload,
}: {
  products: Product[]
  subtitle: string
  onDownload: () => void
}) {
  const t = useTranslations("Dashboard")
  const [searchTerm, _setSearchTerm] = useState("")
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [isFullViewOpen, setIsFullViewOpen] = useState(false)
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({})

  // Group products by category
  const groupedProducts = products.reduce(
    (acc, product) => {
      const category = product.category || t("uncategorized")
      if (!acc[category]) {
        acc[category] = []
      }
      acc[category].push(product)
      return acc
    },
    {} as Record<string, Product[]>,
  )

  // Filter products based on search term
  const filteredGroups = Object.entries(groupedProducts).reduce(
    (acc, [category, categoryProducts]) => {
      const filtered = categoryProducts.filter((product) =>
        product.name.toLowerCase().includes(searchTerm.toLowerCase()),
      )
      if (filtered.length > 0) {
        acc[category] = filtered
      }
      return acc
    },
    {} as Record<string, Product[]>,
  )

  // Toggle category open/closed
  const toggleCategory = (category: string) => {
    setOpenCategories((prev) => ({
      ...prev,
      [category]: !prev[category],
    }))
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-500">{subtitle}</p>
        <Button variant="outline" size="sm" onClick={onDownload}>
          <Download className="h-4 w-4 mr-2" />
          {t("download")}
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
        <Input
          placeholder={t("searchProducts")}
          className="pl-8"
          value={searchTerm}
          onChange={(e) => _setSearchTerm(e.target.value)}
        />
        {searchTerm && (
          <button className="absolute right-2 top-2.5" onClick={() => _setSearchTerm("")} aria-label={t("clearSearch")}>
            <X className="h-4 w-4 text-gray-400" />
          </button>
        )}
      </div>

      <ScrollArea className="h-[400px] pr-4">
        <div className="space-y-4">
          {Object.keys(filteredGroups).length === 0 ? (
            <div className="text-center py-8 text-gray-500">{t("noProductsFound")}</div>
          ) : (
            Object.entries(filteredGroups).map(([category, categoryProducts]) => (
              <Collapsible
                key={category}
                open={openCategories[category] !== false}
                onOpenChange={() => toggleCategory(category)}
              >
                <div className="bg-gray-50 rounded-md">
                  <CollapsibleTrigger className="flex w-full justify-between items-center p-3 text-left">
                    <div className="flex items-center">
                      <span className="font-medium">{category}</span>
                      <Badge variant="outline" className="ml-2">
                        {categoryProducts.length}
                      </Badge>
                    </div>
                    {openCategories[category] !== false ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="px-3 pb-3">
                      <div className="bg-white rounded border">
                        <div className="grid grid-cols-2 gap-4 p-3 border-b text-sm font-medium text-gray-500">
                          <div>{t("productName")}</div>
                          <div className="text-right">{t("quantity")}</div>
                        </div>
                        {categoryProducts.map((product) => (
                          <div
                            key={product.id}
                            className="grid grid-cols-2 gap-4 p-3 border-b last:border-0 items-center"
                          >
                            <div className="truncate">{product.name}</div>
                            <div className="text-right">
                              <Badge
                                variant="outline"
                                className={cn(
                                  "font-medium",
                                  product.quantity > 5
                                    ? "bg-green-50 text-green-700 border-green-200"
                                    : product.quantity > 2
                                      ? "bg-blue-50 text-blue-700 border-blue-200"
                                      : "bg-amber-50 text-amber-700 border-amber-200",
                                )}
                              >
                                {t("quantityPcs", { count: product.quantity })}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  )
} 