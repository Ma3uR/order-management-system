import { AverageOrderValueComponent } from "./average-order-value"

type AverageOrderValueToolProps = {
  averageValue: number
  ordersCount: number
  totalAmount: number
  period: { start: string; end: string }
  source?: string
  isLoading?: boolean
}

export function AverageOrderValueTool({ 
  averageValue, 
  ordersCount, 
  totalAmount,
  period, 
  source,
  isLoading = false 
}: AverageOrderValueToolProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm border p-3">
      <AverageOrderValueComponent 
        averageValue={averageValue}
        ordersCount={ordersCount}
        totalAmount={totalAmount}
        period={period}
        source={source}
        isLoading={isLoading} 
      />
    </div>
  )
}
