import { Alert, AlertDescription, AlertTitle } from "@/app/components/shared/ui/alert"
import { Button } from "@/app/components/shared/ui/button"
import { OrdersResponse } from "@/app/types/pocketbase-types"
import { AlertCircle } from "lucide-react"
import { useTranslations } from "next-intl"

interface MergeNotificationProps {
  orders: OrdersResponse[]
  onConfirm: (orders: OrdersResponse[]) => void
  onReject: (orders: OrdersResponse[]) => void
}

export function MergeNotification({
  orders,
  onConfirm,
  onReject,
}: MergeNotificationProps) {
  const t = useTranslations('Orders.mergeNotification')
  
  if (!orders.length) return null

  const matchType = orders[0].mergeSource === 'phone' ? t('phoneMatch') : t('nameMatch')

  return (
    <Alert variant="default" className="mb-4">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>{t('title')}</AlertTitle>
      <AlertDescription className="mt-2">
        <p>
          {t('description', { count: orders.length, matchType })}
        </p>
        <div className="mt-4 space-x-2">
          <Button
            variant="default"
            onClick={() => onConfirm(orders)}
          >
            {t('confirmButton')}
          </Button>
          <Button
            variant="outline"
            onClick={() => onReject(orders)}
          >
            {t('rejectButton')}
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  )
} 