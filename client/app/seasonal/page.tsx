import { SiteHeader } from '@/components/layout/site-header'
import { SiteFooter } from '@/components/layout/site-footer'
import { SeasonalCalendar } from '@/components/experience/seasonal-calendar'
import { BackButton } from '@/components/ui/back-button'

export const metadata = {
  title: 'Seasonal Food Calendar | Indian Ritu Chakra',
  description: 'Seasonal ingredient rotations and traditional Ayurvedic kitchen rhythms across 6 Indian seasons.',
}

export default function SeasonalPage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <SiteHeader />
      <main id="main-content" className="flex-1 container-shell pt-28 pb-16">
        <div className="mb-6">
          <BackButton fallbackHref="/" label="Back to Marketplace" variant="pill" />
        </div>
        <SeasonalCalendar />
      </main>
      <SiteFooter />
    </div>
  )
}
