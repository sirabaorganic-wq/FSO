import { SiteHeader } from '@/components/layout/site-header'
import { SiteFooter } from '@/components/layout/site-footer'
import { FestivalExperience } from '@/components/experience/festival-experience'
import { mockFestivals } from '@/data/festivals'

export async function generateStaticParams() {
  return mockFestivals.map((f) => ({ slug: f.slug }))
}

export default async function FestivalDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = await params
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <SiteHeader />
      <main id="main-content" className="flex-1 container-shell pt-28 pb-16">
        <FestivalExperience />
      </main>
      <SiteFooter />
    </div>
  )
}
