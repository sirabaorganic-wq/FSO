'use client'

import Image from 'next/image'
import { useState } from 'react'
import type { ProductImage } from '@/types/product'

interface ProductGalleryProps { images: ProductImage[]; name: string }

export function ProductGallery({ images, name }: ProductGalleryProps) {
  const [active, setActive] = useState(0)
  const current = images[active]

  return (
    <div className="grid gap-3 sm:grid-cols-[88px_1fr]">
      <div className="order-2 flex gap-3 overflow-x-auto sm:order-1 sm:flex-col">
        {images.map((image, index) => (
          <button key={image.src} type="button" aria-label={`View ${name} image ${index + 1}`} aria-pressed={active === index} onClick={() => setActive(index)} className={`relative size-20 shrink-0 overflow-hidden border bg-surface transition-[border-color,opacity] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${active === index ? 'border-primary' : 'border-border opacity-70 hover:opacity-100'}`}>
            <Image src={image.src} alt="" fill sizes="80px" className="object-cover" />
          </button>
        ))}
      </div>
      <div className="relative order-1 aspect-[4/5] overflow-hidden bg-surface-muted sm:order-2 sm:aspect-[4/5]">
        <Image src={current.src} alt={current.alt} fill priority sizes="(max-width: 640px) 100vw, 55vw" className="object-cover transition-opacity duration-300" />
      </div>
    </div>
  )
}
