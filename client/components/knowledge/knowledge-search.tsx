'use client'

import Link from 'next/link'
import { Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { articles, ingredients, producers, recipes } from '@/data/knowledge'

export function KnowledgeSearch() {
  const [query, setQuery] = useState('')
  const results = useMemo(() => { const q = query.trim().toLowerCase(); if (!q) return []; return [...producers.map((item) => ({ label: item.name, type: 'Producer', href: `/producers/${item.slug}` })), ...articles.map((item) => ({ label: item.title, type: 'Article', href: `/kitchen-wisdom/articles/${item.slug}` })), ...recipes.map((item) => ({ label: item.title, type: 'Recipe', href: `/recipes/${item.slug}` })), ...ingredients.map((item) => ({ label: item.name, type: 'Ingredient', href: `/ingredients/${item.slug}` }))].filter((item) => item.label.toLowerCase().includes(q)).slice(0, 6) }, [query])
  return <div className="relative"><label className="sr-only" htmlFor="knowledge-search">Search producers, articles, recipes and ingredients</label><div className="flex min-h-12 items-center border border-border bg-background px-4"><Search aria-hidden="true" className="mr-3 size-4 text-secondary" /><input id="knowledge-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search producers, articles, recipes or ingredients" className="min-w-0 flex-1 bg-transparent text-sm outline-none" /></div>{results.length > 0 ? <div className="absolute inset-x-0 top-full z-10 border border-t-0 border-border bg-surface shadow-[var(--shadow-soft)]" role="listbox">{results.map((result) => <Link key={result.href} href={result.href} className="flex items-center justify-between border-b border-border px-4 py-3 text-sm last:border-b-0 hover:bg-surface-muted"><span>{result.label}</span><span className="text-[0.65rem] uppercase tracking-wider text-secondary">{result.type}</span></Link>)}</div> : null}</div>
}
