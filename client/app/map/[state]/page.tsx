import { SiteHeader } from '@/components/layout/site-header'
import { SiteFooter } from '@/components/layout/site-footer'
import { IndiaMap } from '@/components/experience/india-map'
import { mockIndianStates } from '@/data/states'

export async function generateStaticParams() {
  return mockIndianStates.map((st) => ({ state: st.slug }))
}

export default async function StatePage({ params }: { params: Promise<{ state: string }> }) {
  const resolvedParams = await params
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <SiteHeader />
      <main id="main-content" className="flex-1 container-shell pt-28 pb-16">
        <IndiaMap />
      </main>
      <SiteFooter />
    </div>
  )
}
