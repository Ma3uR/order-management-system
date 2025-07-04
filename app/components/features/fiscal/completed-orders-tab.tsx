"use client"

import React, { useState, useEffect } from "react"
import { useTranslations } from 'next-intl'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/shared/ui/card"
import { Button } from "@/app/components/shared/ui/button"
import { Badge } from "@/app/components/shared/ui/badge"
import { Checkbox } from "@/app/components/shared/ui/checkbox"
import { Input } from "@/app/components/shared/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/shared/ui/select"
import { 
  ListChecks, 
  Receipt, 
  Search, 
  Loader2, 
  CheckCircle, 
  ExternalLink,
  Filter
} from "lucide-react"
import { format } from 'date-fns'
import { getCompletedOrdersWithoutReceipts, createSaleReceipt } from '@/app/[locale]/orders/actions/fiscal-receipts'
import { toast } from "sonner"

interface CompletedOrder {
  id: string
  orderNumber: string
  fullName: string
  phoneNumber?: string
  amount: number
  created: string
  created_at_marketplace?: string
  products: Array<{
    title?: string
    name?: string
    quantity?: number
    price?: number
  }>
  expand?: {
    status?: {
      name?: string
      marketplace_code?: number
    }
    source?: {
      name?: string
    }
  }
}

export function CompletedOrdersTab(): JSX.Element {
  const t = useTranslations('Fiscal')
  const [orders, setOrders] = useState<CompletedOrder[]>([])
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [marketplaceFilter, setMarketplaceFilter] = useState<string>("all")
  const [generatingReceipts, setGeneratingReceipts] = useState(false)
  const [processingOrderIds, setProcessingOrderIds] = useState<Set<string>>(new Set())

  // Load completed orders without fiscal receipts
  useEffect(() => {
    const loadCompletedOrders = async () => {
      setLoading(true)
      try {
        const result = await getCompletedOrdersWithoutReceipts()
        if (result.success && result.data) {
          setOrders(result.data as CompletedOrder[])
        }
      } catch (error) {
        console.error('Error loading completed orders:', error)
        toast.error('Failed to load completed orders')
      } finally {
        setLoading(false)
      }
    }

    loadCompletedOrders()
  }, [])

  // Filter orders based on search and marketplace
  const filteredOrders = orders.filter(order => {
    const matchesSearch = 
      order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.phoneNumber?.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesMarketplace = 
      marketplaceFilter === "all" ||
      order.expand?.status?.marketplace_code?.toString() === marketplaceFilter

    return matchesSearch && matchesMarketplace
  })

  // Handle individual order selection
  const handleOrderSelection = (orderId: string, checked: boolean) => {
    const newSelected = new Set(selectedOrderIds)
    if (checked) {
      newSelected.add(orderId)
    } else {
      newSelected.delete(orderId)
    }
    setSelectedOrderIds(newSelected)
  }

  // Handle select all
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedOrderIds(new Set(filteredOrders.map(order => order.id)))
    } else {
      setSelectedOrderIds(new Set())
    }
  }

  // Generate fiscal receipts for selected orders
  const handleGenerateReceipts = async () => {
    const selectedOrders = filteredOrders.filter(order => selectedOrderIds.has(order.id))
    if (selectedOrders.length === 0) {
      toast.error(t('pleaseSelectOrders'))
      return
    }

    setGeneratingReceipts(true)
    const newProcessingIds = new Set(selectedOrderIds)
    setProcessingOrderIds(newProcessingIds)

    let successCount = 0
    let errorCount = 0

    try {
      for (const order of selectedOrders) {
        try {
          console.log(`🧾 Generating receipt for order ${order.orderNumber}...`)
          
          // Generate fiscal receipt using server action
          const result = await createSaleReceipt(
            order.id,
            'System' // Default cashier name for bulk operations
          )
          
          if (!result.success) {
            throw new Error(result.error || 'Failed to create receipt')
          }
          
          successCount++
          
          // Show individual success toast
          toast.success(`✅ Receipt created for order ${order.orderNumber} (${order.fullName})`)
          
          // Remove from selected and processing
          const newSelected = new Set(selectedOrderIds)
          newSelected.delete(order.id)
          setSelectedOrderIds(newSelected)
          
          const newProcessing = new Set(processingOrderIds)
          newProcessing.delete(order.id)
          setProcessingOrderIds(newProcessing)
          
        } catch (error) {
          console.error(`❌ Error generating receipt for order ${order.orderNumber}:`, error)
          errorCount++
          
          // Show individual error toast with more details
          const errorMessage = error instanceof Error ? error.message : 'Unknown error'
          toast.error(`❌ Failed to create receipt for order ${order.orderNumber}: ${errorMessage}`)
          
          // Remove from processing but keep in selected for retry
          const newProcessing = new Set(processingOrderIds)
          newProcessing.delete(order.id)
          setProcessingOrderIds(newProcessing)
        }
      }

      // Show final summary
      if (successCount > 0 && errorCount === 0) {
        toast.success(`🎉 All ${successCount} receipts generated successfully!`)
      } else if (successCount > 0 && errorCount > 0) {
        toast.warning(`⚠️ Generated ${successCount} receipts, ${errorCount} failed. Check failed orders above.`)
      } else if (errorCount > 0) {
        toast.error(`❌ All ${errorCount} receipt generations failed. Check errors above.`)
      }

      // Reload orders to refresh the list
      const result = await getCompletedOrdersWithoutReceipts()
      if (result.success && result.data) {
        setOrders(result.data as CompletedOrder[])
      }

    } finally {
      setGeneratingReceipts(false)
      setProcessingOrderIds(new Set())
    }
  }

  // Navigate to order details
  const handleViewOrder = (orderId: string) => {
    // Open orders page with specific order modal
    const ordersUrl = `/${window.location.pathname.split('/')[1]}/orders?openModal=${orderId}`
    window.open(ordersUrl, '_blank')
  }

  const allSelected = filteredOrders.length > 0 && selectedOrderIds.size === filteredOrders.length
  // const someSelected = selectedOrderIds.size > 0

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ListChecks className="h-5 w-5 text-orange-600" />
          {t('completedOrdersWithoutReceipts')}
        </CardTitle>
        <CardDescription>
          {t('completedOrdersDescription')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters and Search */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex items-center gap-2 flex-1">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('searchOrdersPlaceholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={marketplaceFilter} onValueChange={setMarketplaceFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder={t('filterByMarketplace')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('allMarketplaces')}</SelectItem>
                <SelectItem value="6">{t('marketplaceCode', { code: 6 })}</SelectItem>
                <SelectItem value="1">{t('marketplaceCode', { code: 1 })}</SelectItem>
                <SelectItem value="2">{t('marketplaceCode', { code: 2 })}</SelectItem>
                <SelectItem value="3">{t('marketplaceCode', { code: 3 })}</SelectItem>
                <SelectItem value="4">{t('marketplaceCode', { code: 4 })}</SelectItem>
                <SelectItem value="5">{t('marketplaceCode', { code: 5 })}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Action Bar */}
        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-3">
            <Checkbox
              checked={allSelected}
              onCheckedChange={handleSelectAll}
              // indeterminate={someSelected && !allSelected}
            />
            <span className="text-sm font-medium">
              {selectedOrderIds.size > 0 
                ? t('ordersSelected', { count: selectedOrderIds.size, total: filteredOrders.length })
                : t('selectAllOrders', { count: filteredOrders.length })
              }
            </span>
          </div>
          <Button
            onClick={handleGenerateReceipts}
            disabled={selectedOrderIds.size === 0 || generatingReceipts}
            className="flex items-center gap-2"
          >
            {generatingReceipts ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="animate-pulse">Generating {selectedOrderIds.size} receipts...</span>
              </>
            ) : (
              <>
                <Receipt className="h-4 w-4" />
                {t('generateReceipts', { count: selectedOrderIds.size })}
              </>
            )}
          </Button>
        </div>

        {/* Orders Table */}
        <div className="border rounded-lg overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
              <p className="text-muted-foreground">{t('loadingCompletedOrders')}</p>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="p-8 text-center">
              <CheckCircle className="h-12 w-12 mx-auto mb-2 text-green-500" />
              <h3 className="font-medium mb-1">{t('allOrdersHaveReceipts')}</h3>
              <p className="text-muted-foreground text-sm">
                {orders.length === 0 
                  ? t('noCompletedOrders')
                  : t('allCompletedOrdersHaveReceipts')
                }
              </p>
            </div>
          ) : (
            <div className="max-h-96 overflow-y-auto">
              <table className="w-full">
                <thead className="bg-muted/50 sticky top-0">
                  <tr>
                    <th className="p-3 text-left w-12">
                      <Checkbox
                        checked={allSelected}
                        onCheckedChange={handleSelectAll}
                        // indeterminate={someSelected && !allSelected}
                      />
                    </th>
                    <th className="p-3 text-left font-medium">{t('order')}</th>
                    <th className="p-3 text-left font-medium">{t('customer')}</th>
                    <th className="p-3 text-left font-medium">{t('amount')}</th>
                    <th className="p-3 text-left font-medium">{t('status')}</th>
                    <th className="p-3 text-left font-medium">{t('date')}</th>
                    <th className="p-3 text-left font-medium">{t('actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.map((order) => (
                    <tr key={order.id} className="border-t hover:bg-muted/25">
                      <td className="p-3">
                        <Checkbox
                          checked={selectedOrderIds.has(order.id)}
                          onCheckedChange={(checked) => handleOrderSelection(order.id, checked as boolean)}
                          disabled={processingOrderIds.has(order.id)}
                        />
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm">{order.orderNumber}</span>
                          {processingOrderIds.has(order.id) && (
                            <Loader2 className="h-3 w-3 animate-spin text-orange-500" />
                          )}
                        </div>
                      </td>
                      <td className="p-3">
                        <div>
                          <p className="font-medium text-sm">{order.fullName}</p>
                          {order.phoneNumber && (
                            <p className="text-xs text-muted-foreground">{order.phoneNumber}</p>
                          )}
                        </div>
                      </td>
                      <td className="p-3">
                        <span className="font-medium text-green-600">₴{order.amount.toFixed(2)}</span>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-xs">
                            {order.expand?.status?.name || 'Completed'}
                          </Badge>
                          {order.expand?.status?.marketplace_code && (
                            <Badge variant="outline" className="text-xs">
                              MC: {order.expand.status.marketplace_code}
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="p-3 text-sm text-muted-foreground">
                        {format(new Date(order.created_at_marketplace || order.created), "MMM d, HH:mm")}
                      </td>
                      <td className="p-3">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewOrder(order.id)}
                          className="h-8 w-8 p-0"
                          title={t('viewOrderDetails')}
                        >
                          <ExternalLink className="h-3 w-3" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Summary */}
        {filteredOrders.length > 0 && (
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>
              {t('ordersWithoutReceipts', { count: filteredOrders.length })}
            </span>
            <span>
              {t('totalValue', { amount: filteredOrders.reduce((sum, order) => sum + order.amount, 0).toFixed(2) })}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}