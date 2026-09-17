import { SiteHeader } from '@/components/layout/site-header'
import { SiteFooter } from '@/components/layout/site-footer'
import { IndiaMap } from '@/components/experience/india-map'
import { mockIndianStates } from '@/data/states'
import { BackButton } from '@/components/ui/back-button'

export async function generateStaticParams() {
  return mockIndianStates.map((st) => ({ state: st.slug }))
}

export default async function StatePage({ params }: { params: Promise<{ state: string }> }) {
  const resolvedParams = await params
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <SiteHeader />
      <main id="main-content" className="flex-1 container-shell pt-28 pb-16">
        <div className="mb-6">
          <BackButton fallbackHref="/map" label="Back to India Food Map" variant="pill" />
        </div>
        <IndiaMap />
      </main>
      <SiteFooter />
    </div>
  )
}
