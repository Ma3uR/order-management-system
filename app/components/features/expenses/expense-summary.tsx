"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/app/components/shared/ui/card"
import { motion } from "framer-motion"
import { DollarSign, BarChart2, Clock, TrendingUp } from "lucide-react"
import { useTranslations } from 'next-intl'
import pb, { authenticatedCall } from "@/app/lib/pocketbase"
import { ExpensesResponse, ExpensesCategoriesResponse } from "@/app/types/pocketbase-types"

export function ExpenseSummary() {
  const t = useTranslations('Expenses')
  const [loading, setLoading] = useState(true)
  const [summaryData, setSummaryData] = useState({
    totalSpent: 0,
    averagePerDay: 0,
    highestCategory: "",
    highestCategoryColor: "#000000",
    highestCategoryAmount: 0,
    percentChange: 0,
  })

  useEffect(() => {
    async function fetchAndCalculateData() {
      try {
        setLoading(true)
        
        // Fetch categories for lookup
        const categories = await authenticatedCall(async () => 
          pb.collection('expenses_categories').getFullList<ExpensesCategoriesResponse>()
        )
        const categoryMap: {[key: string]: ExpensesCategoriesResponse} = {}
        categories.forEach(cat => {
          categoryMap[cat.id] = cat
        })
        
        // Get current month dates
        const now = new Date()
        const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
        const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)
        
        // Get previous month dates
        const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
        const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0)
        
        // Format dates for API
        const formatDate = (date: Date) => date.toISOString().split('T')[0]
        
        // Fetch current month expenses with expanded category relations
        const currentMonthExpenses = await authenticatedCall(async () => 
          pb.collection('expenses').getFullList<ExpensesResponse>({
            filter: `date >= "${formatDate(currentMonthStart)}" && date <= "${formatDate(currentMonthEnd)}"`,
            expand: 'category'
          })
        )
        
        // Fetch previous month expenses
        const prevMonthExpenses = await authenticatedCall(async () => 
          pb.collection('expenses').getFullList<ExpensesResponse>({
            filter: `date >= "${formatDate(prevMonthStart)}" && date <= "${formatDate(prevMonthEnd)}"`,
            expand: 'category'
          })
        )
        
        // Calculate total spent this month
        const totalSpent = currentMonthExpenses.reduce((sum, expense) => 
          sum + (expense.amount || 0), 0
        )
        
        // Calculate total spent last month
        const prevMonthTotal = prevMonthExpenses.reduce((sum, expense) => 
          sum + (expense.amount || 0), 0
        )
        
        // Calculate average per day
        const daysInMonth = currentMonthEnd.getDate()
        const averagePerDay = totalSpent / daysInMonth
        
        // Calculate percent change from last month
        const percentChange = prevMonthTotal === 0 
          ? 0 
          : ((totalSpent - prevMonthTotal) / prevMonthTotal) * 100
        
        // Group expenses by category
        const expensesByCategory: {[key: string]: number} = {}
        
        currentMonthExpenses.forEach(expense => {
          let categoryId: string | null = null;
          
          // Get category from either relation or expanded data
          if (expense.category) {
            categoryId = expense.category;
          } else if (expense.expand && expense.expand.category) {
            const expandedCategory = expense.expand.category as unknown as ExpensesCategoriesResponse;
            categoryId = expandedCategory.id;
          }
          
          if (categoryId) {
            if (!expensesByCategory[categoryId]) {
              expensesByCategory[categoryId] = 0;
            }
            expensesByCategory[categoryId] += expense.amount || 0;
          }
        })
        
        // Find highest category
        let highestCategory = ""
        let highestCategoryAmount = 0
        let highestCategoryColor = "#000000"
        
        Object.entries(expensesByCategory).forEach(([catId, amount]) => {
          if (amount > highestCategoryAmount) {
            highestCategoryAmount = amount
            
            // Get category details from lookup map or expanded data
            if (categoryMap[catId]) {
              highestCategory = categoryMap[catId].name;
              highestCategoryColor = categoryMap[catId].color || "#000000";
            } else {
              highestCategory = "Uncategorized";
            }
          }
        })
        
        setSummaryData({
          totalSpent,
          averagePerDay,
          highestCategory,
          highestCategoryColor,
          highestCategoryAmount,
          percentChange
        })
      } catch (error) {
        console.error("Error fetching expense summary data:", error)
      } finally {
        setLoading(false)
      }
    }
    
    fetchAndCalculateData()
  }, [])

  // Show placeholder cards while loading
  const isLoading = loading

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
              <div className={`text-3xl font-bold mb-1 ${isLoading ? "animate-pulse bg-gray-200 dark:bg-gray-700 h-8 w-24 rounded" : ""}`}>
                {!isLoading && `₴${summaryData.totalSpent.toFixed(2)}`}
              </div>
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
              <div className={`text-3xl font-bold mb-1 ${isLoading ? "animate-pulse bg-gray-200 dark:bg-gray-700 h-8 w-24 rounded" : ""}`}>
                {!isLoading && `₴${summaryData.averagePerDay.toFixed(2)}`}
              </div>
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
              <div className={`text-3xl font-bold mb-1 ${isLoading ? "animate-pulse bg-gray-200 dark:bg-gray-700 h-8 w-24 rounded" : ""}`}>
                {!isLoading && (
                  <span className="inline-flex items-center gap-2">
                    <span 
                      className="inline-block w-3 h-3 rounded-full" 
                      style={{ backgroundColor: summaryData.highestCategoryColor }} 
                    />
                    {summaryData.highestCategory || "None"}
                  </span>
                )}
              </div>
              <div className="text-xs text-muted-foreground">
                {!isLoading && `₴${summaryData.highestCategoryAmount.toFixed(2)}`}
              </div>
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
              <div className={`text-3xl font-bold mb-1 ${isLoading ? "animate-pulse bg-gray-200 dark:bg-gray-700 h-8 w-24 rounded" : ""}`}>
                {!isLoading && (
                  <span className={summaryData.percentChange > 0 ? 'text-red-500' : summaryData.percentChange < 0 ? 'text-green-500' : ''}>
                    {summaryData.percentChange > 0 ? "+" : ""}
                    {summaryData.percentChange.toFixed(1)}%
                  </span>
                )}
              </div>
              <div className="text-xs text-muted-foreground">{t('fromLastMonth')}</div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
