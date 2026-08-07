'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Settings, Shield, Mail, Truck, CreditCard, Percent, Key, Palette, Globe, Save, CheckCircle2 } from 'lucide-react'
import { mockSystemSettings } from '@/data/admin/analytics'

export function SystemSettingsView() {
  const [activeTab, setActiveTab] = useState<'general' | 'brand' | 'seo' | 'email' | 'shipping' | 'payments' | 'taxes' | 'security' | 'api'>('general')
  const [savedNotice, setSavedNotice] = useState(false)
  const [settings, setSettings] = useState(mockSystemSettings)

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    setSavedNotice(true)
    setTimeout(() => setSavedNotice(false), 2500)
  }

  const tabs = [
    { id: 'general', label: 'General', icon: Globe },
    { id: 'brand', label: 'Brand & Logo', icon: Palette },
    { id: 'seo', label: 'SEO & Social', icon: Globe },
    { id: 'email', label: 'Email SMTP', icon: Mail },
    { id: 'shipping', label: 'Shipping Rules', icon: Truck },
    { id: 'payments', label: 'Payments', icon: CreditCard },
    { id: 'taxes', label: 'GST & Taxes', icon: Percent },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'api', label: 'API & Keys', icon: Key },
  ] as const

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="eyebrow">Platform Configuration</span>
          <h2 className="font-serif text-2xl font-bold text-foreground">System Settings</h2>
        </div>
        <div className="flex items-center gap-3">
          {savedNotice && (
            <span className="flex items-center gap-1 text-xs font-bold text-emerald-600 animate-in fade-in">
              <CheckCircle2 className="size-4" /> System Settings Saved!
            </span>
          )}
          <button
            type="button"
            onClick={handleSave}
            className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground hover:bg-primary/90 shadow-xs"
          >
            <Save className="size-4" /> Save All Settings
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Settings Sub-nav Tabs */}
        <div className="lg:col-span-1 space-y-1 rounded-xl border border-border bg-surface p-2 shadow-xs">
          {tabs.map((t) => {
            const Icon = t.icon
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveTab(t.id as any)}
                className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-xs font-medium transition-colors ${
                  activeTab === t.id
                    ? 'bg-primary text-primary-foreground font-semibold shadow-2xs'
                    : 'text-foreground/80 hover:bg-surface-muted hover:text-foreground'
                }`}
              >
                <Icon className="size-4 shrink-0" />
                <span>{t.label}</span>
              </button>
            )
          })}
        </div>

        {/* Tab Content Panel */}
        <div className="lg:col-span-3 rounded-xl border border-border bg-surface p-6 shadow-xs text-xs space-y-4">
          {activeTab === 'general' && (
            <form onSubmit={handleSave} className="space-y-4">
              <h3 className="font-serif text-lg font-bold text-foreground border-b border-border/60 pb-2">
                General Marketplace Info
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold mb-1">Marketplace Name</label>
                  <input
                    type="text"
                    value={settings.general.marketplaceName}
                    onChange={(e) => setSettings({ ...settings, general: { ...settings.general, marketplaceName: e.target.value } })}
                    className="w-full rounded-lg border border-border p-2.5 outline-none focus:border-ring"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Tagline</label>
                  <input
                    type="text"
                    value={settings.general.tagline}
                    onChange={(e) => setSettings({ ...settings, general: { ...settings.general, tagline: e.target.value } })}
                    className="w-full rounded-lg border border-border p-2.5 outline-none focus:border-ring"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold mb-1">Support Email</label>
                  <input
                    type="email"
                    value={settings.general.supportEmail}
                    onChange={(e) => setSettings({ ...settings, general: { ...settings.general, supportEmail: e.target.value } })}
                    className="w-full rounded-lg border border-border p-2.5 outline-none focus:border-ring"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Support Toll-Free Phone</label>
                  <input
                    type="text"
                    value={settings.general.supportPhone}
                    onChange={(e) => setSettings({ ...settings, general: { ...settings.general, supportPhone: e.target.value } })}
                    className="w-full rounded-lg border border-border p-2.5 outline-none focus:border-ring"
                  />
                </div>
              </div>
            </form>
          )}

          {activeTab === 'brand' && (
            <div className="space-y-4">
              <h3 className="font-serif text-lg font-bold text-foreground border-b border-border/60 pb-2">
                Brand Logo & Identity
              </h3>
              <div className="flex items-center gap-4 border border-border p-4 rounded-xl bg-background/50">
                <div className="relative size-16 rounded-xl overflow-hidden border border-border bg-surface p-1 shadow-xs">
                  <Image src={settings.brand.logoUrl} alt="Brand Logo" fill className="object-contain" />
                </div>
                <div>
                  <p className="font-bold text-foreground text-sm">Active Brand Logo</p>
                  <p className="text-[11px] font-mono text-muted-foreground">{settings.brand.logoUrl}</p>
                  <p className="text-[10px] text-emerald-700 dark:text-emerald-400 font-bold mt-1">✓ Updated with latest uploaded brand artwork</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="space-y-4">
              <h3 className="font-serif text-lg font-bold text-foreground border-b border-border/60 pb-2">
                Security & Authentication Policies
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold mb-1">Enforce 2FA for Staff</label>
                  <select className="w-full rounded-lg border border-border p-2 outline-none">
                    <option value="true">Mandatory 2FA Enabled</option>
                    <option value="false">Optional 2FA</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold mb-1">Session Inactivity Timeout</label>
                  <input type="number" defaultValue={60} className="w-full rounded-lg border border-border p-2 outline-none" />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'api' && (
            <div className="space-y-4">
              <h3 className="font-serif text-lg font-bold text-foreground border-b border-border/60 pb-2">
                API Keys & Webhooks Placeholder
              </h3>
              <div className="space-y-2">
                <label className="block font-semibold">Production API Key</label>
                <div className="flex items-center gap-2">
                  <input
                    type="password"
                    value="fso_live_pk_99481928401924810294"
                    readOnly
                    className="w-full rounded-lg border border-border p-2 font-mono bg-surface-muted/40"
                  />
                  <button type="button" onClick={() => alert('API Key copied!')} className="rounded-lg border border-border px-3 py-2 font-bold hover:bg-surface-muted">
                    Copy Key
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Catch-all info for other tabs */}
          {['seo', 'email', 'shipping', 'payments', 'taxes'].includes(activeTab) && (
            <div className="space-y-3">
              <h3 className="font-serif text-lg font-bold text-foreground border-b border-border/60 pb-2 capitalize">
                {activeTab} Configuration
              </h3>
              <p className="text-muted-foreground">
                All parameters for {activeTab} are configured with production defaults. Updates save directly to system state.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
