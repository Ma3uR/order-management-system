"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/app/components/shared/ui/dialog"
import { Button } from "@/app/components/shared/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/app/components/shared/ui/table"
import { Badge } from "@/app/components/shared/ui/badge"
import { Separator } from "@/app/components/shared/ui/separator"
import { UtilityService } from "@/app/services/utilityService"
import type { Order } from "./order-list"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/shared/ui/tabs"

// Use more precise types based on actual API responses
type ApiOrderItem = {
  name: string;
  quantity: number;
  price: number;
}

type ApiOrder = {
  id: string;
  orderNumber: string;
  createdAt: string;
  statusName: string;
  customer: string;
  total: number;
  currencyCode: string;
  currencySymbol: string;
  paymentMethod: string;
  deliveryMethod: string;
  itemsCount: number;
  items: ApiOrderItem[];
}

type OrderDetailsProps = {
  order: Order | ApiOrder;
  onClose: () => void;
}

// Function to standardize order data regardless of source
function normalizeOrder(order: Order | ApiOrder): {
  id: string;
  orderNumber: string;
  status: string;
  createdAt: string;
  customerName: string;
  amount: number;
  currency: string;
  currencySymbol?: string;
  paymentMethod: string;
  deliveryMethod: string;
  deliveryPostNumber?: string;
  phoneNumber?: string;
  notes?: string;
  products: { id: string; name: string; quantity: number; price: number }[];
} {
  if ('items' in order) {
    // It's an ApiOrder
    return {
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.statusName || '',
      createdAt: order.createdAt,
      customerName: order.customer || '',
      amount: order.total || 0,
      currency: order.currencyCode || '',
      currencySymbol: order.currencySymbol || '',
      paymentMethod: order.paymentMethod || '',
      deliveryMethod: order.deliveryMethod || '',
      phoneNumber: order.customer?.match(/\(\+\d+\)/)?.toString().replace(/[()]/g, '') || '',
      products: order.items?.map((item, index) => ({
        id: `item-${index}`,
        name: item.name,
        quantity: item.quantity,
        price: item.price
      })) || []
    };
  } else {
    // It's our internal Order type
    return {
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      createdAt: order.createdAt,
      customerName: order.fullName || order.customer || '',
      amount: order.amount,
      currency: order.currency,
      paymentMethod: order.paymentMethod,
      deliveryMethod: order.deliveryMethod,
      deliveryPostNumber: order.deliveryPostNumber,
      phoneNumber: order.phoneNumber,
      notes: order.notes,
      products: Array.isArray(order.products) ? order.products.map(p => ({
        id: p.id || `product-${Math.random()}`,
        name: p.name || p.title || '',
        quantity: p.quantity || 0,
        price: p.price || 0
      })) : []
    };
  }
}

export function OrderDetails({ order, onClose }: OrderDetailsProps) {
  const normalizedOrder = normalizeOrder(order);

  return (
    <Dialog open={true} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-background opacity-100 z-50">
        <DialogHeader>
          <DialogTitle className="flex justify-between items-center">
            <span>Order #{normalizedOrder.orderNumber || "Unknown"}</span>
            <Badge
              className={
                (() => {
                  // Default to empty string if status is undefined
                  const status = normalizedOrder.status || "";
                  if (status.toLowerCase() === "completed") return "bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400";
                  if (status.toLowerCase() === "processing") return "bg-amber-100 dark:bg-amber-900/20 text-amber-800 dark:text-amber-400";
                  if (status.toLowerCase() === "pending") return "bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-400";
                  if (status.toLowerCase() === "cancelled") return "bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-400";
                  return "bg-muted text-muted-foreground";
                })()
              }
            >
              {normalizedOrder.status || "Unknown"}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="details">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="products">Products</TabsTrigger>
            <TabsTrigger value="customer">Customer</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-4 pt-3">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-muted-foreground">Order Date</p>
                <p>{normalizedOrder.createdAt ? new Date(normalizedOrder.createdAt).toLocaleDateString() : "Unknown date"}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Total Amount</p>
                <p className="font-medium">
                  {typeof normalizedOrder.amount === 'number' && !isNaN(normalizedOrder.amount) 
                    ? UtilityService.formatCurrency(normalizedOrder.amount) 
                    : "Amount unavailable"}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Payment Method</p>
                <p>{normalizedOrder.paymentMethod || "Not specified"}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Source</p>
                <p>{'source' in order ? order.source : (normalizedOrder.deliveryMethod || "Unknown source")}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Delivery Method</p>
                <p>{normalizedOrder.deliveryMethod || "Not specified"}</p>
              </div>
              {normalizedOrder.deliveryPostNumber && (
                <div>
                  <p className="text-muted-foreground">Post Number</p>
                  <p>{normalizedOrder.deliveryPostNumber}</p>
                </div>
              )}
            </div>

            {normalizedOrder.notes && (
              <>
                <Separator />
                <div>
                  <p className="text-muted-foreground text-sm mb-1">Notes</p>
                  <p className="text-sm p-2 bg-muted rounded-md text-foreground">{normalizedOrder.notes}</p>
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="products" className="pt-3">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {normalizedOrder.products.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell>{product.name || "Unknown Product"}</TableCell>
                    <TableCell className="text-right">{product.quantity || 0}</TableCell>
                    <TableCell className="text-right">
                      {typeof product.price === 'number' && !isNaN(product.price) && typeof product.quantity === 'number' && !isNaN(product.quantity)
                        ? UtilityService.formatCurrency(product.price * product.quantity)
                        : "N/A"}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow>
                  <TableCell colSpan={2} className="text-right font-medium">
                    Total
                  </TableCell>
                  <TableCell className="text-right font-bold">
                    {typeof normalizedOrder.amount === 'number' && !isNaN(normalizedOrder.amount)
                      ? UtilityService.formatCurrency(normalizedOrder.amount)
                      : "N/A"}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TabsContent>

          <TabsContent value="customer" className="pt-3">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-muted-foreground">Full Name</p>
                <p>{normalizedOrder.customerName || "Not provided"}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Phone Number</p>
                <p>{normalizedOrder.phoneNumber || "Not provided"}</p>
              </div>
              {'mergeStatus' in order && (
                <>
                  <div>
                    <p className="text-muted-foreground">Merge Status</p>
                    <p>{order.mergeStatus || "Not merged"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Merge Source</p>
                    <p>{order.mergeSource || "Not applicable"}</p>
                  </div>
                </>
              )}
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="mt-4">
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
          <Button size="sm">Print Order</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
