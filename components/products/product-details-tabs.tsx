"use client"

import { useEffect, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { ReactNode } from "react"

type ProductDetailsTabsProps = {
  overviewContent: ReactNode
  optionsContent: ReactNode
  activityContent: ReactNode
}

export function ProductDetailsTabs({
  overviewContent,
  optionsContent,
  activityContent,
}: ProductDetailsTabsProps) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState(() => {
    const tab = searchParams.get("tab")
    return tab === "options" ? "options" : tab === "activity" ? "activity" : "overview"
  })

  // Sync with URL searchParams
  useEffect(() => {
    const tab = searchParams.get("tab")
    const newTab = tab === "options" ? "options" : tab === "activity" ? "activity" : "overview"
    if (newTab !== activeTab) {
      setActiveTab(newTab)
    }
  }, [searchParams, activeTab])

  const handleTabChange = (value: string) => {
    setActiveTab(value)
    const newUrl = value === "overview" 
      ? window.location.pathname 
      : `${window.location.pathname}?tab=${value}`
    router.replace(newUrl, { scroll: false })
  }

  return (
    <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6" id="product-tabs">
      <TabsList>
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="options">Options</TabsTrigger>
        <TabsTrigger value="activity">Activity</TabsTrigger>
      </TabsList>

      <TabsContent value="overview" className="space-y-4">
        {overviewContent}
      </TabsContent>

      <TabsContent value="options">
        {optionsContent}
      </TabsContent>

      <TabsContent value="activity" className="space-y-4">
        {activityContent}
      </TabsContent>
    </Tabs>
  )
}

