"use client"

import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { motion, AnimatePresence } from "framer-motion"
import { PlusCircleIcon, TagIcon, XCircleIcon, EditIcon, CheckIcon } from "lucide-react"

import { Button } from "@/app/components/shared/ui/button"
import { Input } from "@/app/components/shared/ui/input"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/app/components/shared/ui/form"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/app/components/shared/ui/dialog"
import { cn } from "@/lib/utils"

const formSchema = z.object({
  name: z
    .string()
    .min(1, {
      message: "Category name is required",
    })
    .max(100, {
      message: "Category name must be less than 100 characters",
    }),
  color: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, {
    message: "Please enter a valid hex color code",
  }),
})

type CategoryFormValues = z.infer<typeof formSchema>

// Sample initial categories
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

interface CategoryManagerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CategoryManagerDialog({ open, onOpenChange }: CategoryManagerDialogProps) {
  const [categories, setCategories] = useState(initialCategories)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<{ name: string; color: string } | null>(null)
  const [showSuccess, setShowSuccess] = useState(false)
  const [successMessage, setSuccessMessage] = useState("")

  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      color: "#6D28D9", // Default violet color
    },
  })

  const showSuccessNotification = (message: string) => {
    setSuccessMessage(message)
    setShowSuccess(true)
    setTimeout(() => setShowSuccess(false), 2000)
  }

  const onSubmit = (values: CategoryFormValues) => {
    // Add new category
    const newCategory = {
      id: `${Date.now()}`,
      name: values.name,
      color: values.color,
    }

    setCategories([...categories, newCategory])
    form.reset({
      name: "",
      color: "#6D28D9",
    })

    showSuccessNotification("Category added successfully!")
  }

  const startEditing = (category: (typeof categories)[0]) => {
    setEditingId(category.id)
    setEditForm({
      name: category.name,
      color: category.color,
    })
  }

  const cancelEditing = () => {
    setEditingId(null)
    setEditForm(null)
  }

  const saveEditing = () => {
    if (editingId && editForm) {
      setCategories(
        categories.map((cat) => (cat.id === editingId ? { ...cat, name: editForm.name, color: editForm.color } : cat)),
      )
      setEditingId(null)
      setEditForm(null)
      showSuccessNotification("Category updated successfully!")
    }
  }

  const deleteCategory = (id: string) => {
    setCategories(categories.filter((cat) => cat.id !== id))
    showSuccessNotification("Category deleted successfully!")
  }

  const handleEditFormChange = (field: "name" | "color", value: string) => {
    if (editForm) {
      setEditForm({
        ...editForm,
        [field]: value,
      })
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
                  <span>{successMessage}</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <DialogHeader className="pt-6 px-6 pb-2 bg-gray-100 dark:bg-gray-800">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-xl font-semibold flex items-center gap-2">
                <span className="bg-black dark:bg-white dark:text-black text-white p-1.5 rounded-full">
                  <TagIcon className="h-5 w-5" />
                </span>
                Manage Categories
              </DialogTitle>
            </div>
          </DialogHeader>

          <div className="p-6">
            <div className="space-y-6">
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-[1fr,auto]">
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center gap-2">
                              <TagIcon className="h-4 w-4 text-black dark:text-white" />
                              Category Name
                            </FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Enter category name"
                                className="border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent transition-all"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="color"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Color</FormLabel>
                            <div className="flex items-center gap-2">
                              <FormControl>
                                <Input
                                  type="color"
                                  className="w-12 h-10 p-1 border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent transition-all"
                                  {...field}
                                />
                              </FormControl>
                              <Input
                                type="text"
                                className="w-24 border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent transition-all"
                                {...field}
                              />
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}>
                      <Button
                        type="submit"
                        className="w-full bg-black text-white dark:bg-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200 transition-all duration-300"
                      >
                        <PlusCircleIcon className="h-4 w-4 mr-2" />
                        Add Category
                      </Button>
                    </motion.div>
                  </form>
                </Form>
              </motion.div>

              <div className="mt-6">
                <h4 className="text-sm font-medium mb-3">Existing Categories</h4>
                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                  <AnimatePresence>
                    {categories.map((category, index) => (
                      <motion.div
                        key={category.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 10 }}
                        transition={{ delay: index * 0.05, duration: 0.2 }}
                        className={cn(
                          "flex items-center justify-between p-3 rounded-md",
                          editingId === category.id
                            ? "bg-slate-100 dark:bg-slate-700"
                            : "hover:bg-slate-50 dark:hover:bg-slate-700/50",
                        )}
                      >
                        {editingId === category.id ? (
                          <div className="flex items-center gap-2 w-full">
                            <div
                              className="w-4 h-4 rounded-full flex-shrink-0"
                              style={{ backgroundColor: editForm?.color }}
                            />
                            <Input
                              value={editForm?.name || ""}
                              onChange={(e) => handleEditFormChange("name", e.target.value)}
                              className="flex-1 h-8 py-1 border-slate-200 dark:border-slate-700"
                            />
                            <Input
                              type="color"
                              value={editForm?.color || "#000000"}
                              onChange={(e) => handleEditFormChange("color", e.target.value)}
                              className="w-8 h-8 p-1 border-slate-200 dark:border-slate-700"
                            />
                            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={saveEditing}>
                              <CheckIcon className="h-4 w-4 text-black dark:text-white" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={cancelEditing}>
                              <XCircleIcon className="h-4 w-4 text-black dark:text-white" />
                            </Button>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-center gap-2">
                              <div className="w-4 h-4 rounded-full" style={{ backgroundColor: category.color }} />
                              <span>{category.name}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <motion.button
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                className="text-slate-500 hover:text-black dark:hover:text-white transition-colors"
                                onClick={() => startEditing(category)}
                              >
                                <EditIcon className="h-4 w-4" />
                              </motion.button>
                              <motion.button
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                className="text-slate-500 hover:text-black dark:hover:text-white transition-colors"
                                onClick={() => deleteCategory(category.id)}
                              >
                                <XCircleIcon className="h-4 w-4" />
                              </motion.button>
                            </div>
                          </>
                        )}
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
