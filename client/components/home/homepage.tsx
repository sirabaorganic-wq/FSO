import { HomeHero } from '@/components/home/home-hero'
import { CategoriesSection, MethodsSection, NewsletterSection, PartnerSection, ProducersSection, ProductsSection, StatesSection, StorySection, TrustIndicators, WisdomSection } from '@/components/home/home-sections'
import { SiteFooter } from '@/components/layout/site-footer'
import { SiteHeader } from '@/components/layout/site-header'

export function HomePage() {
  return (
    <>
      <SiteHeader />
      <main id="main-content">
        <HomeHero />
        <TrustIndicators />
        <CategoriesSection />
        <StorySection />
        <ProducersSection />
        <ProductsSection />
        <WisdomSection />
        <MethodsSection />
        <StatesSection />
        <PartnerSection />
        <NewsletterSection />
      </main>
      <SiteFooter />
    </>
  )
}
