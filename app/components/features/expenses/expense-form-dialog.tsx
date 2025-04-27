"use client"

import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { CalendarIcon, DollarSignIcon, TagIcon, FileTextIcon } from "lucide-react"
import { format } from "date-fns"
import { motion, AnimatePresence } from "framer-motion"

import { Button } from "@/app/components/shared/ui/button"
import { Input } from "@/app/components/shared/ui/input"
import { Textarea } from "@/app/components/shared/ui/textarea"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/app/components/shared/ui/form"
import { Popover, PopoverContent, PopoverTrigger } from "@/app/components/shared/ui/popover"
import { Calendar } from "@/app/components/shared/ui/calendar"
import { cn } from "@/lib/utils"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/app/components/shared/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/shared/ui/select"

const formSchema = z.object({
  amount: z.coerce.number().min(0, {
    message: "Amount must be a positive number",
  }),
  description: z.string().max(500, {
    message: "Description must be less than 500 characters",
  }),
  date: z.date({
    required_error: "Date is required",
  }),
  category: z
    .string()
    .max(100, {
      message: "Category must be less than 100 characters",
    })
    .optional(),
})

type ExpenseFormValues = z.infer<typeof formSchema>

// Sample initial categories - in a real app, these would be fetched from the database
const initialCategories = [
  { id: "1", name: "Food & Dining", color: "#FF5757" },
  { id: "2", name: "Transportation", color: "#54C5EB" },
  { id: "3", name: "Entertainment", color: "#A36FFE" },
  { id: "4", name: "Utilities", color: "#FF9F40" },
  { id: "5", name: "Housing", color: "#4CAF50" },
  { id: "6", name: "Shopping", color: "#FF4081" },
  { id: "7", name: "Healthcare", color: "#2196F3" },
  { id: "8", name: "Travel", color: "#FFC107" },
  { id: "9", name: "Education", color: "#9C27B0" },
  { id: "10", name: "Personal Care", color: "#00BCD4" },
  { id: "11", name: "Other", color: "#607D8B" },
]

interface ExpenseFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ExpenseFormDialog({ open, onOpenChange }: ExpenseFormDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [categories] = useState(initialCategories)

  const form = useForm<ExpenseFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      amount: undefined,
      description: "",
      date: new Date(),
      category: "",
    },
  })

  async function onSubmit(values: ExpenseFormValues) {
    setIsSubmitting(true)

    // Simulate API call
    console.log(values)
    await new Promise((resolve) => setTimeout(resolve, 1000))

    // Show success message
    setShowSuccess(true)
    setTimeout(() => {
      setShowSuccess(false)
      onOpenChange(false)
    }, 1500)

    // Reset form
    form.reset({
      amount: undefined,
      description: "",
      date: new Date(),
      category: "",
    })

    setIsSubmitting(false)
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
                  <span>Expense added successfully!</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <DialogHeader className="pt-6 px-6 pb-2 bg-gray-100 dark:bg-gray-800">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-xl font-semibold flex items-center gap-2">
                <span className="bg-black dark:bg-white dark:text-black text-white p-1.5 rounded-full">
                  <DollarSignIcon className="h-5 w-5" />
                </span>
                Add New Expense
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
                            Amount
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
                            Date
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
                                  {field.value ? format(field.value, "yyyy-MM-dd") : <span>Pick a date</span>}
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
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <FileTextIcon className="h-4 w-4 text-black dark:text-white" />
                          Description
                        </FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="What was this expense for?"
                            className="resize-none min-h-[80px] border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent transition-all"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription className="text-right">{field.value.length}/500 characters</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
                  <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <TagIcon className="h-4 w-4 text-black dark:text-white" />
                          Category
                        </FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger className="border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent transition-all">
                              <SelectValue placeholder="Select a category" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {categories.map((category) => (
                              <SelectItem key={category.id} value={category.name}>
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
                        Adding...
                      </span>
                    ) : (
                      "Add Expense"
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
