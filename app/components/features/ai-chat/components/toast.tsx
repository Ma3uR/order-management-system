"use client"

import { toast as sonnerToast } from 'sonner'

type ToastType = 'success' | 'error' | 'info' | 'warning'

interface ToastOptions {
  type?: ToastType
  title?: string
  description: string
  duration?: number
}

export function toast({
  type = 'info',
  title,
  description,
  duration = 5000,
}: ToastOptions) {
  const options = {
    duration,
  }

  switch (type) {
    case 'success':
      return sonnerToast.success(title || 'Success', {
        description,
        ...options,
      })
    case 'error':
      return sonnerToast.error(title || 'Error', {
        description,
        ...options,
      })
    case 'warning':
      return sonnerToast.warning(title || 'Warning', {
        description,
        ...options,
      })
    default:
      return sonnerToast.info(title || 'Info', {
        description,
        ...options,
      })
  }
} 