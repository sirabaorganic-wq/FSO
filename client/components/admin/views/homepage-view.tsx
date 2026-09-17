'use client'

import { useState } from 'react'
import { Home, ArrowUp, ArrowDown, Eye, EyeOff, Edit, Save, CheckCircle2 } from 'lucide-react'
import { CMSHomepageSection } from '@/types/admin'

const DEFAULT_HOMEPAGE_SECTIONS: CMSHomepageSection[] = [
  {
    id: 'sec-1',
    type: 'hero',
    title: 'India’s Heritage Kitchen Marketplace',
    subtitle: 'Direct from small-batch artisanal producers, stone mills, and Vedic dairies.',
    enabled: true,
    sortOrder: 1,
    config: {
      ctaText: 'Explore Everyday Staples',
      ctaUrl: '/shop',
      secondaryCtaText: 'Our Producer Philosophy',
      secondaryCtaUrl: '/producers',
      badgeText: '100% Traceable Ingredients',
    },
  },
  {
    id: 'sec-2',
    type: 'featured_categories',
    title: 'Shop by Heritage Process',
    subtitle: 'Every ingredient is categorized by traditional preparation method.',
    enabled: true,
    sortOrder: 2,
    config: {
      categories: ['vedic-ghee', 'cold-pressed-oils', 'wild-honey', 'himalayan-spices', 'heirloom-grains'],
    },
  },
  {
    id: 'sec-3',
    type: 'producer_story',
    title: 'Meet the Hands Behind the Food',
    subtitle: 'Discover how Govind Ram Kurmi preserves Sahiwal cow Bilona ghee in Bundelkhand.',
    enabled: true,
    sortOrder: 3,
    config: {
      producerId: 'prod-301',
      featuredVideoUrl: '',
    },
  },
  {
    id: 'sec-4',
    type: 'recipes_grid',
    title: 'Recipes from Regional Kitchens',
    subtitle: 'Authentic heirloom recipes curated with original village techniques.',
    enabled: true,
    sortOrder: 4,
    config: {
      recipeIds: [],
    },
  },
]

export function HomepageView() {
  const [sections, setSections] = useState<CMSHomepageSection[]>(DEFAULT_HOMEPAGE_SECTIONS)
  const [activeSection, setActiveSection] = useState<CMSHomepageSection | null>(sections[0])
  const [savedNotice, setSavedNotice] = useState(false)

  const toggleSection = (id: string) => {
    setSections(sections.map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : s)))
  }

  const moveSection = (index: number, direction: 'up' | 'down') => {
    const newSections = [...sections]
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= newSections.length) return
    const temp = newSections[index]
    newSections[index] = newSections[targetIndex]
    newSections[targetIndex] = temp
    setSections(newSections)
  }

  const handleSaveConfig = () => {
    setSavedNotice(true)
    setTimeout(() => setSavedNotice(false), 2500)
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="eyebrow">Visual Page Builder</span>
          <h2 className="font-serif text-2xl font-bold text-foreground">Homepage CMS Block Editor</h2>
          <span className="inline-block mt-1 rounded bg-surface-muted border border-border px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
            STATIC CONFIG / CMS DESIGNER
          </span>
        </div>
        <div className="flex items-center gap-3">
          {savedNotice && (
            <span className="flex items-center gap-1 text-xs font-bold text-emerald-600 animate-in fade-in">
              <CheckCircle2 className="size-4" /> Layout saved in session!
            </span>
          )}
          <button
            type="button"
            onClick={handleSaveConfig}
            className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground hover:bg-primary/90 transition-all shadow-xs"
          >
            <Save className="size-4" /> Save Homepage Layout
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Reorderable Block List */}
        <div className="lg:col-span-1 rounded-xl border border-border bg-surface p-4 shadow-xs space-y-3">
          <h3 className="font-serif text-lg font-bold text-foreground border-b border-border/60 pb-2">
            Page Blocks Structure
          </h3>
          <div className="space-y-2">
            {sections.map((sec, idx) => (
              <div
                key={sec.id}
                onClick={() => setActiveSection(sec)}
                className={`flex items-center justify-between rounded-lg border p-3 cursor-pointer text-xs transition-all ${
                  activeSection?.id === sec.id
                    ? 'border-primary bg-primary/5 font-semibold text-foreground'
                    : 'border-border/80 bg-background/60 text-muted-foreground hover:bg-surface-muted'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className="font-mono text-[10px] font-bold text-muted-foreground">#{idx + 1}</span>
                  <div>
                    <p className="font-bold text-foreground">{sec.title}</p>
                    <p className="text-[10px] text-muted-foreground capitalize">Block Type: {sec.type}</p>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      moveSection(idx, 'up')
                    }}
                    disabled={idx === 0}
                    className="p-1 rounded hover:bg-surface-muted disabled:opacity-30"
                  >
                    <ArrowUp className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      moveSection(idx, 'down')
                    }}
                    disabled={idx === sections.length - 1}
                    className="p-1 rounded hover:bg-surface-muted disabled:opacity-30"
                  >
                    <ArrowDown className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleSection(sec.id)
                    }}
                    className={`p-1 rounded ${sec.enabled ? 'text-emerald-600' : 'text-rose-500'}`}
                  >
                    {sec.enabled ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Selected Block Inspector & Editor */}
        <div className="lg:col-span-2 rounded-xl border border-border bg-surface p-5 shadow-xs space-y-4">
          {activeSection ? (
            <div className="space-y-4 text-xs">
              <div className="border-b border-border/60 pb-3">
                <span className="eyebrow">Inspector Block #{sections.findIndex((s) => s.id === activeSection.id) + 1}</span>
                <h3 className="font-serif text-xl font-bold text-foreground">{activeSection.title}</h3>
                <p className="text-muted-foreground text-[11px]">Type: {activeSection.type}</p>
              </div>

              <div>
                <label className="block font-semibold mb-1">Section Title</label>
                <input
                  type="text"
                  value={activeSection.title}
                  onChange={(e) => {
                    const updated = { ...activeSection, title: e.target.value }
                    setActiveSection(updated)
                    setSections(sections.map((s) => (s.id === updated.id ? updated : s)))
                  }}
                  className="w-full rounded-lg border border-border p-2.5 outline-none focus:border-ring font-medium text-foreground"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Section Subtitle / Tagline</label>
                <textarea
                  rows={2}
                  value={activeSection.subtitle || ''}
                  onChange={(e) => {
                    const updated = { ...activeSection, subtitle: e.target.value }
                    setActiveSection(updated)
                    setSections(sections.map((s) => (s.id === updated.id ? updated : s)))
                  }}
                  className="w-full rounded-lg border border-border p-2.5 outline-none focus:border-ring font-medium text-foreground"
                />
              </div>

              {activeSection.type === 'hero' && (
                <div className="rounded-lg border border-border p-4 bg-surface-muted/30 space-y-3">
                  <h4 className="font-serif font-bold text-sm text-foreground">Hero CTA Configuration</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold mb-1">Primary Button Text</label>
                      <input
                        type="text"
                        defaultValue={(activeSection.config.ctaText as string) || 'Explore Everyday Staples'}
                        className="w-full rounded-lg border border-border p-2 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold mb-1">Primary Target Link</label>
                      <input
                        type="text"
                        defaultValue={(activeSection.config.ctaUrl as string) || '/shop'}
                        className="w-full rounded-lg border border-border p-2 outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between border-t border-border/60 pt-4">
                <span className="text-[11px] font-semibold text-muted-foreground">
                  Status: {activeSection.enabled ? 'Visible on Storefront' : 'Hidden Block'}
                </span>
                <button
                  type="button"
                  onClick={handleSaveConfig}
                  className="rounded-lg bg-primary px-4 py-2 font-bold text-primary-foreground hover:bg-primary/90"
                >
                  Save Section Config
                </button>
              </div>
            </div>
          ) : (
            <div className="py-12 text-center text-muted-foreground text-xs">
              Select a block from the left structure list to configure properties.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
