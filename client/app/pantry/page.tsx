import { SiteHeader } from '@/components/layout/site-header'
import { SiteFooter } from '@/components/layout/site-footer'
import { PantryPlanner } from '@/components/experience/pantry-planner'

export const metadata = { title: 'Healthy Pantry Planner' }

export default function PantryPage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <SiteHeader />
      <main id="main-content" className="flex-1 container-shell pt-28 pb-16">
        <PantryPlanner />
      </main>
      <SiteFooter />
    </div>
  )
}
