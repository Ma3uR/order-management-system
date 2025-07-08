"use client"

import { useState, useEffect, useCallback } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/app/components/shared/ui/table"
import { Card, CardContent, CardHeader } from "@/app/components/shared/ui/card"
import { format } from "date-fns"
import { Input } from "@/app/components/shared/ui/input"
import { Search, ArrowUpDown, Calendar, Filter, Trash2, AlertCircle, RefreshCw, Edit } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { useTranslations } from 'next-intl'
import { Button } from "@/app/components/shared/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/app/components/shared/ui/popover"
import { Calendar as CalendarComponent } from "@/app/components/shared/ui/calendar"
import type { DateRange } from "react-day-picker"
import { cn } from "@/lib/utils"
import { formatAmount } from "@/lib/utils"
import pb from "@/app/lib/pocketbase.client"
import { ExpensesResponse, ExpensesCategoriesResponse } from "@/app/types/pocketbase-types"
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/app/components/shared/ui/alert-dialog"
import { deleteExpense } from "@/app/lib/services/expenses"
import { toast } from "@/app/components/shared/ui/use-toast"
import { EXPENSE_ADDED_EVENT } from "./expense-form-dialog"
import { EditExpenseDialog, EXPENSE_UPDATED_EVENT } from "./edit-expense-dialog"
import { OrderPagination } from "@/app/components/features/orders/components/OrderPagination"

// Define an extended expense type to include the category info
interface ExtendedExpense extends ExpensesResponse {
  categoryInfo?: {
    name: string;
    color: string;
  };
}

export function ExpensesTable() {
  const t = useTranslations('Expenses')
  const tOrders = useTranslations('Orders')
  const [expenses, setExpenses] = useState<ExtendedExpense[]>([])
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [categoriesMap, setCategories] = useState<{[key: string]: ExpensesCategoriesResponse}>({})
  const [searchTerm, setSearchTerm] = useState("")
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: "ascending" | "descending" } | null>(null)
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined)
  const [isFiltering, setIsFiltering] = useState(false)
  const [loading, setLoading] = useState(true)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [expenseToDelete, setExpenseToDelete] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date())
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [expenseToEdit, setExpenseToEdit] = useState<ExtendedExpense | null>(null)
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [totalItems, setTotalItems] = useState(0)
  
  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      
      // Fetch categories first
      const categoriesData = await pb.collection('expenses_categories').getFullList<ExpensesCategoriesResponse>();
      
      // Convert to a lookup object for easy reference
      const categoriesMap: {[key: string]: ExpensesCategoriesResponse} = {};
      categoriesData.forEach(category => {
        categoriesMap[category.id] = category;
      });
      setCategories(categoriesMap);
      
      // Fetch expenses with expanded category relations
      const expensesData = await pb.collection('expenses').getFullList<ExpensesResponse>({
        expand: 'category'
      });
      
      // Enrich expenses with category info
      const enrichedExpenses = expensesData.map(expense => {
        const extendedExpense: ExtendedExpense = {...expense};
        
        // If using expand and the relation exists
        if (expense.expand) {
          const expObj = expense.expand as Record<string, unknown>;
          if ('category' in expObj && expObj.category) {
            const expandedCategory = expObj.category as ExpensesCategoriesResponse;
            extendedExpense.categoryInfo = {
              name: expandedCategory.name,
              color: expandedCategory.color || '#CCCCCC'
            };
          }
        }
        // If the category ID exists in our map
        else if (expense.category && categoriesMap[expense.category]) {
          extendedExpense.categoryInfo = {
            name: categoriesMap[expense.category].name,
            color: categoriesMap[expense.category].color || '#CCCCCC'
          };
        }
        // Fallback to "Uncategorized"
        else {
          extendedExpense.categoryInfo = {
            name: t('uncategorized'),
            color: "#CCCCCC" // Light gray
          };
        }
        
        return extendedExpense;
      });
      
      setExpenses(enrichedExpenses);
      setLastRefreshed(new Date());
    } catch (error) {
      console.error("Error fetching data:", error);
      toast({
        title: t('errorLoadingExpenses'),
        description: t('problemLoadingExpenses'),
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [t])
  
  // Initial data load
  useEffect(() => {
    fetchData();
  }, [fetchData]);
  
  // Add refresh on visibility change (when user returns to the tab)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Only refresh if it's been more than 30 seconds since last refresh
        const timeSinceLastRefresh = new Date().getTime() - lastRefreshed.getTime();
        if (timeSinceLastRefresh > 30000) { // 30 seconds
          fetchData();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Refresh data every 2 minutes
    const intervalId = setInterval(() => {
      if (!document.hidden) {
        fetchData();
      }
    }, 120000); // 2 minutes
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(intervalId);
    };
  }, [fetchData, lastRefreshed]);
  
  // Manual refresh button handler
  const handleManualRefresh = () => {
    fetchData();
  };
  
  // Handle delete request
  const handleDeleteRequest = (expenseId: string) => {
    setExpenseToDelete(expenseId);
    setDeleteDialogOpen(true);
  };
  
  // Handle edit request
  const handleEditRequest = (expense: ExtendedExpense) => {
    setExpenseToEdit(expense);
    setEditDialogOpen(true);
  };
  
  
  // Confirm and execute deletion
  const confirmDelete = async () => {
    if (expenseToDelete) {
      setIsDeleting(true);
      try {
        const result = await deleteExpense(expenseToDelete);
        
        if (result.error) {
          throw new Error(result.error);
        }
        
        // Success - refresh the expense list
        await fetchData();
        toast({
          title: t('expenseDeleted'),
          description: t('expenseDeletedSuccessfully')
        });
      } catch (error) {
        console.error("Error deleting expense:", error);
        toast({
          title: t('deleteFailed'),
          description: error instanceof Error ? error.message : t('failedToDeleteExpense'),
          variant: "destructive"
        });
      } finally {
        setIsDeleting(false);
        setDeleteDialogOpen(false);
        setExpenseToDelete(null);
      }
    }
  };
  
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
      (expense.categoryInfo?.name?.toLowerCase() || '').includes(searchTerm.toLowerCase())

    // Date range filtering
    const expenseDate = expense.date ? new Date(expense.date) : null;
    const matchesDateRange =
      !dateRange || !dateRange.from || !dateRange.to || 
      (expenseDate && expenseDate >= dateRange.from && expenseDate <= dateRange.to)

    return matchesSearch && matchesDateRange
  })

  // Update total items when filtered expenses change
  useEffect(() => {
    setTotalItems(filteredExpenses.length)
  }, [filteredExpenses.length])

  // Pagination logic
  const totalPages = Math.ceil(totalItems / pageSize)
  const startIndex = (currentPage - 1) * pageSize
  const endIndex = startIndex + pageSize
  const paginatedExpenses = filteredExpenses.slice(startIndex, endIndex)

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, dateRange, sortConfig])

  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  // Handle page size change
  const handlePageSizeChange = (size: number) => {
    setPageSize(size)
    setCurrentPage(1)
  }

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

  // Add event listener for expense added/updated events
  useEffect(() => {
    const handleExpenseAdded = () => {
      // Refresh data when an expense is added
      fetchData();
      toast({
        title: t('dataRefreshed'),
        description: t('expenseListUpdated'),
      });
    };
    
    const handleExpenseUpdated = () => {
      // Refresh data when an expense is updated
      fetchData();
    };

    // Listen for the custom events
    document.addEventListener(EXPENSE_ADDED_EVENT, handleExpenseAdded);
    document.addEventListener(EXPENSE_UPDATED_EVENT, handleExpenseUpdated);
    
    return () => {
      document.removeEventListener(EXPENSE_ADDED_EVENT, handleExpenseAdded);
      document.removeEventListener(EXPENSE_UPDATED_EVENT, handleExpenseUpdated);
    };
  }, [fetchData, t]);

  return (
    <>
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
              <h3 className="text-lg font-semibold">{t('recentExpenses')}</h3>
              <motion.button
                onClick={handleManualRefresh}
                disabled={loading}
                className={`ml-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300 disabled:opacity-50 disabled:cursor-not-allowed`}
                whileHover={{ scale: 1.1, rotate: 180 }}
                transition={{ duration: 0.5 }}
                title={t('refreshExpenses')}
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </motion.button>
            </motion.div>

            <div className="flex flex-wrap gap-2 items-center">
              <div className="relative w-full sm:w-auto sm:min-w-[200px]">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Input
                    type="search"
                    placeholder={t('searchExpenses')}
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
                        t('dateFilter')
                      )}
                    </Button>
                  </motion.div>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <div className="p-3 border-b">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">{t('filterByDate')}</h4>
                      <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 px-2 text-xs">
                        {t('clearFilters')}
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
                        {t('date')}
                        <ArrowUpDown className="h-3 w-3" />
                      </div>
                    </TableHead>
                    <TableHead>{t('description')}</TableHead>
                    <TableHead>{t('category')}</TableHead>
                    <TableHead className="text-right cursor-pointer" onClick={() => requestSort("amount")}>
                      <div className="flex items-center justify-end gap-1">
                        {t('amount')}
                        <ArrowUpDown className="h-3 w-3" />
                      </div>
                    </TableHead>
                    <TableHead className="w-[120px]">{t('actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <AnimatePresence>
                    {paginatedExpenses.length > 0 ? (
                      paginatedExpenses.map((expense, index) => (
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
                            {expense.categoryInfo ? (
                              <motion.span
                                className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
                                style={{ 
                                  backgroundColor: expense.categoryInfo.color,
                                  color: getContrastColor(expense.categoryInfo.color)
                                }}
                                whileHover={{ scale: 1.05 }}
                                transition={{ type: "spring", stiffness: 400, damping: 10 }}
                              >
                                {expense.categoryInfo.name}
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
                              ₴{formatAmount(expense.amount || 0)}
                            </motion.span>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <motion.button
                                className="text-slate-400 hover:text-blue-500 transition-colors p-1 rounded-full hover:bg-blue-50 dark:hover:bg-blue-900/20"
                                whileHover={{ scale: 1.15 }}
                                whileTap={{ scale: 0.95 }}
                                title={t('editExpenseButton')}
                                onClick={() => handleEditRequest(expense)}
                              >
                                <Edit className="h-4 w-4" />
                              </motion.button>
                              <motion.button
                                className="text-slate-400 hover:text-red-500 transition-colors p-1 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20"
                                whileHover={{ scale: 1.15 }}
                                whileTap={{ scale: 0.95 }}
                                title={t('deleteExpenseButton')}
                                onClick={() => handleDeleteRequest(expense.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </motion.button>
                            </div>
                          </TableCell>
                        </motion.tr>
                      ))
                    ) : (
                      <motion.tr initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
                        <TableCell colSpan={5} className="h-32 text-center">
                          <motion.div
                            className="flex flex-col items-center justify-center text-muted-foreground"
                            initial={{ scale: 0.9 }}
                            animate={{ scale: 1 }}
                            transition={{ duration: 0.3 }}
                          >
                            <Search className="h-8 w-8 mb-2 opacity-50" />
                            <p>{t('noExpensesFound')}</p>
                            <p className="text-sm">{t('tryAdjustingSearch')}</p>
                            <Button variant="outline" size="sm" className="mt-4" onClick={clearFilters}>
                              {t('clearFilters')}
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
        
        {/* Pagination */}
        {totalItems > 0 && (
          <div className="px-4 pb-4">
            <OrderPagination
              currentPage={currentPage}
              totalPages={totalPages}
              startIndex={startIndex}
              endIndex={endIndex}
              totalItems={totalItems}
              onPageChange={handlePageChange}
              pageSize={pageSize}
              onPageSizeChange={handlePageSizeChange}
              pageSizeOptions={[5, 10, 20, 50]}
              translations={{
                showing: tOrders('showing'),
                of: tOrders('of'),
                results: tOrders('results'),
                previous: tOrders('previous'),
                next: tOrders('next'),
                page: tOrders('page')
              }}
            />
          </div>
        )}
      </Card>
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-500" />
              {t('deleteExpense')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t('deleteExpenseConfirmation')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                confirmDelete();
              }}
              disabled={isDeleting}
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              {isDeleting ? (
                <span className="flex items-center gap-2">
                  <motion.span
                    className="h-4 w-4 rounded-full border-2 border-current border-t-transparent"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
                  />
                  {t('deleting')}
                </span>
              ) : (
                t('delete')
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Edit Expense Dialog */}
      <EditExpenseDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        expense={expenseToEdit}
      />
    </>
  )
}

// Helper function to determine text color based on background color
function getContrastColor(hexColor: string): string {
  // Default to black if no color provided
  if (!hexColor) return '#000000';
  
  // Convert hex to RGB
  let r = 0, g = 0, b = 0;
  
  // 3 digits
  if (hexColor.length === 4) {
    r = parseInt(hexColor[1] + hexColor[1], 16);
    g = parseInt(hexColor[2] + hexColor[2], 16);
    b = parseInt(hexColor[3] + hexColor[3], 16);
  } 
  // 6 digits
  else if (hexColor.length === 7) {
    r = parseInt(hexColor.substring(1, 3), 16);
    g = parseInt(hexColor.substring(3, 5), 16);
    b = parseInt(hexColor.substring(5, 7), 16);
  }
  
  // Calculate brightness
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  
  // Return black or white based on brightness
  return brightness > 128 ? '#000000' : '#FFFFFF';
}
