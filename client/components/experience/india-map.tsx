'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { MapPin, ChevronRight, Sparkles, ArrowRight } from 'lucide-react'
import { mockIndianStates } from '@/data/states'
import { IndianState } from '@/types/experience'

export function IndiaMap() {
  const [selectedState, setSelectedState] = useState<IndianState>(mockIndianStates[0])

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto space-y-2">
        <span className="eyebrow text-secondary">Interactive Culinary Geography</span>
        <h1 className="font-serif text-3xl md:text-5xl font-bold text-foreground">
          Explore India’s Heritage Food Map
        </h1>
        <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">
          Hover over or tap any state to discover native heirloom ingredients, master artisanal producers, and ancestral cooking techniques.
        </p>
      </div>

      {/* Main Map & Detail Panel Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left / Top: Vector Interactive Map Canvas */}
        <div className="lg:col-span-7 rounded-2xl border border-border bg-surface p-6 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between border-b border-border/60 pb-3 mb-4 text-xs">
            <span className="font-semibold text-foreground flex items-center gap-1.5">
              <MapPin className="size-4 text-secondary" /> Select State or Region
            </span>
            {/* Mobile State Selector Dropdown */}
            <select
              value={selectedState.slug}
              onChange={(e) => {
                const found = mockIndianStates.find((s) => s.slug === e.target.value)
                if (found) setSelectedState(found)
              }}
              className="lg:hidden rounded-lg border border-border bg-background px-2.5 py-1 text-xs outline-none focus:border-ring font-medium"
            >
              {mockIndianStates.map((st) => (
                <option key={st.slug} value={st.slug}>
                  {st.name} ({st.region})
                </option>
              ))}
            </select>
          </div>

          {/* SVG Map Canvas */}
          <div className="relative aspect-[4/3] w-full bg-surface-muted/30 rounded-xl overflow-hidden border border-border/40 flex items-center justify-center">
            {/* Background SVG Outlines */}
            <svg viewBox="0 0 100 100" className="w-full h-full p-4">
              <path
                d="M 20 25 L 35 15 L 50 18 L 65 22 L 85 30 L 80 45 L 60 55 L 55 75 L 45 90 L 35 75 L 25 55 L 15 40 Z"
                fill="var(--surface)"
                stroke="var(--border)"
                strokeWidth="1.5"
                strokeDasharray="2 2"
              />

              {/* State Interactive Pins */}
              {mockIndianStates.map((st) => {
                const isSelected = selectedState.id === st.id
                return (
                  <g
                    key={st.id}
                    className="cursor-pointer group"
                    onClick={() => setSelectedState(st)}
                    onMouseEnter={() => setSelectedState(st)}
                  >
                    <circle
                      cx={st.mapCoordinates.x}
                      cy={st.mapCoordinates.y}
                      r={isSelected ? 6 : 4}
                      className={
                        isSelected
                          ? 'fill-secondary stroke-surface animate-pulse'
                          : 'fill-primary stroke-surface group-hover:fill-accent'
                      }
                      strokeWidth={isSelected ? 3 : 2}
                    />
                    <text
                      x={st.mapCoordinates.x}
                      y={st.mapCoordinates.y + 7}
                      textAnchor="middle"
                      className={`text-[5px] font-bold ${
                        isSelected ? 'fill-secondary font-black' : 'fill-foreground/80'
                      }`}
                    >
                      {st.name}
                    </text>
                  </g>
                )
              })}
            </svg>

            <div className="absolute bottom-3 left-3 bg-surface/90 backdrop-blur-xs px-3 py-1.5 rounded-lg border border-border text-[10px] text-muted-foreground font-semibold">
              Tap any location pin to inspect regional staples
            </div>
          </div>

          {/* State Quick Grid */}
          <div className="mt-4 flex flex-wrap gap-2">
            {mockIndianStates.map((st) => (
              <button
                key={st.id}
                type="button"
                onClick={() => setSelectedState(st)}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                  selectedState.id === st.id
                    ? 'bg-secondary text-secondary-foreground shadow-2xs'
                    : 'bg-background border border-border/80 text-foreground hover:bg-surface-muted'
                }`}
              >
                {st.name}
              </button>
            ))}
          </div>
        </div>

        {/* Right / Bottom: Selected State Detail Card */}
        <div className="lg:col-span-5 rounded-2xl border border-border bg-surface p-6 shadow-xs space-y-4">
          <div className="relative h-44 w-full rounded-xl overflow-hidden border border-border">
            <Image src={selectedState.heroImage} alt={selectedState.name} fill className="object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent p-4 flex flex-col justify-end">
              <span className="text-[10px] font-bold uppercase tracking-widest text-accent">
                {selectedState.region} India • Capital: {selectedState.capital}
              </span>
              <h2 className="font-serif text-2xl font-bold text-white">{selectedState.name}</h2>
            </div>
          </div>

          <div>
            <p className="text-xs font-bold text-secondary">{selectedState.tagline}</p>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{selectedState.description}</p>
          </div>

          <div className="space-y-3 border-t border-border/60 pt-3 text-xs">
            <div>
              <p className="font-semibold text-foreground mb-1">Staple Ingredients & Products</p>
              <div className="flex flex-wrap gap-1.5">
                {selectedState.stapleFoods.map((food) => (
                  <span key={food} className="rounded-md bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                    {food}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <p className="font-semibold text-foreground mb-1">Ancestral Preparation Methods</p>
              <ul className="list-disc list-inside space-y-0.5 text-muted-foreground text-[11px]">
                {selectedState.cookingMethods.map((m) => (
                  <li key={m}>{m}</li>
                ))}
              </ul>
            </div>
          </div>

          <div className="pt-2">
            <Link
              href={`/map/${selectedState.slug}`}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-xs font-bold text-primary-foreground hover:bg-primary/90 transition-all shadow-xs"
            >
              <span>Explore Full {selectedState.name} Heritage Experience</span>
              <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
