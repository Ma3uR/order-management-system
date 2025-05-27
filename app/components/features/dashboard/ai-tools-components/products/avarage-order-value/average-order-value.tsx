import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/shared/ui/card"
import { Skeleton } from "@/app/components/shared/ui/skeleton"
import { useTranslations } from "next-intl"

type AverageOrderValueComponentProps = {
  averageValue: number
  ordersCount: number
  totalAmount: number
  period: { start: string; end: string }
  source?: string
  isLoading?: boolean
}

export function AverageOrderValueComponent({ 
  averageValue, 
  ordersCount, 
  totalAmount,
  period, 
  source,
  isLoading = false 
}: AverageOrderValueComponentProps) {
  const t = useTranslations('Dashboard')
  const periodText = `${period.start} - ${period.end}`
  
  // Format currency values
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('uk-UA', { 
      style: 'currency', 
      currency: 'UAH',
      minimumFractionDigits: 2
    }).format(value)
  }

  return (
    <Card className="border-0 shadow-none">
      <CardHeader className="px-0 pt-0">
        <CardTitle className="text-lg font-semibold">
          {t('averageOrderValue.title')}
          {source && <span className="ml-1 text-muted-foreground">({source})</span>}
        </CardTitle>
        <p className="text-sm text-muted-foreground">{periodText}</p>
      </CardHeader>
      <CardContent className="px-0 pb-0">
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-16 w-full" />
            <div className="flex gap-4">
              <Skeleton className="h-10 w-1/2" />
              <Skeleton className="h-10 w-1/2" />
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-col">
              <span className="text-3xl font-bold text-primary">
                {formatCurrency(averageValue)}
              </span>
              <span className="text-sm text-muted-foreground">
                {t('averageOrderValue.perOrder')}
              </span>
            </div>
            
            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="flex flex-col">
                <span className="text-sm font-medium text-muted-foreground">
                  {t('averageOrderValue.totalOrders')}
                </span>
                <span className="text-lg font-semibold">{ordersCount}</span>
              </div>
              
              <div className="flex flex-col">
                <span className="text-sm font-medium text-muted-foreground">
                  {t('averageOrderValue.totalAmount')}
                </span>
                <span className="text-lg font-semibold">{formatCurrency(totalAmount)}</span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
} 