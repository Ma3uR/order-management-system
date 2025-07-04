"use client"

import React, { useState, useEffect } from "react"
import { Button } from "@/app/components/shared/ui/button"
import { Input } from "@/app/components/shared/ui/input"
import { Dialog, DialogHeader, DialogTitle, DialogFooter, DialogContent } from "@/app/components/shared/ui/dialog"
import { Label } from "@/app/components/shared/ui/label"
import { ScrollArea } from "@/app/components/shared/ui/scroll-area"
import { Search, Receipt, RotateCcw, Loader2, AlertCircle, Copy } from "lucide-react"
import { format } from "date-fns"
import { toast } from 'sonner'
import { getEligibleSaleReceipts, createReturnReceipt, getReturnableAmount, validateReturnAmount } from '@/app/[locale]/orders/actions/fiscal-receipts'
import { Alert, AlertDescription } from "@/app/components/shared/ui/alert"
import { formatCurrency } from "@/app/lib/utils"

interface FiscalReceipt {
  id: string
  receipt_type: 'sale' | 'return' | 'z_report'
  status: 'success' | 'failed' | 'pending'
  created: string
  document_code?: string
  order_id?: string
  error_message?: string
  casa_response?: {
    info?: {
      receipt?: {
        sum?: number
      }
      doccode?: string
      docno?: string
      cashier?: string
      dt?: string
      fisid?: string
    }
    res?: number
    errortxt?: string
  }
  qr_code?: string
  expand?: {
    order_id?: {
      orderNumber?: string
      id?: string
      fullName?: string
      phoneNumber?: string
      amount?: number
      products?: Array<{
        name?: string
        title?: string
        productName?: string
        product_name?: string
        quantity?: number
        qty?: number
        amount?: number
        price?: number
        cost?: number
        value?: number
      }>
    }
  }
}

interface BillReturnModalProps {
  isOpen: boolean
  onClose: () => void
  onReturnCreated?: () => void
}

export function BillReturnModal({
  isOpen,
  onClose,
  onReturnCreated,
}: BillReturnModalProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [cashierName, setCashierName] = useState("")
  const [returnAmount, setReturnAmount] = useState("")
  const [selectedReceipt, setSelectedReceipt] = useState<FiscalReceipt | null>(null)
  const [saleReceipts, setSaleReceipts] = useState<FiscalReceipt[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [creatingReturn, setCreatingReturn] = useState(false)
  const [errors, setErrors] = useState<{ cashier?: string; amount?: string; receipt?: string }>({})
  const [returnableInfo, setReturnableInfo] = useState<{
    originalAmount: number;
    totalReturned: number;
    remainingReturnable: number;
    returnHistory: unknown[];
  } | null>(null)
  const [loadingReturnableAmount, setLoadingReturnableAmount] = useState(false)

  // Load eligible sale receipts
  useEffect(() => {
    if (isOpen) {
      loadSaleReceipts()
    }
  }, [isOpen])

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setSearchQuery("")
      setCashierName("")
      setReturnAmount("")
      setSelectedReceipt(null)
      setReturnableInfo(null)
      setErrors({})
    }
  }, [isOpen])

  // Load returnable amount info when receipt is selected
  useEffect(() => {
    if (selectedReceipt?.order_id && selectedReceipt.casa_response?.info?.receipt?.sum) {
      loadReturnableAmount(selectedReceipt.order_id, selectedReceipt.casa_response.info.receipt.sum)
    }
  }, [selectedReceipt])

  const loadSaleReceipts = async (query?: string) => {
    setSearchLoading(true)
    try {
      const result = await getEligibleSaleReceipts(query, 1, 50)
      if (result.success && result.data?.items) {
        setSaleReceipts(result.data.items as FiscalReceipt[])
      } else {
        toast.error('Failed to load sale receipts')
      }
    } catch (error) {
      console.error('Error loading sale receipts:', error)
      toast.error('Error loading sale receipts')
    } finally {
      setSearchLoading(false)
    }
  }

  const loadReturnableAmount = async (orderId: string, originalAmount: number) => {
    setLoadingReturnableAmount(true)
    try {
      const result = await getReturnableAmount(orderId, originalAmount)
      if (result.success && result.data) {
        setReturnableInfo(result.data)
        // Set default return amount to remaining returnable amount
        setReturnAmount(result.data.remainingReturnable.toString())
      } else {
        console.error('Failed to load returnable amount:', result.error)
        setReturnableInfo(null)
      }
    } catch (error) {
      console.error('Error loading returnable amount:', error)
      setReturnableInfo(null)
    } finally {
      setLoadingReturnableAmount(false)
    }
  }

  // Debounced search function
  useEffect(() => {
    if (!isOpen) return
    
    const timeoutId = setTimeout(() => {
      loadSaleReceipts(searchQuery.trim() || undefined)
    }, 300) // 300ms debounce

    return () => clearTimeout(timeoutId)
  }, [searchQuery, isOpen])

  const validateForm = async () => {
    const newErrors: { cashier?: string; amount?: string; receipt?: string } = {}

    if (!cashierName.trim()) {
      newErrors.cashier = 'Cashier name is required'
    }

    if (!selectedReceipt) {
      newErrors.receipt = 'Please select a receipt to return'
    }

    if (!returnAmount.trim()) {
      newErrors.amount = 'Return amount is required'
    } else if (selectedReceipt?.order_id && selectedReceipt.casa_response?.info?.receipt?.sum) {
      const amount = parseFloat(returnAmount)
      
      if (isNaN(amount) || amount <= 0) {
        newErrors.amount = 'Return amount must be a positive number'
      } else {
        // Use server-side validation
        try {
          const validationResult = await validateReturnAmount(
            selectedReceipt.order_id,
            selectedReceipt.casa_response.info.receipt.sum,
            amount
          )
          
          if (validationResult.success && validationResult.data && !validationResult.data.valid) {
            newErrors.amount = validationResult.data.errorMessage || 'Invalid return amount'
          }
        } catch (error) {
          console.error('Error validating return amount:', error)
          newErrors.amount = 'Failed to validate return amount'
        }
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleCreateReturn = async () => {
    if (!(await validateForm())) {
      return
    }

    if (!selectedReceipt?.order_id) {
      toast.error('No order ID found for selected receipt')
      return
    }

    setCreatingReturn(true)
    try {
      const result = await createReturnReceipt(
        selectedReceipt.order_id,
        cashierName.trim(),
        parseFloat(returnAmount)
      )

      if (result.success) {
        toast.success('Return receipt created successfully!')
        onReturnCreated?.()
        onClose()
      } else {
        toast.error(`Failed to create return receipt: ${result.error}`)
      }
    } catch (error) {
      toast.error('Error creating return receipt')
      console.error('Error creating return receipt:', error)
    } finally {
      setCreatingReturn(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast.success("Copied to clipboard!")
    }).catch(() => {
      toast.error("Failed to copy to clipboard")
    })
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RotateCcw className="h-5 w-5 text-red-600" />
            Process Bill Return
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Side - Receipt Search */}
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium">Search Sale Receipts</Label>
              <div className="relative mt-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by order number, customer name, document code..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {errors.receipt && (
              <Alert className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20">
                <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                <AlertDescription className="text-red-800 dark:text-red-200">
                  {errors.receipt}
                </AlertDescription>
              </Alert>
            )}

            <ScrollArea className="h-[400px] border rounded-lg">
              {searchLoading ? (
                <div className="flex items-center justify-center p-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                  <span className="ml-2">Loading receipts...</span>
                </div>
              ) : saleReceipts.length > 0 ? (
                <div className="p-2 space-y-2">
                  {saleReceipts.map((receipt) => (
                    <div
                      key={receipt.id}
                      className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                        selectedReceipt?.id === receipt.id
                          ? 'border-primary bg-primary/10'
                          : 'border-border hover:bg-muted/50'
                      }`}
                      onClick={() => {
                        setSelectedReceipt(receipt)
                        setErrors(prev => ({ ...prev, receipt: undefined }))
                        // Return amount will be set automatically when returnable info loads
                      }}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <Receipt className="h-4 w-4 text-green-600" />
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-sm">
                              Order #{receipt.expand?.order_id?.orderNumber || 'N/A'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {receipt.expand?.order_id?.fullName || 'Unknown Customer'}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-green-600">
                            {receipt.casa_response?.info?.receipt?.sum 
                              ? formatCurrency(receipt.casa_response.info.receipt.sum)
                              : 'N/A'
                            }
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(receipt.created), "MMM d, HH:mm")}
                          </p>
                        </div>
                      </div>
                      
                      {receipt.document_code && (
                        <div className="mt-2 flex items-center gap-2">
                          <p className="text-xs text-muted-foreground font-mono">
                            Doc: {receipt.document_code}
                          </p>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              copyToClipboard(receipt.document_code || '')
                            }}
                            className="h-5 w-5 p-0"
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      )}

                      {receipt.expand?.order_id?.products && (
                        <div className="mt-2">
                          <p className="text-xs text-muted-foreground">
                            Products: {receipt.expand.order_id.products.map(p => {
                              const name = p.name || p.title || p.productName || p.product_name || 'Product';
                              const quantity = p.quantity || p.qty || p.amount || 1;
                              return `${name} (${quantity}x)`;
                            }).join(', ')}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center p-8 text-center">
                  <Receipt className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p className="text-muted-foreground">
                    {searchQuery ? 'No receipts found matching your search' : 'No sale receipts available'}
                  </p>
                </div>
              )}
            </ScrollArea>
          </div>

          {/* Right Side - Return Details */}
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium">Selected Receipt Details</Label>
              {selectedReceipt ? (
                <div className="mt-2 p-4 border rounded-lg bg-muted/30">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Order:</span>
                      <span className="text-sm">#{selectedReceipt.expand?.order_id?.orderNumber || 'N/A'}</span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Customer:</span>
                      <span className="text-sm">{selectedReceipt.expand?.order_id?.fullName || 'N/A'}</span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Original Amount:</span>
                      <span className="text-sm font-bold text-green-600">
                        {selectedReceipt.casa_response?.info?.receipt?.sum 
                          ? formatCurrency(selectedReceipt.casa_response.info.receipt.sum)
                          : 'N/A'
                        }
                      </span>
                    </div>

                    {loadingReturnableAmount ? (
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span className="text-sm text-muted-foreground">Loading return info...</span>
                      </div>
                    ) : returnableInfo ? (
                      <>
                        {returnableInfo.totalReturned > 0 && (
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">Total Returned:</span>
                            <span className="text-sm font-bold text-red-600">
                              {formatCurrency(returnableInfo.totalReturned)}
                            </span>
                          </div>
                        )}
                        
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Remaining Returnable:</span>
                          <span className="text-sm font-bold text-blue-600">
                            {formatCurrency(returnableInfo.remainingReturnable)}
                          </span>
                        </div>

                        {returnableInfo.returnHistory.length > 0 && (
                          <div className="text-sm">
                            <span className="font-medium">Return History:</span>
                            <div className="text-xs text-muted-foreground mt-1">
                              {returnableInfo.returnHistory.length} previous return(s)
                            </div>
                          </div>
                        )}
                      </>
                    ) : null}
                    
                    {selectedReceipt.document_code && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Document Code:</span>
                        <span className="text-sm font-mono">{selectedReceipt.document_code}</span>
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Date:</span>
                      <span className="text-sm">
                        {format(new Date(selectedReceipt.created), "MMM d, yyyy 'at' HH:mm")}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mt-2 p-4 border rounded-lg bg-muted/30 text-center">
                  <p className="text-sm text-muted-foreground">
                    Select a receipt from the left to see details
                  </p>
                </div>
              )}
            </div>

            {/* Return Form */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="cashierName" className="text-sm font-medium">
                  Cashier Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="cashierName"
                  value={cashierName}
                  onChange={(e) => {
                    setCashierName(e.target.value)
                    if (errors.cashier) {
                      setErrors(prev => ({ ...prev, cashier: undefined }))
                    }
                  }}
                  placeholder="Enter cashier name"
                  className={errors.cashier ? "border-red-500" : ""}
                />
                {errors.cashier && (
                  <p className="text-sm text-red-500 mt-1">{errors.cashier}</p>
                )}
              </div>

              <div>
                <Label htmlFor="returnAmount" className="text-sm font-medium">
                  Return Amount <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="returnAmount"
                  type="number"
                  step="0.01"
                  min="0"
                  max={returnableInfo?.remainingReturnable || selectedReceipt?.casa_response?.info?.receipt?.sum || undefined}
                  value={returnAmount}
                  onChange={(e) => {
                    setReturnAmount(e.target.value)
                    if (errors.amount) {
                      setErrors(prev => ({ ...prev, amount: undefined }))
                    }
                  }}
                  placeholder="Enter return amount"
                  className={errors.amount ? "border-red-500" : ""}
                />
                {errors.amount && (
                  <p className="text-sm text-red-500 mt-1">{errors.amount}</p>
                )}
                {returnableInfo && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Maximum returnable: {formatCurrency(returnableInfo.remainingReturnable)}
                    {returnableInfo.totalReturned > 0 && (
                      <span className="text-red-600 ml-1">
                        (₴{returnableInfo.totalReturned.toFixed(2)} already returned)
                      </span>
                    )}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="border-t pt-4">
          <Button variant="outline" onClick={onClose} disabled={creatingReturn}>
            Cancel
          </Button>
          <Button
            onClick={handleCreateReturn}
            disabled={creatingReturn || !selectedReceipt || !cashierName.trim() || !returnAmount.trim()}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            {creatingReturn && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {creatingReturn ? "Creating Return..." : "Create Return Receipt"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}