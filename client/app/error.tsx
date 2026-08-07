'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { AlertTriangle, RotateCcw, Home } from 'lucide-react'

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Unhandled runtime error:', error)
  }, [error])

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center p-6 bg-background text-foreground">
      <div className="space-y-4 max-w-md rounded-2xl border border-rose-500/30 bg-rose-500/5 p-8">
        <div className="grid size-12 place-items-center rounded-full bg-rose-500/10 text-rose-600 mx-auto">
          <AlertTriangle className="size-6" />
        </div>
        <h1 className="font-serif text-2xl font-bold text-foreground">
          Something went wrong
        </h1>
        <p className="text-xs text-muted-foreground leading-relaxed">
          An unexpected system error occurred. Our engineering team has been notified.
        </p>
        <div className="pt-2 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={reset}
            className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground hover:bg-primary/90 transition-all shadow-xs"
          >
            <RotateCcw className="size-3.5" /> Try Again
          </button>
          <Link
            href="/"
            className="flex items-center gap-2 rounded-xl border border-border bg-surface px-4 py-2 text-xs font-bold text-foreground hover:bg-surface-muted transition-all"
          >
            <Home className="size-3.5" /> Home
          </Link>
        </div>
      </div>
    </div>
  )
}
