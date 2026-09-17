'use client'

import { useState, useEffect } from 'react'
import { Bell, Send, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react'
import {
  getAdminNotificationsApi,
  markAdminNotificationReadApi,
  type AdminNotificationItem,
} from '@/lib/api/admin'

export function NotificationsView() {
  const [notifications, setNotifications] = useState<AdminNotificationItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [markingId, setMarkingId] = useState<string | null>(null)

  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [targetRole, setTargetRole] = useState('ALL')
  const [broadcastInfo, setBroadcastInfo] = useState<string | null>(null)

  const loadNotifications = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await getAdminNotificationsApi()
      setNotifications(Array.isArray(data) ? data : [])
    } catch (err: unknown) {
      console.error('Failed to load notifications:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch notifications from database')
      setNotifications([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadNotifications()
  }, [])

  const handleMarkRead = async (id: string) => {
    try {
      setMarkingId(id)
      await markAdminNotificationReadApi(id)
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      )
    } catch (err: unknown) {
      console.error('Failed to mark notification read:', err)
    } finally {
      setMarkingId(null)
    }
  }

  const handleSimulateBroadcast = (e: React.FormEvent) => {
    e.preventDefault()
    setBroadcastInfo(
      'Notification Broadcast Engine (Marketing CRM / FCM Push provider) is not integrated into this tier. In-app system alerts are generated via transactional events.'
    )
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="eyebrow">Customer & System Comms</span>
          <h2 className="font-serif text-2xl font-bold text-foreground">Notification Operations Center</h2>
        </div>
        <button
          type="button"
          onClick={loadNotifications}
          disabled={loading}
          className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold hover:bg-surface-muted transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-xs font-medium text-destructive">
          <AlertCircle className="size-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Broadcast Config / Info */}
        <div className="lg:col-span-1 rounded-xl border border-border bg-surface p-5 shadow-xs space-y-4 text-xs">
          <div className="border-b border-border/60 pb-2">
            <h3 className="font-serif text-lg font-bold text-foreground">
              Broadcast Composer
            </h3>
            <span className="inline-block mt-1 rounded bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-600 dark:text-amber-400">
              STATIC CONFIG / UNSUPPORTED
            </span>
          </div>

          <form onSubmit={handleSimulateBroadcast} className="space-y-3">
            <div>
              <label className="block font-semibold mb-1">Target Audience</label>
              <select
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value)}
                className="w-full rounded-lg border border-border p-2 outline-none bg-background"
              >
                <option value="ALL">All Patrons & Users</option>
                <option value="PRODUCERS">Active Verified Producers</option>
                <option value="ADMINS">Administrative Staff Only</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold mb-1">Broadcast Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-lg border border-border p-2 outline-none bg-background focus:border-ring"
                placeholder="e.g. Seasonal Harvest Launch"
              />
            </div>

            <div>
              <label className="block font-semibold mb-1">Message Body</label>
              <textarea
                rows={3}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full rounded-lg border border-border p-2 outline-none bg-background focus:border-ring"
                placeholder="Broadcast body..."
              />
            </div>

            {broadcastInfo && (
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-2.5 text-[11px] text-amber-700 dark:text-amber-300">
                {broadcastInfo}
              </div>
            )}

            <button
              type="submit"
              className="w-full rounded-xl bg-primary py-2.5 font-bold text-primary-foreground hover:bg-primary/90 transition-all shadow-xs flex items-center justify-center gap-2"
            >
              <Send className="size-4" /> Broadcast Notification
            </button>
          </form>
        </div>

        {/* Live Database Notifications List */}
        <div className="lg:col-span-2 rounded-xl border border-border bg-surface p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-border/60 pb-2">
            <h3 className="font-serif text-lg font-bold text-foreground">
              Authoritative System Notifications
            </h3>
            <span className="text-xs text-muted-foreground font-semibold">
              {notifications.length} Total
            </span>
          </div>

          {loading ? (
            <div className="py-12 text-center text-xs text-muted-foreground">
              <RefreshCw className="size-6 animate-spin mx-auto mb-2 text-primary" />
              Loading notifications from database...
            </div>
          ) : notifications.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border/80 p-8 text-center text-xs text-muted-foreground">
              <Bell className="size-8 mx-auto mb-2 opacity-40" />
              <p className="font-semibold text-foreground">No Notifications in Database</p>
              <p className="mt-1">
                Transactional system notifications (order alerts, vendor verifications, refunds) will appear here once triggered.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {notifications.map((notif) => (
                <div
                  key={notif.id}
                  className={`rounded-lg border p-4 text-xs space-y-2 transition-colors ${
                    notif.read
                      ? 'border-border bg-background/40 opacity-75'
                      : 'border-primary/30 bg-primary/5'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-foreground text-sm">{notif.title}</h4>
                        {!notif.read && (
                          <span className="rounded-full bg-primary/20 px-2 py-0.5 text-[10px] font-bold text-primary">
                            Unread
                          </span>
                        )}
                      </div>
                      <p className="text-muted-foreground mt-0.5">{notif.message}</p>
                    </div>
                    {!notif.read && (
                      <button
                        type="button"
                        onClick={() => handleMarkRead(notif.id)}
                        disabled={markingId === notif.id}
                        className="shrink-0 flex items-center gap-1 rounded border border-border bg-surface px-2 py-1 text-[10px] font-semibold text-foreground hover:bg-surface-muted disabled:opacity-50"
                      >
                        <CheckCircle2 className="size-3 text-primary" />
                        Mark Read
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center justify-between border-t border-border/60 pt-2 text-[11px] text-muted-foreground">
                    <span>Type: <strong className="text-foreground">{notif.type}</strong></span>
                    <span>
                      {new Date(notif.createdAt).toLocaleDateString('en-IN', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
