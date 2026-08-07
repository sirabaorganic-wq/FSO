import { SiteHeader } from '@/components/layout/site-header'
import { SiteFooter } from '@/components/layout/site-footer'
import { IngredientComparisonView } from '@/components/experience/ingredient-comparison'

export const metadata = { title: 'Ingredient Comparison Guide' }

export default function ComparePage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <SiteHeader />
      <main id="main-content" className="flex-1 container-shell pt-28 pb-16">
        <IngredientComparisonView />
      </main>
      <SiteFooter />
    </div>
  )
}
