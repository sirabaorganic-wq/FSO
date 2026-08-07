import Link from 'next/link'
import { WifiOff, RotateCcw } from 'lucide-react'

export const metadata = { title: 'Offline' }

export default function OfflinePage() {
  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center text-center p-6 bg-background text-foreground">
      <div className="space-y-4 max-w-md rounded-2xl border border-border bg-surface p-8 shadow-xl">
        <div className="grid size-14 place-items-center rounded-full bg-surface-muted text-secondary mx-auto">
          <WifiOff className="size-7" />
        </div>
        <h1 className="font-serif text-3xl font-bold text-foreground">
          You are currently offline
        </h1>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Please check your internet connection. FLASH SALES ONLINE will automatically reconnect once your network is restored.
        </p>
        <div className="pt-2 flex justify-center">
          <Link
            href="/"
            className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-xs font-bold text-primary-foreground hover:bg-primary/90 transition-all shadow-xs"
          >
            <RotateCcw className="size-4" /> Retry Connection
          </Link>
        </div>
      </div>
    </div>
  )
}
