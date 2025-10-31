import { notFound, redirect } from "next/navigation"
import { getSupplierWithContracts } from "@/lib/actions/suppliers"
import { getAuditLogs } from "@/lib/actions/audit-logs"
import { DetailsPageLayout } from "@/components/protected/details-page-layout"
import { StatusBadge } from "@/components/ui/status-badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Mail, Phone, MapPin, FileText, Clock, Pencil } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { SupplierDetailsActions } from "@/components/suppliers/supplier-details-actions"
import { ContractsDataTable, type Contract } from "@/components/contracts/contracts-data-table"
import { ActivityTimeline, type AuditLogEntry } from "@/components/audit/activity-timeline"

export default async function SupplierDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  let supplier
  try {
    supplier = await getSupplierWithContracts(id)
  } catch (error) {
    notFound()
  }

  if (!supplier) {
    notFound()
  }

  const contracts = (supplier.contracts as any[]) || []

  // Fetch audit logs for this supplier
  const auditLogsResult = await getAuditLogs({
    entity_type: "supplier",
    entity_id: id,
    limit: 100,
    offset: 0,
  })
  const auditLogs = (auditLogsResult.logs as AuditLogEntry[]) || []

  return (
    <DetailsPageLayout
      title={supplier.name}
      subtitle={`Supplier Code: ${supplier.code}`}
      badge={<StatusBadge variant={supplier.is_active ? "success" : "warning"}>{supplier.is_active ? "Active" : "Inactive"}</StatusBadge>}
      actions={<SupplierDetailsActions supplier={supplier} />}
      backHref="/suppliers"
    >
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>

          <TabsTrigger value="activity">Activity</TabsTrigger>
          <TabsTrigger value="contracts">
            Contracts <Badge variant="secondary" className="ml-2">{contracts.length}</Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <InfoRow label="Supplier Code" value={supplier.code} />
                <InfoRow label="Type" value={supplier.supplier_type || "-"} />
                <InfoRow
                  label="Status"
                  value={<StatusBadge variant={supplier.is_active ? "success" : "warning"}>{supplier.is_active ? "Active" : "Inactive"}</StatusBadge>}
                />
                <InfoRow label="Default Currency" value={supplier.default_currency || "USD"} />
              </CardContent>
            </Card>

            {/* Contact Information */}
            <Card>
              <CardHeader>
                <CardTitle>Contact Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {supplier.email && <InfoRow label="Email" value={supplier.email} icon={<Mail className="h-4 w-4" />} copyable />}
                {supplier.phone && <InfoRow label="Phone" value={supplier.phone} icon={<Phone className="h-4 w-4" />} copyable />}
                {(supplier.address_line1 || supplier.city || supplier.country) && (
                  <InfoRow
                    label="Address"
                    value={
                      <div>
                        {supplier.address_line1 && <div>{supplier.address_line1}</div>}
                        {(supplier.city || supplier.country) && (
                          <div className="text-muted-foreground">
                            {supplier.city}
                            {supplier.city && supplier.country && ", "}
                            {supplier.country}
                          </div>
                        )}
                      </div>
                    }
                    icon={<MapPin className="h-4 w-4" />}
                  />
                )}
              </CardContent>
            </Card>

            {/* Notes */}
            {supplier.notes && (
              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle>Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{supplier.notes}</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="contracts" className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold">Contracts</h2>
              <p className="text-muted-foreground">
                {contracts.length} contract{contracts.length !== 1 ? "s" : ""} with this supplier
              </p>
            </div>
            <Button>
              <FileText className="mr-2 h-4 w-4" />
              Add Contract
            </Button>
          </div>

          {contracts.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No contracts yet</h3>
                <p className="text-sm text-muted-foreground mb-4">Create your first contract with this supplier</p>
                <Button>
                  <FileText className="mr-2 h-4 w-4" />
                  Add Contract
                </Button>
              </CardContent>
            </Card>
          ) : (
            <ContractsDataTable contracts={contracts as Contract[]} />
          )}
        </TabsContent>

        <TabsContent value="activity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Activity Timeline</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Complete audit trail of all changes to this supplier
              </p>
            </CardHeader>
            <CardContent>
              <ActivityTimeline logs={auditLogs} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </DetailsPageLayout>
  )
}

function InfoRow({ label, value, icon, copyable }: { label: string; value: React.ReactNode; icon?: React.ReactNode; copyable?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex items-center gap-2 text-sm text-muted-foreground min-w-[120px]">
        {icon}
        <span>{label}</span>
      </div>
      <div className="text-sm font-medium text-right flex-1">{value}</div>
    </div>
  )
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground mb-1">{label}</div>
      <div className="text-sm font-medium">{value}</div>
    </div>
  )
}


