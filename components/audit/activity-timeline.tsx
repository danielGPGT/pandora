"use client"

import { formatDistanceToNow, format } from "date-fns"
import { Clock, User, Pencil, Trash2, Copy, Plus, Power, MoreVertical } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { cn } from "@/lib/utils"

export type AuditLogEntry = {
  id: string
  entity_type: string
  entity_id: string
  action: string
  old_values: Record<string, any> | null
  new_values: Record<string, any> | null
  changed_by: string | null
  changed_at: string
  changed_by_user?: {
    id: string
    email: string | null
    first_name: string | null
    last_name: string | null
  } | null
}

const actionIcons: Record<string, React.ReactNode> = {
  create: <Plus className="h-4 w-4" />,
  update: <Pencil className="h-4 w-4" />,
  delete: <Trash2 className="h-4 w-4" />,
  duplicate: <Copy className="h-4 w-4" />,
  bulk_delete: <Trash2 className="h-4 w-4" />,
  bulk_update: <Power className="h-4 w-4" />,
  bulk_duplicate: <Copy className="h-4 w-4" />,
}

const actionColors: Record<string, string> = {
  create: "bg-success/10 text-success border-success/20",
  update: "bg-info/10 text-info border-info/20",
  delete: "bg-destructive/10 text-destructive border-destructive/20",
  duplicate: "bg-primary/10 text-primary border-primary/20",
  bulk_delete: "bg-destructive/10 text-destructive border-destructive/20",
  bulk_update: "bg-warning/10 text-warning border-warning/20",
  bulk_duplicate: "bg-primary/10 text-primary border-primary/20",
}

function getActionLabel(action: string): string {
  const labels: Record<string, string> = {
    create: "Created",
    update: "Updated",
    delete: "Deleted",
    duplicate: "Duplicated",
    bulk_delete: "Bulk Deleted",
    bulk_update: "Bulk Updated",
    bulk_duplicate: "Bulk Duplicated",
  }
  return labels[action] || action
}

function getChangedFields(oldValues: Record<string, any> | null, newValues: Record<string, any> | null): string[] {
  if (!oldValues || !newValues) return []
  const fields: string[] = []
  for (const key in newValues) {
    if (oldValues[key] !== newValues[key]) {
      fields.push(key)
    }
  }
  return fields
}

function formatValue(value: any): string {
  if (value === null || value === undefined) return "-"
  if (typeof value === "boolean") return value ? "Yes" : "No"
  if (typeof value === "object") return JSON.stringify(value)
  return String(value)
}

interface ActivityTimelineProps {
  logs: AuditLogEntry[]
  emptyMessage?: string
  entityType?: string
  entityId?: string
  showEntityType?: boolean
}

export function ActivityTimeline({
  logs,
  emptyMessage = "No activity recorded yet.",
  showEntityType = true,
}: ActivityTimelineProps) {
  if (logs.length === 0) {
    return (
      <div className="text-center py-8 text-sm text-muted-foreground">{emptyMessage}</div>
    )
  }

  return (
    <div className="relative">
      {/* Timeline line */}
      <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />

      <div className="space-y-6">
        {logs.map((log, index) => (
          <ActivityTimelineItem key={log.id} log={log} isFirst={index === 0} showEntityType={showEntityType} />
        ))}
      </div>
    </div>
  )
}

function ActivityTimelineItem({
  log,
  isFirst,
  showEntityType = true,
}: {
  log: AuditLogEntry
  isFirst: boolean
  showEntityType?: boolean
}) {
  const userName = log.changed_by_user
    ? `${log.changed_by_user.first_name || ""} ${log.changed_by_user.last_name || ""}`.trim() || log.changed_by_user.email || "Unknown User"
    : "System"

  const changedFields = log.action === "update" ? getChangedFields(log.old_values, log.new_values) : []

  return (
    <div className="relative pl-10">
      {/* Timeline dot */}
      <div
        className={cn(
          "absolute left-0 top-1.5 flex h-8 w-8 items-center justify-center rounded-full border-2 bg-background",
          actionColors[log.action] || "bg-muted border-border"
        )}
      >
        {actionIcons[log.action] || <Clock className="h-4 w-4" />}
      </div>

      <div className="space-y-1">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium">{getActionLabel(log.action)}</span>
              {showEntityType && (
                <Badge variant="outline" className="text-xs capitalize">
                  {log.entity_type}
                </Badge>
              )}
              {log.action.startsWith("bulk_") && (
                <Badge variant="secondary" className="text-xs">
                  Bulk Operation
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
              <User className="h-3 w-3" />
              <span>{userName}</span>
            </div>
            {changedFields.length > 0 && (
              <div className="mt-1 text-xs text-muted-foreground">
                Changed: {changedFields.slice(0, 3).join(", ")}
                {changedFields.length > 3 && ` +${changedFields.length - 3} more`}
              </div>
            )}
            <div className="mt-1 text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span>{formatDistanceToNow(new Date(log.changed_at), { addSuffix: true })}</span>
              <span className="mx-1">•</span>
              <span>{format(new Date(log.changed_at), "MMM dd, yyyy HH:mm")}</span>
            </div>
          </div>
        </div>

        {/* Expandable details */}
        {(log.old_values || log.new_values) && (
          <Collapsible>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 text-xs mt-2">
                <MoreVertical className="h-3 w-3 mr-1" />
                View Details
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2">
              <div className="rounded-lg border bg-muted/30 p-4 space-y-3 text-sm">
                {log.action === "update" && log.old_values && log.new_values && (
                  <div className="space-y-2">
                    <div className="font-medium">Changes:</div>
                    <div className="space-y-1">
                      {changedFields.slice(0, 10).map((field) => (
                        <div key={field} className="flex gap-4 text-xs">
                          <div className="flex-1">
                            <span className="font-medium">{field}:</span>
                            <div className="text-muted-foreground line-through">
                              {formatValue(log.old_values?.[field])}
                            </div>
                          </div>
                          <div className="flex-1">
                            <span className="font-medium">→</span>
                            <div className="text-foreground">{formatValue(log.new_values?.[field])}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {log.action === "create" && log.new_values && (
                  <div>
                    <div className="font-medium mb-2">Created with:</div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {Object.entries(log.new_values)
                        .filter(([key]) => !["id", "created_at", "updated_at", "organization_id"].includes(key))
                        .slice(0, 8)
                        .map(([key, value]) => (
                          <div key={key}>
                            <span className="font-medium">{key}:</span> {formatValue(value)}
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {log.action === "delete" && log.old_values && (
                  <div>
                    <div className="font-medium mb-2">Deleted:</div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {Object.entries(log.old_values)
                        .filter(([key]) => !["id", "created_at", "updated_at", "organization_id"].includes(key))
                        .slice(0, 8)
                        .map(([key, value]) => (
                          <div key={key}>
                            <span className="font-medium">{key}:</span> {formatValue(value)}
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}
      </div>
    </div>
  )
}

