import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/app/components/shared/ui/dialog"
import { Button } from "@/app/components/shared/ui/button"
import { OrdersResponse } from "@/app/types/pocketbase-types"
import { ScrollArea } from "@/app/components/shared/ui/scroll-area"
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/shared/ui/card"
import { UtilityService } from "@/app/services/utilityService"
import { useState, useEffect } from "react"

interface MergeConfirmationDialogProps {
  isOpen: boolean
  orders: OrdersResponse[]
  onClose: () => void
  onConfirm: (orders: OrdersResponse[]) => void
  translations: {
    ordersFromSource: (number: string, source: string) => Promise<string>
    mergeConfirmation: string
    mergeDescription: string
    mergedOrderSummary: string
    totalItems: string
    totalAmount: string
    cancel: string
    confirm: string
  }
}

export function MergeConfirmationDialog({
  isOpen,
  orders,
  onClose,
  onConfirm,
  translations
}: MergeConfirmationDialogProps) {
  const [orderTitles, setOrderTitles] = useState<Record<string, string>>({})
  const totalAmount = orders.reduce((sum, order) => sum + order.amount, 0)
  const totalItems = orders.reduce((sum, order) => sum + order.numberOfItems, 0)

  useEffect(() => {
    const sourceIds = {
      pj9sejm9vqtu8xq: 'Epicentr',
      gfzk8nxfokgu9ku: 'PromUa',
      '4tvf116a5aitwmb': 'Rozetka'
    }
    async function loadTranslations() {
      const titles: Record<string, string> = {}
      for (const order of orders) {
        titles[order.id] = await translations.ordersFromSource(
          order.orderNumber, 
          sourceIds[order.source as keyof typeof sourceIds]
        )
      }
      setOrderTitles(titles)
    }
    if (isOpen) {
      loadTranslations()
    }
  }, [isOpen, orders, translations])

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{translations.mergeConfirmation}</DialogTitle>
          <DialogDescription>
            {translations.mergeDescription}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] mt-4">
          <div className="space-y-4">
            {orders.map((order) => (
              <Card key={order.id}>
                <CardHeader>
                  <CardTitle className="text-sm">
                    {orderTitles[order.id]}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <strong>Customer:</strong> {order.fullName}
                    </div>
                    <div>
                      <strong>Phone:</strong> {order.phoneNumber}
                    </div>
                    <div>
                      <strong>Items:</strong> {order.numberOfItems}
                    </div>
                    <div>
                      <strong>Amount:</strong> {UtilityService.formatCurrency(order.amount)}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>

        <div className="mt-4 p-4 bg-muted rounded-lg">
          <h4 className="font-semibold mb-2">{translations.mergedOrderSummary}</h4>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>{translations.totalItems}: {totalItems}</div>
            <div>{translations.totalAmount}: {UtilityService.formatCurrency(totalAmount)}</div>
          </div>
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={onClose}>
            {translations.cancel}
          </Button>
          <Button onClick={() => onConfirm(orders)}>
            {translations.confirm}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 