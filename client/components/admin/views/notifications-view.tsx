'use client'

import { useState } from 'react'
import { Bell, Send, Calendar, Users, Mail, Smartphone, MessageSquare } from 'lucide-react'
import { mockNotifications } from '@/data/admin/notifications'
import { NotificationPayload } from '@/types/admin'

export function NotificationsView() {
  const [notifications, setNotifications] = useState<NotificationPayload[]>(mockNotifications)
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [audience, setAudience] = useState<any>('All Customers')
  const [channels, setChannels] = useState<string[]>(['Push', 'In-App'])

  const toggleChannel = (ch: string) => {
    if (channels.includes(ch)) setChannels(channels.filter((c) => c !== ch))
    else setChannels([...channels, ch])
  }

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title || !message) return
    const newNotif: NotificationPayload = {
      id: `notif-${Date.now()}`,
      title,
      message,
      channels: channels as any,
      audience,
      status: 'Sent',
      sentTime: new Date().toISOString().replace('T', ' ').substring(0, 16),
      recipientCount: 8950,
      openRate: 0,
    }
    setNotifications([newNotif, ...notifications])
    setTitle('')
    setMessage('')
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="eyebrow">Customer & Producer Comms</span>
          <h2 className="font-serif text-2xl font-bold text-foreground">Notification Broadcast Center</h2>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Composer Form */}
        <div className="lg:col-span-1 rounded-xl border border-border bg-surface p-5 shadow-xs space-y-4 text-xs">
          <h3 className="font-serif text-lg font-bold text-foreground border-b border-border/60 pb-2">
            Notification Composer
          </h3>
          <form onSubmit={handleSend} className="space-y-3">
            <div>
              <label className="block font-semibold mb-1">Target Audience</label>
              <select
                value={audience}
                onChange={(e) => setAudience(e.target.value)}
                className="w-full rounded-lg border border-border p-2 outline-none"
              >
                <option value="All Customers">All Registered Customers (8,950)</option>
                <option value="VIP Customers">VIP High-Spend Cohort (420)</option>
                <option value="Producers">Active Artisanal Producers (64)</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold mb-1">Broadcast Channels</label>
              <div className="flex flex-wrap gap-2">
                {['Push', 'Email', 'SMS', 'In-App'].map((ch) => (
                  <button
                    key={ch}
                    type="button"
                    onClick={() => toggleChannel(ch)}
                    className={`rounded-lg px-3 py-1.5 font-bold transition-all ${
                      channels.includes(ch)
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-surface-muted border border-border text-muted-foreground'
                    }`}
                  >
                    {ch}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block font-semibold mb-1">Headline Title</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-lg border border-border p-2 outline-none focus:border-ring"
                placeholder="e.g. Fresh A2 Bilona Ghee Restocked!"
              />
            </div>

            <div>
              <label className="block font-semibold mb-1">Message Body</label>
              <textarea
                rows={3}
                required
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full rounded-lg border border-border p-2 outline-none focus:border-ring"
                placeholder="Notification payload content..."
              />
            </div>

            <button
              type="submit"
              className="w-full rounded-xl bg-primary py-2.5 font-bold text-primary-foreground hover:bg-primary/90 transition-all shadow-xs flex items-center justify-center gap-2"
            >
              <Send className="size-4" /> Trigger Broadcast Now
            </button>
          </form>
        </div>

        {/* History List */}
        <div className="lg:col-span-2 rounded-xl border border-border bg-surface p-5 shadow-xs space-y-4">
          <h3 className="font-serif text-lg font-bold text-foreground border-b border-border/60 pb-2">
            Recent Broadcast Campaigns
          </h3>
          <div className="space-y-3">
            {notifications.map((notif) => (
              <div key={notif.id} className="rounded-lg border border-border p-4 text-xs space-y-2 bg-background/50">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h4 className="font-bold text-foreground text-sm">{notif.title}</h4>
                    <p className="text-muted-foreground mt-0.5">{notif.message}</p>
                  </div>
                  <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-400">
                    {notif.status}
                  </span>
                </div>
                <div className="flex flex-wrap items-center justify-between border-t border-border/60 pt-2 text-[11px] text-muted-foreground">
                  <span>Target: <strong className="text-foreground">{notif.audience}</strong> ({notif.recipientCount} Users)</span>
                  <span>Channels: {notif.channels.join(', ')}</span>
                  <span>{notif.sentTime || notif.scheduledTime}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
