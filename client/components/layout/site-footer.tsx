'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Sun, Moon, Laptop, ShieldCheck } from 'lucide-react'
import { logoUrl } from '@/data/images'
import { useTheme } from '@/lib/theme'

export function SiteFooter() {
  const { theme, setTheme } = useTheme()

  return (
    <footer className="bg-primary py-12 text-primary-foreground border-t border-primary-foreground/10" aria-label="Site footer">
      <div className="container-shell space-y-10">
        <div className="grid gap-10 md:grid-cols-[1.5fr_1fr_1fr_1fr]">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="relative size-10 rounded-lg overflow-hidden border border-primary-foreground/20 bg-background/90 p-0.5 shadow-sm">
                <Image src={logoUrl} alt="Flash Sales Online Logo" fill className="object-contain" priority />
              </div>
              <span className="font-serif text-2xl font-bold tracking-tight text-primary-foreground">
                FLASH SALES ONLINE
              </span>
            </div>
            <p className="max-w-xs text-xs leading-relaxed text-primary-foreground/75">
              India&apos;s Heritage Kitchen Marketplace. Connecting small-batch artisanal producers directly with everyday kitchens.
            </p>
          </div>

          <FooterColumn
            title="Explore Shop"
            links={[
              ['Everyday Pantry', '/shop'],
              ['Cold Pressed Oils', '/shop?category=cold-pressed-oils'],
              ['Vedic Desi Ghee', '/shop?category=vedic-ghee'],
              ['Artisanal Producers', '/producers'],
            ]}
          />

          <FooterColumn
            title="Kitchen Wisdom"
            links={[
              ['Food Science Articles', '/kitchen-wisdom/articles'],
              ['Heirloom Recipes', '/recipes'],
              ['Ingredient Encyclopedia', '/ingredients'],
              ['Heritage Wisdom', '/kitchen-wisdom'],
            ]}
          />

          <div className="space-y-3">
            <p className="eyebrow text-accent">Portals & Theme</p>
            <nav className="flex flex-col gap-2.5 text-xs text-primary-foreground/75" aria-label="Portals & Settings">
              <Link href="/admin" className="hover:text-accent font-semibold flex items-center gap-1.5">
                <ShieldCheck className="size-3.5 text-accent" /> Admin Control Center
              </Link>
              <Link href="/seller" className="hover:text-accent font-semibold">
                Producer Portal
              </Link>
            </nav>

            <div className="pt-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-primary-foreground/60 mb-1.5">
                Appearance Theme
              </p>
              <div className="inline-flex rounded-lg border border-primary-foreground/20 bg-primary-foreground/10 p-0.5">
                <button
                  type="button"
                  onClick={() => setTheme('light')}
                  title="Switch to Light mode"
                  aria-label="Light mode"
                  className={`p-1.5 rounded-md text-xs font-semibold transition-colors ${
                    theme === 'light' ? 'bg-primary-foreground text-primary shadow-xs' : 'text-primary-foreground/70 hover:text-primary-foreground'
                  }`}
                >
                  <Sun className="size-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setTheme('dark')}
                  title="Switch to Dark mode"
                  aria-label="Dark mode"
                  className={`p-1.5 rounded-md text-xs font-semibold transition-colors ${
                    theme === 'dark' ? 'bg-primary-foreground text-primary shadow-xs' : 'text-primary-foreground/70 hover:text-primary-foreground'
                  }`}
                >
                  <Moon className="size-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setTheme('system')}
                  title="Switch to System mode"
                  aria-label="System mode"
                  className={`p-1.5 rounded-md text-xs font-semibold transition-colors ${
                    theme === 'system' ? 'bg-primary-foreground text-primary shadow-xs' : 'text-primary-foreground/70 hover:text-primary-foreground'
                  }`}
                >
                  <Laptop className="size-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-primary-foreground/20 pt-6 text-xs text-primary-foreground/60 md:flex-row md:justify-between items-center">
          <span>© 2026 FLASH SALES ONLINE. All rights reserved.</span>
          <span>Traceable • Artisanal • Chemical-Free Food</span>
        </div>
      </div>
    </footer>
  )
}

function FooterColumn({ title, links }: { title: string; links: readonly [string, string][] }) {
  return (
    <div>
      <p className="eyebrow text-accent mb-3">{title}</p>
      <nav className="flex flex-col gap-2.5 text-xs text-primary-foreground/75" aria-label={`${title} navigation`}>
        {links.map(([label, href]) => (
          <Link key={label} href={href} className="hover:text-accent transition-colors">
            {label}
          </Link>
        ))}
      </nav>
    </div>
  )
}
