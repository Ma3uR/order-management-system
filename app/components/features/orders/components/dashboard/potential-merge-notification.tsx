"use client"

import { Button } from "@/app/components/shared/ui/button"
import { AlertTriangle } from "lucide-react"

interface PotentialMergeNotificationProps {
  detectedOrdersCount: number
  onMergeClick: () => void
  onKeepSeparateClick: () => void
}

export function PotentialMergeNotification({
  detectedOrdersCount,
  onMergeClick,
  onKeepSeparateClick,
}: PotentialMergeNotificationProps) {
  if (detectedOrdersCount === 0) return null

  return (
    <div className="bg-amber-50 border border-amber-200 dark:bg-amber-900/30 dark:border-amber-700/50 p-4 rounded-lg mb-6 flex flex-col sm:flex-row items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <AlertTriangle className="h-6 w-6 text-amber-500 dark:text-amber-400" />
        <div>
          <p className="font-semibold text-amber-700 dark:text-amber-300">Potential order merge detected</p>
          <p className="text-sm text-amber-600 dark:text-amber-400">
            We found {detectedOrdersCount} orders that might be from the same customer.
          </p>
        </div>
      </div>
      <div className="flex gap-2 flex-shrink-0">
        <Button onClick={onMergeClick} size="sm" className="bg-slate-700 hover:bg-slate-800 text-white">
          Merge Orders
        </Button>
        <Button onClick={onKeepSeparateClick} variant="outline" size="sm">
          Keep Separate
        </Button>
      </div>
    </div>
  )
}
