"use client"

import { Button } from "@/app/components/shared/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/app/components/shared/ui/dialog"
import { Badge } from "@/app/components/shared/ui/badge"
import { ScrollArea } from "@/app/components/shared/ui/scroll-area"
import { Separator } from "@/app/components/shared/ui/separator"

// Assuming Order and Source types are available/imported
type Order = {
  id: string
  orderNumber: string
  fullName: string
  phoneNumber: string
  status: string
  amount: number
  source: string // source ID
  created: string
  products: Array<{ title: string; quantity: number; price: number }>
  numberOfItems: number
  currency: string
}

type Source = {
  id: string
  name: string
  color?: string
}

interface ConfirmOrderMergeModalProps {
  isOpen: boolean
  onClose: () => void
  ordersToMerge: Order[]
  sources: Source[] // To display source names
  onConfirmMerge: (ordersToMerge: Order[]) => void
}

export function ConfirmOrderMergeModal({
  isOpen,
  onClose,
  ordersToMerge,
  sources,
  onConfirmMerge,
}: ConfirmOrderMergeModalProps) {
  if (!isOpen || ordersToMerge.length === 0) return null

  const getSourceName = (sourceId: string) => {
    return sources.find((s) => s.id === sourceId)?.name || "Unknown Source"
  }

  const mergedSummary = ordersToMerge.reduce(
    (acc, order) => {
      acc.totalItems += order.numberOfItems
      acc.totalAmount += order.amount
      if (!acc.marketplaceIds.includes(order.orderNumber)) {
        // Using orderNumber as a unique ID here for display
        acc.marketplaceIds.push(order.orderNumber)
      }
      return acc
    },
    { totalItems: 0, totalAmount: 0, marketplaceIds: [] as string[] },
  )

  const handleConfirm = () => {
    // TODO: Add loading state
    onConfirmMerge(ordersToMerge)
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl w-[90vw] p-0">
        <DialogHeader className="p-6 pb-4 border-b">
          <DialogTitle className="text-xl font-semibold">Confirm Order Merge</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Review the orders below before confirming the merge. All orders will be combined into a single order.
          </p>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          <div className="p-6 space-y-6">
            {ordersToMerge.map((order, index) => (
              <div key={order.id}>
                <div className="p-4 border rounded-lg bg-slate-50 dark:bg-slate-800/50">
                  <h4 className="font-semibold mb-2">
                    Order #{order.orderNumber} from {getSourceName(order.source)}
                  </h4>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                    <p>
                      <span className="text-muted-foreground">Customer:</span> {order.fullName}
                    </p>
                    <p>
                      <span className="text-muted-foreground">Phone:</span> {order.phoneNumber}
                    </p>
                    <p>
                      <span className="text-muted-foreground">Items:</span> {order.numberOfItems}
                    </p>
                    <p>
                      <span className="text-muted-foreground">Amount:</span>{" "}
                      {order.amount.toLocaleString("uk-UA", { style: "currency", currency: order.currency })}
                    </p>
                  </div>
                </div>
                {index < ordersToMerge.length - 1 && <Separator className="my-6" />}
              </div>
            ))}
          </div>
        </ScrollArea>

        <div className="p-6 bg-slate-50 dark:bg-slate-800/50 border-t">
          <h4 className="font-semibold mb-3 text-lg">Merged Order Summary</h4>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <p>
              <span className="text-muted-foreground">Total Items:</span> {mergedSummary.totalItems}
            </p>
            <p>
              <span className="text-muted-foreground">Total Amount:</span>{" "}
              {mergedSummary.totalAmount.toLocaleString("uk-UA", {
                style: "currency",
                currency: "UAH" /* Assuming UAH for merged */,
              })}
            </p>
            <div className="col-span-2">
              <p className="text-muted-foreground">Original Order Numbers:</p>
              <div className="flex flex-wrap gap-1 mt-1">
                {mergedSummary.marketplaceIds.map((id) => (
                  <Badge key={id} variant="secondary">
                    {id}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="p-6 border-t">
          
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
         
          <Button onClick={handleConfirm} className="bg-primary hover:bg-primary/90 text-white">
            Confirm Merge
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
