"use client"

import { Button } from "@/app/components/shared/ui/button"
import { Badge } from "@/app/components/shared/ui/badge"
import { AlertTriangle, X, Phone, User, Clock } from "lucide-react"
import { PotentialMerge, getMergeDetails } from "@/app/lib/mergeDetection"
import { useTranslations } from 'next-intl'

interface PotentialMergeNotificationProps {
  detectedOrdersCount: number
  potentialMerges: PotentialMerge[]
  onKeepSeparateClick: () => void
}

export function PotentialMergeNotification({
  detectedOrdersCount,
  potentialMerges,
  onKeepSeparateClick,
}: PotentialMergeNotificationProps) {
  const t = useTranslations('Orders.duplicateNotification')
  
  if (detectedOrdersCount === 0 || potentialMerges.length === 0) return null

  // Show the first (highest confidence) merge for display
  const topMerge = potentialMerges[0]
  const totalMerges = potentialMerges.length

  return (
    <div className="bg-amber-50 border border-amber-200 dark:bg-amber-900/30 dark:border-amber-700/50 p-4 rounded-lg mb-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 flex-1">
          <AlertTriangle className="h-6 w-6 text-amber-500 dark:text-amber-400 mt-0.5 flex-shrink-0" />
          <div className="flex-1 space-y-3">
            <div>
              <p className="font-semibold text-amber-700 dark:text-amber-300">
                {t('title')}
              </p>
              <p className="text-sm text-amber-600 dark:text-amber-400">
                {t('foundMerges', { count: totalMerges })} {t('involvingOrders', { count: detectedOrdersCount })}
              </p>
            </div>
            
            {/* Show details for the top merge */}
            <div className="bg-white/50 dark:bg-black/20 rounded-md p-3 border border-amber-200/50 dark:border-amber-700/30">
              <div className="flex items-center gap-2 mb-2">
                <Badge 
                  variant="secondary" 
                  className="bg-amber-100 text-amber-800 dark:bg-amber-800/30 dark:text-amber-200"
                >
                  {topMerge.matchType === 'phone' && <Phone className="h-3 w-3 mr-1" />}
                  {topMerge.matchType === 'name' && <User className="h-3 w-3 mr-1" />}
                  {topMerge.matchType === 'both' && <><Phone className="h-3 w-3 mr-1" /><User className="h-3 w-3" /></>}
                  {t(`matchTypes.${topMerge.matchType}`)}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {t('confidence', { percent: Math.round(topMerge.confidence * 100) })}
                </Badge>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                {topMerge.orders.map((order) => (
                  <div key={order.id} className="flex items-center gap-2">
                    <span className="font-medium text-amber-700 dark:text-amber-300">
                      #{order.orderNumber}
                    </span>
                    <span className="text-amber-600 dark:text-amber-400">
                      {order.fullName}
                    </span>
                    {topMerge.matchedFields.includes('phoneNumber') && (
                      <Badge variant="outline" className="text-xs">
                        {order.phoneNumber}
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
              
              <div className="flex items-center gap-1 mt-2 text-xs text-amber-600 dark:text-amber-400">
                <Clock className="h-3 w-3" />
                <span>{getMergeDetails(topMerge)}</span>
              </div>
            </div>
            
            {totalMerges > 1 && (
              <p className="text-xs text-amber-600 dark:text-amber-400">
                {t('moreMerges', { count: totalMerges - 1 })}
              </p>
            )}
          </div>
        </div>
        
        <Button 
          onClick={onKeepSeparateClick} 
          variant="ghost" 
          size="sm"
          className="text-amber-600 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300 flex-shrink-0"
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Dismiss</span>
        </Button>
      </div>
    </div>
  )
}
