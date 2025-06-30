"use client"

import { useState, useEffect } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { CalendarIcon, DollarSignIcon, TagIcon, FileTextIcon } from "lucide-react"
import { format } from "date-fns"
import { motion, AnimatePresence } from "framer-motion"
import { useTranslations } from 'next-intl'

import { Button } from "@/app/components/shared/ui/button"
import { Input } from "@/app/components/shared/ui/input"
import { Textarea } from "@/app/components/shared/ui/textarea"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/app/components/shared/ui/form"
import { Popover, PopoverContent, PopoverTrigger } from "@/app/components/shared/ui/popover"
import { Calendar } from "@/app/components/shared/ui/calendar"
import { cn } from "@/lib/utils"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/app/components/shared/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/shared/ui/select"
import { ExpensesCategoriesResponse, ExpensesResponse } from "@/app/types/pocketbase-types"
import pb, { authenticatedCall } from "@/app/lib/pocketbase"
import { updateExpense } from "@/app/lib/services/expenses"
import { toast } from "@/app/components/shared/ui/use-toast"

// Create a custom event for expense updated
export const EXPENSE_UPDATED_EVENT = 'expense:updated'

// Create a function to dispatch the event
export function dispatchExpenseUpdatedEvent() {
  const event = new CustomEvent(EXPENSE_UPDATED_EVENT)
  document.dispatchEvent(event)
}

const createFormSchema = (t: (key: string) => string) => z.object({
  amount: z.coerce.number().min(0, {
    message: t('amountMustBePositive'),
  }),
  description: z.string().max(500, {
    message: t('descriptionMaxChars'),
  }).optional(),
  date: z.date({
    required_error: t('dateRequired'),
  }),
  category: z
    .string()
    .max(100, {
      message: t('categoryMaxChars'),
    })
    .optional(),
})

type ExpenseFormValues = z.infer<ReturnType<typeof createFormSchema>>

interface EditExpenseDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  expense: ExpensesResponse | null
}

export function EditExpenseDialog({ open, onOpenChange, expense }: EditExpenseDialogProps) {
  const t = useTranslations('Expenses')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [categories, setCategories] = useState<ExpensesCategoriesResponse[]>([])
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    async function fetchCategories() {
      try {
        const fetchedCategories = await authenticatedCall(async () => 
          pb.collection('expenses_categories').getFullList<ExpensesCategoriesResponse>()
        )
        setCategories(fetchedCategories)
      } catch (error) {
        console.error("Error fetching categories:", error)
      }
    }
    
    if (open) {
      fetchCategories()
    }
  }, [open])

  const form = useForm<ExpenseFormValues>({
    resolver: zodResolver(createFormSchema(t)),
    defaultValues: {
      amount: undefined,
      description: "",
      date: new Date(),
      category: "",
    },
  })

  // Reset form when expense changes
  useEffect(() => {
    if (expense && open) {
      form.reset({
        amount: expense.amount || 0,
        description: expense.description || "",
        date: expense.date ? new Date(expense.date) : new Date(),
        category: expense.category || "",
      })
    }
  }, [expense, open, form])

  async function onSubmit(values: ExpenseFormValues) {
    if (!expense) return
    
    setIsSubmitting(true)
    setErrorMessage(null)

    try {
      // Format date to ISO string (YYYY-MM-DD)
      const formattedDate = format(values.date, 'yyyy-MM-dd')
      
      // Call the updateExpense service function
      const result = await updateExpense(
        expense.id,
        values.amount,
        values.description || "",
        formattedDate,
        values.category
      )
      
      if (result.error) {
        throw new Error(result.error)
      }

      // Show success message
      setShowSuccess(true)
      
      // Dispatch the custom event to notify other components
      dispatchExpenseUpdatedEvent()
      
      setTimeout(() => {
        setShowSuccess(false)
        onOpenChange(false)
      }, 1500)
      
      // Show a toast notification
      toast({
        title: t('expenseUpdated'),
        description: t('expenseUpdatedSuccessfully'),
      })
    } catch (error) {
      console.error('Error updating expense:', error)
      setErrorMessage(error instanceof Error ? error.message : 'Failed to update expense')
      
      // Show error toast
      toast({
        title: t('errorUpdatingExpense'),
        description: error instanceof Error ? error.message : t('failedToUpdateExpense'), 
        variant: "destructive"
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px] p-0 overflow-hidden bg-white dark:bg-slate-800 border-none shadow-xl">
        <div className="relative">
          <AnimatePresence>
            {showSuccess && (
              <motion.div
                className="absolute inset-0 z-50 bg-gray-100 dark:bg-gray-800 text-black dark:text-white flex items-center justify-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                <div className="flex items-center gap-2 text-lg">
                  <svg className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span>{t('expenseUpdated')}</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {errorMessage && (
            <div className="absolute top-0 inset-x-0 p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-t-lg">
              {errorMessage}
            </div>
          )}

          <DialogHeader className="pt-6 px-6 pb-2 bg-gray-100 dark:bg-gray-800">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-xl font-semibold flex items-center gap-2">
                <span className="bg-black dark:bg-white dark:text-black text-white p-1.5 rounded-full">
                  <DollarSignIcon className="h-5 w-5" />
                </span>
                {t('editExpense')}
              </DialogTitle>
            </div>
          </DialogHeader>

          <div className="p-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid gap-6 sm:grid-cols-2">
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 }}
                  >
                    <FormField
                      control={form.control}
                      name="amount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            <DollarSignIcon className="h-4 w-4 text-black dark:text-white" />
                            {t('amount')}
                          </FormLabel>
                          <FormControl>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                placeholder="0.00"
                                className="pl-8 border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent transition-all"
                                {...field}
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
                  >
                    <FormField
                      control={form.control}
                      name="date"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel className="flex items-center gap-2">
                            <CalendarIcon className="h-4 w-4 text-black dark:text-white" />
                            {t('date')}
                          </FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant={"outline"}
                                  className={cn(
                                    "w-full pl-3 text-left font-normal border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent transition-all",
                                    !field.value && "text-muted-foreground",
                                  )}
                                >
                                  {field.value ? format(field.value, "yyyy-MM-dd") : <span>{t('pickDate')}</span>}
                                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={field.value}
                                onSelect={field.onChange}
                                initialFocus
                                className="rounded-md border-slate-200 dark:border-slate-700"
                              />
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </motion.div>
                </div>

                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                  <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <TagIcon className="h-4 w-4 text-black dark:text-white" />
                          {t('category')}
                        </FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent transition-all">
                              <SelectValue placeholder={t('selectACategory')} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {categories.map((category) => (
                              <SelectItem key={category.id} value={category.id}>
                                <div className="flex items-center gap-2">
                                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: category.color }} />
                                  {category.name}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <FileTextIcon className="h-4 w-4 text-black dark:text-white" />
                          {t('description')} ({t('optional')})
                        </FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder={t('whatWasExpenseFor')}
                            className="resize-none min-h-[80px] border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent transition-all"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription className="text-right">{(field.value || '').length}/500 {t('characters')}</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Button
                    type="submit"
                    className="w-full bg-black text-white dark:bg-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200 transition-all duration-300"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <span className="flex items-center gap-2">
                        <motion.span
                          className="h-4 w-4 rounded-full border-2 border-current border-t-transparent"
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
                        />
                        {t('updating')}
                      </span>
                    ) : (
                      t('updateExpense')
                    )}
                  </Button>
                </motion.div>
              </form>
            </Form>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}