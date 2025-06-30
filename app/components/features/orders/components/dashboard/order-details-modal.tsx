"use client"

import React, { useState, useEffect, useRef, useCallback } from "react"
import { Button } from "@/app/components/shared/ui/button"
import { Input } from "@/app/components/shared/ui/input"
import { Textarea } from "@/app/components/shared/ui/textarea"
import { Dialog, DialogHeader, DialogTitle, DialogFooter, DialogContent } from "@/app/components/shared/ui/dialog"
import { Badge } from "@/app/components/shared/ui/badge"
import { Label } from "@/app/components/shared/ui/label"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/app/components/shared/ui/select"
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/app/components/shared/ui/table"
import { Phone, MessageSquare, Send, Copy, PlusCircle, Trash2, Edit3, Save, Truck, Package, Search, ChevronsUpDown, AlertCircle, X, Loader2, Receipt, RotateCcw } from "lucide-react"
import { format } from "date-fns"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/app/components/shared/ui/accordion"
import { useEntities } from '@/app/hooks/useEntities'
import { NovaPoshtaModal } from "@/app/components/features/orders/components/nova-poshta-modal"
import { ScrollArea } from "@/app/components/shared/ui/scroll-area"
import { cn } from "@/lib/utils"
import { orderSchema } from "@/app/lib/validations/orders"
import { z } from "zod"
import { Alert, AlertDescription } from "@/app/components/shared/ui/alert"
import { toast, Toaster } from 'sonner'
import { createOrder } from "@/app/[locale]/orders/actions/orders"
import { OrdersMergeStatusOptions, OrdersMergeSourceOptions, OrdersRecord, OrdersResponse, SourcesResponse, StatusResponse } from '@/app/types/pocketbase-types'
import pb from '@/app/lib/pocketbase'
import { formatCurrency } from "@/app/lib/utils"
import { deleteInternetDocument } from '@/app/[locale]/orders/actions/nova-poshta'
import { useTranslations } from 'next-intl'
import { createSaleReceipt, createReturnReceipt, getFiscalReceiptsForOrder } from '@/app/[locale]/orders/actions/fiscal-receipts'
import { PermissionGate } from '@/app/components/auth/PermissionGate'
import { PERMISSIONS } from '@/app/lib/auth/permissions'

// Add this type near the top of the file
type OrderProduct = {
  title: string;
  quantity: number;
  price: number;
}

// Fiscal receipt type
type FiscalReceipt = {
  id?: string;
  status: string;
  receipt_type: string;
  qr_code?: string;
  document_code?: string;
  error_message?: string;
  created?: string;
}

// Nova Poshta invoice data structure
interface NovaPoshtaInvoiceData {
  Ref: string;
  IntDocNumber: string;
  CostOnSite?: string;
  EstimatedDeliveryDate?: string;
  TypeDocument?: string;
  // Allow for other properties that might be in the response
  [key: string]: string | number | boolean | null | undefined;
}

// Helper function to get source color
const getSourceColor = (sourceId: string) => {
  const sourceColors: Record<string, string> = {
    '4tvf116a5aitwmb': '#10B981', // Rozetka - Green
    'gfzk8nxfokgu9ku': '#8B5CF6', // Prom.ua - Purple
    'pj9sejm9vqtu8xq': '#6B7280', // Epicentr - Gray
  };
  return sourceColors[sourceId] || '#6B7280'; // Default gray
};



// Nova Poshta compatible order type
type NovaPoshtaOrder = {
  id: string
  customerName: string
  customerPhone: string
  customerEmail: string
  totalAmount: number
  deliveryPostNumber?: string
}

interface OrderDetailsModalProps {
  isOpen: boolean
  onClose: () => void
  order: OrdersResponse | null
  statusOptions: StatusResponse[]
  sources: SourcesResponse[]
  onSave: (updatedOrder: OrdersRecord) => Promise<unknown> // Callback for saving changes
}

export function OrderDetailsModal({
  isOpen,
  onClose,
  order: initialOrder,
  statusOptions,
  sources,
  onSave,
}: OrderDetailsModalProps) {
  const [order, setOrder] = useState<OrdersResponse | null>(initialOrder)
  const [isEditingNotes, setIsEditingNotes] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isNovaPoshtaModalOpen, setIsNovaPoshtaModalOpen] = useState(false)
  const [statusOpen, setStatusOpen] = useState(false)
  const [statusSearchValue, setStatusSearchValue] = useState("")
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})
  const [deletingTtn, setDeletingTtn] = useState(false)
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false)
  const [showNotFoundDialog, setShowNotFoundDialog] = useState(false)
  const [notFoundError, setNotFoundError] = useState<string>("")
  const [fiscalReceipts, setFiscalReceipts] = useState<FiscalReceipt[]>([])
  const [loadingFiscalReceipts, setLoadingFiscalReceipts] = useState(false)
  const [creatingFiscalReceipt, setCreatingFiscalReceipt] = useState(false)
  const statusRef = useRef<HTMLDivElement>(null)

  // Translations
  const t = useTranslations('Orders.novaPoshta')

  // Fetch delivery and payment methods
  const { deliveryMethods, paymentMethods } = useEntities()

  // Check if this is a Rozetka order
  const isRozetkaOrder = order?.source === '4tvf116a5aitwmb'


  // Validate order using zod schema
  const validateOrder = useCallback((orderData: OrdersRecord) => {
    try {
      // Transform order data to match schema expectations
      const orderToValidate = {
        ...orderData,
        mergeStatus: orderData.mergeStatus || 'none',
        mergeSource: orderData.mergeSource || 'none',
        archived: orderData.archived || false,
      }
      
      orderSchema.parse(orderToValidate)
      setValidationErrors({})
      return true
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors: Record<string, string> = {}
        error.errors.forEach((err) => {
          const path = err.path.join('.')
          errors[path] = err.message
        })
        setValidationErrors(errors)
        console.log('🔍 Validation errors:', errors)
      }
      return false
    }
  }, [])

  useEffect(() => {
    setOrder(initialOrder)
    setIsEditingNotes(false) // Reset notes editing state when order changes
    setValidationErrors({}) // Clear validation errors when order changes
    
    // Load fiscal receipts when order changes
    if (initialOrder?.id) {
      loadFiscalReceipts(initialOrder.id)
    }
  }, [initialOrder])

  // Trigger validation whenever order changes
  useEffect(() => {
    if (order) {
      validateOrder(order)
    }
  }, [order, validateOrder])

  // Handle click outside to close status dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (statusRef.current && 
          !statusRef.current.contains(event.target as Node) && 
          statusOpen) {
        setStatusOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [statusOpen])

  if (!order) return null

  const currentStatus = statusOptions.find((s) => s.id === order.status) as StatusResponse

  // Filter statuses based on source and search query
  const filteredStatuses = (() => {
    // For Rozetka orders, show all statuses with source "rozetka"
    if (isRozetkaOrder) {
      return statusOptions
        .filter(status => status.source === order?.source)
        .filter(status => status.name.toLowerCase().includes(statusSearchValue.toLowerCase()))
    }
    
    // For other orders, get statuses that match the order's source
    const sourceSpecificStatuses = statusOptions.filter(status => {
      return status.source === order?.source
    });
    
    // If we have source-specific statuses, use only those
    if (sourceSpecificStatuses.length > 0) {
      return sourceSpecificStatuses.filter(status => 
        status.name.toLowerCase().includes(statusSearchValue.toLowerCase())
      );
    }
    
    // Fallback: if no source-specific statuses exist, show general statuses (those without source relation)
    return statusOptions.filter(status => {
      const matchesSearch = status.name.toLowerCase().includes(statusSearchValue.toLowerCase())
      const isGeneralStatus = !status.source
      return matchesSearch && isGeneralStatus
    })
  })()

  const handleInputChange = <K extends keyof OrdersRecord>(field: K, value: OrdersRecord[K]) => {
    setOrder((prev) => {
      if (!prev) return null
      const updatedOrder = { ...prev, [field]: value }
      return updatedOrder
    })
  }



  const handleProductChange = (index: number, field: keyof OrderProduct, value: string | number) => {
    setOrder((prev) => {
      if (!prev) return null;
      const updatedProducts = [...(prev.products as OrderProduct[])];
      updatedProducts[index] = {
        ...updatedProducts[index],
        [field]: field === "quantity" || field === "price" ? Number(value) : value,
      };
      return {
        ...prev,
        products: updatedProducts,
        amount: calculateTotalAmount(updatedProducts),
        numberOfItems: calculateTotalItems(updatedProducts),
      };
    });
  }

  const handleAddProduct = () => {
    setOrder((prev) => {
      if (!prev) return null;
      const newProduct: OrderProduct = { title: "", quantity: 1, price: 0 };
      return { ...prev, products: [...(prev.products as OrderProduct[]), newProduct] };
    });
  }

  const handleRemoveProduct = (index: number) => {
    setOrder((prev) => {
      if (!prev) return null
      const updatedProducts = (prev.products as OrderProduct[]).filter((_, i) => i !== index)
      return {
        ...prev,
        products: updatedProducts,
        amount: calculateTotalAmount(updatedProducts),
        numberOfItems: calculateTotalItems(updatedProducts),
      }
    })
  }

  const calculateTotalAmount = (products: OrderProduct[]) =>
    products.reduce((sum, p) => sum + p.quantity * p.price, 0)
  const calculateTotalItems = (products: OrderProduct[]) => products.reduce((sum, p) => sum + p.quantity, 0)

  // Convert Order to NovaPoshtaOrder format
  const convertToNovaPoshtaOrder = (order: OrdersResponse): NovaPoshtaOrder => ({
    id: order.id || '',
    customerName: order.fullName,
    customerPhone: order.phoneNumber,
    customerEmail: "",
    totalAmount: order.amount,
    deliveryPostNumber: order.deliveryPostNumber
  })

  // Handle TTN creation
  const handleTtnCreated = (ttnNumber: string, documentRef: string) => {
    setOrder((prev) => prev ? {
      ...prev,
      ttnNumber,
      ttnDocumentRef: documentRef,
      deliveryPostNumber: ttnNumber
    } : null)
    console.log(`TTN created: ${ttnNumber}, Document Ref: ${documentRef}`)
    toast.success("TTN created successfully")
  }

  // Handle TTN deletion
  const handleTtnDeleted = () => {
    setOrder((prev) => prev ? {
      ...prev,
      ttnNumber: undefined,
      ttnDocumentRef: undefined,
      deliveryPostNumber: undefined,
      invoice_data: null
    } : null)
    console.log('TTN deleted')
    toast.success("TTN deleted successfully")
  }

  // Handle TTN deletion from order details modal
  const handleDeleteTtn = async () => {
    if (!order?.invoice_data || !(order.invoice_data as NovaPoshtaInvoiceData)?.Ref) {
      toast.error("No invoice reference found to delete")
      return
    }
    
    setDeletingTtn(true)
    try {
      const documentRef = (order.invoice_data as NovaPoshtaInvoiceData).Ref
      console.log('🗑️ Deleting TTN with ref:', documentRef)
      
      const result = await deleteInternetDocument(documentRef)
      
      if (result.success) {
        handleTtnDeleted()
        setShowDeleteConfirmation(false)
        toast.success(t('ttnDeletedSuccessfully'))
      } else if (result.errorType === 'not_found') {
        // Handle "document not found" scenario - give user a choice
        setNotFoundError(result.error || "Document not found")
        setShowDeleteConfirmation(false)
        setShowNotFoundDialog(true)
      } else {
        // Handle other errors normally
        throw new Error(result.error || "Failed to delete TTN")
      }
    } catch (error) {
      console.error("Failed to delete TTN:", error)
      toast.error(error instanceof Error ? error.message : "Failed to delete TTN")
    } finally {
      setDeletingTtn(false)
    }
  }

  // Handle removing TTN from app only (when Nova Poshta says not found)
  const handleRemoveFromApp = () => {
    handleTtnDeleted()
    setShowNotFoundDialog(false)
    toast.success(t('ttnReferenceRemoved'))
  }

  // Load fiscal receipts for the order
  const loadFiscalReceipts = async (orderId: string) => {
    setLoadingFiscalReceipts(true)
    try {
      const result = await getFiscalReceiptsForOrder(orderId)
      if (result.success && result.data) {
        setFiscalReceipts(result.data as FiscalReceipt[])
      } else {
        console.error('Failed to load fiscal receipts:', result.error)
      }
    } catch (error) {
      console.error('Error loading fiscal receipts:', error)
    } finally {
      setLoadingFiscalReceipts(false)
    }
  }

  // Handle creating sale receipt
  const handleCreateSaleReceipt = async () => {
    if (!order?.id) return
    
    const cashierName = prompt('Enter cashier name:')
    if (!cashierName?.trim()) {
      toast.error('Cashier name is required')
      return
    }

    setCreatingFiscalReceipt(true)
    try {
      const result = await createSaleReceipt(
        order.id,
        cashierName.trim(),
        undefined, // customer email - optional
        order.phoneNumber
      )

      if (result.success) {
        toast.success('Sale receipt created successfully!')
        // Reload fiscal receipts
        await loadFiscalReceipts(order.id)
      } else {
        toast.error(`Failed to create sale receipt: ${result.error}`)
      }
    } catch (error) {
      toast.error('Error creating sale receipt')
      console.error('Error creating sale receipt:', error)
    } finally {
      setCreatingFiscalReceipt(false)
    }
  }

  // Handle creating return receipt
  const handleCreateReturnReceipt = async () => {
    if (!order?.id) return
    
    const cashierName = prompt('Enter cashier name:')
    if (!cashierName?.trim()) {
      toast.error('Cashier name is required')
      return
    }

    const returnAmountStr = prompt(`Enter return amount (max: ${formatCurrency(order.amount)}):`)
    if (!returnAmountStr) return

    const returnAmount = parseFloat(returnAmountStr)
    if (isNaN(returnAmount) || returnAmount <= 0 || returnAmount > order.amount) {
      toast.error('Invalid return amount')
      return
    }

    setCreatingFiscalReceipt(true)
    try {
      const result = await createReturnReceipt(
        order.id,
        cashierName.trim(),
        returnAmount
      )

      if (result.success) {
        toast.success('Return receipt created successfully!')
        // Reload fiscal receipts
        await loadFiscalReceipts(order.id)
      } else {
        toast.error(`Failed to create return receipt: ${result.error}`)
      }
    } catch (error) {
      toast.error('Error creating return receipt')
      console.error('Error creating return receipt:', error)
    } finally {
      setCreatingFiscalReceipt(false)
    }
  }

  const handleSaveChanges = async () => {
    if (!order) return
    
    // Validate order before saving
    if (!validateOrder(order)) {
      console.log('❌ Order validation failed, cannot save')
      return
    }
    
    setIsLoading(true)
    try {
      // Simulate API call - THIS IS NOT ACTUAL SAVING!
      await new Promise((resolve) => setTimeout(resolve, 1000))
      
      console.log('🔄 Calling parent onSave callback with order data...')
      
      // Determine if this is create or update
      const isCreating = !order.id || order.id === ""
      
              if (isCreating) {
          // For new orders, prepare data for creation
          // Get default currency if none specified
          let currencyId = order.currency
          if (!currencyId) {
            try {
              // First, try to get the default currency
              const defaultCurrency = await pb.collection('currency_options').getFirstListItem('isDefault = true')
              currencyId = defaultCurrency.id
              console.log('✅ Found default currency:', defaultCurrency)
            } catch (error) {
              console.warn('Could not fetch default currency, trying to get any currency:', error)
              try {
                // If no default, get the first available currency
                const currencies = await pb.collection('currency_options').getList(1, 1)
                if (currencies.items.length > 0) {
                  currencyId = currencies.items[0].id
                  console.log('✅ Using first available currency:', currencies.items[0])
                } else {
                  throw new Error('No currencies found in database')
                }
              } catch (fallbackError) {
                console.error('❌ No currencies available in database:', fallbackError)
                throw new Error('No currencies configured. Please add currencies to the system.')
              }
            }
          }
          
          console.log('💰 Using currency ID for order creation:', currencyId)
          
          const orderData = {
            status: order.status,
            orderNumber: order.orderNumber,
            source: order.source || '',
            deliveryMethod: order.deliveryMethod,
            phoneNumber: order.phoneNumber,
            fullName: order.fullName,
            paymentMethod: order.paymentMethod,
            currency: currencyId,
            amount: order.amount,
            numberOfItems: order.numberOfItems,
            notes: order.notes || '',
            deliveryPostNumber: order.deliveryPostNumber || '',
            productionCost: order.productionCost || 0,
            archived: order.archived || false,
            mergeStatus: OrdersMergeStatusOptions.none,
            mergeSource: OrdersMergeSourceOptions.none,
            originalOrders: null,
            products: (order.products || []) as Array<{ title: string; quantity: number; price: number }>
          } as const;
          
                    console.log('🔍 Order data prepared for creation:', JSON.stringify(orderData, null, 2))
          
          // Validate all relation IDs before creating
          try {
            console.log('🔍 Validating relation IDs...')
            await Promise.all([
              pb.collection('status_options').getOne(orderData.status),
              pb.collection('sources').getOne(orderData.source || ''),
              pb.collection('delivery_options').getOne(orderData.deliveryMethod),
              pb.collection('payment_options').getOne(orderData.paymentMethod),
              pb.collection('currency_options').getOne(orderData.currency)
            ])
            console.log('✅ All relation IDs are valid')
          } catch (validationError) {
            console.error('❌ Invalid relation ID found:', validationError)
            throw new Error(`Invalid relation ID: ${validationError instanceof Error ? validationError.message : 'Unknown validation error'}`)
          }
          
            const createResult = await createOrder(orderData)
          if (createResult.error) {
            throw new Error(createResult.error)
          }
          console.log('✅ Order created successfully')
        } else {
          // For existing orders, use the parent's onSave callback
          const saveResult = await onSave(order)
          console.log('✅ Parent onSave callback completed, result:', saveResult)
        }
        console.log('✅ Order saved successfully')
        toast.success("Order saved successfully")
        
        // Close the modal after successful save
        onClose()
    } catch (error) {
      console.error('❌ Error in save process:', error)
      if (error instanceof Error) {
        console.error('❌ Error details:', {
          message: error.message,
          stack: error.stack
        })
      } else {
        console.error('❌ Unknown error type:', error)
      }
      toast.error("Failed to save order. Please try again.")
    } finally {
      setIsLoading(false)
    }
    // onClose(); // Parent will close it after save if needed
  }

  const copyToClipboard = (text: string) => {
    // Fallback function for when clipboard API is not available
    const fallbackCopy = (text: string) => {
      const textArea = document.createElement('textarea')
      textArea.value = text
      textArea.style.position = 'fixed'
      textArea.style.left = '-999999px'
      textArea.style.top = '-999999px'
      document.body.appendChild(textArea)
      textArea.focus()
      textArea.select()
      
      try {
        const successful = document.execCommand('copy')
        document.body.removeChild(textArea)
        return Promise.resolve(successful)
      } catch (err) {
        document.body.removeChild(textArea)
        return Promise.reject(err)
      }
    }

    // Use modern clipboard API if available, otherwise fallback
    const copyPromise = navigator.clipboard && navigator.clipboard.writeText 
      ? navigator.clipboard.writeText(text)
      : fallbackCopy(text)

    copyPromise.then(() => {
      toast.success("Copied to clipboard!")
      console.log("Copied to clipboard:", text)
    }).catch(() => {
      toast.error("Failed to copy to clipboard")
    })
  }

  const formatOrderDetails = () => {
    if (!order) return ""
    
    // Get delivery method name
    const deliveryMethodName = deliveryMethods.find(dm => dm.id === order.deliveryMethod)?.name || "Не вказано"
    
    // Address fallback to delivery post number or "Не вказано"
    const address = order.deliveryPostNumber || "Не вказано"
    
    // Format products with quantities
    const productsText = (order.products as OrderProduct[]).map(product => {
      if (product.quantity > 1) {
        return `**_${product.title} ${product.quantity} шт_**`
      } else {
        return `${product.title} ${product.quantity} шт`
      }
    }).join('\n')
    
    // Build the formatted text
    const formattedText = `№${order.orderNumber}
${address}
${deliveryMethodName}
${order.phoneNumber}
${order.fullName}
${productsText}
Разом: ${formatCurrency(order.amount)}`
    
    return formattedText
  }

  // Get validation error for a specific field
  const getFieldError = (fieldPath: string) => {
    return validationErrors[fieldPath]
  }

  // Check if there are any validation errors
  const hasValidationErrors = Object.keys(validationErrors).length > 0



  return (
    <>
    <Toaster richColors />
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[98vw] max-h-[90vh] flex flex-col p-0 overflow-hidden" style={{ maxWidth: 'none', backgroundColor: 'var(--background)' }}>
        <DialogHeader className="p-6 pb-4 border-b border-border">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <DialogTitle className="text-2xl font-bold text-foreground">
                Order #{order.orderNumber}
              </DialogTitle>
              {(() => {
                const sourceName = sources.find(s => s.id === order.source)?.name;
                return sourceName ? (
                  <Badge 
                    className="text-white text-xs"
                    style={{
                      backgroundColor: getSourceColor(order.source || ''),
                      borderColor: getSourceColor(order.source || '')
                    }}
                  >
                    {sourceName}
                  </Badge>
                ) : null;
              })()}
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(formatOrderDetails())}
                className="h-8 px-3 text-xs"
              >
                <Copy className="h-4 w-4 mr-1" />
                Copy Details
              </Button>
            </div>
            <div className="flex items-center gap-3">
              {currentStatus && (
                <Badge 
                  className="text-white text-xs"
                  style={{
                    backgroundColor: currentStatus.color,
                    borderColor: currentStatus.color
                  }}
                >
                  {currentStatus.name}
                </Badge>
              )}
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {format(new Date(order.created_at_marketplace || order.created), "MMM d, yyyy HH:mm")}
              </span>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 grid md:grid-cols-2 gap-x-8 gap-y-6">
          {/* Validation Summary */}
          {hasValidationErrors && (
            <div className="md:col-span-2 mb-4">
              <Alert className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20">
                <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                <AlertDescription className="text-red-800 dark:text-red-200">
                  Please fix the following validation errors before saving:
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    {Object.entries(validationErrors).map(([field, error]) => (
                      <li key={field} className="text-sm">
                        <strong>{field}:</strong> {error}
                      </li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            </div>
          )}
          {/* Left Column */}
          <div className="space-y-6">
            <section>
              <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-gray-100">Customer Details</h3>
              <div className="space-y-2">
                <Label htmlFor="fullName" className="text-xs text-gray-600 dark:text-gray-400">
                  Full Name
                </Label>
                <Input
                  id="fullName"
                  value={order.fullName}
                  onChange={(e) => handleInputChange("fullName", e.target.value)}
                  className={cn("text-base", getFieldError("fullName") && "border-red-500")}
                />
                {getFieldError("fullName") && (
                  <div className="flex items-center gap-1 text-red-500 text-xs mt-1">
                    <AlertCircle className="h-3 w-3" />
                    {getFieldError("fullName")}
                  </div>
                )}

                <Label htmlFor="phoneNumber" className="text-xs text-gray-600 dark:text-gray-400">
                  Phone Number
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="phoneNumber"
                    value={order.phoneNumber}
                    onChange={(e) => handleInputChange("phoneNumber", e.target.value)}
                    className={cn("text-base flex-1", getFieldError("phoneNumber") && "border-red-500")}
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-9 w-9"
                    onClick={() => (window.location.href = `tel:${order.phoneNumber}`)}
                  >
                    <Phone className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-9 w-9"
                    onClick={() => window.open(`viber://chat?number=${order.phoneNumber.replace(/\+/g, "")}`, "_blank")}
                  >
                    <MessageSquare className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-9 w-9"
                    onClick={() => window.open(`https://t.me/+${order.phoneNumber.replace(/\+/g, "")}`, "_blank")}
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
                {getFieldError("phoneNumber") && (
                  <div className="flex items-center gap-1 text-red-500 text-xs mt-1">
                    <AlertCircle className="h-3 w-3" />
                    {getFieldError("phoneNumber")}
                  </div>
                )}
                {/* {order.email && (
                  <div>
                    <Label htmlFor="email" className="text-xs text-gray-600 dark:text-gray-400">
                      Email
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={order.email}
                      onChange={(e) => handleInputChange("email", e.target.value)}
                      className="text-base"
                    />
                  </div>
                )} */}
              </div>
            </section>

            <section>
              <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-gray-100">Order Information</h3>
              <div className="space-y-3">
                <div className="flex items-center">
                  <Label htmlFor="orderNumberModal" className="text-xs text-gray-600 dark:text-gray-400 w-28">
                    Order #
                  </Label>
                  <Input
                    id="orderNumberModal"
                    value={order.orderNumber}
                    onChange={(e) => handleInputChange("orderNumber", e.target.value)}
                    className="text-base flex-1"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="ml-2 h-8 w-8"
                    onClick={() => copyToClipboard(order.orderNumber)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <div>
                  <Label htmlFor="statusModal" className="text-xs text-gray-600 dark:text-gray-400">
                    Status {isRozetkaOrder && (
                      <span className="text-green-600 dark:text-green-400 font-semibold">
                        (Rozetka)
                      </span>
                    )}
                  </Label>
                  <div className="relative" ref={statusRef}>
                    <Button
                      type="button"
                      variant="outline"
                      role="combobox"
                      className="w-full justify-between mt-1 text-base"
                      onClick={() => setStatusOpen(!statusOpen)}
                    >
                      {currentStatus ? (
                        <div className="flex items-center">
                          <Badge 
                            className="text-white mr-2 text-xs"
                            style={{
                              backgroundColor: currentStatus.color,
                              borderColor: currentStatus.color
                            }}
                          >
                            {currentStatus.name}
                          </Badge>
                        </div>
                      ) : (
                        "Select status"
                      )}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                    
                    {statusOpen && (
                      <div className="absolute z-[999999] w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-md shadow-md mt-1">
                        <div className="flex items-center border-b px-3 py-2">
                          <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                          <Input
                            placeholder="Search statuses..."
                            className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                            value={statusSearchValue}
                            onChange={(e) => setStatusSearchValue(e.target.value)}
                            autoFocus
                          />
                        </div>
                        <ScrollArea className="max-h-[200px] overflow-y-auto">
                          <div className="py-1">
                            {filteredStatuses.length === 0 ? (
                              <div className="p-4 text-center text-gray-600 dark:text-gray-400">
                                No statuses found
                              </div>
                            ) : (
                              filteredStatuses.map((status) => (
                                <div
                                  key={status.id}
                                  className={cn(
                                    "relative flex cursor-pointer select-none items-center rounded-sm px-3 py-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground",
                                    order.status === status.id && "bg-accent text-accent-foreground"
                                  )}
                                  onClick={() => {
                                    handleInputChange("status", status.id)
                                    setStatusOpen(false)
                                    setStatusSearchValue("")
                                  }}
                                >
                                  <Badge 
                                    className="text-white mr-2 text-xs"
                                    style={{
                                      backgroundColor: status.color,
                                      borderColor: status.color
                                    }}
                                  >
                                    {status.name}
                                  </Badge>
                                </div>
                              ))
                            )}
                          </div>
                        </ScrollArea>
                      </div>
                    )}
                  </div>
                </div>
                {/* Source dropdown - only show during order creation */}
                {(!order.id || order.id === "") && (
                  <div>
                    <Label htmlFor="sourceModal" className="text-xs text-gray-600 dark:text-gray-400">
                      Source/Marketplace
                    </Label>
                    <Select value={order.source} onValueChange={(value) => handleInputChange("source", value)}>
                      <SelectTrigger className="w-full mt-1 text-base">
                        <SelectValue placeholder="Select source" />
                      </SelectTrigger>
                      <SelectContent>
                        {sources.map((src) => (
                          <SelectItem key={src.id} value={src.id}>
                            <Badge 
                              className="text-white mr-2 text-xs"
                              style={{
                                backgroundColor: getSourceColor(src.id),
                                borderColor: getSourceColor(src.id)
                              }}
                            >
                              {src.name}
                            </Badge>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Created:{" "}
                  <span className="font-medium text-gray-900 dark:text-gray-100">
                    {format(new Date(order.created_at_marketplace || order.created), "PPPp")}
                  </span>
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Total Amount:{" "}
                  <span className="font-medium text-gray-900 dark:text-gray-100">
                    {formatCurrency(order.amount)}
                  </span>
                </p>
              </div>
            </section>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            <section>
              <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-gray-100">Delivery Details</h3>
              <div className="space-y-3">
                <div>
                  <Label htmlFor="deliveryMethod" className="text-xs text-gray-600 dark:text-gray-400">
                    Delivery Method
                  </Label>
                  <Select
                    value={order.deliveryMethod}
                    onValueChange={(value) => handleInputChange("deliveryMethod", value)}
                  >
                    <SelectTrigger className="w-full mt-1 text-base">
                      <SelectValue placeholder="Select delivery method" />
                    </SelectTrigger>
                    <SelectContent>
                      {deliveryMethods.map((method) => (
                        <SelectItem key={method.id} value={method.id}>
                          {method.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Nova Poshta TTN Section */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-gray-600 dark:text-gray-400">Nova Poshta {t('ttn')}</Label>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsNovaPoshtaModalOpen(true)}
                      className="h-8 px-3 text-xs"
                    >
                      <Truck className="h-4 w-4 mr-1" />
                      {order.invoice_data ? t('manageTtn') : t('createTtn')}
                    </Button>
                  </div>
                  {order.invoice_data && (order.invoice_data as NovaPoshtaInvoiceData)?.IntDocNumber ? (
                    <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Package className="h-4 w-4 text-green-600 dark:text-green-400" />
                          <span className="text-sm font-medium text-green-800 dark:text-green-200">
                            {t('ttn')}: {(order.invoice_data as NovaPoshtaInvoiceData).IntDocNumber}
                          </span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowDeleteConfirmation(true)}
                          className="h-6 w-6 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/20"
                          disabled={deletingTtn}
                        >
                          {deletingTtn ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <X className="h-3 w-3" />
                          )}
                        </Button>
                      </div>
                    </div>
                  ) : null}
                </div>

                {/* Fiscal Receipts Section - Admin Only */}
                <PermissionGate permission={PERMISSIONS.FISCAL_MANAGE}>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs text-gray-600 dark:text-gray-400">Casa.vchasno Fiscal Receipts</Label>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleCreateSaleReceipt}
                          disabled={creatingFiscalReceipt || !order.id}
                          className="h-8 px-3 text-xs"
                        >
                          {creatingFiscalReceipt ? (
                            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                          ) : (
                            <Receipt className="h-4 w-4 mr-1" />
                          )}
                          Sale Receipt
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleCreateReturnReceipt}
                          disabled={creatingFiscalReceipt || !order.id}
                          className="h-8 px-3 text-xs"
                        >
                          {creatingFiscalReceipt ? (
                            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                          ) : (
                            <RotateCcw className="h-4 w-4 mr-1" />
                          )}
                          Return Receipt
                        </Button>
                      </div>
                    )</div>
                  
                  {loadingFiscalReceipts ? (
                    <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-md p-3">
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin text-gray-600 dark:text-gray-400" />
                        <span className="text-sm text-gray-600 dark:text-gray-400">Loading fiscal receipts...</span>
                      </div>
                    </div>
                  ) : fiscalReceipts.length > 0 ? (
                    <div className="space-y-2">
                      {fiscalReceipts.map((receipt, index) => (
                        <div
                          key={receipt.id || index}
                          className={cn(
                            "border rounded-md p-3",
                            receipt.status === 'success' 
                              ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800" 
                              : receipt.status === 'failed'
                              ? "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"
                              : "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800"
                          )}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {receipt.receipt_type === 'sale' ? (
                                <Receipt className="h-4 w-4 text-green-600 dark:text-green-400" />
                              ) : (
                                <RotateCcw className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                              )}
                              <span className="text-sm font-medium capitalize">
                                {receipt.receipt_type} Receipt
                              </span>
                              <Badge 
                                variant={receipt.status === 'success' ? 'default' : receipt.status === 'failed' ? 'destructive' : 'secondary'}
                                className="text-xs"
                              >
                                {receipt.status}
                              </Badge>
                            </div>
                            {receipt.qr_code && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => window.open(receipt.qr_code, '_blank')}
                                className="h-6 px-2 text-xs"
                              >
                                View QR
                              </Button>
                            )}
                          </div>
                          
                          {receipt.document_code && (
                            <div className="mt-2">
                              <p className="text-xs text-gray-600 dark:text-gray-400">
                                Document Code: <span className="font-mono">{receipt.document_code}</span>
                              </p>
                            </div>
                          )}
                          
                          {receipt.error_message && (
                            <div className="mt-2">
                              <p className="text-xs text-red-600 dark:text-red-400">
                                Error: {receipt.error_message}
                              </p>
                            </div>
                          )}
                          
                          {receipt.created && (
                            <div className="mt-2">
                              <p className="text-xs text-gray-500 dark:text-gray-500">
                                Created: {format(new Date(receipt.created), "MMM d, yyyy HH:mm")}
                              </p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : order.id ? (
                    <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-md p-3">
                      <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
                        No fiscal receipts created yet
                      </p>
                    </div>
                  ) : null}
                  </div>
                </PermissionGate>
                
                {order.deliveryPostNumber && (
                  <div>
                    <Label htmlFor="deliveryPostNumber" className="text-xs text-gray-600 dark:text-gray-400">
                      Post/Tracking Number
                    </Label>
                    <Input
                      id="deliveryPostNumber"
                      value={order.deliveryPostNumber}
                      onChange={(e) => handleInputChange("deliveryPostNumber", e.target.value)}
                      className="text-base mt-1"
                    />
                  </div>
                                  )}
              </div>
            </section>

            <section>
              <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-gray-100">Payment Information</h3>
              <div className="space-y-3">
                <div>
                  <Label htmlFor="paymentMethod" className="text-xs text-gray-600 dark:text-gray-400">
                    Payment Method
                  </Label>
                  <Select
                    value={order.paymentMethod}
                    onValueChange={(value) => handleInputChange("paymentMethod", value)}
                  >
                    <SelectTrigger className="w-full mt-1 text-base">
                      <SelectValue placeholder="Select payment method" />
                    </SelectTrigger>
                    <SelectContent>
                      {paymentMethods.map((method) => (
                        <SelectItem key={method.id} value={method.id}>
                          {method.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="productionCost" className="text-xs text-gray-600 dark:text-gray-400">
                    Production Cost (Optional)
                  </Label>
                  <Input
                    id="productionCost"
                    type="number"
                    value={order.productionCost || ""}
                    onChange={(e) =>
                      handleInputChange("productionCost", Number.parseFloat(e.target.value) || undefined)
                    }
                    className="text-base mt-1"
                  />
                </div>
              </div>
            </section>

            <section>
              <div className="flex justify-between items-center mb-1">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Notes</h3>
                <Button variant="ghost" size="sm" onClick={() => setIsEditingNotes(!isEditingNotes)}>
                  {isEditingNotes ? "Done" : <Edit3 className="h-4 w-4 mr-1" />} {isEditingNotes ? "" : "Edit"}
                </Button>
              </div>
              {isEditingNotes ? (
                <Textarea
                  value={order.notes || ""}
                  onChange={(e) => handleInputChange("notes", e.target.value)}
                  placeholder="Add notes for this order..."
                  rows={4}
                  className="text-sm"
                />
              ) : (
                <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap min-h-[40px]">
                  {order.notes || "No notes yet."}
                </p>
              )}
            </section>
          </div>
        </div>

        {/* Products Section */}
        <div className="p-6 border-t border-gray-200 dark:border-gray-700">
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="products-section">
              <AccordionTrigger className="py-3 hover:no-underline">
                <div className="flex justify-between items-center w-full">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Products</h3>
                  {/* Optionally, move the "Add Product" button outside the trigger or style it differently if inside */}
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-1 pb-4">
                <Button variant="outline" size="sm" onClick={handleAddProduct} className="mb-3">
                  <PlusCircle className="h-4 w-4 mr-2" /> Add Product
                </Button>
                <div className="max-h-60 overflow-y-auto border rounded-md border-gray-200 dark:border-gray-700">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[50%]">Product Name</TableHead>
                        <TableHead className="w-[15%] text-center">Quantity</TableHead>
                        <TableHead className="w-[20%] text-right">Unit Price</TableHead>
                        <TableHead className="w-[15%] text-right">Total</TableHead>
                        <TableHead className="w-[5%]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(order.products as OrderProduct[]).map((product, index) => (
                        <TableRow key={index}>
                          <TableCell>
                            <Input
                              value={product.title}
                              onChange={(e) => handleProductChange(index, "title", e.target.value)}
                              className="h-8 text-sm"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              value={product.quantity}
                              onChange={(e) => handleProductChange(index, "quantity", e.target.value)}
                              className="h-8 text-sm text-center"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              value={product.price}
                              onChange={(e) => handleProductChange(index, "price", e.target.value)}
                              className="h-8 text-sm text-right"
                            />
                          </TableCell>
                          <TableCell className="text-right text-sm">
                            {formatCurrency(product.quantity * product.price)}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => handleRemoveProduct(index)}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                      {(order.products as OrderProduct[]).length === 0 && (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-sm text-gray-600 dark:text-gray-400 py-4">
                            No products added yet.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
                <div className="flex justify-end items-center mt-4 gap-6 text-sm">
                  <p>
                    Total Items: <span className="font-semibold">{order.numberOfItems}</span>
                  </p>
                  <p>
                    Total Amount:{" "}
                    <span className="font-semibold">
                      {formatCurrency(order.amount)}
                    </span>
                  </p>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>

        <DialogFooter className="p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
          <Button
            onClick={handleSaveChanges}
            disabled={isLoading || hasValidationErrors}
            className="bg-primary hover:bg-primary/90 text-primary-foreground disabled:opacity-50"
          >
            {isLoading && <Save className="mr-2 h-4 w-4 animate-spin" />}
            {isLoading ? "Saving..." : hasValidationErrors ? "Fix Errors to Save" : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* Nova Poshta Modal */}
    {order && (
      <NovaPoshtaModal
        open={isNovaPoshtaModalOpen}
        onOpenChange={setIsNovaPoshtaModalOpen}
        order={convertToNovaPoshtaOrder(order)}
        onTtnCreated={handleTtnCreated}
        onTtnDeleted={handleTtnDeleted}
        existingTtn={order.invoice_data && (order.invoice_data as NovaPoshtaInvoiceData)?.IntDocNumber ? {
          number: (order.invoice_data as NovaPoshtaInvoiceData).IntDocNumber,
          documentRef: (order.invoice_data as NovaPoshtaInvoiceData).Ref
        } : undefined}
      />
    )}

    {/* TTN Delete Confirmation Dialog */}
    <Dialog open={showDeleteConfirmation} onOpenChange={setShowDeleteConfirmation}>
      <DialogContent className="sm:max-w-md bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-lg">
        <DialogHeader>
          <DialogTitle className="text-gray-900 dark:text-gray-100">{t('deleteTtnTitle')}</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {t('deleteTtnConfirmation')}
          </p>
          {order?.invoice_data && (order.invoice_data as NovaPoshtaInvoiceData)?.IntDocNumber ? (
            <p className="text-sm font-medium mt-2 text-gray-900 dark:text-gray-100">
              {t('ttnNumber')}: {(order.invoice_data as NovaPoshtaInvoiceData).IntDocNumber}
            </p>
          ) : null}
        </div>
        <DialogFooter className="bg-gray-50 dark:bg-gray-800 -m-6 mt-4 p-6 rounded-b-lg">
          <Button 
            variant="outline" 
            onClick={() => setShowDeleteConfirmation(false)}
            disabled={deletingTtn}
            className="bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-600"
          >
            Cancel
          </Button>
          <Button 
            variant="destructive"
            onClick={handleDeleteTtn}
            disabled={deletingTtn}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            {deletingTtn && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t('deleteTtn')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* TTN Not Found Dialog - User Choice */}
    <Dialog open={showNotFoundDialog} onOpenChange={setShowNotFoundDialog}>
      <DialogContent className="sm:max-w-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-lg">
        <DialogHeader>
          <DialogTitle className="text-gray-900 dark:text-gray-100">{t('ttnNotFoundTitle')}</DialogTitle>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md p-3">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              <strong>{t('novaPoshtaError')}:</strong> {notFoundError}
            </p>
          </div>
          
          <div className="space-y-3">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {t('ttnNotFoundDescription')}
            </p>
            <ul className="text-sm text-gray-600 dark:text-gray-400 list-disc list-inside space-y-1 ml-2">
              <li>{t('ttnNotFoundReasons.alreadyDeleted')}</li>
              <li>{t('ttnNotFoundReasons.differentAccount')}</li>
              <li>{t('ttnNotFoundReasons.permissionIssue')}</li>
            </ul>
            
            <p className="text-sm text-gray-900 dark:text-gray-100 font-medium mt-4">
              {t('ttnNotFoundQuestion')}
            </p>
          </div>
          
          {order?.invoice_data && (order.invoice_data as NovaPoshtaInvoiceData)?.IntDocNumber ? (
            <div className="bg-gray-50 dark:bg-gray-800 rounded-md p-3">
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {t('ttnNumber')}: {(order.invoice_data as NovaPoshtaInvoiceData).IntDocNumber}
              </p>
            </div>
          ) : null}
        </div>
        <DialogFooter className="bg-gray-50 dark:bg-gray-800 -m-6 mt-4 p-6 rounded-b-lg flex-col sm:flex-row gap-2">
          <Button 
            variant="outline" 
            onClick={() => setShowNotFoundDialog(false)}
            className="bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-600 w-full sm:w-auto"
          >
            {t('keepReference')}
          </Button>
          <Button 
            variant="destructive"
            onClick={handleRemoveFromApp}
            className="bg-orange-600 hover:bg-orange-700 text-white w-full sm:w-auto"
          >
            {t('removeFromApp')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  )
}
