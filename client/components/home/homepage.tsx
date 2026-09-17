import { HomeHero } from '@/components/home/home-hero'
import { CategoriesSection, MethodsSection, NewsletterSection, PartnerSection, ProducersSection, ProductsSection, StatesSection, StorySection, TrustIndicators, WisdomSection } from '@/components/home/home-sections'
import { SiteFooter } from '@/components/layout/site-footer'
import { SiteHeader } from '@/components/layout/site-header'
import type { BackendCategory, BackendProduct, BackendVendor, BackendArticle } from '@/lib/api/types'

interface HomePageProps {
  categories?: BackendCategory[]
  producers?: BackendVendor[]
  products?: BackendProduct[]
  articles?: BackendArticle[]
}

export function HomePage({
  categories = [],
  producers = [],
  products = [],
  articles = [],
}: HomePageProps = {}) {
  return (
    <>
      <SiteHeader />
      <main id="main-content">
        <HomeHero />
        <TrustIndicators />
        <CategoriesSection categories={categories} />
        <StorySection />
        <ProducersSection producers={producers} />
        <ProductsSection products={products} />
        <WisdomSection articles={articles} />
        <MethodsSection />
        <StatesSection />
        <PartnerSection />
        <NewsletterSection />
      </main>
      <SiteFooter />
    </>
  )
}
