import { SiteHeader } from '@/components/layout/site-header'
import { SiteFooter } from '@/components/layout/site-footer'
import { CommunityKitchen } from '@/components/experience/community-kitchen'
import { BackButton } from '@/components/ui/back-button'

export const metadata = { title: 'Community Kitchen' }

export default function CommunityPage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <SiteHeader />
      <main id="main-content" className="flex-1 container-shell pt-28 pb-16">
        <div className="mb-6">
          <BackButton fallbackHref="/" label="Back to Marketplace" variant="pill" />
        </div>
        <CommunityKitchen />
      </main>
      <SiteFooter />
    </div>
  )
}
