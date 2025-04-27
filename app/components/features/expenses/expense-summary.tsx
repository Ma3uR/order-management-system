"use client"

import { Card, CardContent } from "@/app/components/shared/ui/card"
import { motion } from "framer-motion"
import { DollarSign, BarChart2, Clock, TrendingUp } from "lucide-react"
import { useTranslations } from 'next-intl'

export function ExpenseSummary() {
  const t = useTranslations('Expenses')
  
  // Sample summary data - in a real app, this would be calculated from actual expenses
  const summaryData = {
    totalSpent: 364.22,
    averagePerDay: 28.02,
    highestCategory: "Food & Dining",
    highestCategoryAmount: 108.74,
    percentChange: 12.5,
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {/* Total Spent Card */}
      <motion.div 
        whileHover={{ y: -5 }} 
        transition={{ type: "spring", stiffness: 300, damping: 15 }}
      >
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <div className="p-6">
              <div className="flex justify-between items-start mb-2">
                <div className="text-sm text-muted-foreground font-medium">
                  {t('totalSpent')}
                </div>
                <div className="bg-black dark:bg-black rounded-full p-2">
                  <DollarSign className="h-5 w-5 text-white" />
                </div>
              </div>
              <div className="text-3xl font-bold mb-1">${summaryData.totalSpent.toFixed(2)}</div>
              <div className="text-xs text-muted-foreground">{t('thisMonth')}</div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Daily Average Card */}
      <motion.div 
        whileHover={{ y: -5 }} 
        transition={{ type: "spring", stiffness: 300, damping: 15 }}
      >
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <div className="p-6">
              <div className="flex justify-between items-start mb-2">
                <div className="text-sm text-muted-foreground font-medium">
                  {t('dailyAverage')}
                </div>
                <div className="bg-black dark:bg-black rounded-full p-2">
                  <BarChart2 className="h-5 w-5 text-white" />
                </div>
              </div>
              <div className="text-3xl font-bold mb-1">${summaryData.averagePerDay.toFixed(2)}</div>
              <div className="text-xs text-muted-foreground">{t('perDay')}</div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Top Category Card */}
      <motion.div 
        whileHover={{ y: -5 }} 
        transition={{ type: "spring", stiffness: 300, damping: 15 }}
      >
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <div className="p-6">
              <div className="flex justify-between items-start mb-2">
                <div className="text-sm text-muted-foreground font-medium">
                  {t('topCategory')}
                </div>
                <div className="bg-black dark:bg-black rounded-full p-2">
                  <Clock className="h-5 w-5 text-white" />
                </div>
              </div>
              <div className="text-3xl font-bold mb-1">{summaryData.highestCategory}</div>
              <div className="text-xs text-muted-foreground">${summaryData.highestCategoryAmount.toFixed(2)}</div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Monthly Change Card */}
      <motion.div 
        whileHover={{ y: -5 }} 
        transition={{ type: "spring", stiffness: 300, damping: 15 }}
      >
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <div className="p-6">
              <div className="flex justify-between items-start mb-2">
                <div className="text-sm text-muted-foreground font-medium">
                  {t('monthlyChange')}
                </div>
                <div className="bg-black dark:bg-black rounded-full p-2">
                  <TrendingUp className="h-5 w-5 text-white" />
                </div>
              </div>
              <div className="text-3xl font-bold mb-1">
                {summaryData.percentChange > 0 ? "+" : ""}
                {summaryData.percentChange}%
              </div>
              <div className="text-xs text-muted-foreground">{t('fromLastMonth')}</div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
