import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { LineChart } from "./line-chart"

interface StatsCardProps {
  title: string
  value: string
  change: {
    value: string
    positive: boolean
  }
  data: number[]
}

export function StatsCard({ title, value, change, data }: StatsCardProps) {
  return (
    <Card className="bg-background/60 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-1">
          <div className="flex items-baseline justify-between">
            <div className="text-2xl font-bold">{value}</div>
            <span className={`text-sm ${change.positive ? 'text-emerald-500' : 'text-rose-500'}`}>
              {change.value}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            Compared to last month
          </p>
          <div className="h-[40px] mt-2">
            <LineChart data={data} positive={change.positive} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

