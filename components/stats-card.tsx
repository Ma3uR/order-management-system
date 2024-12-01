import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { LineChart } from "@/components/line-chart"
import { motion } from "framer-motion"

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
    <motion.div
      initial={{ scale: 0.95, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm md:text-base font-medium">
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="text-xl md:text-2xl font-bold">{value}</div>
              <p className={`text-xs md:text-sm ${
                change.positive ? 'text-green-500' : 'text-red-500'
              }`}>
                {change.value}
              </p>
            </div>
            <div className="w-full sm:w-44 h-12 md:h-16">
              <LineChart 
                data={data} 
                strokeColor={change.positive ? '#10B981' : '#EF4444'}
                filled
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

