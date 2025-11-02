import { GeneralPageLayout } from "@/components/protected/general-page-layout"
import { QuoteBuilder } from "@/components/quotes/quote-builder"

export default async function QuoteBuilderPage() {
  return (
    <GeneralPageLayout
      title="Quote Builder"
      subtitle="Build custom quotes by bundling products together. Test pricing and create quotes for customers."
    >
      <QuoteBuilder />
    </GeneralPageLayout>
  )
}

