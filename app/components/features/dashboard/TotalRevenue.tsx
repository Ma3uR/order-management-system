"use client"

import { useState, useEffect } from "react"
import { useTheme } from 'next-themes'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/app/components/shared/ui/card"
import { Button } from "@/app/components/shared/ui/button"
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { motion } from "framer-motion"
import { useTranslations } from 'next-intl'

// Real data will be provided via props and calculated in fetchDataForFilter

const fetchDataForFilter = (filter: string, monthlyData: number[]) => {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const currentMonth = new Date().getMonth();
  
  if (filter === "Last 7 days") {
    // Get last 7 days of data - for simplicity, use last 7 months
    const last7Months = [];
    for (let i = 6; i >= 0; i--) {
      const monthIndex = (currentMonth - i + 12) % 12;
      last7Months.push({
        date: months[monthIndex],
        current: monthlyData[monthIndex] || 0,
        previous: monthlyData[(monthIndex - 1 + 12) % 12] || 0
      });
    }
    return last7Months;
  }
  
  if (filter === "Last 3 months") {
    const last3Months = [];
    for (let i = 2; i >= 0; i--) {
      const monthIndex = (currentMonth - i + 12) % 12;
      last3Months.push({
        date: months[monthIndex],
        current: monthlyData[monthIndex] || 0,
        previous: monthlyData[(monthIndex - 1 + 12) % 12] || 0
      });
    }
    return last3Months;
  }
  
  // Last 30 days (12 months)
  return months.map((month, index) => ({
    date: month,
    current: monthlyData[index] || 0,
    previous: monthlyData[(index - 1 + 12) % 12] || 0
  }));
}

interface TotalRevenueProps {
  value: string;
  change: {
    value: string;
    positive: boolean;
  };
  data: number[];
  className?: string;
}

export function TotalRevenue({ value, change, data, className }: TotalRevenueProps) {
  const t = useTranslations('Dashboard');
  const { theme, systemTheme } = useTheme();
  const [activeFilter, setActiveFilter] = useState("Last 30 days")
  const [chartData, setChartData] = useState(fetchDataForFilter(activeFilter, data))
  
  // Determine if we're in dark mode
  const isDarkMode = theme === 'dark' || (theme === 'system' && systemTheme === 'dark');
  const textColor = isDarkMode ? '#ffffff' : '#000000';
  const borderColor = isDarkMode ? '#374151' : '#e5e7eb';
  
  // Update chart data when data prop changes
  useEffect(() => {
    setChartData(fetchDataForFilter(activeFilter, data));
  }, [data, activeFilter]);

  const handleFilterChange = (filter: string) => {
    setActiveFilter(filter)
    setChartData(fetchDataForFilter(filter, data))
  }

  const filters = ["Last 3 months", "Last 30 days", "Last 7 days"]

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={className}
    >
      <Card className="shadow-md">
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
            <div>
              <CardTitle className="text-xl font-semibold text-foreground">{t('totalRevenue')}</CardTitle>
              <CardDescription className="text-muted-foreground">
                {value} ({change.positive ? '+' : ''}{change.value})
              </CardDescription>
            </div>
            <div className="flex space-x-1 mt-2 sm:mt-0 p-1 bg-muted rounded-md">
              {filters.map((filter) => (
                <Button
                  key={filter}
                  variant="ghost"
                  size="sm"
                  onClick={() => handleFilterChange(filter)}
                  className={`text-xs sm:text-sm h-8 px-2 sm:px-3 ${
                    activeFilter === filter
                      ? "bg-accent text-accent-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-accent/50"
                  }`}
                >
                  {filter}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div style={{ width: "100%", height: 300 }}>
            <ResponsiveContainer>
              <AreaChart data={chartData} margin={{ top: 5, right: 20, left: -25, bottom: 5 }}>
                <defs>
                  <linearGradient id="colorCurrent" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0.05} />
                  </linearGradient>
                  <linearGradient id="colorPrevious" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={borderColor} opacity={0.5} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12, fill: textColor }}
                  axisLine={{ stroke: borderColor }}
                  tickLine={{ stroke: borderColor }}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: textColor }}
                  axisLine={{ stroke: borderColor }}
                  tickLine={{ stroke: borderColor }}
                  tickFormatter={(value) => `€${value}`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    borderColor: "hsl(var(--border))",
                    borderRadius: "var(--radius-md)",
                    color: "hsl(var(--card-foreground))",
                  }}
                  labelStyle={{ fontWeight: "bold", color: "hsl(var(--card-foreground))" }}
                  formatter={(value: number, name: string) => [
                    `€${value.toFixed(2)}`,
                    name === "current" ? "Current Period" : "Previous Period"
                  ]}
                />
                <Area
                  type="monotone"
                  dataKey="previous"
                  stroke="#10b981"
                  fillOpacity={1}
                  fill="url(#colorPrevious)"
                  strokeWidth={2}
                  name="Previous Period"
                />
                <Area
                  type="monotone"
                  dataKey="current"
                  stroke="#22c55e"
                  fillOpacity={1}
                  fill="url(#colorCurrent)"
                  strokeWidth={2}
                  name="Current Period"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}