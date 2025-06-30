"use client"
  
import { useState } from "react"
import { useTranslations } from 'next-intl'
import { ExpensesTable } from "@/app/components/features/expenses/expenses-table"
import { ExpenseSummary } from "@/app/components/features/expenses/expense-summary"
import { ExpenseFormDialog } from "@/app/components/features/expenses/expense-form-dialog"
import { CategoryManagerDialog } from "@/app/components/features/expenses/category-manager-dialog"
import { PlusCircleIcon, TagIcon, Shield } from "lucide-react"
import { Button } from "@/app/components/shared/ui/button"
import { ProtectedRoute } from "@/app/components/auth/ProtectedRoute"

export default function ExpensesPage() {
  const t = useTranslations('Expenses')
  const [expenseDialogOpen, setExpenseDialogOpen] = useState(false)
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false)

  return (
    <ProtectedRoute 
      adminOnly 
      fallbackPath="/dashboard"
    >
      <div className="min-h-screen bg-background">
        <div className="container mx-auto py-8 px-4 space-y-6">
          {/* Header with title and action buttons */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <div className="flex items-center gap-2">
                <Shield className="h-6 w-6 text-amber-600" />
                <h1 className="text-4xl font-bold tracking-tight">{t('title')}</h1>
              </div>
              <p className="text-muted-foreground mt-1 max-w-2xl">
                {t('description')} - Admin Only
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button
                variant="default"
                onClick={() => setExpenseDialogOpen(true)}
                className="bg-black text-white dark:bg-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200 shadow-sm"
              >
                <PlusCircleIcon className="mr-2 h-5 w-5" />
                {t('addExpense')}
              </Button>
              <Button
                variant="outline"
                onClick={() => setCategoryDialogOpen(true)}
                className="border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 shadow-sm"
              >
                <TagIcon className="mr-2 h-5 w-5" />
                {t('categories')}
              </Button>
            </div>
          </div>

          {/* Expense Summary Cards */}
          <ExpenseSummary />

          {/* Expenses Table */}
          <div className="bg-background rounded-lg border shadow-sm">
            <h2 className="text-xl font-semibold p-4 border-b">{t('recentExpenses')}</h2>
            <ExpensesTable />
          </div>

          <ExpenseFormDialog open={expenseDialogOpen} onOpenChange={setExpenseDialogOpen} />
          <CategoryManagerDialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen} />
        </div>
      </div>
    </ProtectedRoute>
  )
}
