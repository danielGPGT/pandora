"use client"

import Link from "next/link"
import { format } from "date-fns"
import { FileText, ChevronRight, Building2 } from "lucide-react"

import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { StatusBadge } from "@/components/ui/status-badge"
import type { EventDetailsResult } from "@/lib/data/events"

type EventContractsCardProps = {
  contracts: EventDetailsResult["contracts"]
  counts: EventDetailsResult["counts"]
  eventId: string
}

const statusVariantMap: Record<string, React.ComponentProps<typeof StatusBadge>["variant"]> = {
  active: "success",
  confirmed: "success",
  signed: "success",
  draft: "info",
  pending: "warning",
  expired: "warning",
  cancelled: "destructive",
  terminated: "destructive",
}

export function EventContractsCard({ contracts, counts, eventId }: EventContractsCardProps) {
  return (
    <Card className="h-full">
      <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <CardTitle className="text-lg font-semibold">Contracts</CardTitle>
          <p className="text-xs text-muted-foreground">
            Showing up to 6 contracts linked to this event.
          </p>
        </div>
        <Badge variant="secondary" className="uppercase tracking-wide">
          {counts.contractsActive}/{counts.contractsTotal} active
        </Badge>
      </CardHeader>
      <CardContent className="space-y-3">
        {contracts.length === 0 ? (
          <div className="rounded-lg border border-dashed bg-muted/40 p-6 text-center text-sm text-muted-foreground">
            No contracts connected to this event.
          </div>
        ) : (
          <div className="space-y-3">
            {contracts.map((contract) => (
              <ContractRow key={contract.id} contract={contract} />
            ))}
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-end">
        <Link
          href={`/contracts?event=${eventId}`}
          className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
        >
          View contracts
          <ChevronRight className="h-4 w-4" aria-hidden />
        </Link>
      </CardFooter>
    </Card>
  )
}

function ContractRow({
  contract,
}: {
  contract: EventDetailsResult["contracts"][number]
}) {
  const href = `/contracts/${contract.id}`
  const statusKey = (contract.status ?? "").toLowerCase()
  const variant = statusVariantMap[statusKey] ?? "default"

  const periodLabel = `${format(new Date(contract.valid_from), "MMM dd, yyyy")} → ${format(
    new Date(contract.valid_to),
    "MMM dd, yyyy"
  )}`

  const title = contract.contract_name || contract.contract_number

  return (
    <Link
      href={href}
      className="flex items-start justify-between gap-3 rounded-lg border bg-card/60 p-3 transition hover:border-primary/40 hover:bg-card"
    >
      <div className="min-w-0 space-y-1">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-muted-foreground" aria-hidden />
          <p className="truncate text-sm font-medium">{title}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <Badge variant="outline">{contract.contract_number}</Badge>
          <span>{periodLabel}</span>
          {contract.supplier?.name ? (
            <span className="inline-flex items-center gap-1">
              <Building2 className="h-3 w-3" aria-hidden /> {contract.supplier.name}
            </span>
          ) : null}
        </div>
      </div>
      <StatusBadge variant={variant}>{contract.status ?? "Unknown"}</StatusBadge>
    </Link>
  )
}

