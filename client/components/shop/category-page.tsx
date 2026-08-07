import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import type { DiscoveryCategory } from '@/types/discovery'
import { getProductsByCategory, discoveryArticles, discoveryProducers } from '@/data/discovery'
import { ProductCard, ArticleCard, ProducerCard } from '@/components/cards/discovery-cards'
import { FilterControls, SortControl } from '@/components/discovery/controls'
import { SectionHeading } from '@/components/ui/section-heading'
import { SiteFooter } from '@/components/layout/site-footer'

export function CategoryPage({ category }: { category: DiscoveryCategory }) {
  const products = getProductsByCategory(category.name)
  return <>
    <main id="main-content" className="pt-20">
      <section className="border-b border-border bg-surface-muted"><div className="container-shell py-12 md:py-20"><nav aria-label="Breadcrumb" className="mb-10 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground"><Link href="/shop" className="hover:text-secondary">Shop</Link><span aria-hidden="true">/</span><span>{category.name}</span></nav><div className="grid gap-8 md:grid-cols-[1.2fr_0.8fr] md:items-end"><div><p className="eyebrow mb-4">{category.descriptor}</p><h1 className="display max-w-3xl text-6xl text-primary md:text-8xl">{category.name}</h1></div><p className="max-w-md text-sm leading-7 text-muted-foreground">{category.story}</p></div></div></section>
      <section className="section-shell"><div className="container-shell"><div className="mb-10 flex flex-col gap-5 border-b border-border pb-5 md:flex-row md:items-end md:justify-between"><div><p className="eyebrow">{products.length} ingredients</p><h2 className="mt-2 font-serif text-4xl text-foreground">Chosen for the everyday</h2></div><div className="flex items-center gap-5"><FilterControls groups={[{ label: 'Subcategory', options: category.subcategories }, { label: 'Region', options: ['Karnataka', 'Maharashtra', 'Meghalaya'] }, { label: 'Method', options: ['Stone-ground', 'Hand-pounded', 'Wood-pressed'] }]} /><SortControl /></div></div><div className="flex flex-col gap-14 lg:flex-row"><div className="flex-1"><div className="grid gap-x-5 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">{products.map((product) => <ProductCard key={product.slug} product={product} />)}</div></div><aside className="hidden w-64 shrink-0 border-l border-border pl-7 lg:block"><p className="eyebrow">Kitchen note</p><p className="mt-4 font-serif text-3xl leading-tight text-foreground">The best pantry is a conversation with place.</p><p className="mt-4 text-sm leading-6 text-muted-foreground">Begin with one ingredient you use often. Learn its season, its method and the hands behind it.</p><Link href="/search?q=processing" className="mt-6 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] text-secondary">Read the wisdom <ArrowRight className="size-4" aria-hidden="true" /></Link></aside></div></div></section>
      <section className="section-shell bg-primary text-primary-foreground"><div className="container-shell"><SectionHeading eyebrow="Related wisdom" title="Know what you cook with." inverted action="Explore kitchen wisdom" actionHref="/search?q=kitchen" /><div className="grid gap-8 md:grid-cols-3">{discoveryArticles.map((article) => <ArticleCard key={article.slug} article={article} />)}</div></div></section>
      <section className="section-shell"><div className="container-shell"><SectionHeading eyebrow="Meet a maker" title="Every ingredient has a person behind it." /><div className="max-w-2xl">{discoveryProducers.map((producer) => <ProducerCard key={producer.slug} producer={producer} />)}</div></div></section>
    </main><SiteFooter />
  </>
}
