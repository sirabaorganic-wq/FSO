'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'

export interface BackButtonProps {
  fallbackHref?: string
  label?: string
  className?: string
  variant?: 'pill' | 'ghost' | 'inline' | 'subtle'
  iconOnly?: boolean
}

export function BackButton({
  fallbackHref = '/',
  label = 'Back',
  className = '',
  variant = 'ghost',
  iconOnly = false,
}: BackButtonProps) {
  const router = useRouter()

  const handleBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back()
    } else {
      router.push(fallbackHref)
    }
  }

  const baseStyles =
    'group inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer select-none'

  const variantStyles = {
    pill: 'rounded-full border border-border bg-surface/80 px-3.5 py-1.5 text-foreground/80 hover:border-foreground/30 hover:bg-surface-muted hover:text-foreground shadow-2xs backdrop-blur-xs',
    ghost:
      'rounded-lg px-2.5 py-1.5 text-muted-foreground hover:bg-surface-muted hover:text-foreground',
    inline:
      'text-muted-foreground hover:text-secondary p-0 underline-offset-4 hover:underline',
    subtle:
      'rounded-md border border-border/60 bg-background/60 px-3 py-1 text-muted-foreground hover:border-border hover:bg-background hover:text-foreground',
  }

  return (
    <button
      type="button"
      onClick={handleBack}
      className={`${baseStyles} ${variantStyles[variant]} ${className}`}
      aria-label={label}
      title={label}
    >
      <ArrowLeft
        className="size-3.5 shrink-0 transition-transform duration-200 group-hover:-translate-x-0.5"
        aria-hidden="true"
      />
      {!iconOnly && <span>{label}</span>}
    </button>
  )
}
