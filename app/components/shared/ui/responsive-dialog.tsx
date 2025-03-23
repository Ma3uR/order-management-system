"use client"

import * as React from "react"

import { cn } from "@/app/lib/utils"
import { useMediaQuery } from "@/app/hooks/use-media-query"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/app/components/shared/ui/dialog"
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/app/components/shared/ui/drawer"

interface ResponsiveDialogProps {
  children: React.ReactNode
  trigger: React.ReactNode
  title: string
  description?: string
  className?: string
  contentClassName?: string
  open?: boolean
  onOpenChange?: (open: boolean) => void
  showFooter?: boolean
}

export function ResponsiveDialog({
  children,
  trigger,
  title,
  description,
  className,
  contentClassName,
  open,
  onOpenChange,
  showFooter = false,
}: ResponsiveDialogProps) {
  const [internalOpen, setInternalOpen] = React.useState(false)
  const isDesktop = useMediaQuery("(min-width: 768px)")
  
  const isControlled = open !== undefined
  const currentOpen = isControlled ? open : internalOpen
  const handleOpenChange = isControlled ? onOpenChange : setInternalOpen

  if (isDesktop) {
    return (
      <Dialog open={currentOpen} onOpenChange={handleOpenChange}>
        <DialogTrigger asChild>
          {trigger}
        </DialogTrigger>
        <DialogContent className={cn("sm:max-w-[550px]", contentClassName)}>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            {description && (
              <DialogDescription>
                {description}
              </DialogDescription>
            )}
          </DialogHeader>
          <div className={className}>
            {children}
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Drawer open={currentOpen} onOpenChange={handleOpenChange}>
      <DrawerTrigger asChild>
        {trigger}
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader className="text-left">
          <DrawerTitle>{title}</DrawerTitle>
          {description && (
            <DrawerDescription>
              {description}
            </DrawerDescription>
          )}
        </DrawerHeader>
        <div className={cn("px-4", className)}>
          {children}
        </div>
        {showFooter && (
          <DrawerFooter className="pt-2">
            <DrawerClose asChild>
              <button className="rounded-md border border-input bg-background px-4 py-2 text-sm font-medium shadow-sm hover:bg-accent hover:text-accent-foreground">
                Close
              </button>
            </DrawerClose>
          </DrawerFooter>
        )}
      </DrawerContent>
    </Drawer>
  )
} 