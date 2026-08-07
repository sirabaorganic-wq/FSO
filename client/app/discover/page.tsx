import { SiteHeader } from '@/components/layout/site-header'
import { SiteFooter } from '@/components/layout/site-footer'
import { AIDiscovery } from '@/components/experience/ai-discovery'

export const metadata = { title: 'AI Ingredient Discovery' }

export default function DiscoverPage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <SiteHeader />
      <main id="main-content" className="flex-1 container-shell pt-28 pb-16">
        <AIDiscovery />
      </main>
      <SiteFooter />
    </div>
  )
}
