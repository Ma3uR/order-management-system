"use client"

import { useState } from "react"
import { OrderDetails } from "./order-details"
import { Input } from "@/app/components/shared/ui/input"
import { Search } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/app/components/shared/ui/table"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/app/components/shared/ui/pagination"
import { Badge } from "@/app/components/shared/ui/badge"
import { UtilityService } from "@/app/services/utilityService"

// This would be replaced with your actual type from the schema
type Product = {
  id: string
  name: string
  title?: string  // Add title as optional property for compatibility
  quantity: number
  price: number
}

// Use AiOrder for AI-generated orders that don't come directly from PocketBase
export type AiOrder = {
  id: string
  orderNumber: string
  marketplaceIds?: string
  source: string
  deliveryMethod: string
  deliveryPostNumber?: string
  phoneNumber: string
  fullName: string
  customer?: string  // Add customer field as alternative to fullName
  products: Product[]
  numberOfItems: number
  amount: number
  total?: number  // Add total as an alternative to amount for API responses
  status: string
  currency: string
  currencyCode?: string  // Some API responses use currencyCode instead of currency
  currencySymbol?: string  // Some API responses include currency symbol
  paymentMethod: string
  notes?: string
  mergeStatus: string
  mergedWithOrderId?: string
  originalOrders?: Record<string, unknown>[] | null
  mergeSource: string
  archived?: boolean
  productionCost?: number
  createdAt: string
  statusName?: string  // Some API responses use statusName instead of status
  itemsCount?: number  // Some API responses use itemsCount instead of numberOfItems
  items?: {name: string, quantity: number, price: number}[]  // Some API responses use items instead of products
}

// For backward compatibility, Order is an alias to AiOrder
export type Order = AiOrder

type OrderListProps = {
  orders: Order[]
  isLoading?: boolean
}

export function OrderList({ orders, isLoading = false }: OrderListProps) {
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const ordersPerPage = 10

  // Filter orders based on search term
  const filteredOrders = orders.filter(
    (order) => {
      const searchTermLower = searchTerm.toLowerCase();
      return (
        ((order.orderNumber || "")?.toLowerCase().includes(searchTermLower)) || 
        ((order.fullName || "")?.toLowerCase().includes(searchTermLower)) ||
        ((order.customer || "")?.toLowerCase().includes(searchTermLower)) || 
        ((order.phoneNumber || "")?.toLowerCase().includes(searchTermLower))
      );
    }
  )

  // Calculate pagination
  const indexOfLastOrder = currentPage * ordersPerPage
  const indexOfFirstOrder = indexOfLastOrder - ordersPerPage
  const currentOrders = filteredOrders.slice(indexOfFirstOrder, indexOfLastOrder)
  const totalPages = Math.ceil(filteredOrders.length / ordersPerPage)

  const handleOrderClick = (order: Order) => {
    setSelectedOrder(order)
  }

  const handleCloseDetails = () => {
    setSelectedOrder(null)
  }

  // Function to determine status badge color
  const getStatusColor = (status: string) => {
    // Default to empty string if status is undefined
    const statusValue = status || "";
    switch (statusValue.toLowerCase()) {
      case "completed":
        return "bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400 border-green-200 dark:border-green-800"
      case "processing":
        return "bg-amber-100 dark:bg-amber-900/20 text-amber-800 dark:text-amber-400 border-amber-200 dark:border-amber-800"
      case "pending":
        return "bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800"
      case "cancelled":
        return "bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-400 border-red-200 dark:border-red-800"
      default:
        return "bg-muted text-muted-foreground border-border"
    }
  }

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
    }).format(date)
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-medium text-foreground">Orders ({filteredOrders.length})</h2>
        <div className="relative w-64">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search orders..."
            className="pl-8 h-9"
            value={searchTerm}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {currentOrders.length === 0 ? (
        <div className="text-center py-6 bg-muted rounded-lg">
          <p className="text-muted-foreground text-sm">No orders found</p>
        </div>
      ) : (
        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order #</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentOrders.map((order) => (
                <TableRow
                  key={order.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleOrderClick(order)}
                >
                  <TableCell className="font-medium">
                    {order.orderNumber.includes("**") 
                      ? order.orderNumber.replace(/\*\*[^*]*\*\*/g, "").split("\\n-")[0].trim() 
                      : order.orderNumber}
                  </TableCell>
                  <TableCell>
                    {order.fullName ? 
                      (order.fullName.includes("**") ? order.fullName.replace(/\*\*/g, "") : order.fullName) 
                      : (order.customer || "Unknown Customer")}
                  </TableCell>
                  <TableCell>{formatDate(order.createdAt)}</TableCell>
                  <TableCell>
                    {typeof order.amount === 'number' && !isNaN(order.amount) 
                      ? UtilityService.formatCurrency(order.amount)
                      : (order.total && typeof order.total === 'number')
                        ? UtilityService.formatCurrency(order.total)
                        : "N/A"}
                  </TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(order.status || order.statusName || '')}>
                      {order.status || order.statusName || 'Unknown'}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {filteredOrders.length > ordersPerPage && (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                className={currentPage === 1 ? "pointer-events-none opacity-50" : ""}
              />
            </PaginationItem>
            <PaginationItem>
              <span className="text-sm px-4">
                {currentPage} / {totalPages}
              </span>
            </PaginationItem>
            <PaginationItem>
              <PaginationNext
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                className={currentPage === totalPages ? "pointer-events-none opacity-50" : ""}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}

      {selectedOrder && <OrderDetails order={selectedOrder} onClose={handleCloseDetails} />}
    </div>
  )
}
