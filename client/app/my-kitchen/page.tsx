import { SiteHeader } from '@/components/layout/site-header'
import { SiteFooter } from '@/components/layout/site-footer'
import { MyKitchenDashboard } from '@/components/experience/my-kitchen-dashboard'

export const metadata = { title: 'My Kitchen Dashboard' }

export default function MyKitchenPage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <SiteHeader />
      <main id="main-content" className="flex-1 container-shell pt-28 pb-16">
        <MyKitchenDashboard />
      </main>
      <SiteFooter />
    </div>
  )
}
