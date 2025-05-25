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
      <div className="flex justify-center items-center h-32 bg-white rounded-lg shadow-sm border p-4">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  if (!balanceData) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-4">
        <h2 className="text-xl font-semibold mb-2">{t("financialBalance")}</h2>
        <p className="text-gray-500">{t("noBalanceDataAvailable")}</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">{t("financialBalance")}</h2>
        <div className="text-sm text-gray-500">
          {balanceData.periodStart} - {balanceData.periodEnd}
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="p-3 rounded-lg bg-green-50 border border-green-100">
          <div className="text-sm text-gray-600">{t("totalIncome")}</div>
          <div className="text-lg font-semibold text-green-600">
            {formatCurrency(balanceData.totalIncome)}
          </div>
        </div>
        
        <div className="p-3 rounded-lg bg-red-50 border border-red-100">
          <div className="text-sm text-gray-600">{t("totalExpenses")}</div>
          <div className="text-lg font-semibold text-red-600">
            {formatCurrency(balanceData.totalExpenses)}
          </div>
        </div>
        
        <div className={`p-3 rounded-lg ${balanceData.netBalance >= 0 ? 'bg-blue-50 border border-blue-100' : 'bg-amber-50 border border-amber-100'}`}>
          <div className="text-sm text-gray-600">{t("netBalance")}</div>
          <div className={`text-lg font-semibold ${balanceData.netBalance >= 0 ? 'text-blue-600' : 'text-amber-600'}`}>
            {formatCurrency(balanceData.netBalance)}
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Income Breakdown */}
        <div>
          <h3 className="text-md font-medium mb-2 text-gray-700">{t("incomeBreakdown")}</h3>
          <div className="space-y-2">
            {balanceData.incomeBreakdown.map((item, index) => (
              <div key={`income-${index}`} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                <span className="text-sm">{item.source}</span>
                <span className="text-sm font-medium text-green-600">{formatCurrency(item.amount)}</span>
              </div>
            ))}
          </div>
        </div>
        
        {/* Expenses Breakdown */}
        <div>
          <h3 className="text-md font-medium mb-2 text-gray-700">{t("expensesBreakdown")}</h3>
          <div className="space-y-2">
            {balanceData.expensesBreakdown.map((item, index) => (
              <div key={`expense-${index}`} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                <span className="text-sm">{item.category}</span>
                <span className="text-sm font-medium text-red-600">{formatCurrency(item.amount)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
} 