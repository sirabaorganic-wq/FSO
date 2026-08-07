import { SiteHeader } from '@/components/layout/site-header'
import { SiteFooter } from '@/components/layout/site-footer'
import { CommunityKitchen } from '@/components/experience/community-kitchen'

export const metadata = { title: 'Community Stories' }

export default function CommunityStoriesPage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <SiteHeader />
      <main id="main-content" className="flex-1 container-shell pt-28 pb-16">
        <CommunityKitchen />
      </main>
      <SiteFooter />
    </div>
  )
}
