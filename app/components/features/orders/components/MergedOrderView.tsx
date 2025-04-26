import { Badge } from "@/app/components/shared/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/shared/ui/card"
import { OrdersResponse } from "@/app/types/pocketbase-types"
import { UtilityService } from "@/app/services/utilityService"
import { useState, useEffect } from "react"

interface MergedOrderViewProps {
  order: OrdersResponse
  originalOrders?: OrdersResponse[]
  translations: {
    ordersFromSource: (number: string, source: string) => Promise<string>
    ordersCombined: (count: number) => Promise<string>
    originalOrders: string
  }
}

export function MergedOrderView({ order, originalOrders, translations }: MergedOrderViewProps) {
  const [orderTitle, setOrderTitle] = useState<string>("")
  const [combinedText, setCombinedText] = useState<string>("")

  useEffect(() => {
    async function loadTranslations() {
      if (order) {
        const title = await translations.ordersFromSource(order.orderNumber ?? '', order.source ?? '')
        setOrderTitle(title)
      }
      if (originalOrders?.length) {
        const combined = await translations.ordersCombined(originalOrders.length)
        setCombinedText(combined)
      }
    }
    loadTranslations()
  }, [order, originalOrders, translations])

  if (!originalOrders?.length) return null

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <h3 className="text-lg font-semibold">{translations.originalOrders}</h3>
        <Badge variant="secondary">
          {combinedText}
        </Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">
            {orderTitle}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <strong>Customer:</strong> {order.fullName}
              </div>
              <div>
                <strong>Phone:</strong> {order.phoneNumber}
              </div>
              <div>
                <strong>Total Items:</strong> {order.numberOfItems}
              </div>
              <div>
                <strong>Total Amount:</strong>{" "}
                {UtilityService.formatCurrency(order.amount)}
              </div>
            </div>

            <div>
              <h4 className="font-semibold mb-2">Original Orders</h4>
              <div className="grid gap-2">
                {originalOrders.map((originalOrder) => (
                  <div
                    key={originalOrder.id}
                    className="p-2 bg-muted rounded-lg text-sm"
                  >
                    <div className="flex justify-between mb-1">
                      <span>
                        #{originalOrder.orderNumber} from {originalOrder.source}
                      </span>
                      <span>
                        {UtilityService.formatCurrency(
                          originalOrder.amount
                        )}
                      </span>
                    </div>
                    <div className="text-muted-foreground">
                      {originalOrder.numberOfItems} items
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 