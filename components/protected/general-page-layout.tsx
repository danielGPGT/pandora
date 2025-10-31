"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

type GeneralPageLayoutProps = {
  title?: string
  subtitle?: string
  actions?: React.ReactNode
  className?: string
  children: React.ReactNode
}

export function GeneralPageLayout({ title, subtitle, actions, className, children }: GeneralPageLayoutProps) {
  return (
    <section className={cn("min-h-screen w-full", className)}>
      <div className="w-full">
        <header className="flex items-start justify-between gap-3 p-4 md:p-6 border-b">
          <div className="space-y-1">
            {title && <h1 className="text-xl md:text-2xl font-semibold tracking-tight">{title}</h1>}
            {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
          </div>
          {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
        </header>
        <div className="p-4 md:p-6">
          {children}
        </div>
      </div>
    </section>
  )
}


