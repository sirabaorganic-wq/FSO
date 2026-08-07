'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, Sparkles } from 'lucide-react'
import { mockHeroThemes } from '@/data/heroThemes'

export function RotatingHero() {
  const [activeThemeIndex, setActiveThemeIndex] = useState(0)
  const currentTheme = mockHeroThemes[activeThemeIndex]

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveThemeIndex((prevIndex) => (prevIndex + 1) % mockHeroThemes.length)
    }, 10000)
    return () => clearInterval(timer)
  }, [])

  return (
    <section
      id="top"
      className="relative w-full min-h-[85vh] lg:min-h-screen flex items-center justify-center overflow-hidden bg-black text-primary-foreground pt-20"
      aria-labelledby="hero-title"
    >
      {/* Background Image Container - Edge-to-Edge Edge Fill */}
      <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none">
        <Image
          key={currentTheme.id}
          src={currentTheme.image}
          alt={currentTheme.title}
          fill
          priority
          sizes="100vw"
          className="object-cover object-center w-full h-full scale-105 transition-all duration-1000"
        />
        <div className="absolute inset-0 w-full h-full bg-gradient-to-t from-black/95 via-black/60 to-black/40" aria-hidden="true" />
      </div>

      <div className="container-shell relative z-10 py-16 md:py-24 space-y-8 text-center flex flex-col items-center justify-center">
        {/* Seasonal Badge Pill */}
        <div className="inline-flex items-center gap-2 rounded-full border border-amber-300/40 bg-amber-900/50 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-amber-300 backdrop-blur-xs animate-in fade-in duration-300 shadow-md">
          <Sparkles className="size-3.5" />
          <span>INDIA&apos;S HERITAGE KITCHEN MARKETPLACE</span>
        </div>

        {/* Display Typography - Centralized & Fully Responsive */}
        <div className="space-y-4 max-w-4xl mx-auto flex flex-col items-center">
          <h1
            id="hero-title"
            className="font-serif text-4xl sm:text-6xl md:text-7xl lg:text-[7.5rem] font-bold leading-[0.95] tracking-tight text-white drop-shadow-md text-center transition-all duration-500"
          >
            {currentTheme.title}
          </h1>
          <p className="text-xs sm:text-sm md:text-base text-white/95 max-w-2xl leading-relaxed font-sans drop-shadow-xs text-center mx-auto transition-all duration-500">
            {currentTheme.subtitle}
          </p>
        </div>

        {/* Action Buttons - Centralized */}
        <div className="flex flex-wrap items-center justify-center gap-4 pt-2 mx-auto">
          <Link
            href={currentTheme.ctaHref}
            className="inline-flex min-h-12 items-center justify-center gap-3 rounded-xl bg-accent px-7 text-xs font-extrabold uppercase tracking-[0.16em] text-accent-foreground hover:bg-accent/90 transition-all shadow-md hover:-translate-y-0.5"
          >
            <span>{currentTheme.ctaText}</span>
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
          <Link
            href="/map"
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/40 bg-black/40 px-7 text-xs font-extrabold uppercase tracking-[0.16em] text-white hover:bg-black/60 backdrop-blur-xs transition-all shadow-sm"
          >
            Explore India Food Map
          </Link>
        </div>
      </div>
    </section>
  )
}
