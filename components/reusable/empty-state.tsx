/**
 * Reusable EmptyState component
 * 
 * Displays an empty state with icon, title, and description
 */

import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface EmptyStateProps {
  icon: React.ReactNode
  title: string
  description: string
  action?: React.ReactNode
  className?: string
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <Card className={cn("border-dashed", className)}>
      <CardContent className="flex flex-col items-center justify-center py-12 text-center space-y-3">
        <div>{icon}</div>
        <div className="text-lg font-semibold">{title}</div>
        <p className="text-sm text-muted-foreground max-w-sm">{description}</p>
        {action && <div className="mt-4">{action}</div>}
      </CardContent>
    </Card>
  )
}

