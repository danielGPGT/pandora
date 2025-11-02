/**
 * Reusable SummaryTile component
 * 
 * Displays a summary statistic with icon, label, value, and optional helper text
 */

import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface SummaryTileProps {
  icon?: React.ReactNode
  label: string
  value: React.ReactNode
  helper?: React.ReactNode
  className?: string
}

export function SummaryTile({ icon, label, value, helper, className }: SummaryTileProps) {
  return (
    <Card className={cn("p-4", className)}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {label}
          </div>
          <div className="text-lg font-semibold mt-1">{value}</div>
          {helper && <div className="text-xs text-muted-foreground mt-1">{helper}</div>}
        </div>
        {icon && <div className="text-muted-foreground">{icon}</div>}
      </div>
    </Card>
  )
}

