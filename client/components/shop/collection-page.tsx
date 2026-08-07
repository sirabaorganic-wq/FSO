import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import type { DiscoveryCollection } from '@/types/discovery'
import { getProductsBySlugs, discoveryArticles, discoveryProducers } from '@/data/discovery'
import { ProductCard, ArticleCard, ProducerCard } from '@/components/cards/discovery-cards'
import { SectionHeading } from '@/components/ui/section-heading'
import { SiteFooter } from '@/components/layout/site-footer'

export function CollectionPage({ collection }: { collection: DiscoveryCollection }) {
  const products = getProductsBySlugs(collection.productSlugs)
  return <>
    <main id="main-content" className="pt-20">
      <section className="bg-primary text-primary-foreground"><div className="container-shell grid min-h-[58vh] items-end gap-10 py-20 md:grid-cols-[1fr_0.8fr] md:py-28"><div><nav aria-label="Breadcrumb" className="mb-10 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] text-primary-foreground/60"><Link href="/shop" className="hover:text-accent">Shop</Link><span aria-hidden="true">/</span><span>{collection.name}</span></nav><p className="eyebrow text-accent">{collection.eyebrow}</p><h1 className="display mt-5 max-w-3xl text-6xl leading-[0.9] text-primary-foreground md:text-8xl">{collection.name}</h1></div><div className="border-l border-primary-foreground/20 pl-6 md:pl-10"><p className="font-serif text-3xl leading-tight text-primary-foreground/90">{collection.intro}</p><p className="mt-5 text-sm text-primary-foreground/60">{collection.producer} · {collection.region}</p></div></div></section>
      <section className="section-shell"><div className="container-shell"><SectionHeading eyebrow="The collection" title="A few things that belong together." copy="Chosen for their shared landscape, method or moment. Take your time with them." /><div className="grid gap-x-5 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">{products.map((product) => <ProductCard key={product.slug} product={product} />)}</div></div></section>
      <section className="section-shell bg-surface-muted"><div className="container-shell grid gap-10 md:grid-cols-[0.8fr_1.2fr] md:items-start"><div><p className="eyebrow">The context</p><h2 className="display mt-4 text-6xl text-primary md:text-7xl">A collection is a conversation.</h2></div><div><p className="max-w-2xl text-lg leading-8 text-muted-foreground">The best ingredients make more sense when you see the relationships between them: the region they share, the people who keep the method alive, or the ritual they quietly support.</p><Link href="/search?q=processing" className="mt-8 inline-flex items-center gap-3 text-xs font-bold uppercase tracking-[0.14em] text-secondary">Learn about methods <ArrowRight className="size-4" aria-hidden="true" /></Link></div></div></section>
      <section className="section-shell"><div className="container-shell"><SectionHeading eyebrow="From the source" title="Meet the people in this story." /><div className="max-w-2xl">{discoveryProducers.map((producer) => <ProducerCard key={producer.slug} producer={producer} />)}</div></div></section>
      <section className="section-shell bg-primary text-primary-foreground"><div className="container-shell"><SectionHeading eyebrow="Keep reading" title={collection.article} inverted /><div className="grid gap-8 md:grid-cols-3">{discoveryArticles.map((article) => <ArticleCard key={article.slug} article={article} />)}</div></div></section>
    </main><SiteFooter />
  </>
}
