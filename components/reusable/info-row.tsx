/**
 * Reusable InfoRow component
 * 
 * Displays a label-value pair with optional icon and copy functionality
 */

import { Copy, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useState } from "react"
import { toast } from "sonner"

interface InfoRowProps {
  label: string
  value: React.ReactNode
  icon?: React.ReactNode
  copyable?: boolean
  className?: string
}

export function InfoRow({ label, value, icon, copyable, className }: InfoRowProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    const textToCopy = typeof value === "string" ? value : String(value)
    try {
      await navigator.clipboard.writeText(textToCopy)
      setCopied(true)
      toast.success("Copied to clipboard")
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      toast.error("Failed to copy")
    }
  }

  return (
    <div className={cn("flex items-start justify-between gap-4", className)}>
      <div className="flex items-center gap-2 text-sm text-muted-foreground min-w-[120px]">
        {icon}
        <span>{label}</span>
      </div>
      <div className="text-sm font-medium text-right flex-1 flex items-center justify-end gap-2">
        <span>{value}</span>
        {copyable && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={handleCopy}
            aria-label="Copy to clipboard"
          >
            {copied ? (
              <Check className="h-3 w-3 text-success" />
            ) : (
              <Copy className="h-3 w-3" />
            )}
          </Button>
        )}
      </div>
    </div>
  )
}

