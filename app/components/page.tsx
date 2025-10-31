"use client"

import * as React from "react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Toaster } from "@/components/ui/sonner"
import { toast } from "sonner"

import { DataTable08 } from "@/components/reuseable/data-table/data-table-08"
import { ColumnDef } from "@tanstack/react-table"
import { CheckCircle2, Info, TriangleAlert, XCircle } from "lucide-react"

type Person = { id: string; name: string; email: string; status: "Active" | "Invited" | "Suspended" }

const demoPeople: Person[] = [
  { id: "1", name: "Amara Patel", email: "amara@example.com", status: "Active" },
  { id: "2", name: "Jon Rivera", email: "jon@example.com", status: "Invited" },
  { id: "3", name: "Sofia Chen", email: "sofia@example.com", status: "Suspended" },
]

const peopleColumns: ColumnDef<Person>[] = [
  { accessorKey: "name", header: "Name" },
  { accessorKey: "email", header: "Email" },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => <Badge variant="outline">{row.getValue("status") as string}</Badge>,
  },
]

function DataTable08Demo() {
  return (
    <DataTable08
      data={demoPeople}
      columns={peopleColumns}
      searchPlaceholder="Search people..."
      exportFilename="people.csv"
    />
  )
}

export default function ComponentsGuidePage() {
  return (
    <main className={cn("container mx-auto max-w-screen-xl px-4 py-8 space-y-8")}> 
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Component Guide</h1>
          <p className="text-muted-foreground mt-1">Living style guide and component preview for the Tour Operator SaaS.</p>
        </div>
        <div className="hidden sm:flex items-center gap-2">
          <Button asChild variant="outline"><Link href="/">Back to Home</Link></Button>
          <Button onClick={() => toast.success("Example success toast")}>Show Toast</Button>
        </div>
      </header>

      <Tabs defaultValue="foundations" className="space-y-6">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="foundations">Foundations</TabsTrigger>
          <TabsTrigger value="elements">Elements</TabsTrigger>
          <TabsTrigger value="data">Data</TabsTrigger>
          <TabsTrigger value="feedback">Feedback</TabsTrigger>
          <TabsTrigger value="shadcn-studio">shadcn-studio</TabsTrigger>
        </TabsList>

        <TabsContent value="foundations" className="space-y-6">
          <section>
            <h2 className="text-lg font-medium">Colors</h2>
            <p className="text-sm text-muted-foreground mb-3">Semantic palette derived from OKLCH system.</p>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {[
                { name: "Primary", cls: "bg-primary text-primary-foreground" },
                { name: "Secondary", cls: "bg-secondary text-secondary-foreground" },
                { name: "Success", cls: "bg-success text-success-foreground" },
                { name: "Warning", cls: "bg-warning text-warning-foreground" },
                { name: "Destructive", cls: "bg-destructive text-destructive-foreground" },
                { name: "Info", cls: "bg-info text-info-foreground" },
              ].map((c) => (
                <Card key={c.name} className={cn("p-4 text-sm font-medium", c.cls)}>{c.name}</Card>
              ))}
            </div>
          </section>

          <Separator />

          <section className="space-y-3">
            <h2 className="text-lg font-medium">Typography & Inputs</h2>
            <div className="grid gap-3 md:grid-cols-2">
              <Card className="p-4 space-y-2">
                <div className="text-sm text-muted-foreground">Buttons</div>
                <div className="flex flex-wrap gap-2">
                  <Button>Primary</Button>
                  <Button variant="secondary">Secondary</Button>
                  <Button variant="outline">Outline</Button>
                  <Button variant="ghost">Ghost</Button>
                  <Button variant="destructive">Destructive</Button>
                </div>
              </Card>

              <Card className="p-4 space-y-2">
                <div className="text-sm text-muted-foreground">Inputs</div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Input placeholder="Search or type…" className="w-full" />
                  <Button onClick={() => toast("Action performed")}>Action</Button>
                </div>
              </Card>
            </div>
          </section>
        </TabsContent>

        <TabsContent value="elements" className="space-y-6">
          <section className="space-y-3">
            <h2 className="text-lg font-medium">Badges</h2>
            <div className="flex flex-wrap gap-2">
              <Badge>Default</Badge>
              <Badge variant="secondary">Secondary</Badge>
              <Badge variant="outline">Outline</Badge>
            </div>
          </section>

          <Separator />

          <section className="space-y-3">
            <h2 className="text-lg font-medium">Alerts</h2>
            <div className="grid gap-3 md:grid-cols-2">
              <Alert>
                <CheckCircle2 className="h-4 w-4" />
                <AlertTitle>Success</AlertTitle>
                <AlertDescription>Everything looks good.</AlertDescription>
              </Alert>
              <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>Info</AlertTitle>
                <AlertDescription>Heads up, here’s some info.</AlertDescription>
              </Alert>
              <Alert>
                <TriangleAlert className="h-4 w-4" />
                <AlertTitle>Warning</AlertTitle>
                <AlertDescription>Check this before proceeding.</AlertDescription>
              </Alert>
              <Alert>
                <XCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>Something went wrong.</AlertDescription>
              </Alert>
            </div>
          </section>
        </TabsContent>

        <TabsContent value="data" className="space-y-6">
          <section className="space-y-3">
            <h2 className="text-lg font-medium">DataTable</h2>
            <p className="text-sm text-muted-foreground">Sortable, filterable, draggable columns, responsive card view.</p>
            <DataTable08Demo />
          </section>
        </TabsContent>

        <TabsContent value="feedback" className="space-y-6">
          <section className="space-y-3">
            <h2 className="text-lg font-medium">Toasts</h2>
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => toast.success("Saved successfully")}>Success</Button>
              <Button variant="secondary" onClick={() => toast.info("Heads up")}>Info</Button>
              <Button variant="outline" onClick={() => toast.warning("Be careful")}>Warning</Button>
              <Button variant="destructive" onClick={() => toast.error("Something failed")}>Error</Button>
            </div>
          </section>
        </TabsContent>

        <TabsContent value="shadcn-studio" className="space-y-6">
          <section className="space-y-3">
            <h2 className="text-lg font-medium">DataTable 08 (Draggable Columns)</h2>
            <p className="text-sm text-muted-foreground">Shadcn studio example component wired into this project.</p>
            <DataTable08Demo />
          </section>
        </TabsContent>
      </Tabs>

      <Toaster richColors position="top-right" />
    </main>
  )
}


