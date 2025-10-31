import { notFound } from "next/navigation"
import { format } from "date-fns"
import { DetailsPageLayout } from "@/components/protected/details-page-layout"
import { StatusBadge } from "@/components/ui/status-badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ActivityTimeline, type AuditLogEntry } from "@/components/audit/activity-timeline"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { getContractDetails, type ContractDetails } from "@/lib/data/contracts"
import { Calendar, DollarSign, Percent, FileText, Layers, ClipboardList, Building2, User, Package } from "lucide-react"

type StatusVariant = "success" | "warning" | "info" | "destructive" | "default"

const statusVariantMap: Record<string, StatusVariant> = {
  active: "success",
  pending: "warning",
  draft: "default",
  expired: "info",
  cancelled: "destructive",
}

function formatDate(dateString: string | null | undefined) {
  if (!dateString) return "-"
  try {
    return format(new Date(dateString), "MMM dd, yyyy")
  } catch {
    return dateString
  }
}

function formatCurrency(amount: number | null | undefined, currency: string | null | undefined) {
  if (amount === null || amount === undefined) return "-"
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "USD",
      maximumFractionDigits: 0,
    }).format(amount)
  } catch {
    return `${amount}`
  }
}

function valueOrDash(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") return "-"
  return value
}

function buildAuditEntries(trail: ContractDetails["auditTrail"]): AuditLogEntry[] {
  return trail.map((entry) => ({
    id: entry.id,
    entity_type: entry.entity_type,
    entity_id: entry.entity_id,
    action: entry.action,
    old_values: entry.old_values,
    new_values: entry.new_values,
    changed_by: entry.changed_by,
    changed_at: entry.changed_at,
    changed_by_user: entry.changed_by_user
      ? {
          id: entry.changed_by_user.id,
          email: entry.changed_by_user.email ?? null,
          first_name: entry.changed_by_user.first_name ?? null,
          last_name: entry.changed_by_user.last_name ?? null,
        }
      : null,
  }))
}

export default async function ContractDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const contractDetails = await getContractDetails(id)

  if (!contractDetails) {
    notFound()
  }

  const { contract, allocations, supplierRates, recentBookings, auditTrail, loadErrors } = contractDetails
  const statusVariant = statusVariantMap[contract.status ?? ""] || "default"

  const auditEntries = buildAuditEntries(auditTrail)

  return (
    <DetailsPageLayout
      title={contract.contract_name || contract.contract_number}
      subtitle={`Contract #${contract.contract_number}`}
      badge={
        <StatusBadge variant={statusVariant}>
          {(contract.status || "unknown").toString()}
        </StatusBadge>
      }
      backHref="/contracts"
    >
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="allocations">
            Allocations <Badge variant="secondary" className="ml-2">{allocations.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="rates">
            Rates <Badge variant="secondary" className="ml-2">{supplierRates.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="usage">
            Usage <Badge variant="secondary" className="ml-2">{recentBookings.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryTile
              icon={<StatusBadge variant={statusVariant}>{contract.status || "-"}</StatusBadge>}
              label="Status"
              value={contract.contract_type ? `${contract.contract_type}` : "General"}
              helper="Contract type"
            />
            <SummaryTile
              icon={<Calendar className="h-5 w-5 text-muted-foreground" />}
              label="Validity"
              value={`${formatDate(contract.valid_from)} → ${formatDate(contract.valid_to)}`}
              helper="Contract period"
            />
            <SummaryTile
              icon={<DollarSign className="h-5 w-5 text-muted-foreground" />}
              label="Total Value"
              value={formatCurrency(contract.total_cost, contract.currency)}
              helper={contract.currency || "USD"}
            />
            <SummaryTile
              icon={<Percent className="h-5 w-5 text-muted-foreground" />}
              label="Commission"
              value={contract.commission_rate ? `${contract.commission_rate}%` : "-"}
              helper="Commission / margin"
            />
          </section>

          <section className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Contract Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <InfoRow label="Contract Number" value={contract.contract_number} />
                <InfoRow label="Contract Name" value={contract.contract_name || "-"} />
                <InfoRow label="Status" value={<StatusBadge variant={statusVariant}>{contract.status || "-"}</StatusBadge>} />
                <InfoRow label="Type" value={valueOrDash(contract.contract_type)} />
                <InfoRow label="Currency" value={contract.currency || "USD"} />
                <InfoRow label="Created" value={`${formatDate(contract.created_at)} by ${contract.owner?.first_name || contract.owner?.email || "Unknown"}`} />
                <InfoRow label="Last Updated" value={formatDate(contract.updated_at)} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Relationships</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <RelationItem
                  icon={<Building2 className="h-4 w-4 text-muted-foreground" />}
                  label="Supplier"
                  primary={contract.supplier?.name || "Unassigned"}
                  secondary={contract.supplier?.code || contract.supplier?.email || undefined}
                />
                <RelationItem
                  icon={<Layers className="h-4 w-4 text-muted-foreground" />}
                  label="Event"
                  primary={contract.event?.event_name || "None"}
                  secondary={contract.event?.event_code ? `${contract.event.event_code}` : undefined}
                  helper={contract.event?.event_date_from ? `${formatDate(contract.event.event_date_from)} → ${formatDate(contract.event?.event_date_to || null)}` : undefined}
                />
                <RelationItem
                  icon={<User className="h-4 w-4 text-muted-foreground" />}
                  label="Owner"
                  primary={contract.owner ? `${contract.owner.first_name ?? ""} ${contract.owner.last_name ?? ""}`.trim() || contract.owner.email || "Unknown" : "System"}
                  secondary={contract.owner?.email || undefined}
                />
              </CardContent>
            </Card>
          </section>

          {(contract.payment_terms || contract.cancellation_policy || contract.terms_and_conditions) && (
            <Card>
              <CardHeader>
                <CardTitle>Terms & Conditions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {contract.payment_terms && (
                  <TermsBlock title="Payment Terms" text={contract.payment_terms} />
                )}
                {contract.cancellation_policy && (
                  <TermsBlock title="Cancellation Policy" text={contract.cancellation_policy} />
                )}
                {contract.terms_and_conditions && (
                  <TermsBlock title="Additional Terms" text={contract.terms_and_conditions} />
                )}
              </CardContent>
            </Card>
          )}

          {Array.isArray(contract.contract_files) && contract.contract_files.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Attached Files</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  {contract.contract_files.map((file: any, idx: number) => (
                    <li key={file.id ?? idx} className="flex items-center justify-between rounded-md border px-3 py-2">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <FileText className="h-4 w-4" />
                        <span>{file.name || file.filename || `File ${idx + 1}`}</span>
                      </div>
                      {file.url ? (
                        <a href={file.url} target="_blank" rel="noopener noreferrer" className="text-xs font-medium text-primary hover:underline">
                          Open
                        </a>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {contract.notes && (
            <Card>
              <CardHeader>
                <CardTitle>Internal Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{contract.notes}</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="allocations" className="space-y-4">
          {loadErrors.allocations ? (
            <Alert variant="default" className="border-dashed border-amber-500/40">
              <AlertTitle>Allocations unavailable</AlertTitle>
              <AlertDescription>
                We couldn’t load allocation data for this contract right now. Try refreshing or check back later.
              </AlertDescription>
            </Alert>
          ) : null}
          {allocations.length === 0 ? (
            <EmptyState
              icon={<Layers className="h-10 w-10 text-muted-foreground" />}
              title="No allocations yet"
              description="Create allocations to manage inventory, release schedules, and availability."
            />
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {allocations.map((allocation) => (
                <Card key={allocation.id} className="flex flex-col">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between gap-2">
                      <span>{allocation.allocation_name || "Unnamed allocation"}</span>
                      <Badge variant="outline">{allocation.allocation_type || "on_request"}</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-4 text-sm">
                    <div className="grid gap-2">
                      <InfoRow label="Product" value={allocation.product?.name || "-"} />
                      <InfoRow label="Option" value={allocation.product_option?.option_name || "-"} />
                      <InfoRow label="Quantity" value={allocation.total_quantity ?? "-"} />
                      <InfoRow
                        label="Valid"
                        value={`${formatDate(allocation.valid_from)} → ${formatDate(allocation.valid_to)}`}
                      />
                    </div>
                    <Separator />
                    <div>
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Availability Summary</h4>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <SummaryStat label="Total" value={allocation.availabilitySummary.totalAvailable} />
                        <SummaryStat label="Booked" value={allocation.availabilitySummary.totalBooked} />
                        <SummaryStat label="Remaining" value={allocation.availabilitySummary.totalRemaining} />
                      </div>
                      <p className="mt-2 text-xs text-muted-foreground">
                        Next availability: {allocation.availabilitySummary.nextAvailabilityDate ? formatDate(allocation.availabilitySummary.nextAvailabilityDate) : "-"}
                      </p>
                    </div>
                    {allocation.upcomingAvailability.length > 0 && (
                      <div>
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Upcoming Availability</h4>
                        <ul className="space-y-1 text-xs">
                          {allocation.upcomingAvailability.slice(0, 5).map((slot) => (
                            <li key={slot.id} className="flex items-center justify-between rounded-md border px-2 py-1">
                              <span>{formatDate(slot.date)}</span>
                              <span className="font-medium text-foreground">{slot.available}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {allocation.releases && allocation.releases.length > 0 && (
                      <div>
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Release Schedule</h4>
                        <ul className="space-y-1 text-xs">
                          {allocation.releases.map((release) => (
                            <li key={release.id} className="flex items-center justify-between rounded-md border px-2 py-1">
                              <span>{formatDate(release.release_date)}</span>
                              <span>
                                {release.release_quantity ? `${release.release_quantity} units` : release.release_percentage ? `${release.release_percentage}%` : ""}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="rates" className="space-y-4">
          {loadErrors.supplierRates ? (
            <Alert variant="default" className="border-dashed border-amber-500/40">
              <AlertTitle>Supplier rates unavailable</AlertTitle>
              <AlertDescription>
                Something went wrong while loading supplier rates. The data shown below may be incomplete.
              </AlertDescription>
            </Alert>
          ) : null}
          {supplierRates.length === 0 ? (
            <EmptyState
              icon={<ClipboardList className="h-10 w-10 text-muted-foreground" />}
              title="No supplier rates"
              description="Attach supplier rates to define pricing for this contract."
            />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Supplier Rates</CardTitle>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-muted-foreground">
                    <tr className="text-left">
                      <th className="px-3 py-2 font-medium">Rate</th>
                      <th className="px-3 py-2 font-medium">Product</th>
                      <th className="px-3 py-2 font-medium">Valid</th>
                      <th className="px-3 py-2 font-medium">Base Cost</th>
                      <th className="px-3 py-2 font-medium">Markup</th>
                      <th className="px-3 py-2 font-medium">Allocation</th>
                    </tr>
                  </thead>
                  <tbody>
                    {supplierRates.map((rate) => (
                      <tr key={rate.id} className="border-b last:border-0">
                        <td className="px-3 py-3">
                          <div className="font-medium">{rate.rate_name || "Untitled rate"}</div>
                          <div className="text-xs text-muted-foreground">{rate.rate_basis}</div>
                        </td>
                        <td className="px-3 py-3">
                          <div>{rate.product?.name || "-"}</div>
                          <div className="text-xs text-muted-foreground">{rate.product_option?.option_name || ""}</div>
                        </td>
                        <td className="px-3 py-3">{`${formatDate(rate.valid_from)} → ${formatDate(rate.valid_to)}`}</td>
                        <td className="px-3 py-3">{formatCurrency(rate.base_cost, rate.currency)}</td>
                        <td className="px-3 py-3">{rate.markup_amount ? `${rate.markup_amount}${rate.markup_type === "percent" ? "%" : ``}` : "-"}</td>
                        <td className="px-3 py-3">{rate.contract_allocation?.allocation_name || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="usage" className="space-y-4">
          {loadErrors.bookings ? (
            <Alert variant="default" className="border-dashed border-amber-500/40">
              <AlertTitle>Usage data unavailable</AlertTitle>
              <AlertDescription>
                We couldn’t fetch recent booking usage for this contract.
              </AlertDescription>
            </Alert>
          ) : null}
          {recentBookings.length === 0 ? (
            <EmptyState
              icon={<Package className="h-10 w-10 text-muted-foreground" />}
              title="No usage yet"
              description="As bookings consume this contract, they will appear here."
            />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Recent Bookings</CardTitle>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-muted-foreground">
                    <tr className="text-left">
                      <th className="px-3 py-2 font-medium">Booking</th>
                      <th className="px-3 py-2 font-medium">Travel Dates</th>
                      <th className="px-3 py-2 font-medium">Quantity</th>
                      <th className="px-3 py-2 font-medium">Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentBookings.map((booking) => (
                      <tr key={booking.id} className="border-b last:border-0">
                        <td className="px-3 py-3">
                          <div className="font-medium">{booking.booking?.booking_reference || booking.booking_id}</div>
                          <div className="text-xs text-muted-foreground">{booking.booking?.booking_status || "-"}</div>
                        </td>
                        <td className="px-3 py-3">
                          {booking.service_date_from || booking.service_date_to
                            ? `${formatDate(booking.service_date_from)} → ${formatDate(booking.service_date_to)}`
                            : "-"}
                        </td>
                        <td className="px-3 py-3">{booking.quantity ?? "-"}</td>
                        <td className="px-3 py-3">{formatCurrency(booking.total_price, booking.price_currency)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="activity" className="space-y-4">
          {loadErrors.auditLog ? (
            <Alert variant="default" className="border-dashed border-amber-500/40">
              <AlertTitle>Audit log unavailable</AlertTitle>
              <AlertDescription>
                We couldn’t load the audit trail for this contract. Activity shown below may be incomplete.
              </AlertDescription>
            </Alert>
          ) : null}
          <Card>
            <CardHeader>
              <CardTitle>Audit Trail</CardTitle>
            </CardHeader>
            <CardContent>
              <ActivityTimeline logs={auditEntries} showEntityType={false} emptyMessage="No activity recorded for this contract yet." />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </DetailsPageLayout>
  )
}

function SummaryTile({ icon, label, value, helper }: { icon?: React.ReactNode; label: string; value: React.ReactNode; helper?: React.ReactNode }) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</div>
          <div className="text-lg font-semibold mt-1">{value}</div>
          {helper ? <div className="text-xs text-muted-foreground mt-1">{helper}</div> : null}
        </div>
        {icon ? <div className="text-muted-foreground">{icon}</div> : null}
      </div>
    </Card>
  )
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right max-w-[60%] truncate">{value}</span>
    </div>
  )
}

function RelationItem({ icon, label, primary, secondary, helper }: { icon?: React.ReactNode; label: string; primary: React.ReactNode; secondary?: React.ReactNode; helper?: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      {icon}
      <div className="space-y-1">
        <div className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">{label}</div>
        <div className="text-sm font-medium">{primary}</div>
        {secondary ? <div className="text-xs text-muted-foreground">{secondary}</div> : null}
        {helper ? <div className="text-xs text-muted-foreground">{helper}</div> : null}
      </div>
    </div>
  )
}

function TermsBlock({ title, text }: { title: string; text: string }) {
  return (
    <div className="space-y-2">
      <div className="text-sm font-semibold text-foreground">{title}</div>
      <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">{text}</p>
    </div>
  )
}

function SummaryStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border bg-muted/40 p-3 text-center">
      <div className="text-xs text-muted-foreground uppercase tracking-wide">{label}</div>
      <div className="mt-1 text-sm font-semibold">{value}</div>
    </div>
  )
}

function EmptyState({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center justify-center py-12 text-center space-y-3">
        <div>{icon}</div>
        <div className="text-lg font-semibold">{title}</div>
        <p className="text-sm text-muted-foreground max-w-sm">{description}</p>
      </CardContent>
    </Card>
  )
}

