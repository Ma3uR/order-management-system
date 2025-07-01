"use client"

import React, { useState, useEffect, useCallback } from "react"
import { useTranslations } from 'next-intl'
import { Button } from "@/app/components/shared/ui/button"
import { Input } from "@/app/components/shared/ui/input"
import { Dialog, DialogHeader, DialogTitle, DialogContent, DialogFooter } from "@/app/components/shared/ui/dialog"
import { Badge } from "@/app/components/shared/ui/badge"
import { Label } from "@/app/components/shared/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/shared/ui/card"
import { Alert, AlertDescription } from "@/app/components/shared/ui/alert"
import { Clock, DollarSign, Receipt, RotateCcw, User, Calendar, TrendingUp, Loader2, Power, PowerOff, FileText } from "lucide-react"
import { format } from "date-fns"
import { toast } from 'sonner'
import { formatCurrency } from "@/app/lib/utils"
import {
  openShift,
  getCurrentShift,
  createZReport,
  getFiscalStatistics
} from '@/app/[locale]/orders/actions/fiscal-receipts'

interface ShiftData {
  id: string;
  cashier: string;
  opened_at: string;
  closed_at?: string;
  status: 'open' | 'closed';
  total_sales: number;
  total_returns: number;
  receipts_count: number;
  z_report_data?: unknown;
}

interface FiscalStats {
  currentShift: ShiftData | null;
  todayReceipts: number;
  todaySales: number;
  todayReturns: number;
}

export function ShiftManagement() {
  const t = useTranslations('Fiscal')
  const [currentShift, setCurrentShift] = useState<ShiftData | null>(null)
  const [fiscalStats, setFiscalStats] = useState<FiscalStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [isOpeningShift, setIsOpeningShift] = useState(false)
  const [isClosingShift, setIsClosingShift] = useState(false)
  const [showOpenShiftDialog, setShowOpenShiftDialog] = useState(false)
  const [showCloseShiftDialog, setShowCloseShiftDialog] = useState(false)
  const [cashierName, setCashierName] = useState("")

  // Load current shift and fiscal statistics
  const loadShiftData = useCallback(async () => {
    setLoading(true)
    try {
      const [shiftResult, statsResult] = await Promise.all([
        getCurrentShift(),
        getFiscalStatistics()
      ])

      if (shiftResult.success) {
        setCurrentShift(shiftResult.data as ShiftData)
      }

      if (statsResult.success && statsResult.data) {
        setFiscalStats(statsResult.data as FiscalStats)
      }
    } catch (error) {
      console.error('Error loading shift data:', error)
      toast.error(t('failedToLoadShiftData'))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    loadShiftData()
  }, [loadShiftData])

  const handleOpenShift = async () => {
    if (!cashierName.trim()) {
      toast.error(t('cashierNameRequired'))
      return
    }

    setIsOpeningShift(true)
    try {
      const result = await openShift(cashierName.trim())
      
      if (result.success) {
        toast.success(t('shiftOpenedSuccessfully'))
        setShowOpenShiftDialog(false)
        setCashierName("")
        await loadShiftData()
      } else {
        toast.error(`${t('failedToOpenShift')}: ${result.error}`)
      }
    } catch (error) {
      toast.error(t('errorOpeningShift'))
      console.error('Error opening shift:', error)
    } finally {
      setIsOpeningShift(false)
    }
  }

  const handleCloseShift = async () => {
    if (!currentShift) {
      toast.error(t('noActiveShiftToClose'))
      return
    }

    setIsClosingShift(true)
    try {
      const result = await createZReport(currentShift.cashier)
      
      if (result.success) {
        toast.success(t('shiftClosedSuccessfully'))
        setShowCloseShiftDialog(false)
        await loadShiftData()
      } else {
        toast.error(`${t('failedToCloseShift')}: ${result.error}`)
      }
    } catch (error) {
      toast.error(t('errorClosingShift'))
      console.error('Error closing shift:', error)
    } finally {
      setIsClosingShift(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-gray-600 dark:text-gray-400" />
          <span className="ml-2 text-gray-600 dark:text-gray-400">{t('loadingShiftData')}</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Current Shift Status */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                {t('currentShiftStatus')}
              </CardTitle>
              <CardDescription>
                {t('manageShiftOperations')}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              {currentShift ? (
                <Button
                  onClick={() => setShowCloseShiftDialog(true)}
                  variant="destructive"
                  disabled={isClosingShift}
                >
                  {isClosingShift ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <PowerOff className="h-4 w-4 mr-2" />
                  )}
                  {t('closeShift')}
                </Button>
              ) : (
                <Button
                  onClick={() => setShowOpenShiftDialog(true)}
                  disabled={isOpeningShift}
                >
                  {isOpeningShift ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Power className="h-4 w-4 mr-2" />
                  )}
                  {t('openShift')}
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {currentShift ? (
            <div className="space-y-4">
              <Alert className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20">
                <Power className="h-4 w-4 text-green-600 dark:text-green-400" />
                <AlertDescription className="text-green-800 dark:text-green-200">
                  <div className="flex items-center justify-between">
                    <span>
                      <span dangerouslySetInnerHTML={{__html: t('shiftCurrentlyOpen')}} />
                    </span>
                    <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                      {t('active')}
                    </Badge>
                  </div>
                </AlertDescription>
              </Alert>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">{t('cashier')}</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <User className="h-4 w-4 text-gray-500" />
                    <span className="text-sm">{currentShift.cashier}</span>
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium">{t('openedAt')}</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Calendar className="h-4 w-4 text-gray-500" />
                    <span className="text-sm">
                      {currentShift.opened_at ? format(new Date(currentShift.opened_at), "MMM d, yyyy HH:mm") : "-"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-green-600 dark:text-green-400" />
                    <span className="text-sm font-medium">{t('sales')}</span>
                  </div>
                  <p className="text-lg font-bold text-green-600 dark:text-green-400">
                    {formatCurrency(currentShift.total_sales || 0)}
                  </p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <RotateCcw className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    <span className="text-sm font-medium">{t('returns')}</span>
                  </div>
                  <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
                    {formatCurrency(currentShift.total_returns || 0)}
                  </p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <Receipt className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                    <span className="text-sm font-medium">{t('receipts')}</span>
                  </div>
                  <p className="text-lg font-bold text-gray-600 dark:text-gray-400">
                    {currentShift.receipts_count || 0}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <Alert className="border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900/20">
              <PowerOff className="h-4 w-4 text-gray-600 dark:text-gray-400" />
              <AlertDescription className="text-gray-800 dark:text-gray-200">
                {t('noActiveShift')}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Today's Statistics */}
      {fiscalStats && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              {t('todaysFiscalStatistics')}
            </CardTitle>
            <CardDescription>
              {t('fiscalReceiptStatistics')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                <div className="flex items-center gap-2 mb-2">
                  <Receipt className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  <span className="text-sm font-medium text-blue-800 dark:text-blue-200">{t('totalReceipts')}</span>
                </div>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {fiscalStats.todayReceipts}
                </p>
              </div>
              
              <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="h-5 w-5 text-green-600 dark:text-green-400" />
                  <span className="text-sm font-medium text-green-800 dark:text-green-200">{t('salesToday')}</span>
                </div>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {formatCurrency(fiscalStats.todaySales)}
                </p>
              </div>
              
              <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4 border border-orange-200 dark:border-orange-800">
                <div className="flex items-center gap-2 mb-2">
                  <RotateCcw className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                  <span className="text-sm font-medium text-orange-800 dark:text-orange-200">{t('returnsToday')}</span>
                </div>
                <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                  {formatCurrency(fiscalStats.todayReturns)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Open Shift Dialog */}
      <Dialog open={showOpenShiftDialog} onOpenChange={setShowOpenShiftDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('openNewShift')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="cashierName">{t('cashierName')}</Label>
              <Input
                id="cashierName"
                value={cashierName}
                onChange={(e) => setCashierName(e.target.value)}
                placeholder={t('enterCashierName')}
                className="mt-1"
                disabled={isOpeningShift}
              />
            </div>
            <Alert>
              <Power className="h-4 w-4" />
              <AlertDescription>
                {t('openingShiftDescription')}
              </AlertDescription>
            </Alert>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowOpenShiftDialog(false)}
              disabled={isOpeningShift}
            >
              {t('cancel')}
            </Button>
            <Button
              onClick={handleOpenShift}
              disabled={isOpeningShift || !cashierName.trim()}
            >
              {isOpeningShift && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('openShift')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Close Shift Dialog */}
      <Dialog open={showCloseShiftDialog} onOpenChange={setShowCloseShiftDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('closeCurrentShift')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {currentShift && (
              <div className="space-y-2">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {t('closingShiftDescription')}
                </p>
                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">{t('cashier')}:</span>
                    <span className="text-sm font-medium">{currentShift.cashier}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">{t('totalSales')}:</span>
                    <span className="text-sm font-medium text-green-600 dark:text-green-400">
                      {formatCurrency(currentShift.total_sales || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">{t('totalReturns')}:</span>
                    <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                      {formatCurrency(currentShift.total_returns || 0)}
                    </span>
                  </div>
                </div>
              </div>
            )}
            <Alert className="border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-900/20">
              <FileText className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
              <AlertDescription className="text-yellow-800 dark:text-yellow-200">
                {t('closingShiftWarning')}
              </AlertDescription>
            </Alert>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCloseShiftDialog(false)}
              disabled={isClosingShift}
            >
              {t('cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={handleCloseShift}
              disabled={isClosingShift}
            >
              {isClosingShift && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('closeShiftAndGenerateZReport')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}