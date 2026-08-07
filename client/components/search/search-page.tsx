'use client'

import Link from 'next/link'
import { Search, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { discoveryCategories, discoveryProducts, discoveryArticles, searchDiscovery } from '@/data/discovery'
import { ProductCard, CategoryCard, ProducerCard, ArticleCard } from '@/components/cards/discovery-cards'
import { SectionHeading } from '@/components/ui/section-heading'
import { SiteFooter } from '@/components/layout/site-footer'

const popularSearches = ['millets', 'cold-pressed', 'Karnataka', 'kitchen wisdom']

export function SearchPage({ initialQuery }: { initialQuery: string }) {
  const [query, setQuery] = useState(initialQuery)
  const [submittedQuery, setSubmittedQuery] = useState(initialQuery)
  const results = useMemo(() => searchDiscovery(submittedQuery), [submittedQuery])
  const suggestions = useMemo(() => {
    if (!query.trim()) return []
    const value = query.toLowerCase()
    return [...discoveryProducts.map((item) => item.name), ...discoveryCategories.map((item) => item.name)].filter((item) => item.toLowerCase().includes(value)).slice(0, 5)
  }, [query])
  const hasResults = Object.values(results).some((items) => items.length > 0)
  const submit = (value = query) => {
    setQuery(value)
    setSubmittedQuery(value)
    window.history.replaceState(null, '', value.trim() ? `/search?q=${encodeURIComponent(value.trim())}` : '/search')
  }

  return <>
    <main id="main-content" className="pt-20">
      <section className="border-b border-border bg-surface-muted"><div className="container-shell py-16 md:py-24"><p className="eyebrow mb-5">Find your way in</p><h1 className="display max-w-4xl text-6xl text-primary md:text-8xl">Search the pantry, the people, the wisdom.</h1><form className="relative mt-10 max-w-3xl" role="search" onSubmit={(event) => { event.preventDefault(); submit() }}><label htmlFor="site-search" className="sr-only">Search FSO</label><Search className="pointer-events-none absolute left-5 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" /><input id="site-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Try turmeric, millet, or Karnataka" className="min-h-16 w-full border border-border bg-background py-4 pl-14 pr-28 text-base text-foreground outline-none transition-shadow placeholder:text-muted-foreground focus:ring-2 focus:ring-ring" autoComplete="off" /><button type="submit" className="absolute right-2 top-2 min-h-12 bg-primary px-5 text-xs font-bold uppercase tracking-[0.12em] text-primary-foreground hover:bg-secondary">Search</button>{suggestions.length > 0 ? <ul className="absolute inset-x-0 top-[4.5rem] z-10 border border-border bg-background p-2 shadow-[var(--shadow-soft)]" role="listbox" aria-label="Search suggestions">{suggestions.map((suggestion) => <li key={suggestion}><button type="button" role="option" aria-selected="false" className="flex min-h-11 w-full items-center px-3 text-left text-sm text-foreground hover:bg-surface-muted" onClick={() => submit(suggestion)}>{suggestion}</button></li>)}</ul> : null}</form><div className="mt-5 flex flex-wrap items-center gap-2"><span className="text-xs text-muted-foreground">Try</span>{popularSearches.map((item) => <button key={item} type="button" onClick={() => submit(item)} className="min-h-9 border border-border px-3 text-xs text-muted-foreground hover:border-secondary hover:text-secondary">{item}</button>)}</div></div></section>
      <section className="section-shell"><div className="container-shell">{submittedQuery ? <SearchResults query={submittedQuery} results={results} hasResults={hasResults} /> : <EmptySearch />}</div></section>
    </main><SiteFooter />
  </>
}

function SearchResults({ query, results, hasResults }: { query: string; results: ReturnType<typeof searchDiscovery>; hasResults: boolean }) {
  if (!hasResults) return <div className="mx-auto flex max-w-xl flex-col items-center gap-5 py-16 text-center"><div className="grid size-16 place-items-center rounded-full bg-surface-muted text-secondary"><X aria-hidden="true" /></div><p className="eyebrow">No exact match</p><h2 className="font-serif text-5xl text-foreground">Nothing found for “{query}”</h2><p className="text-sm leading-6 text-muted-foreground">Try a broader ingredient, region, or method. The pantry is full of paths in.</p></div>
  return <div className="flex flex-col gap-16"><div className="flex flex-col gap-3 border-b border-border pb-6 md:flex-row md:items-end md:justify-between"><div><p className="eyebrow">Search results</p><h2 className="mt-2 font-serif text-5xl text-foreground">Showing what we found for “{query}”</h2></div><Link href="/shop" className="text-xs font-bold uppercase tracking-[0.12em] text-secondary">Browse all <span aria-hidden="true">→</span></Link></div>{results.products.length > 0 ? <div><SectionHeading eyebrow="Ingredients" title="From the pantry" /><div className="grid gap-x-5 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">{results.products.map((product) => <ProductCard key={product.slug} product={product} />)}</div></div> : null}{results.categories.length > 0 ? <div><SectionHeading eyebrow="Places to begin" title="Explore a category" /><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{results.categories.map((category) => <CategoryCard key={category.slug} category={category} />)}</div></div> : null}{results.producers.length > 0 ? <div><SectionHeading eyebrow="The source" title="Meet the makers" /><div className="max-w-2xl">{results.producers.map((producer) => <ProducerCard key={producer.slug} producer={producer} />)}</div></div> : null}{results.articles.length > 0 ? <div><SectionHeading eyebrow="Kitchen wisdom" title="Keep reading" /><div className="grid gap-8 md:grid-cols-3">{results.articles.map((article) => <ArticleCard key={article.slug} article={article} />)}</div></div> : null}</div>
}

function EmptySearch() { return <div className="grid gap-10 md:grid-cols-[0.8fr_1.2fr] md:items-start"><div><p className="eyebrow">Start with a question</p><h2 className="display mt-4 text-6xl text-primary md:text-7xl">The right ingredient is often a story away.</h2></div><div><p className="max-w-xl text-lg leading-8 text-muted-foreground">Search by what you cook, where you are curious about, or the method you want to understand. FSO is designed to help you discover, not just find.</p><div className="mt-10 grid gap-4 sm:grid-cols-2">{discoveryArticles.slice(0, 2).map((article) => <ArticleCard key={article.slug} article={article} />)}</div></div></div> }
