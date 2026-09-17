'use client'

import { useState, useEffect } from 'react'
import { Truck, Globe, Shield, CreditCard, Save, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react'
import {
  getAdminShippingSettingsApi,
  updateAdminShippingSettingsApi,
} from '@/lib/api/admin'

export function SystemSettingsView() {
  const [activeTab, setActiveTab] = useState<'shipping' | 'general' | 'payments' | 'security'>('shipping')
  const [shippingConfig, setShippingConfig] = useState<{
    flatRate?: number
    freeShippingThreshold?: number
    defaultWeightKg?: number
    defaultCourier?: string
  }>({
    flatRate: 99,
    freeShippingThreshold: 999,
    defaultWeightKg: 0.5,
    defaultCourier: 'Shiprocket',
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savedNotice, setSavedNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const loadSettings = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await getAdminShippingSettingsApi()
      if (data && typeof data === 'object') {
        setShippingConfig((prev) => ({ ...prev, ...data }))
      }
    } catch (err: unknown) {
      console.error('Failed to load shipping settings:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch settings')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSettings()
  }, [])

  const handleSaveShipping = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setSaving(true)
      setSavedNotice(null)
      await updateAdminShippingSettingsApi(shippingConfig)
      setSavedNotice('Authoritative shipping configuration persisted to database (SiteSettings.shippingConfig).')
    } catch (err: unknown) {
      console.error('Failed to save settings:', err)
      setSavedNotice(err instanceof Error ? err.message : 'Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const tabs = [
    { id: 'shipping', label: 'Shipping Rules (Live)', icon: Truck, live: true },
    { id: 'general', label: 'General Info (Static)', icon: Globe, live: false },
    { id: 'payments', label: 'Payment Gateway (Config)', icon: CreditCard, live: false },
    { id: 'security', label: 'Security & Auth (Config)', icon: Shield, live: false },
  ] as const

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="eyebrow">Platform Configuration</span>
          <h2 className="font-serif text-2xl font-bold text-foreground">System Settings</h2>
        </div>
      </div>

      {savedNotice && (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs font-semibold text-emerald-700 dark:text-emerald-400 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="size-4" /> {savedNotice}
          </span>
          <button type="button" onClick={() => setSavedNotice(null)} className="underline ml-2">
            Dismiss
          </button>
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs font-semibold text-destructive flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <AlertCircle className="size-4" /> {error}
          </span>
          <button type="button" onClick={() => setError(null)} className="underline ml-2">
            Dismiss
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Settings Tabs */}
        <div className="lg:col-span-1 space-y-1 rounded-xl border border-border bg-surface p-2 shadow-xs">
          {tabs.map((t) => {
            const Icon = t.icon
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveTab(t.id)}
                className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-xs font-medium transition-colors ${
                  activeTab === t.id
                    ? 'bg-primary text-primary-foreground font-semibold shadow-2xs'
                    : 'text-foreground/80 hover:bg-surface-muted hover:text-foreground'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className="size-4 shrink-0" />
                  <span>{t.label}</span>
                </div>
                {t.live && (
                  <span className="rounded-full bg-emerald-500/20 px-1.5 py-0.2 text-[9px] font-bold text-emerald-700 dark:text-emerald-300">
                    LIVE
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* Tab Content Panel */}
        <div className="lg:col-span-3 rounded-xl border border-border bg-surface p-6 shadow-xs text-xs space-y-4">
          {activeTab === 'shipping' && (
            <form onSubmit={handleSaveShipping} className="space-y-4">
              <div className="flex items-center justify-between border-b border-border/60 pb-3">
                <div>
                  <h3 className="font-serif text-lg font-bold text-foreground">
                    Authoritative Shipping Configuration
                  </h3>
                  <p className="text-muted-foreground">
                    Persisted directly in <code className="font-mono text-[11px]">SiteSettings.shippingConfig</code> and utilized across Phase 5 Shiprocket operations.
                  </p>
                </div>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground hover:bg-primary/90 shadow-xs disabled:opacity-50"
                >
                  <Save className="size-3.5" /> {saving ? 'Saving...' : 'Save Settings'}
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold mb-1 text-foreground">Standard Flat Rate (₹)</label>
                  <input
                    type="number"
                    value={shippingConfig.flatRate || 99}
                    onChange={(e) => setShippingConfig({ ...shippingConfig, flatRate: Number(e.target.value) })}
                    className="w-full rounded-lg border border-border bg-background p-2.5 outline-none focus:border-primary text-foreground"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1 text-foreground">Free Shipping Threshold (₹)</label>
                  <input
                    type="number"
                    value={shippingConfig.freeShippingThreshold || 999}
                    onChange={(e) => setShippingConfig({ ...shippingConfig, freeShippingThreshold: Number(e.target.value) })}
                    className="w-full rounded-lg border border-border bg-background p-2.5 outline-none focus:border-primary text-foreground"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1 text-foreground">Default Fallback Weight (kg)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={shippingConfig.defaultWeightKg || 0.5}
                    onChange={(e) => setShippingConfig({ ...shippingConfig, defaultWeightKg: Number(e.target.value) })}
                    className="w-full rounded-lg border border-border bg-background p-2.5 outline-none focus:border-primary text-foreground"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1 text-foreground">Default Logistics Provider</label>
                  <input
                    type="text"
                    value={shippingConfig.defaultCourier || 'Shiprocket'}
                    onChange={(e) => setShippingConfig({ ...shippingConfig, defaultCourier: e.target.value })}
                    className="w-full rounded-lg border border-border bg-background p-2.5 outline-none focus:border-primary text-foreground"
                  />
                </div>
              </div>
            </form>
          )}

          {activeTab === 'general' && (
            <div className="space-y-3">
              <div className="border-b border-border/60 pb-3">
                <h3 className="font-serif text-lg font-bold text-foreground">General Platform Information</h3>
                <span className="inline-block mt-1 rounded bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-300">
                  CLASSIFICATION: STATIC CONFIG
                </span>
              </div>
              <p className="text-muted-foreground leading-relaxed">
                Brand assets, marketplace name, and legal entity details are managed via build-time deployment variables and static configuration.
              </p>
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="p-3 rounded-lg border border-border/60 bg-surface-muted/30">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold block">Marketplace Name</span>
                  <span className="font-semibold text-foreground">Flash Sales Online (FSO)</span>
                </div>
                <div className="p-3 rounded-lg border border-border/60 bg-surface-muted/30">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold block">Canonical Currency</span>
                  <span className="font-semibold text-foreground">Indian Rupee (INR / ₹)</span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'payments' && (
            <div className="space-y-3">
              <div className="border-b border-border/60 pb-3">
                <h3 className="font-serif text-lg font-bold text-foreground">Payment Provider Configuration</h3>
                <span className="inline-block mt-1 rounded bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
                  CLASSIFICATION: ENVIRONMENT PROTECTED
                </span>
              </div>
              <p className="text-muted-foreground leading-relaxed">
                Payment gateway credentials (<code className="font-mono text-[11px]">RAZORPAY_KEY_ID</code>, <code className="font-mono text-[11px]">RAZORPAY_KEY_SECRET</code>) are strictly server-side environment variables and are intentionally never exposed to or editable via client-side controls.
              </p>
              <div className="p-3 rounded-lg border border-border/60 bg-surface-muted/30">
                <span className="font-semibold text-foreground">Primary Provider: Razorpay Payment Gateway</span>
                <p className="text-[11px] text-muted-foreground mt-0.5">Integration state: Active, Webhook verified, Signature protected.</p>
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="space-y-3">
              <div className="border-b border-border/60 pb-3">
                <h3 className="font-serif text-lg font-bold text-foreground">Authentication & Session Policy</h3>
                <span className="inline-block mt-1 rounded bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
                  CLASSIFICATION: ENFORCED VIA MIDDLEWARE
                </span>
              </div>
              <div className="space-y-2 text-muted-foreground">
                <p>• Access tokens: Stored strictly in-memory (15 minute validity).</p>
                <p>• Refresh tokens: Transported exclusively via HttpOnly, Secure, SameSite cookies.</p>
                <p>• Role-Based Access Control: Authoritative backend evaluation on every protected request.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
