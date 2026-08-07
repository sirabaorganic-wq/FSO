'use client'

import React from 'react'
import { ThemeProvider } from '@/lib/theme'
import { ToastProvider } from '@/lib/toast'
import { OrganizationSchema } from '@/lib/seo'

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <ToastProvider>
        <OrganizationSchema />
        {children}
      </ToastProvider>
    </ThemeProvider>
  )
}
