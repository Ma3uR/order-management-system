"use client"

import { useState, useEffect, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/shared/ui/card"
import { Button } from "@/app/components/shared/ui/button"
import { Badge } from "@/app/components/shared/ui/badge"
import { RefreshCw, Wifi, WifiOff, AlertCircle, CheckCircle, XCircle, Clock } from "lucide-react"
import { checkShiftStatus } from '@/app/[locale]/orders/actions/fiscal-receipts'
import { ShiftStatusInfo, ShiftStatus } from '@/app/types/casa-vchasno'
import { toast } from 'sonner'
import { format } from 'date-fns'

export function ShiftStatusDisplay() {
  const t = useTranslations('Fiscal')
  const [shiftStatus, setShiftStatus] = useState<ShiftStatusInfo | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())

  const loadShiftStatus = useCallback(async (showToast = false) => {
    try {
      setIsRefreshing(true)
      const result = await checkShiftStatus()
      
      if (result.success && result.data) {
        setShiftStatus(result.data)
        setLastUpdated(new Date())
        if (showToast) {
          toast.success(t('shiftStatusUpdated'))
        }
      } else {
        if (showToast) {
          toast.error(result.error || t('failedToCheckShiftStatus'))
        }
        console.error('Failed to check shift status:', result.error)
      }
    } catch (error) {
      console.error('Error checking shift status:', error)
      if (showToast) {
        toast.error(t('failedToCheckShiftStatus'))
      }
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [t])

  useEffect(() => {
    loadShiftStatus()
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      loadShiftStatus()
    }, 30000)

    return () => clearInterval(interval)
  }, [loadShiftStatus])

  const getShiftStatusIcon = (status: ShiftStatus) => {
    switch (status) {
      case ShiftStatus.OPEN:
        return <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
      case ShiftStatus.CLOSED:
        return <XCircle className="h-4 w-4 text-gray-600 dark:text-gray-400" />
      case ShiftStatus.BLOCKED:
        return <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
      case ShiftStatus.UNKNOWN:
      default:
        return <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
    }
  }

  const getShiftStatusText = (status: ShiftStatus) => {
    switch (status) {
      case ShiftStatus.OPEN:
        return t('open')
      case ShiftStatus.CLOSED:
        return t('closed')
      case ShiftStatus.BLOCKED:
        return t('blocked')
      case ShiftStatus.UNKNOWN:
      default:
        return t('unknown')
    }
  }

  const getShiftStatusVariant = (status: ShiftStatus): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case ShiftStatus.OPEN:
        return 'default'
      case ShiftStatus.CLOSED:
        return 'secondary'
      case ShiftStatus.BLOCKED:
        return 'destructive'
      case ShiftStatus.UNKNOWN:
      default:
        return 'outline'
    }
  }

  const getOnlineStatusIcon = (isOnline: boolean) => {
    return isOnline ? (
      <Wifi className="h-4 w-4 text-green-600 dark:text-green-400" />
    ) : (
      <WifiOff className="h-4 w-4 text-red-600 dark:text-red-400" />
    )
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('uk-UA', {
      style: 'currency',
      currency: 'UAH'
    }).format(amount)
  }

  const formatDateTime = (dateString: string) => {
    if (!dateString) return 'N/A'
    
    try {
      // Parse Casa.vchasno datetime format (YYYYMMDDHHMMSS)
      const year = dateString.substring(0, 4)
      const month = dateString.substring(4, 6)
      const day = dateString.substring(6, 8)
      const hour = dateString.substring(8, 10)
      const minute = dateString.substring(10, 12)
      const second = dateString.substring(12, 14)
      
      const date = new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}`)
      return format(date, 'MMM d, yyyy HH:mm:ss')
    } catch {
      return dateString
    }
  }

  if (isLoading) {
    return (
      <Card className="border-green-200 dark:border-green-800 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-900/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-800 dark:text-green-200">
            <Clock className="h-5 w-5 text-green-600" />
            {t('shiftStatus')}
          </CardTitle>
          <CardDescription className="text-green-700 dark:text-green-300">
            {t('currentFiscalShiftStatus')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-green-200 dark:border-green-800 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-900/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-green-800 dark:text-green-200">
          <Clock className="h-5 w-5 text-green-600" />
          {t('shiftStatus')}
        </CardTitle>
        <CardDescription className="text-green-700 dark:text-green-300">
          {t('currentFiscalShiftStatus')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {shiftStatus ? (
          <>
            {/* Current Shift Status */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {getShiftStatusIcon(shiftStatus.shift_status)}
                <div>
                  <p className="font-medium">{t('shiftStatus')}</p>
                  <p className="text-sm text-muted-foreground">
                    {t('currentShiftStatus')}
                  </p>
                </div>
              </div>
              <Badge variant={getShiftStatusVariant(shiftStatus.shift_status)}>
                {getShiftStatusText(shiftStatus.shift_status)}
              </Badge>
            </div>

            {/* Device Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">{t('deviceInformation')}</p>
                <div className="space-y-1">
                  <p className="text-sm">
                    <span className="font-medium">{t('fiscalId')}:</span> {shiftStatus.fisid}
                  </p>
                  <p className="text-sm">
                    <span className="font-medium">{t('companyId')}:</span> {shiftStatus.edrpou}
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{t('onlineStatus')}:</span>
                    {getOnlineStatusIcon(shiftStatus.online_status === 1)}
                    <span className="text-sm">
                      {shiftStatus.online_status === 1 ? t('online') : t('offline')}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">{t('shiftDetails')}</p>
                <div className="space-y-1">
                  <p className="text-sm">
                    <span className="font-medium">{t('shiftDate')}:</span> {formatDateTime(shiftStatus.shift_dt)}
                  </p>
                  <p className="text-sm">
                    <span className="font-medium">{t('safeAmount')}:</span> {formatCurrency(shiftStatus.safe)}
                  </p>
                  <p className="text-sm">
                    <span className="font-medium">{t('fiscalStatus')}:</span> {shiftStatus.isFis === 1 ? t('fiscal') : t('nonFiscal')}
                  </p>
                </div>
              </div>
            </div>

            {/* Last Updated */}
            <div className="flex items-center justify-between pt-4 border-t">
              <p className="text-xs text-muted-foreground">
                {t('lastUpdated')}: {format(lastUpdated, 'HH:mm:ss')}
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => loadShiftStatus(true)}
                disabled={isRefreshing}
                className="h-8"
              >
                <RefreshCw className={`h-3 w-3 mr-1 ${isRefreshing ? 'animate-spin' : ''}`} />
                {t('refresh')}
              </Button>
            </div>
          </>
        ) : (
          <div className="text-center py-8">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground mb-4">{t('failedToLoadShiftStatus')}</p>
            <Button
              variant="outline"
              onClick={() => loadShiftStatus(true)}
              disabled={isRefreshing}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              {t('tryAgain')}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}