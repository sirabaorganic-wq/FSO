import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import type { DiscoveryCollection, DiscoveryProduct, DiscoveryProducer, DiscoveryArticle } from '@/types/discovery'
import { ProductCard, ArticleCard, ProducerCard } from '@/components/cards/discovery-cards'
import { SectionHeading } from '@/components/ui/section-heading'
import { BackButton } from '@/components/ui/back-button'
import { SiteFooter } from '@/components/layout/site-footer'

interface CollectionPageProps {
  collection: DiscoveryCollection
  products?: DiscoveryProduct[]
  producers?: DiscoveryProducer[]
  articles?: DiscoveryArticle[]
}

export function CollectionPage({
  collection,
  products = [],
  producers = [],
  articles = [],
}: CollectionPageProps) {
  return (
    <>
      <main id="main-content" className="pt-20">
        <section className="bg-primary text-primary-foreground">
          <div className="container-shell grid min-h-[58vh] items-end gap-10 py-20 md:grid-cols-[1fr_0.8fr] md:py-28">
            <div>
              <div className="mb-10 flex flex-wrap items-center justify-between gap-4">
                <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] text-primary-foreground/60">
                  <Link href="/shop" className="hover:text-accent">Shop</Link>
                  <span aria-hidden="true">/</span>
                  <span>{collection.name}</span>
                </nav>
                <BackButton fallbackHref="/collections" label="Back to collections" variant="pill" className="text-xs border-primary-foreground/30 bg-primary-foreground/10 text-primary-foreground hover:bg-primary-foreground/20" />
              </div>
              <p className="eyebrow text-accent">{collection.eyebrow}</p>
              <h1 className="display mt-5 max-w-3xl text-6xl leading-[0.9] text-primary-foreground md:text-8xl">
                {collection.name}
              </h1>
            </div>
            <div className="border-l border-primary-foreground/20 pl-6 md:pl-10">
              <p className="font-serif text-3xl leading-tight text-primary-foreground/90">
                {collection.intro}
              </p>
              <p className="mt-5 text-sm text-primary-foreground/60">
                {collection.producer} · {collection.region}
              </p>
            </div>
          </div>
        </section>

        <section className="section-shell">
          <div className="container-shell">
            <SectionHeading
              eyebrow="The collection"
              title="A few things that belong together."
              copy="Chosen for their shared landscape, method or moment. Take your time with them."
            />
            <div className="grid gap-x-5 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
              {products.length > 0 ? (
                products.map((product) => <ProductCard key={product.slug} product={product} />)
              ) : (
                <div className="col-span-full py-8 text-center text-sm text-muted-foreground">
                  No products currently linked to this collection.
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="section-shell bg-surface-muted">
          <div className="container-shell grid gap-10 md:grid-cols-[0.8fr_1.2fr] md:items-start">
            <div>
              <p className="eyebrow">The context</p>
              <h2 className="display mt-4 text-6xl text-primary md:text-7xl">
                A collection is a conversation.
              </h2>
            </div>
            <div>
              <p className="max-w-2xl text-lg leading-8 text-muted-foreground">
                The best ingredients make more sense when you see the relationships between them: the region they share,
                the people who keep the method alive, or the ritual they quietly support.
              </p>
              <Link
                href="/kitchen-wisdom"
                className="mt-8 inline-flex items-center gap-3 text-xs font-bold uppercase tracking-[0.14em] text-secondary"
              >
                Learn about methods <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </section>

        {producers.length > 0 && (
          <section className="section-shell">
            <div className="container-shell">
              <SectionHeading eyebrow="From the source" title="Meet the people in this story." />
              <div className="max-w-2xl space-y-4">
                {producers.map((producer) => (
                  <ProducerCard key={producer.slug} producer={producer} />
                ))}
              </div>
            </div>
          </section>
        )}

        {articles.length > 0 && (
          <section className="section-shell bg-primary text-primary-foreground">
            <div className="container-shell">
              <SectionHeading eyebrow="Keep reading" title={collection.article || 'Stories from the land'} inverted />
              <div className="grid gap-8 md:grid-cols-3">
                {articles.map((article) => (
                  <ArticleCard key={article.slug} article={article} />
                ))}
              </div>
            </div>
          </section>
        )}
      </main>
      <SiteFooter />
    </>
  )
}
