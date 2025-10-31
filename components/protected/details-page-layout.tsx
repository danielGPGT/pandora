"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ChevronLeft } from "lucide-react"
import { cn } from "@/lib/utils"

type DetailsPageLayoutProps = {
  title: string
  subtitle?: string
  badge?: React.ReactNode
  actions?: React.ReactNode
  backHref?: string
  className?: string
  children: React.ReactNode
}

export function DetailsPageLayout({ title, subtitle, badge, actions, backHref, className, children }: DetailsPageLayoutProps) {
  const router = useRouter()

  const handleBack = () => {
    if (backHref) {
      router.push(backHref)
    } else {
      router.back()
    }
  }

  return (
    <section className={cn("min-h-screen w-full", className)}>
      <div className="w-full">
        {/* Header with back button */}
        <header className="border-b">
          <div className="flex items-start gap-4 p-4 md:p-6">
            <Button variant="ghost" size="icon" onClick={handleBack} className="shrink-0">
              <ChevronLeft className="h-5 w-5" />
              <span className="sr-only">Go back</span>
            </Button>
            <div className="flex-1 min-w-0 space-y-2">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-xl md:text-2xl font-semibold tracking-tight">{title}</h1>
                {badge && <div className="shrink-0">{badge}</div>}
              </div>
              {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
            </div>
            {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
          </div>
        </header>
        {/* Content */}
        <div className="p-4 md:p-6">
          {children}
        </div>
      </div>
    </section>
  )
}

