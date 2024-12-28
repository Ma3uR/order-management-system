"use client";

import { Spinner } from "@/app/components/shared/ui/spinner"

interface LoadingSpinnerProps {
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

export function LoadingSpinner({ className, size = 'md' }: LoadingSpinnerProps) {
  return (
    <div className="flex justify-center items-center w-full h-full min-h-[100px]">
      <Spinner size={size} className={className} />
    </div>
  )
} 