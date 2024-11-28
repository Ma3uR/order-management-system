"use client"

import { Line, LineChart as RechartsLineChart, ResponsiveContainer } from "recharts"

interface LineChartProps {
  data: number[]
  positive?: boolean
}

export function LineChart({ data, positive = true }: LineChartProps) {
  const chartData = data.map(value => ({ value }))

  return (
    <ResponsiveContainer width="100%" height="100%">
      <RechartsLineChart data={chartData}>
        <Line
          type="monotone"
          dataKey="value"
          stroke={positive ? "rgb(16, 185, 129)" : "rgb(239, 68, 68)"}
          strokeWidth={1.5}
          dot={false}
          activeDot={false}
        />
      </RechartsLineChart>
    </ResponsiveContainer>
  )
}

