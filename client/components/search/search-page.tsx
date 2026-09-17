'use client'

import Link from 'next/link'
import { Search, X, Loader2 } from 'lucide-react'
import React, { useEffect, useState } from 'react'
import { ProductCard, CategoryCard, ProducerCard, ArticleCard } from '@/components/cards/discovery-cards'
import { SectionHeading } from '@/components/ui/section-heading'
import { BackButton } from '@/components/ui/back-button'
import { SiteFooter } from '@/components/layout/site-footer'
import { unifiedSearchApi } from '@/lib/api/search'
import { toDiscoveryProduct, toDiscoveryProducer } from '@/lib/api/mappers'
import type { DiscoveryProduct, DiscoveryProducer, DiscoveryCategory, DiscoveryArticle } from '@/types/discovery'

const popularSearches = ['saffron', 'nettle', 'tisane', 'Kashmir', 'Pahadi', 'honey']

interface SearchState {
  products: DiscoveryProduct[]
  producers: DiscoveryProducer[]
  categories: DiscoveryCategory[]
  articles: DiscoveryArticle[]
}

export function SearchPage({ initialQuery }: { initialQuery: string }) {
  const [query, setQuery] = useState(initialQuery)
  const [submittedQuery, setSubmittedQuery] = useState(initialQuery)
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<SearchState>({
    products: [],
    producers: [],
    categories: [],
    articles: [],
  })

  useEffect(() => {
    if (!submittedQuery.trim()) {
      setResults({ products: [], producers: [], categories: [], articles: [] })
      return
    }

    let isMounted = true
    setLoading(true)

    unifiedSearchApi(submittedQuery)
      .then((res) => {
        if (!isMounted) return
        const data = res.data?.results || {
          products: [],
          producers: [],
          articles: [],
          recipes: [],
          ingredients: [],
          collections: [],
        }

        const mappedProducts = (data.products || []).map(toDiscoveryProduct)
        const mappedProducers = (data.producers || []).map(toDiscoveryProducer)
        const mappedArticles: DiscoveryArticle[] = (data.articles || []).map((a) => ({
          slug: a.slug,
          title: a.title,
          category: a.category,
          excerpt: a.excerpt,
          image: a.image || '/images/pantry.jpg',
          readTime: a.readTime || '5 min read',
        }))

        // Derive categories matching search
        const uniqueCategories = Array.from(new Set(mappedProducts.map((p) => p.category))).map((catName) => ({
          slug: catName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
          name: catName,
          descriptor: 'Direct from heritage producers',
          story: `Artisan ${catName.toLowerCase()} sourced transparently across India.`,
          image: '/images/pantry.jpg',
          count: mappedProducts.filter((p) => p.category === catName).length,
          accent: 'forest' as const,
          subcategories: [],
        }))

        setResults({
          products: mappedProducts,
          producers: mappedProducers,
          categories: uniqueCategories,
          articles: mappedArticles,
        })
      })
      .catch((err) => {
        console.error('Search error:', err)
        if (isMounted) {
          setResults({ products: [], producers: [], categories: [], articles: [] })
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [submittedQuery])

  const submit = (value = query) => {
    setQuery(value)
    setSubmittedQuery(value)
    window.history.replaceState(null, '', value.trim() ? `/search?q=${encodeURIComponent(value.trim())}` : '/search')
  }

  const hasResults = Object.values(results).some((items) => items.length > 0)

  return (
    <>
      <main id="main-content" className="pt-20">
        <section className="border-b border-border bg-surface-muted">
          <div className="container-shell py-16 md:py-24">
            <div className="mb-6">
              <BackButton fallbackHref="/" label="Back to Discovery" variant="pill" />
            </div>
            <p className="eyebrow mb-5">Find your way in</p>
            <h1 className="display max-w-4xl text-6xl text-primary md:text-8xl">
              Search the pantry, the people, the wisdom.
            </h1>
            <form
              className="relative mt-10 max-w-3xl"
              role="search"
              onSubmit={(event) => {
                event.preventDefault()
                submit()
              }}
            >
              <label htmlFor="site-search" className="sr-only">
                Search FSO
              </label>
              <Search
                className="pointer-events-none absolute left-5 top-1/2 size-5 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <input
                id="site-search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Try saffron, nettle, tisane, or Kashmir"
                className="min-h-16 w-full border border-border bg-background py-4 pl-14 pr-28 text-base text-foreground outline-none transition-shadow placeholder:text-muted-foreground focus:ring-2 focus:ring-ring"
                autoComplete="off"
              />
              <button
                type="submit"
                className="absolute right-2 top-2 min-h-12 bg-primary px-5 text-xs font-bold uppercase tracking-[0.12em] text-primary-foreground hover:bg-secondary transition-colors"
              >
                Search
              </button>
            </form>
            <div className="mt-5 flex flex-wrap items-center gap-2">
              <span className="text-xs text-muted-foreground">Try</span>
              {popularSearches.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => submit(item)}
                  className="min-h-9 border border-border px-3 text-xs text-muted-foreground hover:border-secondary hover:text-secondary transition-colors"
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
        </section>
        <section className="section-shell">
          <div className="container-shell">
            {loading ? (
              <div className="py-24 flex items-center justify-center gap-3 text-muted-foreground">
                <Loader2 className="size-6 animate-spin" /> Searching the FSO registry...
              </div>
            ) : submittedQuery ? (
              <SearchResults query={submittedQuery} results={results} hasResults={hasResults} />
            ) : (
              <EmptySearch />
            )}
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  )
}

function SearchResults({
  query,
  results,
  hasResults,
}: {
  query: string
  results: SearchState
  hasResults: boolean
}) {
  if (!hasResults) {
    return (
      <div className="mx-auto flex max-w-xl flex-col items-center gap-5 py-16 text-center">
        <div className="grid size-16 place-items-center rounded-full bg-surface-muted text-secondary">
          <X aria-hidden="true" />
        </div>
        <p className="eyebrow">No exact match</p>
        <h2 className="font-serif text-5xl text-foreground">Nothing found for “{query}”</h2>
        <p className="text-sm leading-6 text-muted-foreground">
          Try searching for a broader ingredient, region, or craft method.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-16">
      <div className="flex flex-col gap-3 border-b border-border pb-6 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="eyebrow">Search results</p>
          <h2 className="mt-2 font-serif text-5xl text-foreground">Showing what we found for “{query}”</h2>
        </div>
        <Link href="/shop" className="text-xs font-bold uppercase tracking-[0.12em] text-secondary">
          Browse all <span aria-hidden="true">→</span>
        </Link>
      </div>
      {results.products.length > 0 && (
        <div>
          <SectionHeading eyebrow="Ingredients" title="From the pantry" />
          <div className="grid gap-x-5 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
            {results.products.map((product) => (
              <ProductCard key={product.slug} product={product} />
            ))}
          </div>
        </div>
      )}
      {results.categories.length > 0 && (
        <div>
          <SectionHeading eyebrow="Places to begin" title="Explore a category" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {results.categories.map((category) => (
              <CategoryCard key={category.slug} category={category} />
            ))}
          </div>
        </div>
      )}
      {results.producers.length > 0 && (
        <div>
          <SectionHeading eyebrow="The source" title="Meet the makers" />
          <div className="max-w-2xl">
            {results.producers.map((producer) => (
              <ProducerCard key={producer.slug} producer={producer} />
            ))}
          </div>
        </div>
      )}
      {results.articles.length > 0 && (
        <div>
          <SectionHeading eyebrow="Kitchen wisdom" title="Keep reading" />
          <div className="grid gap-8 md:grid-cols-3">
            {results.articles.map((article) => (
              <ArticleCard key={article.slug} article={article} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function EmptySearch() {
  return (
    <div className="grid gap-10 md:grid-cols-[0.8fr_1.2fr] md:items-start">
      <div>
        <p className="eyebrow">Start with a question</p>
        <h2 className="display mt-4 text-6xl text-primary md:text-7xl">The right ingredient is often a story away.</h2>
      </div>
      <div>
        <p className="max-w-xl text-lg leading-8 text-muted-foreground">
          Search by what you cook, where you are curious about, or the method you want to understand. FSO is designed to
          help you discover, not just find.
        </p>
      </div>
    </div>
  )
}
