import { getAuditLogs } from "@/lib/actions/audit-logs"
import { GeneralPageLayout } from "@/components/protected/general-page-layout"
import { AuditLogsDataTable } from "@/components/audit/audit-logs-data-table"

export default async function AuditLogsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const params = await searchParams
  const page = Number(params.page) || 1
  const pageSize = Number(params.pageSize) || 50
  const q = (params.q as string) || ""
  const entityType = (params.entity_type as string) || ""
  const action = (params.action as string) || ""
  const changedBy = (params.changed_by as string) || ""
  const startDate = (params.start_date as string) || ""
  const endDate = (params.end_date as string) || ""

  const result = await getAuditLogs({
    entity_type: entityType || undefined,
    action: action || undefined,
    changed_by: changedBy || undefined,
    start_date: startDate || undefined,
    end_date: endDate || undefined,
    limit: pageSize,
    offset: (page - 1) * pageSize,
  })

  return (
    <GeneralPageLayout
      title="Audit Logs"
      subtitle="Complete audit trail of all system activities and changes"
    >
      <AuditLogsDataTable
        initialData={result.logs}
        totalCount={result.totalCount}
        page={page}
        pageSize={pageSize}
        q={q}
        entityType={entityType}
        action={action}
        changedBy={changedBy}
        startDate={startDate}
        endDate={endDate}
      />
    </GeneralPageLayout>
  )
}

