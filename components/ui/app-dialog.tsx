"use client"

import * as React from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

type AppDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: React.ReactNode
  description?: React.ReactNode
  children: React.ReactNode
  footer?: React.ReactNode
  className?: string
  contentClassName?: string
  size?: "sm" | "md" | "lg" | "xl"
  stickyFooter?: boolean
}

const sizeClass: Record<NonNullable<AppDialogProps["size"]>, string> = {
  sm: "max-w-md",
  md: "max-w-lg",
  lg: "max-w-2xl",
  xl: "max-w-4xl",
}

export function AppDialog({ open, onOpenChange, title, description, children, footer, className, contentClassName, size = "lg", stickyFooter = false }: AppDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn("p-0", sizeClass[size], className)}>
        <div className={cn("flex flex-col max-h-[90vh] overflow-hidden", contentClassName)}>
          <DialogHeader className="px-6 pt-5 pb-4">
            <DialogTitle className="text-base md:text-lg">{title}</DialogTitle>
            {description ? <DialogDescription className="text-sm">{description}</DialogDescription> : null}
          </DialogHeader>
          <div className="px-6 pb-6 overflow-y-auto flex-1">{children}</div>
          {footer ? (
            <div className={cn("border-t bg-card/50 px-6 py-3", stickyFooter ? "sticky bottom-0" : undefined)}>{footer}</div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  )
}


