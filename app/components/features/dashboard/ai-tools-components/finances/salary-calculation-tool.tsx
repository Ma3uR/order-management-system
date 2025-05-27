"use client"

import * as React from "react"
import { useState } from "react"
import { useTranslations } from "next-intl"
import { SalaryCalculationDisplay } from "./salary-calculation-display"
import { salaryCalculator } from "@/app/lib/ai/tools/salary-calculations"

type DateRange = {
  startDate: string
  endDate: string
}

// Define the expected result types
type SalaryData = {
  periodStart: string
  periodEnd: string
  totalSalary: number
  salaryBreakdown: Array<{ source: string, commission: number, orderCount: number }>
  orderCount: number
  totalOrderValue: number
  totalProductionCosts: number
}

type SalaryError = {
  error?: boolean
  message?: string
}

type SalaryResult = SalaryData | SalaryError

export function SalaryCalcTool() {
  const t = useTranslations("Dashboard")
  const [isLoading, setIsLoading] = useState(false)
  const [salaryData, setSalaryData] = useState<SalaryData | null>(null)
  const [dateRange, setDateRange] = useState<DateRange>({
    startDate: getDefaultStartDate(),
    endDate: getDefaultEndDate()
  })
  const [error, setError] = useState<string | null>(null)

  // Get default date for start (first day of current month)
  function getDefaultStartDate() {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
  }

  // Get default date for end (today)
  function getDefaultEndDate() {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  }

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDateRange({
      ...dateRange,
      [e.target.name]: e.target.value
    })
  }

  const handleCalculateSalary = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      const result = await salaryCalculator.execute(dateRange) as SalaryResult
      
      if ('error' in result || 'message' in result) {
        setError(result.error ? String(result.error) : result.message || 'Unknown error')
        setSalaryData(null)
      } else {
        setSalaryData(result as SalaryData)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setSalaryData(null)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg shadow-sm border p-4">
        <h2 className="text-xl font-semibold mb-4">{t("calculateSalary")}</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t("startDate")}
            </label>
            <input
              type="date"
              name="startDate"
              value={dateRange.startDate}
              onChange={handleDateChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t("endDate")}
            </label>
            <input
              type="date"
              name="endDate"
              value={dateRange.endDate}
              onChange={handleDateChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
        
        <button
          onClick={handleCalculateSalary}
          disabled={isLoading}
          className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md shadow-sm transition-colors disabled:bg-gray-400"
        >
          {isLoading ? t("calculating") : t("calculateSalary")}
        </button>
        
        {error && (
          <div className="mt-3 p-3 bg-red-50 border border-red-200 text-red-700 rounded">
            {error}
          </div>
        )}
      </div>
      
      <SalaryCalculationDisplay salaryData={salaryData} isLoading={isLoading} />
    </div>
  )
}

