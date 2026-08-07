import { SiteHeader } from '@/components/layout/site-header'
import { SiteFooter } from '@/components/layout/site-footer'
import { FestivalExperience } from '@/components/experience/festival-experience'

export const metadata = { title: 'Festivals of India' }

export default function FestivalsPage() {
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
