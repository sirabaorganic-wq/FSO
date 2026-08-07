import Link from 'next/link'
import { Home, Search, ShoppingBag } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center text-center p-6 bg-background text-foreground">
      <div className="space-y-4 max-w-md">
        <span className="eyebrow text-secondary">404 Error</span>
        <h1 className="font-serif text-4xl sm:text-5xl font-bold text-foreground">
          Page Not Found
        </h1>
        <p className="text-sm text-muted-foreground leading-relaxed">
          The heritage recipe, producer page, or ingredient you are looking for might have been moved or does not exist.
        </p>
        <div className="pt-4 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-xs font-bold text-primary-foreground hover:bg-primary/90 transition-all shadow-xs"
          >
            <Home className="size-4" /> Back to Home
          </Link>
          <Link
            href="/shop"
            className="flex items-center gap-2 rounded-xl border border-border bg-surface px-5 py-2.5 text-xs font-bold text-foreground hover:bg-surface-muted transition-all"
          >
            <ShoppingBag className="size-4" /> Explore Shop
          </Link>
        </div>
      </div>
    </div>
  )
}
