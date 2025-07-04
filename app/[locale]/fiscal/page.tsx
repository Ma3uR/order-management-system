"use client"

import React, { useState } from "react"
import { useTranslations } from 'next-intl'
import { ShiftManagement } from "@/app/components/features/orders/components/shift-management"
import { ZReportViewer } from "@/app/components/features/orders/components/z-report-viewer"
import type { ZReportData } from "@/app/components/features/orders/components/z-report-viewer"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/shared/ui/card"
import { Button } from "@/app/components/shared/ui/button"
import { Badge } from "@/app/components/shared/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/app/components/shared/ui/dialog"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/app/components/shared/ui/tabs"
import { Calculator, Receipt, FileText, TrendingUp, Clock, Copy, CheckCircle, XCircle, QrCode, RotateCcw, ListChecks, ExternalLink } from "lucide-react"
import { BillReturnModal } from "@/app/components/features/orders/components/bill-return-modal"
import { getFiscalReceipts, getFiscalShifts, getFiscalStatistics } from '@/app/[locale]/orders/actions/fiscal-receipts'
import { useEffect } from 'react'
import { format } from 'date-fns'
import { CompletedOrdersTab } from "@/app/components/features/fiscal/completed-orders-tab"

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

interface FiscalShift {
  id: string
  cashier: string
  status: 'open' | 'closed'
  opened_at: string
  closed_at?: string
  z_report_data?: Record<string, unknown>
}

export default function FiscalPage(): JSX.Element {
  const t = useTranslations('Fiscal')
  const [selectedZReport, setSelectedZReport] = useState<Record<string, unknown> | null>(null)
  const [showZReportViewer, setShowZReportViewer] = useState(false)
  const [selectedReceipt, setSelectedReceipt] = useState<FiscalReceipt | null>(null)
  const [showReceiptDetails, setShowReceiptDetails] = useState(false)
  const [recentReceipts, setRecentReceipts] = useState<FiscalReceipt[]>([])
  const [recentShifts, setRecentShifts] = useState<FiscalShift[]>([])
  const [loading, setLoading] = useState(true)
  const [fiscalStats, setFiscalStats] = useState<{
    todayReceipts: number;
    todaySales: number;
    todayReturns: number;
  } | null>(null)
  const [statsLoading, setStatsLoading] = useState(true)
  const [showBillReturnModal, setShowBillReturnModal] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [hasMoreReceipts, setHasMoreReceipts] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)

  // Load recent fiscal data
  useEffect(() => {
    const loadFiscalData = async () => {
      setLoading(true)
      setStatsLoading(true)
      try {
        const [receiptsResult, shiftsResult, statsResult] = await Promise.all([
          getFiscalReceipts(1, 10),
          getFiscalShifts(1, 5),
          getFiscalStatistics()
        ])

        if (receiptsResult.success && receiptsResult.data) {
          setRecentReceipts((receiptsResult.data.items || []) as FiscalReceipt[])
          const totalPages = Math.ceil((receiptsResult.data.totalItems || 0) / (receiptsResult.data.perPage || 10))
          setHasMoreReceipts(totalPages > 1)
          setCurrentPage(1)
        }

        if (shiftsResult.success && shiftsResult.data) {
          setRecentShifts((shiftsResult.data.items || []) as FiscalShift[])
        }

        if (statsResult.success && statsResult.data) {
          setFiscalStats({
            todayReceipts: statsResult.data.todayReceipts,
            todaySales: statsResult.data.todaySales,
            todayReturns: statsResult.data.todayReturns
          })
        }
      } catch (error) {
        console.error('Error loading fiscal data:', error)
      } finally {
        setLoading(false)
        setStatsLoading(false)
      }
    }

    loadFiscalData()
  }, [])

  // Load more receipts for infinite scroll
  const loadMoreReceipts = async () => {
    if (loadingMore || !hasMoreReceipts) return
    setLoadingMore(true)
    try {
      const nextPage = currentPage + 1
      const receiptsResult = await getFiscalReceipts(nextPage, 10)
      if (receiptsResult.success && receiptsResult.data) {
        const newReceipts = (receiptsResult.data.items || []) as FiscalReceipt[]
        setRecentReceipts(prev => [...prev, ...newReceipts])
        setCurrentPage(nextPage)
        const totalPages = Math.ceil((receiptsResult.data.totalItems || 0) / (receiptsResult.data.perPage || 10))
        setHasMoreReceipts(nextPage < totalPages)
      }
    } catch (error) {
      console.error('Error loading more receipts:', error)
    } finally {
      setLoadingMore(false)
    }
  }

  // Handle scroll to load more receipts
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget
    if (scrollHeight - scrollTop <= clientHeight + 10) {
      loadMoreReceipts()
    }
  }

  const handleViewZReport = (shift: FiscalShift) => {
    if (shift.z_report_data) {
      setSelectedZReport(shift.z_report_data)
      setShowZReportViewer(true)
    }
  }

  const handleViewReceipt = (receipt: FiscalReceipt) => {
    setSelectedReceipt(receipt)
    setShowReceiptDetails(true)
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const handleReturnCreated = () => {
    // Refresh fiscal data after a return is created
    const loadFiscalData = async () => {
      setLoading(true)
      setStatsLoading(true)
      try {
        const [receiptsResult, shiftsResult, statsResult] = await Promise.all([
          getFiscalReceipts(1, 10),
          getFiscalShifts(1, 5),
          getFiscalStatistics()
        ])

        if (receiptsResult.success && receiptsResult.data) {
          setRecentReceipts((receiptsResult.data.items || []) as FiscalReceipt[])
          const totalPages = Math.ceil((receiptsResult.data.totalItems || 0) / (receiptsResult.data.perPage || 10))
          setHasMoreReceipts(totalPages > 1)
          setCurrentPage(1)
        }

        if (shiftsResult.success && shiftsResult.data) {
          setRecentShifts((shiftsResult.data.items || []) as FiscalShift[])
        }

        if (statsResult.success && statsResult.data) {
          setFiscalStats({
            todayReceipts: statsResult.data.todayReceipts,
            todaySales: statsResult.data.todaySales,
            todayReturns: statsResult.data.todayReturns
          })
        }
      } catch (error) {
        console.error('Error loading fiscal data:', error)
      } finally {
        setLoading(false)
        setStatsLoading(false)
      }
    }

    loadFiscalData()
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8 px-4 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Calculator className="h-6 w-6 text-primary" />
              {t('title')}
            </h1>
            <p className="text-muted-foreground mt-1 max-w-2xl text-sm">
              {t('description')}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => setShowBillReturnModal(true)}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Process Return
            </Button>
          </div>
        </div>

        {/* Fiscal Management Tabs */}
        <Tabs defaultValue="dashboard" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="dashboard" className="flex items-center gap-2">
              <Calculator className="h-4 w-4" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="receipt-management" className="flex items-center gap-2">
              <ListChecks className="h-4 w-4" />
              {t('receiptManagement')}
            </TabsTrigger>
          </TabsList>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="space-y-6">
            {/* Today's Fiscal Statistics */}
            <Card className="border-green-200 dark:border-green-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-800 dark:text-green-200">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                  {t('todaysFiscalStatistics')}
                </CardTitle>
                <CardDescription className="text-green-700 dark:text-green-300">
                  {t('todaysFiscalStatisticsDescription')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {statsLoading ? (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="h-20 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
                      <div className="flex items-center gap-2 mb-2">
                        <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
                        <span className="text-sm font-medium text-green-800 dark:text-green-200">
                          {t('salesToday')}
                        </span>
                      </div>
                      <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                        {fiscalStats ? `${fiscalStats.todaySales.toFixed(0)} грн` : '0 грн'}
                      </p>
                    </div>
                    
                    <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4 border border-orange-200 dark:border-orange-800">
                      <div className="flex items-center gap-2 mb-2">
                        <Receipt className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                        <span className="text-sm font-medium text-orange-800 dark:text-orange-200">
                          {t('returnsToday')}
                        </span>
                      </div>
                      <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                        {fiscalStats ? `${fiscalStats.todayReturns.toFixed(0)} грн` : '0 грн'}
                      </p>
                    </div>
                    
                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                      <div className="flex items-center gap-2 mb-2">
                        <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
                          {t('totalReceipts')}
                        </span>
                      </div>
                      <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                        {fiscalStats ? fiscalStats.todayReceipts : 0}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Shift Management and Recent Receipts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[500px]">
          {/* Recent Fiscal Receipts */}
          <Card className="border-purple-200 dark:border-purple-800 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-900/30 flex flex-col h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-purple-800 dark:text-purple-200">
                <Receipt className="h-5 w-5 text-purple-600" />
                {t('recentReceipts')}
              </CardTitle>
              <CardDescription className="text-purple-700 dark:text-purple-300">
                {t('recentReceiptsDescription')}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 overflow-hidden">
              {loading ? (
                <div className="space-y-2">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-16 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
                  ))}
                </div>
              ) : recentReceipts.length > 0 ? (
                <div className="max-h-[700px] overflow-y-auto" onScroll={handleScroll}>
                  <div className="space-y-3 pr-2">
                    {recentReceipts.map((receipt) => (
                    <div 
                      key={receipt.id} 
                      className="flex items-start gap-3 p-3 bg-white/50 dark:bg-gray-800/50 rounded-lg cursor-pointer hover:bg-white/70 dark:hover:bg-gray-700/50 transition-colors"
                      onClick={() => handleViewReceipt(receipt)}
                    >
                      {receipt.receipt_type === 'sale' ? (
                        <Receipt className="h-4 w-4 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                      ) : receipt.receipt_type === 'return' ? (
                        <Receipt className="h-4 w-4 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                      ) : (
                        <Receipt className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium capitalize">
                            {receipt.receipt_type} Receipt
                          </p>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {receipt.receipt_type === 'sale' && receipt.status === 'success' && receipt.order_id && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setShowBillReturnModal(true)
                                }}
                                className="h-6 w-6 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                title="Process Return"
                              >
                                <RotateCcw className="h-3 w-3" />
                              </Button>
                            )}
                            {receipt.qr_code && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  window.open(receipt.qr_code, '_blank')
                                }}
                                className="h-6 w-6 p-0"
                                title="View QR Code"
                              >
                                <QrCode className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {receipt.created && !isNaN(new Date(receipt.created).getTime()) ? format(new Date(receipt.created), "MMM d, HH:mm") : 'N/A'}
                          {receipt.casa_response?.info?.receipt?.sum && (
                            <span className="font-medium text-gray-600 dark:text-gray-300 ml-2">
                              • ₴{receipt.casa_response.info.receipt.sum.toFixed(2)}
                            </span>
                          )}
                        </p>
                        {receipt.expand?.order_id?.fullName && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                            👥 {receipt.expand.order_id.fullName}
                          </p>
                        )}
                        {receipt.expand?.order_id?.products && Array.isArray(receipt.expand.order_id.products) && receipt.expand.order_id.products.length > 0 && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                            📦 {receipt.expand.order_id.products.map(p => {
                              const name = p.name || p.title || p.productName || p.product_name || 'Product';
                              const quantity = p.quantity || p.qty || p.amount || 1;
                              return `${name} (${quantity}x)`;
                            }).join(', ')}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                  </div>
                  {loadingMore && (
                    <div className="space-y-2 mt-3">
                      {[...Array(2)].map((_, i) => (
                        <div key={i} className="h-16 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
                      ))}
                    </div>
                  )}
                  {!hasMoreReceipts && recentReceipts.length > 10 && (
                    <div className="text-center py-2 text-xs text-muted-foreground">
                      No more receipts to load
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Receipt className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>{t('noRecentReceipts')}</p>
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Shift Management */}
          <Card className="border-blue-200 dark:border-blue-800 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-900/30 flex flex-col h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-blue-800 dark:text-blue-200">
                <Clock className="h-5 w-5 text-blue-600" />
                {t('shiftManagement')}
              </CardTitle>
              <CardDescription className="text-blue-700 dark:text-blue-300">
                {t('shiftManagementDescription')}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 overflow-auto">
              <ShiftManagement />
              
              {/* Recent Shifts Section */}
              <div className="mt-6 space-y-3">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-blue-600" />
                  <h3 className="font-medium text-blue-800 dark:text-blue-200">{t('recentShifts')}</h3>
                </div>
                <div className="text-xs text-blue-700 dark:text-blue-300 mb-3">
                  {t('recentShiftsDescription')}
                </div>
                {loading ? (
                  <div className="space-y-2">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="h-12 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
                    ))}
                  </div>
                ) : recentShifts.length > 0 ? (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {recentShifts.slice(0, 4).map((shift) => (
                      <div key={shift.id} className="flex items-center justify-between p-2 bg-blue-50/50 dark:bg-blue-900/10 rounded-lg">
                        <div className="flex items-center gap-2">
                          <Clock className="h-3 w-3 text-gray-600 dark:text-gray-400" />
                          <div>
                            <p className="text-xs font-medium">{shift.cashier}</p>
                            <p className="text-xs text-muted-foreground">
                              {shift.opened_at && !isNaN(new Date(shift.opened_at).getTime()) ? format(new Date(shift.opened_at), "MMM d, HH:mm") : 'N/A'}
                              {shift.closed_at && !isNaN(new Date(shift.closed_at).getTime()) && ` - ${format(new Date(shift.closed_at), "HH:mm")}`}
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <Badge 
                            variant={shift.status === 'open' ? 'default' : 'secondary'}
                            className="text-xs h-4"
                          >
                            {shift.status}
                          </Badge>
                          {shift.status === 'closed' && shift.z_report_data && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewZReport(shift)}
                              className="h-4 px-1 text-xs"
                            >
                              Z-Report
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4 text-muted-foreground">
                    <FileText className="h-8 w-8 mx-auto mb-1 opacity-50" />
                    <p className="text-xs">{t('noRecentShifts')}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
          </TabsContent>

          {/* Receipt Management Tab */}
          <TabsContent value="receipt-management">
            <CompletedOrdersTab />
          </TabsContent>
        </Tabs>

        {/* Z-Report Viewer Modal */}
        {selectedZReport && (
          <ZReportViewer
            isOpen={showZReportViewer}
            onClose={() => {
              setShowZReportViewer(false)
              setSelectedZReport(null)
            }}
            zReportData={selectedZReport as ZReportData}
          />
        )}

        {/* Receipt Details Modal */}
        {selectedReceipt && (
          <Dialog open={showReceiptDetails} onOpenChange={setShowReceiptDetails}>
            <DialogContent className="max-w-md bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {selectedReceipt.receipt_type === 'sale' ? (
                    <Receipt className="h-5 w-5 text-green-600" />
                  ) : selectedReceipt.receipt_type === 'return' ? (
                    <Receipt className="h-5 w-5 text-red-600" />
                  ) : (
                    <Receipt className="h-5 w-5 text-blue-600" />
                  )}
                  {selectedReceipt.receipt_type.charAt(0).toUpperCase() + selectedReceipt.receipt_type.slice(1)} Receipt
                </DialogTitle>
              </DialogHeader>
              
              <div className="space-y-4">
                {/* Status */}
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Status:</span>
                  <div className="flex items-center gap-2">
                    {selectedReceipt.status === 'success' ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : selectedReceipt.status === 'failed' ? (
                      <XCircle className="h-4 w-4 text-red-600" />
                    ) : (
                      <Clock className="h-4 w-4 text-orange-600" />
                    )}
                    <Badge 
                      variant={selectedReceipt.status === 'success' ? 'default' : selectedReceipt.status === 'failed' ? 'destructive' : 'secondary'}
                    >
                      {selectedReceipt.status}
                    </Badge>
                  </div>
                </div>

                {/* Receipt ID */}
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Receipt ID:</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-mono">{selectedReceipt.id}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(selectedReceipt.id)}
                      className="h-6 w-6 p-0"
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>

                {/* Document Code */}
                {selectedReceipt.document_code && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Document Code:</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-mono">{selectedReceipt.document_code}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(selectedReceipt.document_code || '')}
                        className="h-6 w-6 p-0"
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                )}

                {/* Amount */}
                {selectedReceipt.casa_response?.info?.receipt?.sum && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Amount:</span>
                    <span className="text-sm font-bold text-green-600">
                      ₴{selectedReceipt.casa_response.info.receipt.sum.toFixed(2)}
                    </span>
                  </div>
                )}

                {/* Cashier */}
                {selectedReceipt.casa_response?.info?.cashier && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Cashier:</span>
                    <span className="text-sm">{selectedReceipt.casa_response.info.cashier}</span>
                  </div>
                )}

                {/* Order Details */}
                {selectedReceipt.order_id && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Order:</span>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const ordersUrl = `/${window.location.pathname.split('/')[1]}/orders?openModal=${selectedReceipt.order_id}`
                          window.open(ordersUrl, '_blank')
                        }}
                        className="h-6 px-2 text-sm font-mono text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        title="View Order Details"
                      >
                        <ExternalLink className="h-3 w-3 mr-1" />
                        {selectedReceipt.order_id}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(selectedReceipt.order_id || '')}
                        className="h-6 w-6 p-0"
                        title="Copy Order ID"
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                )}

                {/* Customer Name */}
                {selectedReceipt.expand?.order_id?.fullName && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Customer:</span>
                    <span className="text-sm">
                      {selectedReceipt.expand.order_id.fullName}
                      {selectedReceipt.expand.order_id.phoneNumber && (
                        <span className="text-xs text-muted-foreground ml-1">
                          ({selectedReceipt.expand.order_id.phoneNumber})
                        </span>
                      )}
                    </span>
                  </div>
                )}

                {/* Products */}
                {selectedReceipt.expand?.order_id?.products && Array.isArray(selectedReceipt.expand.order_id.products) && selectedReceipt.expand.order_id.products.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-sm font-medium">Products:</span>
                    <div className="max-h-20 overflow-y-auto">
                      {selectedReceipt.expand.order_id.products.map((product, index) => {
                        const name = product.name || product.title || product.productName || product.product_name || 'Product';
                        const quantity = product.quantity || product.qty || product.amount || 1;
                        const price = product.price || product.cost || product.value;
                        return (
                          <div key={index} className="text-sm text-gray-600 dark:text-gray-300">
                            • {name} ({quantity}x){price && ` - ₴${price.toFixed(2)}`}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* QR Code */}
                {selectedReceipt.qr_code && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">QR Code:</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(selectedReceipt.qr_code, '_blank')}
                      className="flex items-center gap-2"
                    >
                      <QrCode className="h-4 w-4" />
                      View QR
                    </Button>
                  </div>
                )}

                {/* Fiscal ID */}
                {selectedReceipt.casa_response?.info?.fisid && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Fiscal ID:</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-mono">{selectedReceipt.casa_response.info.fisid}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(selectedReceipt.casa_response?.info?.fisid || '')}
                        className="h-6 w-6 p-0"
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                )}

                {/* Document Number */}
                {selectedReceipt.casa_response?.info?.docno && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Document Number:</span>
                    <span className="text-sm font-mono">{selectedReceipt.casa_response.info.docno}</span>
                  </div>
                )}

                {/* Creation Date */}
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Created:</span>
                  <span className="text-sm">
                    {selectedReceipt.created && !isNaN(new Date(selectedReceipt.created).getTime()) ? format(new Date(selectedReceipt.created), "MMM d, yyyy 'at' HH:mm") : 'N/A'}
                  </span>
                </div>

                {/* Casa Date */}
                {selectedReceipt.casa_response?.info?.dt && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Casa Date:</span>
                    <span className="text-sm">
                      {selectedReceipt.casa_response.info.dt && !isNaN(new Date(selectedReceipt.casa_response.info.dt).getTime()) ? format(new Date(selectedReceipt.casa_response.info.dt), "MMM d, yyyy 'at' HH:mm") : 'N/A'}
                    </span>
                  </div>
                )}

                {/* Error Message */}
                {selectedReceipt.status === 'failed' && (selectedReceipt.error_message || selectedReceipt.casa_response?.errortxt) && (
                  <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                    <p className="text-sm font-medium text-red-800 dark:text-red-200 mb-1">Error:</p>
                    <p className="text-sm text-red-700 dark:text-red-300">
                      {selectedReceipt.error_message || selectedReceipt.casa_response?.errortxt}
                    </p>
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setShowReceiptDetails(false)}
                >
                  Close
                </Button>
                {selectedReceipt.receipt_type === 'sale' && selectedReceipt.status === 'success' && selectedReceipt.order_id && (
                  <Button
                    onClick={() => {
                      setShowReceiptDetails(false)
                      setShowBillReturnModal(true)
                    }}
                    className="bg-red-600 hover:bg-red-700 text-white"
                  >
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Create Return
                  </Button>
                )}
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        {/* Bill Return Modal */}
        <BillReturnModal
          isOpen={showBillReturnModal}
          onClose={() => setShowBillReturnModal(false)}
          onReturnCreated={handleReturnCreated}
        />
      </div>
    </div>
  )
}