"use client"

import React, { useState, useEffect, useCallback } from "react"
import { Button } from "@/app/components/shared/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/shared/ui/card"
import { Badge } from "@/app/components/shared/ui/badge"
import { Alert, AlertDescription } from "@/app/components/shared/ui/alert"
import { 
  Clock, 
  Play, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Loader2,
  Settings,
  Calendar,
  Timer,
  Activity,
  List
} from "lucide-react"
import { format } from "date-fns"
import { toast } from 'sonner'

import { getSchedulerStatus } from '@/app/[locale]/orders/actions/fiscal-scheduler'
import { 
  getFiscalQueueStats, 
  getFiscalQueueItems, 
  processFiscalQueueManually,
  retryFiscalQueueItem,
  removeFiscalQueueItem
} from '@/app/[locale]/orders/actions/fiscal-queue'
import { OrdersResponse } from "@/app/types/pocketbase-types"

interface ProductItem {
  name?: string;
  title?: string;
  productName?: string;
  product_name?: string;
  quantity?: number;
  qty?: number;
  amount?: number;
  [key: string]: unknown;
}

interface SchedulerStatus {
  enabled: boolean;
  testMode: boolean;
  businessHours: boolean;
  queuedOrders: number;
  nextBusinessStart: string;
  config: {
    enabled: boolean;
    testMode: boolean;
    startHour: number;
    endHour: number;
    cashierName: string;
    timezone: string;
  };
}

interface QueueStats {
  total: number;
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  nextScheduled?: string;
}

interface QueuedOrder {
  id: string;
  order_id: string;
  created: string;
  priority: number;
  attempts: number;
  last_attempt?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error_message?: string;
  scheduled_for?: string;
  expand?: {
    order_id?: {
      id: string;
      fullName?: string;
      phoneNumber?: string;
      products?: OrdersResponse['products'];
      orderNumber?: string;
    };
  };
}

export function AutomationQueue() {
  const [schedulerStatus, setSchedulerStatus] = useState<SchedulerStatus | null>(null)
  const [queueStats, setQueueStats] = useState<QueueStats | null>(null)
  const [queueItems, setQueueItems] = useState<QueuedOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  const loadData = useCallback(async () => {
    try {
      setRefreshing(true)
      
      const [statusResult, statsResult, itemsResult] = await Promise.all([
        getSchedulerStatus(),
        getFiscalQueueStats(),
        getFiscalQueueItems(1, 20, undefined, 'order_id')
      ])

      if (statusResult.success && statusResult.data) {
        setSchedulerStatus(statusResult.data)
      }

      if (statsResult.success && statsResult.data) {
        setQueueStats(statsResult.data)
      }

      if (itemsResult.success && itemsResult.data) {
        setQueueItems(itemsResult.data.items)
      }
    } catch (error) {
      console.error('Error loading automation queue data:', error)
      toast.error('Failed to load automation queue data')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleProcessQueue = async () => {
    setProcessing(true)
    try {
      const result = await processFiscalQueueManually()
      if (result.success && result.data) {
        toast.success(
          `Queue processed: ${result.data.processed} succeeded, ${result.data.failed} failed`
        )
        await loadData()
      } else {
        toast.error(`Failed to process queue: ${result.error}`)
      }
    } catch (error) {
      toast.error('Error processing queue')
      console.error('Error processing queue:', error)
    } finally {
      setProcessing(false)
    }
  }

  const handleRetryItem = async (queueId: string) => {
    try {
      const result = await retryFiscalQueueItem(queueId)
      if (result.success) {
        toast.success('Queue item retried')
        await loadData()
      } else {
        toast.error(`Failed to retry item: ${result.error}`)
      }
    } catch (error) {
      toast.error('Error retrying queue item')
      console.error('Error retrying queue item:', error)
    }
  }

  const handleRemoveItem = async (queueId: string) => {
    try {
      const result = await removeFiscalQueueItem(queueId)
      if (result.success) {
        toast.success('Queue item removed')
        await loadData()
      } else {
        toast.error(`Failed to remove item: ${result.error}`)
      }
    } catch (error) {
      toast.error('Error removing queue item')
      console.error('Error removing queue item:', error)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="text-blue-600"><Clock className="w-3 h-3 mr-1" />Pending</Badge>
      case 'processing':
        return <Badge variant="outline" className="text-yellow-600"><Loader2 className="w-3 h-3 mr-1 animate-spin" />Processing</Badge>
      case 'completed':
        return <Badge variant="outline" className="text-green-600"><CheckCircle className="w-3 h-3 mr-1" />Completed</Badge>
      case 'failed':
        return <Badge variant="outline" className="text-red-600"><XCircle className="w-3 h-3 mr-1" />Failed</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <List className="h-5 w-5" />
            Fiscal Automation Queue
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-gray-600 dark:text-gray-400" />
            <span className="ml-2 text-gray-600 dark:text-gray-400">Loading automation queue...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Scheduler Status */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Automation Status
              </CardTitle>
              <CardDescription>
                Fiscal automation scheduler configuration and status
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={loadData}
              disabled={refreshing}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {schedulerStatus ? (
            <div className="space-y-4">
              {!schedulerStatus.enabled && (
                <Alert className="border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-900/20">
                  <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                  <AlertDescription className="text-yellow-800 dark:text-yellow-200">
                    Fiscal automation is disabled. Set ENABLE_FISCAL_AUTOMATION=true to enable.
                  </AlertDescription>
                </Alert>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Activity className="h-4 w-4 text-gray-500" />
                    <span className="text-sm font-medium">Status</span>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">Enabled:</span>
                      <Badge variant={schedulerStatus.enabled ? "default" : "outline"}>
                        {schedulerStatus.enabled ? 'Yes' : 'No'}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">Test Mode:</span>
                      <Badge variant={schedulerStatus.testMode ? "outline" : "secondary"}>
                        {schedulerStatus.testMode ? 'Yes' : 'No'}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">Business Hours:</span>
                      <Badge variant={schedulerStatus.businessHours ? "default" : "outline"}>
                        {schedulerStatus.businessHours ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Timer className="h-4 w-4 text-gray-500" />
                    <span className="text-sm font-medium">Schedule</span>
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs text-gray-500">
                      Hours: {schedulerStatus.config.startHour}:00 - {schedulerStatus.config.endHour}:00
                    </div>
                    <div className="text-xs text-gray-500">
                      Timezone: {schedulerStatus.config.timezone}
                    </div>
                    <div className="text-xs text-gray-500">
                      Cashier: {schedulerStatus.config.cashierName}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-500" />
                    <span className="text-sm font-medium">Next Schedule</span>
                  </div>
                  <div className="text-xs text-gray-500">
                    {format(new Date(schedulerStatus.nextBusinessStart), 'MMM d, yyyy HH:mm')}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <Alert className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20">
              <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
              <AlertDescription className="text-red-800 dark:text-red-200">
                Failed to load scheduler status
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Queue Statistics */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <List className="h-5 w-5" />
                Queue Statistics
              </CardTitle>
              <CardDescription>
                Overview of fiscal automation queue status
              </CardDescription>
            </div>
            <Button
              onClick={handleProcessQueue}
              disabled={processing || !schedulerStatus?.enabled}
              size="sm"
            >
              {processing ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Play className="h-4 w-4 mr-2" />
              )}
              Process Queue
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {queueStats ? (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {queueStats.total}
                </div>
                <div className="text-xs text-gray-500">Total</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {queueStats.pending}
                </div>
                <div className="text-xs text-gray-500">Pending</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">
                  {queueStats.processing}
                </div>
                <div className="text-xs text-gray-500">Processing</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {queueStats.completed}
                </div>
                <div className="text-xs text-gray-500">Completed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">
                  {queueStats.failed}
                </div>
                <div className="text-xs text-gray-500">Failed</div>
              </div>
            </div>
          ) : (
            <Alert className="border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900/20">
              <AlertTriangle className="h-4 w-4 text-gray-600 dark:text-gray-400" />
              <AlertDescription className="text-gray-800 dark:text-gray-200">
                Queue statistics unavailable
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Queue Items */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <List className="h-5 w-5" />
            Recent Queue Items
          </CardTitle>
          <CardDescription>
            Latest items in the fiscal automation queue
          </CardDescription>
        </CardHeader>
        <CardContent>
          {queueItems.length > 0 ? (
            <div className="space-y-4">
              {queueItems.map((item) => (
                <div key={item.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="text-sm font-medium">
                        Order: {item.expand?.order_id?.orderNumber || item.order_id}
                      </div>
                      {getStatusBadge(item.status)}
                    </div>
                    <div className="flex items-center gap-2">
                      {item.status === 'failed' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRetryItem(item.id)}
                        >
                          <RefreshCw className="h-3 w-3 mr-1" />
                          Retry
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRemoveItem(item.id)}
                      >
                        <XCircle className="h-3 w-3 mr-1" />
                        Remove
                      </Button>
                    </div>
                  </div>

                  {/* Customer and Product Info */}
                  {item.expand?.order_id && (
                    <div className="space-y-1">
                      {item.expand.order_id.fullName && (
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          👥 {item.expand.order_id.fullName}
                          {item.expand.order_id.phoneNumber && (
                            <span className="ml-1 text-gray-500">({item.expand.order_id.phoneNumber})</span>
                          )}
                        </p>
                      )}
                      {(() => {
                        const products = item.expand?.order_id?.products;
                        if (products && Array.isArray(products) && products.length > 0) {
                          const productList = (products as ProductItem[]).map((p: ProductItem) => {
                            const name = p.name || p.title || p.productName || p.product_name || 'Product';
                            const quantity = p.quantity || p.qty || p.amount || 1;
                            return `${name} (${quantity}x)`;
                          }).join(', ');
                          
                          return (
                            <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
                              📦 {productList}
                            </p>
                          );
                        }
                        return null;
                      })()}
                    </div>
                  )}

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs text-gray-500">
                    <div>
                      <span className="font-medium">Created:</span><br />
                      {format(new Date(item.created), 'MMM d, HH:mm')}
                    </div>
                    <div>
                      <span className="font-medium">Priority:</span><br />
                      {item.priority}
                    </div>
                    <div>
                      <span className="font-medium">Attempts:</span><br />
                      {item.attempts}
                    </div>
                    {item.scheduled_for && (
                      <div>
                        <span className="font-medium">Scheduled:</span><br />
                        {format(new Date(item.scheduled_for), 'MMM d, HH:mm')}
                      </div>
                    )}
                  </div>

                  {item.error_message && (
                    <Alert className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20">
                      <XCircle className="h-3 w-3 text-red-600 dark:text-red-400" />
                      <AlertDescription className="text-red-800 dark:text-red-200 text-xs">
                        {item.error_message}
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <Alert className="border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900/20">
              <CheckCircle className="h-4 w-4 text-gray-600 dark:text-gray-400" />
              <AlertDescription className="text-gray-800 dark:text-gray-200">
                No items in queue
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
