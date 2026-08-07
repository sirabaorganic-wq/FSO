import { SiteHeader } from '@/components/layout/site-header'
import { SiteFooter } from '@/components/layout/site-footer'
import { IndiaMap } from '@/components/experience/india-map'

export const metadata = {
  title: 'Interactive India Food Map | Heritage Kitchen Geography',
  description: 'Explore traditional ingredients, artisanal producers, and recipes across India’s 28 states.',
}

export default function MapPage() {
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
