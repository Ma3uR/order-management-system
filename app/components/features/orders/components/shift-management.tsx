"use client"

import React, { useState, useEffect } from "react"
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
  z_report_data?: any;
}

interface FiscalStats {
  currentShift: ShiftData | null;
  todayReceipts: number;
  todaySales: number;
  todayReturns: number;
}

export function ShiftManagement() {
  const [currentShift, setCurrentShift] = useState<ShiftData | null>(null)
  const [fiscalStats, setFiscalStats] = useState<FiscalStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [isOpeningShift, setIsOpeningShift] = useState(false)
  const [isClosingShift, setIsClosingShift] = useState(false)
  const [showOpenShiftDialog, setShowOpenShiftDialog] = useState(false)
  const [showCloseShiftDialog, setShowCloseShiftDialog] = useState(false)
  const [cashierName, setCashierName] = useState("")

  // Load current shift and fiscal statistics
  const loadShiftData = async () => {
    setLoading(true)
    try {
      const [shiftResult, statsResult] = await Promise.all([
        getCurrentShift(),
        getFiscalStatistics()
      ])

      if (shiftResult.success) {
        setCurrentShift(shiftResult.data)
      }

      if (statsResult.success && statsResult.data) {
        setFiscalStats(statsResult.data)
      }
    } catch (error) {
      console.error('Error loading shift data:', error)
      toast.error('Failed to load shift data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadShiftData()
  }, [])

  const handleOpenShift = async () => {
    if (!cashierName.trim()) {
      toast.error('Cashier name is required')
      return
    }

    setIsOpeningShift(true)
    try {
      const result = await openShift(cashierName.trim())
      
      if (result.success) {
        toast.success('Shift opened successfully!')
        setShowOpenShiftDialog(false)
        setCashierName("")
        await loadShiftData()
      } else {
        toast.error(`Failed to open shift: ${result.error}`)
      }
    } catch (error) {
      toast.error('Error opening shift')
      console.error('Error opening shift:', error)
    } finally {
      setIsOpeningShift(false)
    }
  }

  const handleCloseShift = async () => {
    if (!currentShift) {
      toast.error('No active shift to close')
      return
    }

    setIsClosingShift(true)
    try {
      const result = await createZReport(currentShift.cashier)
      
      if (result.success) {
        toast.success('Shift closed successfully with Z-report!')
        setShowCloseShiftDialog(false)
        await loadShiftData()
      } else {
        toast.error(`Failed to close shift: ${result.error}`)
      }
    } catch (error) {
      toast.error('Error closing shift')
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
          <span className="ml-2 text-gray-600 dark:text-gray-400">Loading shift data...</span>
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
                Current Shift Status
              </CardTitle>
              <CardDescription>
                Manage fiscal shift operations
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
                  Close Shift
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
                  Open Shift
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
                      Shift is currently <strong>OPEN</strong>
                    </span>
                    <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                      Active
                    </Badge>
                  </div>
                </AlertDescription>
              </Alert>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Cashier</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <User className="h-4 w-4 text-gray-500" />
                    <span className="text-sm">{currentShift.cashier}</span>
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium">Opened At</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Calendar className="h-4 w-4 text-gray-500" />
                    <span className="text-sm">
                      {format(new Date(currentShift.opened_at), "MMM d, yyyy HH:mm")}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-green-600 dark:text-green-400" />
                    <span className="text-sm font-medium">Sales</span>
                  </div>
                  <p className="text-lg font-bold text-green-600 dark:text-green-400">
                    {formatCurrency(currentShift.total_sales || 0)}
                  </p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <RotateCcw className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    <span className="text-sm font-medium">Returns</span>
                  </div>
                  <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
                    {formatCurrency(currentShift.total_returns || 0)}
                  </p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <Receipt className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                    <span className="text-sm font-medium">Receipts</span>
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
                No active shift. Open a shift to start fiscal operations.
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
              Today's Fiscal Statistics
            </CardTitle>
            <CardDescription>
              Fiscal receipt statistics for today
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                <div className="flex items-center gap-2 mb-2">
                  <Receipt className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  <span className="text-sm font-medium text-blue-800 dark:text-blue-200">Total Receipts</span>
                </div>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {fiscalStats.todayReceipts}
                </p>
              </div>
              
              <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="h-5 w-5 text-green-600 dark:text-green-400" />
                  <span className="text-sm font-medium text-green-800 dark:text-green-200">Sales Today</span>
                </div>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {formatCurrency(fiscalStats.todaySales)}
                </p>
              </div>
              
              <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4 border border-orange-200 dark:border-orange-800">
                <div className="flex items-center gap-2 mb-2">
                  <RotateCcw className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                  <span className="text-sm font-medium text-orange-800 dark:text-orange-200">Returns Today</span>
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
            <DialogTitle>Open New Shift</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="cashierName">Cashier Name</Label>
              <Input
                id="cashierName"
                value={cashierName}
                onChange={(e) => setCashierName(e.target.value)}
                placeholder="Enter cashier name"
                className="mt-1"
                disabled={isOpeningShift}
              />
            </div>
            <Alert>
              <Power className="h-4 w-4" />
              <AlertDescription>
                Opening a new shift will allow you to create fiscal receipts. Make sure you have the necessary permissions.
              </AlertDescription>
            </Alert>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowOpenShiftDialog(false)}
              disabled={isOpeningShift}
            >
              Cancel
            </Button>
            <Button
              onClick={handleOpenShift}
              disabled={isOpeningShift || !cashierName.trim()}
            >
              {isOpeningShift && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Open Shift
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Close Shift Dialog */}
      <Dialog open={showCloseShiftDialog} onOpenChange={setShowCloseShiftDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Close Current Shift</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {currentShift && (
              <div className="space-y-2">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  This will close the current shift and generate a Z-report.
                </p>
                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Cashier:</span>
                    <span className="text-sm font-medium">{currentShift.cashier}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Total Sales:</span>
                    <span className="text-sm font-medium text-green-600 dark:text-green-400">
                      {formatCurrency(currentShift.total_sales || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Total Returns:</span>
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
                This action will generate a Z-report and cannot be undone. Make sure all transactions for this shift are complete.
              </AlertDescription>
            </Alert>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCloseShiftDialog(false)}
              disabled={isClosingShift}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleCloseShift}
              disabled={isClosingShift}
            >
              {isClosingShift && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Close Shift & Generate Z-Report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}