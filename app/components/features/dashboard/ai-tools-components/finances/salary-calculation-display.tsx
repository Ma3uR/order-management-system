"use client"

import * as React from "react"
import { useTranslations } from "next-intl"
import { formatCurrency } from "@/app/lib/utils"

// Define interface for order with salary
interface OrderWithSalary {
  id?: string;
  orderNumber?: string;
  source: string;
  customerName?: string;
  fullName?: string;
  total?: number;
  amount?: number;
  salary?: number;
  date?: string;
  createdAt?: string;
}

type SalaryData = {
  periodStart: string
  periodEnd: string
  totalSalary: number
  salaryBreakdown: Array<{ source: string, commission: number, orderCount: number }>
  orderCount: number
  totalOrderValue: number
  totalProductionCosts: number
  orders?: OrderWithSalary[] // Orders with salary information
}

type SalaryCalculationDisplayProps = {
  salaryData: SalaryData | null
  isLoading?: boolean
}

export function SalaryCalculationDisplay({ salaryData, isLoading = false }: SalaryCalculationDisplayProps) {
  const t = useTranslations("Dashboard")
  
  // Debug output to check what data we're receiving
  React.useEffect(() => {
    if (salaryData) {
      console.log("SalaryCalculationDisplay received data:", salaryData);
      console.log("Orders available:", salaryData.orders ? `Yes (${salaryData.orders.length})` : "No");
    }
  }, [salaryData]);

  const handleDownload = () => {
    if (!salaryData || !salaryData.orders) return;
    
    // Format data for CSV
    const headers = ["Order ID", "Source", "Customer", "Total", "Salary", "Date"];
    const rows = salaryData.orders.map((order: OrderWithSalary) => [
      order.id || order.orderNumber,
      order.source,
      order.customerName || order.fullName,
      order.total || order.amount,
      order.salary || 0,
      order.date || order.createdAt
    ]);
    
    // Create CSV content
    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.join(","))
    ].join("\n");
    
    // Create a blob and download link
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `salary-report-${salaryData.periodStart}-${salaryData.periodEnd}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-32 bg-card rounded-lg shadow-sm border p-4">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  if (!salaryData) {
    return (
      <div className="bg-card rounded-lg shadow-sm border p-4">
        <h2 className="text-xl font-semibold mb-2 text-card-foreground">{t("salaryCalculation")}</h2>
        <p className="text-muted-foreground">{t("noSalaryDataAvailable")}</p>
      </div>
    )
  }

  const profitMargin = salaryData.totalOrderValue - salaryData.totalProductionCosts

  return (
    <div className="bg-card rounded-lg shadow-sm border p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-card-foreground">{t("salaryCalculation")}</h2>
        <div className="flex items-center gap-2">
          <div className="text-sm text-muted-foreground">
            {salaryData.periodStart} - {salaryData.periodEnd}
          </div>
          {salaryData.orders && salaryData.orders.length > 0 ? (
            <button
              onClick={handleDownload}
              className="px-3 py-1 text-xs bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/20 dark:hover:bg-blue-800/30 text-blue-700 dark:text-blue-300 rounded-md flex items-center gap-1"
              title={`Download ${salaryData.orders.length} orders with salary data`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              {t("download")}
            </button>
          ) : (
            <span className="text-xs text-muted-foreground italic" title="No order data available for download">
              {t("noOrderDataForDownload")}
            </span>
          )}
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800">
          <div className="text-sm text-gray-600 dark:text-gray-300">{t("totalSalary")}</div>
          <div className="text-lg font-semibold text-blue-600 dark:text-blue-400">
            {formatCurrency(salaryData.totalSalary)}
          </div>
        </div>
        
        <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800">
          <div className="text-sm text-gray-600 dark:text-gray-300">{t("totalOrderValue")}</div>
          <div className="text-lg font-semibold text-green-600 dark:text-green-400">
            {formatCurrency(salaryData.totalOrderValue)}
          </div>
        </div>
        
        <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800">
          <div className="text-sm text-gray-600 dark:text-gray-300">{t("totalProductionCosts")}</div>
          <div className="text-lg font-semibold text-red-600 dark:text-red-400">
            {formatCurrency(salaryData.totalProductionCosts)}
          </div>
        </div>
        
        <div className="p-3 rounded-lg bg-purple-50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-800">
          <div className="text-sm text-gray-600 dark:text-gray-300">{t("orderCount")}</div>
          <div className="text-lg font-semibold text-purple-600 dark:text-purple-400">
            {salaryData.orderCount}
          </div>
        </div>
      </div>
      
      <div className="mb-4 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800">
        <div className="text-sm text-gray-600 dark:text-gray-300">{t("profitMargin")}</div>
        <div className="text-lg font-semibold text-amber-600 dark:text-amber-400">
          {formatCurrency(profitMargin)}
        </div>
      </div>
      
      {/* Salary Breakdown */}
      <div>
        <h3 className="text-md font-medium mb-2 text-foreground">{t("salaryBreakdown")}</h3>
        <div className="space-y-2">
          {salaryData.salaryBreakdown.map((item, index) => (
            <div key={`salary-${index}`} className="flex justify-between items-center p-3 bg-muted rounded">
              <div className="flex flex-col">
                <span className="text-sm font-medium text-foreground">{item.source}</span>
                <span className="text-xs text-muted-foreground">{item.orderCount} {t("orders")}</span>
              </div>
              <span className="text-sm font-medium text-blue-600 dark:text-blue-400">{formatCurrency(item.commission)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
