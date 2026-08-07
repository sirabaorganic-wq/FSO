'use client'

import { useState } from 'react'
import { Check, ChevronDown, SlidersHorizontal, X } from 'lucide-react'
import type { FilterGroup } from '@/types/discovery'

export function FilterControls({ groups }: { groups: FilterGroup[] }) {
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<string[]>([])
  const toggle = (option: string) => setSelected((current) => current.includes(option) ? current.filter((item) => item !== option) : [...current, option])
  return <>
    <aside className="hidden w-56 shrink-0 lg:block"><FilterFields groups={groups} selected={selected} onToggle={toggle} /></aside>
    <div className="lg:hidden"><button type="button" className="flex min-h-11 items-center gap-2 border border-border px-4 text-xs font-bold uppercase tracking-[0.12em]" onClick={() => setOpen(true)}><SlidersHorizontal aria-hidden="true" /> Filter {selected.length > 0 ? `(${selected.length})` : ''}</button>{open ? <div className="fixed inset-0 z-50 bg-background p-6" role="dialog" aria-modal="true" aria-label="Filter products"><div className="mx-auto flex max-w-md flex-col gap-8"><div className="flex items-center justify-between border-b border-border pb-5"><h2 className="font-serif text-3xl">Filter by</h2><button type="button" className="grid size-11 place-items-center" aria-label="Close filters" onClick={() => setOpen(false)}><X aria-hidden="true" /></button></div><FilterFields groups={groups} selected={selected} onToggle={toggle} /><button type="button" className="min-h-12 bg-primary px-5 text-xs font-bold uppercase tracking-[0.12em] text-primary-foreground" onClick={() => setOpen(false)}>View ingredients</button></div></div> : null}</div>
  </>
}

function FilterFields({ groups, selected, onToggle }: { groups: FilterGroup[]; selected: string[]; onToggle: (option: string) => void }) {
  return <div className="flex flex-col gap-7">{groups.map((group) => <fieldset key={group.label} className="flex flex-col gap-3"><legend className="text-xs font-bold uppercase tracking-[0.12em] text-foreground">{group.label}</legend>{group.options.map((option) => <label key={option} className="flex min-h-10 cursor-pointer items-center gap-3 text-sm text-muted-foreground"><span className={`grid size-4 place-items-center border ${selected.includes(option) ? 'border-primary bg-primary text-primary-foreground' : 'border-border'}`}><Check className={selected.includes(option) ? 'size-3' : 'hidden'} aria-hidden="true" /></span><input type="checkbox" className="sr-only" checked={selected.includes(option)} onChange={() => onToggle(option)} />{option}</label>)}</fieldset>)}</div>
}

export function SortControl() {
  return <label className="flex min-h-11 items-center gap-2 border-b border-border text-xs font-bold uppercase tracking-[0.12em] text-foreground">Sort by<select className="bg-transparent py-2 text-xs font-bold outline-none" defaultValue="featured" aria-label="Sort products"><option value="featured">Featured</option><option value="newest">Newest</option><option value="rating">Top rated</option></select><ChevronDown className="size-3" aria-hidden="true" /></label>
}
