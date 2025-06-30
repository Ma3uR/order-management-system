"use client"

import { useEffect, useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { CalendarIcon, ChevronDownIcon, PlusCircleIcon, DollarSignIcon, TagIcon, FileTextIcon } from "lucide-react"
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
import { Card, CardContent, CardHeader } from "@/app/components/shared/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/shared/ui/select"
import { addExpense } from "@/app/lib/services/expenses"
import { ExpensesCategoriesResponse } from "@/app/types/pocketbase-types"
import pb from "@/app/lib/pocketbase"

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

// Sample initial categories - in a real app, these would be fetched from the database
// and would be the same as those managed in the CategoryManager component
export function ExpenseForm() {
  const t = useTranslations('Expenses')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [categories, setCategories] = useState<ExpensesCategoriesResponse[]>([])
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    async function fetchCategories() {
      const categories = await pb.collection('expenses_categories').getFullList<ExpensesCategoriesResponse>()
      setCategories(categories)
    }
    fetchCategories()
  }, [])

  const form = useForm<ExpenseFormValues>({
    resolver: zodResolver(createFormSchema(t)),
    defaultValues: {
      amount: undefined,
      description: "",
      date: new Date(),
      category: "",
    },
  })

  async function onSubmit(values: ExpenseFormValues) {
    setIsSubmitting(true)
    setErrorMessage(null)

    try {
      // Format date to ISO string (YYYY-MM-DD)
      const formattedDate = format(values.date, 'yyyy-MM-dd')
      
      // Call the addExpense service function
      const result = await addExpense(
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
      setTimeout(() => setShowSuccess(false), 3000)

      // Reset form
      form.reset({
        amount: undefined,
        description: "",
        date: new Date(),
        category: "",
      })
    } catch (error) {
      console.error('Error adding expense:', error)
      setErrorMessage(error instanceof Error ? error.message : 'Failed to add expense')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="relative">
      <AnimatePresence>
        {showSuccess && (
          <motion.div
            className="absolute top-0 left-0 right-0 z-50 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-100 p-4 rounded-lg shadow-lg flex items-center justify-center"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <div className="flex items-center gap-2">
              <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              <span>{t('expenseAdded')}</span>
            </div>
          </motion.div>
        )}

        {errorMessage && (
          <motion.div
            className="absolute top-0 left-0 right-0 z-50 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-100 p-4 rounded-lg shadow-lg flex items-center justify-center"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <div className="flex items-center gap-2">
              <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
              <span>{errorMessage}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <Card className="max-w-2xl mx-auto w-full overflow-hidden border-none shadow-md bg-white dark:bg-slate-800">
        <CardHeader
          className="bg-gradient-to-r from-violet-500/10 to-indigo-500/10 dark:from-violet-500/20 dark:to-indigo-500/20 cursor-pointer p-4"
          onClick={() => setIsOpen(!isOpen)}
        >
          <motion.div
            className="flex items-center justify-between"
            whileHover={{ scale: 1.01 }}
            transition={{ type: "spring", stiffness: 400, damping: 10 }}
          >
            <div className="flex items-center gap-2">
              <motion.div
                className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white p-2 rounded-full"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <PlusCircleIcon className="h-5 w-5" />
              </motion.div>
              <h3 className="text-lg font-semibold">{t('addNewExpense')}</h3>
            </div>
            <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.3 }}>
              <ChevronDownIcon className="h-5 w-5 text-muted-foreground" />
            </motion.div>
          </motion.div>
        </CardHeader>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <CardContent className="p-6 pt-6">
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
                                <DollarSignIcon className="h-4 w-4 text-violet-500" />
                                {t('amount')}
                              </FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                                    $
                                  </span>
                                  <Input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    placeholder="0.00"
                                    className="pl-8 border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
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
                                <CalendarIcon className="h-4 w-4 text-violet-500" />
                                Date
                              </FormLabel>
                              <Popover>
                                <PopoverTrigger asChild>
                                  <FormControl>
                                    <Button
                                      variant={"outline"}
                                      className={cn(
                                        "w-full pl-3 text-left font-normal border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all",
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

                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                    >
                      <FormField
                        control={form.control}
                        name="category"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center gap-2">
                              <TagIcon className="h-4 w-4 text-violet-500" />
                              {t('category')}
                            </FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger className="border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all">
                                  <SelectValue placeholder={t('selectACategory')} />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {categories.map((category) => (
                                  <SelectItem key={category.id} value={category.name}>
                                    <div className="flex items-center gap-2">
                                      <div
                                        className="w-3 h-3 rounded-full"
                                        style={{ backgroundColor: category.color }}
                                      />
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

                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 }}
                    >
                      <FormField
                        control={form.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center gap-2">
                              <FileTextIcon className="h-4 w-4 text-violet-500" />
                              {t('description')} ({t('optional')})
                            </FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder={t('whatWasExpenseFor')}
                                className="resize-none min-h-[80px] border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                                {...field}
                              />
                            </FormControl>
                            <FormDescription className="text-right">
                              {(field.value || '').length}/500 {t('characters')}
                            </FormDescription>
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
                        className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 transition-all duration-300"
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? (
                          <span className="flex items-center gap-2">
                            <motion.span
                              className="h-4 w-4 rounded-full border-2 border-current border-t-transparent"
                              animate={{ rotate: 360 }}
                              transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
                            />
                            {t('adding')}
                          </span>
                        ) : (
                          t('addExpense')
                        )}
                      </Button>
                    </motion.div>
                  </form>
                </Form>
              </CardContent>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </div>
  )
}
