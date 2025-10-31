"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

type StatusVariant = "success" | "warning" | "destructive" | "info" | "default"

export function StatusBadge({
  children,
  variant = "default",
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { variant?: StatusVariant }) {
  const base = "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium"
  const styles: Record<StatusVariant, string> = {
    success:
      "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800",
    warning:
      "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800",
    destructive:
      "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800",
    info:
      "bg-sky-100 text-sky-700 border-sky-200 dark:bg-sky-900/30 dark:text-sky-300 dark:border-sky-800",
    default:
      "bg-muted text-foreground border-border",
  }

  return (
    <span className={cn(base, styles[variant], className)} {...props}>
      {children}
    </span>
  )
}


