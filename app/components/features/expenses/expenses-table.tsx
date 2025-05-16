"use client"

import { useState, useEffect } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/app/components/shared/ui/table"
import { Card, CardContent, CardHeader } from "@/app/components/shared/ui/card"
import { format } from "date-fns"
import { Input } from "@/app/components/shared/ui/input"
import { Search, ArrowUpDown, Calendar, Filter } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/app/components/shared/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/app/components/shared/ui/popover"
import { Calendar as CalendarComponent } from "@/app/components/shared/ui/calendar"
import type { DateRange } from "react-day-picker"
import { cn } from "@/lib/utils"
import pb from "@/app/lib/pocketbase"
import { ExpensesResponse } from "@/app/types/pocketbase-types"

// Define an extended expense type to include the potentially missing fields
interface ExtendedExpense extends ExpensesResponse {
  category?: string;
  description?: string;
  amount?: number;
  date?: string;
}

// Sample data - in a real app, this would come from a database

export function ExpensesTable() {
  const [expenses, setExpenses] = useState<ExtendedExpense[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: "ascending" | "descending" } | null>(null)
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined)
  const [isFiltering, setIsFiltering] = useState(false)
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    async function fetchExpenses() {
      try {
        const data = await pb.collection('expenses').getFullList<ExpensesResponse>()
        setExpenses(data as ExtendedExpense[])
      } catch (error) {
        console.error("Error fetching expenses:", error)
      } finally {
        setLoading(false)
      }
    }
    
    fetchExpenses()
  }, [])
  
  // Sorting function
  const sortedExpenses = [...expenses].sort((a, b) => {
    if (!sortConfig) return 0

    if (sortConfig.key === "date") {
      return sortConfig.direction === "ascending"
        ? new Date(a.date || "").getTime() - new Date(b.date || "").getTime()
        : new Date(b.date || "").getTime() - new Date(a.date || "").getTime()
    }

    if (sortConfig.key === "amount") {
      return sortConfig.direction === "ascending" ? (a.amount || 0) - (b.amount || 0) : (b.amount || 0) - (a.amount || 0)
    }

    return 0
  })

  // Filtering function
  const filteredExpenses = sortedExpenses.filter((expense) => {
    const matchesSearch =
      (expense.description?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (expense.category?.toLowerCase() || '').includes(searchTerm.toLowerCase())

    // Date range filtering
    const expenseDate = expense.date ? new Date(expense.date) : null;
    const matchesDateRange =
      !dateRange || !dateRange.from || !dateRange.to || 
      (expenseDate && expenseDate >= dateRange.from && expenseDate <= dateRange.to)

    return matchesSearch && matchesDateRange
  })

  // Request sort
  const requestSort = (key: string) => {
    let direction: "ascending" | "descending" = "ascending"
    if (sortConfig && sortConfig.key === key && sortConfig.direction === "ascending") {
      direction = "descending"
    }
    setSortConfig({ key, direction })
  }

  // Clear filters
  const clearFilters = () => {
    setDateRange(undefined)
    setSearchTerm("")
    setSortConfig(null)
    setIsFiltering(false)
  }

  return (
    <Card className="shadow-md border-none bg-white dark:bg-gray-900 overflow-hidden">
      <CardHeader className="bg-gray-100 dark:bg-gray-800 p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <motion.div
            className="flex items-center gap-2"
            whileHover={{ scale: 1.01 }}
            transition={{ type: "spring", stiffness: 400, damping: 10 }}
          >
            <motion.div
              className="bg-black dark:bg-white text-white dark:text-black p-2 rounded-full"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <Search className="h-5 w-5" />
            </motion.div>
            <h3 className="text-lg font-semibold">Recent Expenses</h3>
          </motion.div>

          <div className="flex flex-wrap gap-2 items-center">
            <div className="relative w-full sm:w-auto sm:min-w-[200px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Input
                  type="search"
                  placeholder="Search expenses..."
                  className="pl-8 border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent transition-all"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </motion.div>
            </div>

            <Popover open={isFiltering} onOpenChange={setIsFiltering}>
              <PopoverTrigger asChild>
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn(
                      "border-gray-200 dark:border-gray-700 transition-all",
                      dateRange && "bg-gray-200 dark:bg-gray-700 border-gray-300 dark:border-gray-600",
                    )}
                  >
                    <Filter className="h-4 w-4 mr-2" />
                    {dateRange?.from ? (
                      dateRange.to ? (
                        <>
                          {format(dateRange.from, "LLL dd")} - {format(dateRange.to, "LLL dd")}
                        </>
                      ) : (
                        format(dateRange.from, "LLL dd")
                      )
                    ) : (
                      "Date Filter"
                    )}
                  </Button>
                </motion.div>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <div className="p-3 border-b">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Filter by date</h4>
                    <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 px-2 text-xs">
                      Clear filters
                    </Button>
                  </div>
                </div>
                <CalendarComponent
                  initialFocus
                  mode="range"
                  defaultMonth={dateRange?.from}
                  selected={dateRange}
                  onSelect={setDateRange}
                  numberOfMonths={1}
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="rounded-md">
          {loading ? (
            <div className="flex justify-center items-center h-32">
              <div className="animate-spin h-8 w-8 border-4 border-gray-300 rounded-full border-t-gray-800"></div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="cursor-pointer" onClick={() => requestSort("date")}>
                    <div className="flex items-center gap-1">
                      Date
                      <ArrowUpDown className="h-3 w-3" />
                    </div>
                  </TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right cursor-pointer" onClick={() => requestSort("amount")}>
                    <div className="flex items-center justify-end gap-1">
                      Amount
                      <ArrowUpDown className="h-3 w-3" />
                    </div>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <AnimatePresence>
                  {filteredExpenses.length > 0 ? (
                    filteredExpenses.map((expense, index) => (
                      <motion.tr
                        key={expense.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ delay: index * 0.05, duration: 0.2 }}
                        className="group"
                      >
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-3 w-3 text-black dark:text-white opacity-70" />
                            {expense.date ? format(new Date(expense.date), "yyyy-MM-dd") : "N/A"}
                          </div>
                        </TableCell>
                        <TableCell className="max-w-[300px] truncate" title={expense.description || ''}>
                          <motion.div whileHover={{ x: 3 }} transition={{ type: "spring", stiffness: 400, damping: 10 }}>
                            {expense.description || '-'}
                          </motion.div>
                        </TableCell>
                        <TableCell>
                          {expense.category ? (
                            <motion.span
                              className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-gray-200 dark:bg-gray-700 text-black dark:text-white"
                              whileHover={{ scale: 1.05 }}
                              transition={{ type: "spring", stiffness: 400, damping: 10 }}
                            >
                              {expense.category}
                            </motion.span>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          <motion.span
                            className={cn(
                              (expense.amount || 0) > 100
                                ? "text-black dark:text-white font-bold"
                                : "text-black dark:text-white",
                              "transition-colors",
                            )}
                            whileHover={{ scale: 1.05 }}
                            transition={{ type: "spring", stiffness: 400, damping: 10 }}
                          >
                            ${(expense.amount || 0).toFixed(2)}
                          </motion.span>
                        </TableCell>
                      </motion.tr>
                    ))
                  ) : (
                    <motion.tr initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
                      <TableCell colSpan={4} className="h-32 text-center">
                        <motion.div
                          className="flex flex-col items-center justify-center text-muted-foreground"
                          initial={{ scale: 0.9 }}
                          animate={{ scale: 1 }}
                          transition={{ duration: 0.3 }}
                        >
                          <Search className="h-8 w-8 mb-2 opacity-50" />
                          <p>No expenses found</p>
                          <p className="text-sm">Try adjusting your search or add a new expense</p>
                          <Button variant="outline" size="sm" className="mt-4" onClick={clearFilters}>
                            Clear filters
                          </Button>
                        </motion.div>
                      </TableCell>
                    </motion.tr>
                  )}
                </AnimatePresence>
              </TableBody>
            </Table>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
