import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/shared/ui/card"
import { OrdersResponse, CurrencyOptionsResponse } from '@/app/types/pocketbase-types'
import { UtilityService } from '@/app/services/utilityService'
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts'
import { ArrowUpIcon } from "lucide-react"

interface OrderStatsProps {
  orders: (OrdersResponse & { expand?: { currency?: CurrencyOptionsResponse } })[]
  translations: {
    totalAmount: string
    totalOrders: string
  }
}

export function OrderStats({ orders, translations }: OrderStatsProps) {
  const totalAmount = orders.reduce((sum, order) => sum + Number(order.amount), 0)
  const totalOrders = orders.length

  // Generate data for the last 7 days
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date()
    date.setDate(date.getDate() - (6 - i)) // This makes today the last point
    return date
  })

  const amountData = last7Days.map(date => {
    const dayStart = new Date(date)
    dayStart.setHours(0, 0, 0, 0)
    const dayEnd = new Date(date)
    dayEnd.setHours(23, 59, 59, 999)

    const dayAmount = orders
      .filter(order => {
        const orderDate = new Date(order.created)
        return orderDate >= dayStart && orderDate <= dayEnd
      })
      .reduce((sum, order) => sum + Number(order.amount), 0)

    return {
      date: date.toISOString().split('T')[0],
      amount: dayAmount
    }
  })

  const ordersData = last7Days.map(date => {
    const dayStart = new Date(date)
    dayStart.setHours(0, 0, 0, 0)
    const dayEnd = new Date(date)
    dayEnd.setHours(23, 59, 59, 999)

    return {
      date: date.toISOString().split('T')[0],
      count: orders.filter(order => {
        const orderDate = new Date(order.created)
        return orderDate >= dayStart && orderDate <= dayEnd
      }).length
    }
  })

  return (
    <div className="space-y-4">
      <div className="grid gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {translations.totalAmount}
            </CardTitle>
            <ArrowUpIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {UtilityService.formatCurrency(totalAmount)}
            </div>
            <div className="h-[80px] mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={amountData}>
                  <XAxis 
                    dataKey="date" 
                    hide 
                  />
                  <YAxis hide />
                  <Tooltip 
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="rounded-lg border bg-background p-2 shadow-sm">
                            <div className="flex flex-col gap-1">
                              <span className="text-[0.70rem] uppercase text-muted-foreground">
                                {new Date(payload[0].payload.date).toLocaleDateString()}
                              </span>
                              <span className="font-bold text-muted-foreground">
                                {UtilityService.formatCurrency(payload[0].value as number)}
                              </span>
                            </div>
                          </div>
                        )
                      }
                      return null
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="amount"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {translations.totalOrders}
            </CardTitle>
            <ArrowUpIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalOrders}
            </div>
            <div className="h-[80px] mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={ordersData}>
                  <XAxis 
                    dataKey="date" 
                    hide 
                  />
                  <YAxis hide />
                  <Tooltip 
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="rounded-lg border bg-background p-2 shadow-sm">
                            <div className="flex flex-col gap-1">
                              <span className="text-[0.70rem] uppercase text-muted-foreground">
                                {new Date(payload[0].payload.date).toLocaleDateString()}
                              </span>
                              <span className="font-bold text-muted-foreground">
                                {payload[0].value} orders
                              </span>
                            </div>
                          </div>
                        )
                      }
                      return null
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 