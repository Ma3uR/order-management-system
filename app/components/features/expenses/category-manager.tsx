"use client"

import { useState, useEffect } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { motion, AnimatePresence } from "framer-motion"
import { ChevronDownIcon, PlusCircleIcon, TagIcon, XCircleIcon, EditIcon, CheckIcon } from "lucide-react"

import { Button } from "@/app/components/shared/ui/button"
import { Input } from "@/app/components/shared/ui/input"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/app/components/shared/ui/form"
import { Card, CardContent, CardHeader } from "@/app/components/shared/ui/card"
import { cn } from "@/lib/utils"
import pb, { authenticatedCall } from "@/app/lib/pocketbase"
import { ExpensesCategoriesResponse } from "../../../types/pocketbase-types"

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

export function CategoryManager() {
  const [categories, setCategories] = useState<ExpensesCategoriesResponse[]>([])
  const [isOpen, setIsOpen] = useState(false)
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

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const data = await authenticatedCall(async () => pb.collection("expenses_categories").getFullList<ExpensesCategoriesResponse>());
        setCategories(data);
      } catch (error) {
        console.error("Failed to fetch categories:", error);
      }
    };
    
    fetchCategories();
  }, []);

  const showSuccessNotification = (message: string) => {
    setSuccessMessage(message)
    setShowSuccess(true)
    setTimeout(() => setShowSuccess(false), 3000)
  }

  const onSubmit = (values: CategoryFormValues) => {
    // Add new category
    const newCategory = {
      id: `${Date.now()}`,
      name: values.name,
      color: values.color,
    }

    setCategories([...categories, newCategory as ExpensesCategoriesResponse])
    form.reset({
      name: "",
      color: "#6D28D9",
    })

    showSuccessNotification("Category added successfully!")
  }

  const startEditing = (category: ExpensesCategoriesResponse) => {
    setEditingId(category.id)
    setEditForm({
      name: category.name,
      color: category.color || "#6D28D9",
    })
  }

  const cancelEditing = () => {
    setEditingId(null)
    setEditForm(null)
  }

  const saveEditing = () => {
    if (editingId && editForm) {
      setCategories(
        categories.map((cat: ExpensesCategoriesResponse) => (cat.id === editingId ? { ...cat, name: editForm.name, color: editForm.color } : cat)),
      )
      setEditingId(null)
      setEditForm(null)
      showSuccessNotification("Category updated successfully!")
    }
  }

  const deleteCategory = (id: string) => {
    setCategories(categories.filter((cat: ExpensesCategoriesResponse) => cat.id !== id))
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
    <div className="relative mb-8">
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
              <span>{successMessage}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <Card className="max-w-2xl mx-auto w-full overflow-hidden border-none shadow-md bg-white dark:bg-slate-800">
        <CardHeader
          className="bg-gradient-to-r from-indigo-500/10 to-violet-500/10 dark:from-indigo-500/20 dark:to-violet-500/20 cursor-pointer p-4"
          onClick={() => setIsOpen(!isOpen)}
        >
          <motion.div
            className="flex items-center justify-between"
            whileHover={{ scale: 1.01 }}
            transition={{ type: "spring", stiffness: 400, damping: 10 }}
          >
            <div className="flex items-center gap-2">
              <motion.div
                className="bg-gradient-to-r from-indigo-600 to-violet-600 text-white p-2 rounded-full"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <TagIcon className="h-5 w-5" />
              </motion.div>
              <h3 className="text-lg font-semibold">Manage Categories</h3>
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
              <CardContent className="p-6">
                <div className="space-y-6">
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                  >
                    <Form {...form}>
                      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <div className="grid gap-4 sm:grid-cols-[1fr,auto]">
                          <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="flex items-center gap-2">
                                  <TagIcon className="h-4 w-4 text-violet-500" />
                                  Category Name
                                </FormLabel>
                                <FormControl>
                                  <Input
                                    placeholder="Enter category name"
                                    className="border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
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
                                      className="w-12 h-10 p-1 border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                                      {...field}
                                    />
                                  </FormControl>
                                  <Input
                                    type="text"
                                    className="w-24 border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
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
                            className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 transition-all duration-300"
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
                    <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
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
                                  <CheckIcon className="h-4 w-4 text-green-500" />
                                </Button>
                                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={cancelEditing}>
                                  <XCircleIcon className="h-4 w-4 text-red-500" />
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
                                    className="text-slate-500 hover:text-violet-500 transition-colors"
                                    onClick={() => startEditing(category)}
                                  >
                                    <EditIcon className="h-4 w-4" />
                                  </motion.button>
                                  <motion.button
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.9 }}
                                    className="text-slate-500 hover:text-red-500 transition-colors"
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
              </CardContent>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </div>
  )
}
