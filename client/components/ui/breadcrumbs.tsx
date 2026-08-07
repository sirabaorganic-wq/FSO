import React from 'react'
import Link from 'next/link'
import { ChevronRight, Home } from 'lucide-react'
import { BreadcrumbSchema } from '@/lib/seo'

export interface BreadcrumbItem {
  label: string
  href: string
}

export function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  const fullItems = [{ label: 'Home', href: '/' }, ...items]

  return (
    <>
      <BreadcrumbSchema items={fullItems.map((item) => ({ name: item.label, url: item.href }))} />
      <nav aria-label="Breadcrumb" className="flex items-center text-xs text-muted-foreground my-2">
        <ol className="flex items-center gap-1.5 flex-wrap">
          {fullItems.map((item, idx) => {
            const isLast = idx === fullItems.length - 1
            return (
              <li key={item.href} className="flex items-center gap-1.5">
                {idx > 0 && <ChevronRight className="size-3 text-muted-foreground/60" />}
                {isLast ? (
                  <span className="font-semibold text-foreground" aria-current="page">
                    {item.label}
                  </span>
                ) : (
                  <Link href={item.href} className="hover:text-foreground transition-colors">
                    {idx === 0 ? (
                      <span className="flex items-center gap-1">
                        <Home className="size-3" />
                        <span className="sr-only">Home</span>
                      </span>
                    ) : (
                      item.label
                    )}
                  </Link>
                )}
              </li>
            )
          })}
        </ol>
      </nav>
    </>
  )
}
