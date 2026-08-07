'use client'

import React, { createContext, useContext, useState, useCallback } from 'react'
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react'

export type ToastVariant = 'success' | 'error' | 'warning' | 'info'

export interface ToastItem {
  id: string
  title: string
  message?: string
  variant: ToastVariant
  duration?: number
}

interface ToastContextType {
  toasts: ToastItem[]
  showToast: (toast: Omit<ToastItem, 'id'>) => void
  dismissToast: (id: string) => void
  success: (title: string, message?: string) => void
  error: (title: string, message?: string) => void
  warning: (title: string, message?: string) => void
  info: (title: string, message?: string) => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const showToast = useCallback(
    ({ title, message, variant = 'info', duration = 4000 }: Omit<ToastItem, 'id'>) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`
      const newToast: ToastItem = { id, title, message, variant, duration }

      setToasts((prev) => [...prev.slice(-4), newToast])

      if (duration > 0) {
        setTimeout(() => {
          dismissToast(id)
        }, duration)
      }
    },
    [dismissToast]
  )

  const success = useCallback((title: string, message?: string) => showToast({ title, message, variant: 'success' }), [showToast])
  const error = useCallback((title: string, message?: string) => showToast({ title, message, variant: 'error' }), [showToast])
  const warning = useCallback((title: string, message?: string) => showToast({ title, message, variant: 'warning' }), [showToast])
  const info = useCallback((title: string, message?: string) => showToast({ title, message, variant: 'info' }), [showToast])

  return (
    <ToastContext.Provider value={{ toasts, showToast, dismissToast, success, error, warning, info }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}

function ToastContainer({ toasts, onDismiss }: { toasts: ToastItem[]; onDismiss: (id: string) => void }) {
  if (toasts.length === 0) return null

  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-4"
    >
      {toasts.map((t) => {
        const icons: Record<ToastVariant, React.ElementType> = {
          success: CheckCircle2,
          error: XCircle,
          warning: AlertTriangle,
          info: Info,
        }
        const Icon = icons[t.variant]

        const variantStyles: Record<ToastVariant, string> = {
          success: 'border-emerald-500/30 bg-surface text-foreground shadow-lg',
          error: 'border-rose-500/30 bg-surface text-foreground shadow-lg',
          warning: 'border-amber-500/30 bg-surface text-foreground shadow-lg',
          info: 'border-primary/30 bg-surface text-foreground shadow-lg',
        }

        const iconStyles: Record<ToastVariant, string> = {
          success: 'text-emerald-600 dark:text-emerald-400',
          error: 'text-rose-600 dark:text-rose-400',
          warning: 'text-amber-600 dark:text-amber-400',
          info: 'text-primary dark:text-primary-foreground',
        }

        return (
          <div
            key={t.id}
            role="status"
            className={`pointer-events-auto flex items-start gap-3 rounded-xl border p-3.5 text-xs transition-all duration-300 animate-in slide-in-from-bottom-5 fade-in ${variantStyles[t.variant]}`}
          >
            <Icon className={`size-4 shrink-0 mt-0.5 ${iconStyles[t.variant]}`} />
            <div className="flex-1 min-w-0">
              <p className="font-bold leading-tight">{t.title}</p>
              {t.message && <p className="mt-1 text-muted-foreground leading-normal">{t.message}</p>}
            </div>
            <button
              type="button"
              onClick={() => onDismiss(t.id)}
              className="p-1 rounded-md text-muted-foreground hover:text-foreground transition-colors shrink-0"
              aria-label="Close notification"
            >
              <X className="size-3.5" />
            </button>
          </div>
        )
      })}
    </div>
  )
}
