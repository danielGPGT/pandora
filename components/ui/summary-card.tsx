"use client"

import * as React from "react"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"

type Variant = "success" | "warning" | "destructive" | "info" | "default"

type SummaryCardProps = {
  title: string
  value: React.ReactNode
  subtitle?: string
  icon?: React.ReactNode
  variant?: Variant
  delta?: string | React.ReactNode
  className?: string
}

const variantClasses: Record<Variant, string> = {
  success:
    "text-emerald-500 dark:text-emerald-300",
  warning:
    "text-amber-500  dark:text-amber-300",
  destructive:
    "text-red-500 dark:text-red-300",
  info:
    "text-info-500 dark:text-info-300",
  default: "text-foreground",
}

export function SummaryCard({ title, value, subtitle, icon, variant = "default", delta, className }: SummaryCardProps) {
  return (
    <Card className={cn("p-4 md:p-5 rounded-xl border bg-card/80 backdrop-blur-xl shadow-sm transition-shadow hover:shadow-md", className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <span className={cn("h-3 w-1.5 rounded-full", {
                "bg-emerald-500": variant === "success",
                "bg-amber-500": variant === "warning",
                "bg-red-500": variant === "destructive",
                "bg-info-500": variant === "info",
                "bg-muted-foreground/40": variant === "default",
              })} />
              <div className="text-sm font-medium truncate">{title}</div>
            </div>
            {icon ? (
              <div className={cn("inline-flex items-center justify-center", variantClasses[variant])}>{icon}</div>
            ) : null}
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <div className="text-3xl font-semibold leading-none tracking-tight">{value}</div>
            {delta ? (
              <div
                className={cn("text-xs font-medium", {
                  "text-emerald-600 dark:text-emerald-400": variant === "success",
                  "text-amber-600 dark:text-amber-400": variant === "warning",
                  "text-red-600 dark:text-red-400": variant === "destructive",
                  "text-sky-600 dark:text-sky-400": variant === "info",
                  "text-muted-foreground": variant === "default",
                })}
              >
                {delta}
              </div>
            ) : null}
          </div>
          {subtitle ? (
            <div className="mt-2 text-xs text-muted-foreground leading-relaxed line-clamp-2">{subtitle}</div>
          ) : null}
        </div>
      </div>
    </Card>
  )
}


