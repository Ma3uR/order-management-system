"use client"

import * as React from "react"
import { useTranslations } from "next-intl"
import { formatCurrency } from "@/app/lib/utils"

type BalanceData = {
  periodStart: string
  periodEnd: string
  totalIncome: number
  totalExpenses: number
  netBalance: number
  incomeBreakdown: Array<{ source: string, amount: number }>
  expensesBreakdown: Array<{ category: string, amount: number }>
}

type FinancialBalanceDisplayProps = {
  balanceData: BalanceData | null
  isLoading?: boolean
}

export function FinancialBalanceDisplay({ balanceData, isLoading = false }: FinancialBalanceDisplayProps) {
  const t = useTranslations("Dashboard")

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-32 bg-card rounded-lg shadow-sm border p-4">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  if (!balanceData) {
    return (
      <div className="bg-card rounded-lg shadow-sm border p-4">
        <h2 className="text-xl font-semibold mb-2 text-card-foreground">{t("financialBalance")}</h2>
        <p className="text-muted-foreground">{t("noBalanceDataAvailable")}</p>
      </div>
    )
  }

  return (
    <div className="bg-card rounded-lg shadow-sm border p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-card-foreground">{t("financialBalance")}</h2>
        <div className="text-sm text-muted-foreground">
          {balanceData.periodStart} - {balanceData.periodEnd}
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800">
          <div className="text-sm text-gray-600 dark:text-gray-300">{t("totalIncome")}</div>
          <div className="text-lg font-semibold text-green-600 dark:text-green-400">
            {formatCurrency(balanceData.totalIncome)}
          </div>
        </div>
        
        <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800">
          <div className="text-sm text-gray-600 dark:text-gray-300">{t("totalExpenses")}</div>
          <div className="text-lg font-semibold text-red-600 dark:text-red-400">
            {formatCurrency(balanceData.totalExpenses)}
          </div>
        </div>
        
        <div className={`p-3 rounded-lg ${balanceData.netBalance >= 0 ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800' : 'bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800'}`}>
          <div className="text-sm text-gray-600 dark:text-gray-300">{t("netBalance")}</div>
          <div className={`text-lg font-semibold ${balanceData.netBalance >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-amber-600 dark:text-amber-400'}`}>
            {formatCurrency(balanceData.netBalance)}
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Income Breakdown */}
        <div>
          <h3 className="text-md font-medium mb-2 text-foreground">{t("incomeBreakdown")}</h3>
          <div className="space-y-2">
            {balanceData.incomeBreakdown.map((item, index) => (
              <div key={`income-${index}`} className="flex justify-between items-center p-2 bg-muted rounded">
                <span className="text-sm text-foreground">{item.source}</span>
                <span className="text-sm font-medium text-green-600 dark:text-green-400">{formatCurrency(item.amount)}</span>
              </div>
            ))}
          </div>
        </div>
        
        {/* Expenses Breakdown */}
        <div>
          <h3 className="text-md font-medium mb-2 text-foreground">{t("expensesBreakdown")}</h3>
          <div className="space-y-2">
            {balanceData.expensesBreakdown.map((item, index) => (
              <div key={`expense-${index}`} className="flex justify-between items-center p-2 bg-muted rounded">
                <span className="text-sm text-foreground">{item.category}</span>
                <span className="text-sm font-medium text-red-600 dark:text-red-400">{formatCurrency(item.amount)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
} 