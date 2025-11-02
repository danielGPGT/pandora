/**
 * Reusable RelationItem component
 * 
 * Displays a relationship/link between entities with icon, label, primary/secondary text
 */

import { cn } from "@/lib/utils"

interface RelationItemProps {
  icon?: React.ReactNode
  label: string
  primary: React.ReactNode
  secondary?: React.ReactNode
  helper?: React.ReactNode
  href?: string
  className?: string
}

export function RelationItem({
  icon,
  label,
  primary,
  secondary,
  helper,
  href,
  className,
}: RelationItemProps) {
  const content = (
    <div className={cn("flex items-start gap-3", className)}>
      {icon}
      <div className="space-y-1">
        <div className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">
          {label}
        </div>
        <div className="text-sm font-medium">{primary}</div>
        {secondary && <div className="text-xs text-muted-foreground">{secondary}</div>}
        {helper && <div className="text-xs text-muted-foreground">{helper}</div>}
      </div>
    </div>
  )

  if (href) {
    return (
      <a href={href} className="hover:opacity-80 transition-opacity">
        {content}
      </a>
    )
  }

  return content
}

