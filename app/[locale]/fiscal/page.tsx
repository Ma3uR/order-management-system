"use client"

import React, { useState } from "react"
import { useTranslations } from 'next-intl'
import { ShiftManagement } from "@/app/components/features/orders/components/shift-management"
import { ZReportViewer } from "@/app/components/features/orders/components/z-report-viewer"
import type { ZReportData } from "@/app/components/features/orders/components/z-report-viewer"
import { ShiftStatusDisplay } from "@/app/components/features/orders/components/shift-status"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/shared/ui/card"
import { Button } from "@/app/components/shared/ui/button"
import { Badge } from "@/app/components/shared/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/app/components/shared/ui/dialog"
import { Calculator, Receipt, FileText, TrendingUp, Clock, AlertCircle, Copy, CheckCircle, XCircle, QrCode } from "lucide-react"
import { getFiscalReceipts, getFiscalShifts } from '@/app/[locale]/orders/actions/fiscal-receipts'
import { useEffect } from 'react'
import { format } from 'date-fns'

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

  // Load recent fiscal data
  useEffect(() => {
    const loadFiscalData = async () => {
      setLoading(true)
      try {
        const [receiptsResult, shiftsResult] = await Promise.all([
          getFiscalReceipts(1, 10),
          getFiscalShifts(1, 5)
        ])

        if (receiptsResult.success && receiptsResult.data) {
          setRecentReceipts((receiptsResult.data.items || []) as FiscalReceipt[])
        }

        if (shiftsResult.success && shiftsResult.data) {
          setRecentShifts((shiftsResult.data.items || []) as FiscalShift[])
        }
      } catch (error) {
        console.error('Error loading fiscal data:', error)
      } finally {
        setLoading(false)
      }
    }

    loadFiscalData()
  }, [])

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

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8 px-4 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-4xl font-bold tracking-tight flex items-center gap-3">
              <Calculator className="h-8 w-8 text-primary" />
              {t('title')}
            </h1>
            <p className="text-muted-foreground mt-1 max-w-2xl">
              {t('description')}
            </p>
          </div>
        </div>

        {/* Shift Status and Management Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Current Shift Status */}
          <ShiftStatusDisplay />
          
          {/* Shift Management */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                {t('shiftManagement')}
              </CardTitle>
              <CardDescription>
                {t('shiftManagementDescription')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ShiftManagement />
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Fiscal Receipts */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Receipt className="h-5 w-5" />
                {t('recentReceipts')}
              </CardTitle>
              <CardDescription>
                {t('recentReceiptsDescription')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-2">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-16 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
                  ))}
                </div>
              ) : recentReceipts.length > 0 ? (
                <div className="space-y-3">
                  {recentReceipts.slice(0, 5).map((receipt) => (
                    <div 
                      key={receipt.id} 
                      className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors"
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
                  {recentReceipts.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <Receipt className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>{t('noRecentReceipts')}</p>
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

          {/* Recent Shifts & Z-Reports */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                {t('recentShifts')}
              </CardTitle>
              <CardDescription>
                {t('recentShiftsDescription')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-2">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-16 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
                  ))}
                </div>
              ) : recentShifts.length > 0 ? (
                <div className="space-y-3">
                  {recentShifts.slice(0, 5).map((shift) => (
                    <div key={shift.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Clock className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                        <div>
                          <p className="text-sm font-medium">{shift.cashier}</p>
                          <p className="text-xs text-muted-foreground">
                            {shift.opened_at && !isNaN(new Date(shift.opened_at).getTime()) ? format(new Date(shift.opened_at), "MMM d, HH:mm") : 'N/A'}
                            {shift.closed_at && !isNaN(new Date(shift.closed_at).getTime()) && ` - ${format(new Date(shift.closed_at), "HH:mm")}`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge 
                          variant={shift.status === 'open' ? 'default' : 'secondary'}
                          className="text-xs"
                        >
                          {shift.status}
                        </Badge>
                        {shift.status === 'closed' && shift.z_report_data && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewZReport(shift)}
                            className="h-6 px-2 text-xs"
                          >
                            View Z-Report
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>{t('noRecentShifts')}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Stats */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              {t('quickStats')}
            </CardTitle>
            <CardDescription>
              {t('quickStatsDescription')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                <div className="flex items-center gap-2 mb-2">
                  <Receipt className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
                    {t('totalReceipts')}
                  </span>
                </div>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {recentReceipts.length}
                </p>
              </div>
              
              <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
                  <span className="text-sm font-medium text-green-800 dark:text-green-200">
                    {t('successfulReceipts')}
                  </span>
                </div>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {recentReceipts.filter(r => r.status === 'success').length}
                </p>
              </div>
              
              <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4 border border-purple-200 dark:border-purple-800">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                  <span className="text-sm font-medium text-purple-800 dark:text-purple-200">
                    {t('totalShifts')}
                  </span>
                </div>
                <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                  {recentShifts.length}
                </p>
              </div>
              
              <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4 border border-orange-200 dark:border-orange-800">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                  <span className="text-sm font-medium text-orange-800 dark:text-orange-200">
                    {t('activeShifts')}
                  </span>
                </div>
                <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                  {recentShifts.filter(s => s.status === 'open').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

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
            <DialogContent className="max-w-md">
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

                {/* Order ID */}
                {selectedReceipt.order_id && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Order ID:</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-mono">{selectedReceipt.order_id}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(selectedReceipt.order_id || '')}
                        className="h-6 w-6 p-0"
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
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  )
}