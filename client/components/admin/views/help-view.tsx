'use client'

import { HelpCircle, BookOpen, Command, ShieldCheck, CheckCircle2 } from 'lucide-react'

export function HelpView() {
  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="eyebrow">Admin Knowledge Base</span>
          <h2 className="font-serif text-2xl font-bold text-foreground">Documentation & System Health</h2>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-xl border border-border bg-surface p-5 shadow-xs space-y-3 text-xs">
          <div className="flex items-center gap-2 border-b border-border/60 pb-3">
            <Command className="size-4 text-primary" />
            <h3 className="font-serif text-lg font-bold text-foreground">Keyboard Shortcuts</h3>
          </div>
          <ul className="space-y-2 text-muted-foreground">
            <li className="flex justify-between">
              <span>Open Global Command Palette</span>
              <kbd className="rounded border border-border bg-surface-muted px-1.5 py-0.5 font-mono text-[10px] font-bold">⌘ + K</kbd>
            </li>
            <li className="flex justify-between">
              <span>Collapse / Expand Sidebar</span>
              <kbd className="rounded border border-border bg-surface-muted px-1.5 py-0.5 font-mono text-[10px] font-bold">⌘ + B</kbd>
            </li>
            <li className="flex justify-between">
              <span>Quick Add Product</span>
              <kbd className="rounded border border-border bg-surface-muted px-1.5 py-0.5 font-mono text-[10px] font-bold">⌘ + P</kbd>
            </li>
          </ul>
        </div>

        <div className="rounded-xl border border-border bg-surface p-5 shadow-xs space-y-3 text-xs">
          <div className="flex items-center gap-2 border-b border-border/60 pb-3">
            <ShieldCheck className="size-4 text-emerald-600" />
            <h3 className="font-serif text-lg font-bold text-foreground">System Health Diagnostics</h3>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between items-center p-2 rounded bg-emerald-500/10">
              <span className="font-semibold text-emerald-800 dark:text-emerald-300">Marketplace Gateway API</span>
              <span className="font-bold text-emerald-600">✓ 100% Operational</span>
            </div>
            <div className="flex justify-between items-center p-2 rounded bg-emerald-500/10">
              <span className="font-semibold text-emerald-800 dark:text-emerald-300">CDN & Media Delivery</span>
              <span className="font-bold text-emerald-600">✓ 100% Operational</span>
            </div>
            <div className="flex justify-between items-center p-2 rounded bg-emerald-500/10">
              <span className="font-semibold text-emerald-800 dark:text-emerald-300">Razorpay / UPI Payments</span>
              <span className="font-bold text-emerald-600">✓ Connected</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
