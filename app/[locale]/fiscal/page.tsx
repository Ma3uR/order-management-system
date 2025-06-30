"use client"

import { useState } from "react"
import { useTranslations } from 'next-intl'
import { ShiftManagement } from "@/app/components/features/orders/components/shift-management"
import { ZReportViewer } from "@/app/components/features/orders/components/z-report-viewer"
import { ShiftStatusDisplay } from "@/app/components/features/orders/components/shift-status"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/shared/ui/card"
import { Button } from "@/app/components/shared/ui/button"
import { Badge } from "@/app/components/shared/ui/badge"
import { Calculator, Receipt, FileText, TrendingUp, Clock, AlertCircle } from "lucide-react"
import { getFiscalReceipts, getFiscalShifts } from '@/app/[locale]/orders/actions/fiscal-receipts'
import { useEffect } from 'react'
import { format } from 'date-fns'

interface FiscalReceipt {
  id: string
  receipt_type: 'sale' | 'return' | 'z_report'
  status: 'success' | 'failed' | 'pending'
  created: string
}

interface FiscalShift {
  id: string
  cashier: string
  status: 'open' | 'closed'
  opened_at: string
  closed_at?: string
  z_report_data?: unknown
}

export default function FiscalPage() {
  const t = useTranslations('Fiscal')
  const [selectedZReport, setSelectedZReport] = useState<unknown>(null)
  const [showZReportViewer, setShowZReportViewer] = useState(false)
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

        {/* Recent Activity Overview */}
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
                    <div key={receipt.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                      <div className="flex items-center gap-3">
                        {receipt.receipt_type === 'sale' ? (
                          <Receipt className="h-4 w-4 text-green-600 dark:text-green-400" />
                        ) : (
                          <Receipt className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        )}
                        <div>
                          <p className="text-sm font-medium capitalize">
                            {receipt.receipt_type} Receipt
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {receipt.created ? format(new Date(receipt.created), "MMM d, HH:mm") : 'N/A'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge 
                          variant={receipt.status === 'success' ? 'default' : receipt.status === 'failed' ? 'destructive' : 'secondary'}
                          className="text-xs"
                        >
                          {receipt.status}
                        </Badge>
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
                            {shift.opened_at ? format(new Date(shift.opened_at), "MMM d, HH:mm") : 'N/A'}
                            {shift.closed_at && ` - ${format(new Date(shift.closed_at), "HH:mm")}`}
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
            zReportData={selectedZReport}
          />
        )}
      </div>
    </div>
  )
}