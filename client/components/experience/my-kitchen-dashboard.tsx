'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Bookmark, Award, Heart, ShoppingBag, BookOpen, Sparkles, CheckCircle2 } from 'lucide-react'
import { mockAchievements } from '@/data/achievements'
import { mockPantryItems } from '@/data/pantry'
import { mockRecommendations } from '@/data/recommendations'

export function MyKitchenDashboard() {
  const [activeTab, setActiveTab] = useState<'saved' | 'pantry' | 'achievements' | 'recent'>('saved')

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/60 pb-4">
        <div>
          <span className="eyebrow text-secondary">Personal Culinary Hub</span>
          <h1 className="font-serif text-3xl font-bold text-foreground">My Kitchen</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Your saved recipes, artisanal producers, custom healthy pantry checklist, and explorer achievements.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/pantry/planner"
            className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground hover:bg-primary/90 shadow-xs"
          >
            <span>Open Pantry Planner</span>
          </Link>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-border/60 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('saved')}
          className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
            activeTab === 'saved' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Saved Items (6)
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('pantry')}
          className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
            activeTab === 'pantry' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Active Pantry (6 Items)
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('achievements')}
          className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
            activeTab === 'achievements' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Gamification Badges (4 Unlocked)
        </button>
      </div>

      {/* Tab Panels */}
      {activeTab === 'saved' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
          <div className="rounded-xl border border-border bg-surface p-4 space-y-2">
            <span className="rounded bg-secondary/10 px-2 py-0.5 text-[10px] font-bold text-secondary">
              Saved Product
            </span>
            <h3 className="font-serif text-base font-bold text-foreground">Bundelkhand Bilona A2 Desi Ghee</h3>
            <p className="text-muted-foreground">Artisan: Govind Ram Kurmi • ₹1,850</p>
            <Link href="/shop" className="font-bold text-primary hover:underline block pt-1">View Product →</Link>
          </div>

          <div className="rounded-xl border border-border bg-surface p-4 space-y-2">
            <span className="rounded bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
              Saved Recipe
            </span>
            <h3 className="font-serif text-base font-bold text-foreground">Kumaoni Pahadi Aloo ke Gutke</h3>
            <p className="text-muted-foreground">Prep: 15 mins • Jakhiya Tempering</p>
            <Link href="/recipes" className="font-bold text-primary hover:underline block pt-1">View Recipe →</Link>
          </div>

          <div className="rounded-xl border border-border bg-surface p-4 space-y-2">
            <span className="rounded bg-accent/20 px-2 py-0.5 text-[10px] font-bold text-accent-foreground">
              Saved Producer
            </span>
            <h3 className="font-serif text-base font-bold text-foreground">Chettinad Stone Mill Oils</h3>
            <p className="text-muted-foreground">Master Lakshmi Narayanan • Karaikudi, TN</p>
            <Link href="/producers" className="font-bold text-primary hover:underline block pt-1">View Producer →</Link>
          </div>
        </div>
      )}

      {activeTab === 'achievements' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          {mockAchievements.map((ach) => (
            <div
              key={ach.id}
              className={`rounded-xl border p-4 space-y-2 ${
                ach.unlocked ? 'border-amber-500/30 bg-amber-500/5' : 'border-border bg-surface opacity-75'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-serif text-base font-bold text-foreground flex items-center gap-1.5">
                  <Award className="size-4 text-amber-500" /> {ach.title}
                </span>
                <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                  {ach.unlocked ? 'Unlocked' : 'In Progress'}
                </span>
              </div>
              <p className="text-muted-foreground leading-relaxed">{ach.description}</p>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'pantry' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          {mockPantryItems.map((p) => (
            <div key={p.id} className="rounded-xl border border-border bg-surface p-3.5 flex items-center justify-between">
              <div>
                <p className="font-bold text-foreground">{p.name}</p>
                <p className="text-[10px] text-muted-foreground">{p.category} • {p.recommendedQuantity}</p>
              </div>
              <CheckCircle2 className="size-4 text-emerald-600" />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
