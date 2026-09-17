'use client'

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import type { CustomerUser } from '@/types/customer'
import type { BackendUser, BackendAddress } from './api/types'
import { loginApi, registerApi, registerSellerApi, logoutApi, getProfileApi, updateProfileApi, type RegisterPayload, type SellerRegisterPayload, type UpdateProfilePayload } from './api/auth'
import { agricultureImages } from '@/data/images'

export function getDashboardRouteForUser(user?: BackendUser | { role?: string; isAdmin?: boolean } | null): string {
  if (!user) return '/account'
  const role = (user.role || '').toLowerCase()
  if (
    user.isAdmin ||
    role === 'admin' ||
    role === 'operations_manager' ||
    role === 'finance_admin' ||
    role === 'vendor_onboarder' ||
    role === 'content_editor' ||
    role === 'blog_creator' ||
    role === 'customer_support'
  ) {
    return '/admin'
  }
  if (role === 'vendor' || role === 'seller' || role === 'producer_manager') {
    return '/seller'
  }
  return '/account'
}

interface AuthContextType {
  user: CustomerUser | null
  rawUser: BackendUser | null
  addresses: BackendAddress[]
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, password?: string) => Promise<BackendUser>
  register: (payload: RegisterPayload) => Promise<BackendUser>
  registerSeller: (payload: SellerRegisterPayload) => Promise<BackendUser>
  logout: () => Promise<void>
  updateProfile: (payload: UpdateProfilePayload) => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

function formatCustomerUser(raw: BackendUser): CustomerUser {
  const names = (raw.name || 'FSO Patron').split(' ')
  const initials = names.length > 1
    ? `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase()
    : names[0].slice(0, 2).toUpperCase()

  return {
    name: raw.name || 'FSO Patron',
    email: raw.email,
    phone: raw.phone || '+91 98765 43210',
    initials,
    language: 'English',
    diet: 'Heritage',
    avatar: agricultureImages.farmer,
  }
}

/**
 * Security: Proactively purge any persisted authentication credentials from web storage.
 * FSO architecture strictly uses in-memory access tokens and HTTP-only cookies.
 * Preserves legitimate non-auth application keys ('fso-theme', 'fso_guest_cart').
 */
function purgePersistedAuthCredentials(): void {
  if (typeof window === 'undefined') return
  const preservedKeys = new Set(['fso-theme', 'fso_guest_cart'])
  const authPattern = /(auth|token|jwt|bearer|refresh|session|credential|access_token|id_token)/i

  const cleanStorage = (storage: Storage) => {
    try {
      const keysToRemove: string[] = []
      for (let i = 0; i < storage.length; i++) {
        const key = storage.key(i)
        if (key && !preservedKeys.has(key) && authPattern.test(key)) {
          keysToRemove.push(key)
        }
      }
      keysToRemove.forEach((k) => storage.removeItem(k))
    } catch {
      // Ignore errors in sandboxed storage environments
    }
  }

  cleanStorage(window.localStorage)
  cleanStorage(window.sessionStorage)
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [rawUser, setRawUser] = useState<BackendUser | null>(null)
  const [user, setUser] = useState<CustomerUser | null>(null)
  const [addresses, setAddresses] = useState<BackendAddress[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(true)

  const refreshUser = useCallback(async () => {
    purgePersistedAuthCredentials()
    try {
      const profile = await getProfileApi()
      if (profile && profile.id) {
        setRawUser(profile)
        setUser(formatCustomerUser(profile))
        setAddresses(profile.addresses || [])
      } else {
        setRawUser(null)
        setUser(null)
        setAddresses([])
      }
    } catch {
      setRawUser(null)
      setUser(null)
      setAddresses([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    purgePersistedAuthCredentials()
    refreshUser()
  }, [refreshUser])

  const login = async (email: string, password?: string): Promise<BackendUser> => {
    setIsLoading(true)
    try {
      const loggedIn = await loginApi({ email, password })
      setRawUser(loggedIn)
      setUser(formatCustomerUser(loggedIn))
      setAddresses(loggedIn.addresses || [])
      return loggedIn
    } finally {
      setIsLoading(false)
    }
  }

  const register = async (payload: RegisterPayload): Promise<BackendUser> => {
    setIsLoading(true)
    try {
      const registered = await registerApi(payload)
      setRawUser(registered)
      setUser(formatCustomerUser(registered))
      setAddresses(registered.addresses || [])
      return registered
    } finally {
      setIsLoading(false)
    }
  }

  const registerSeller = async (payload: SellerRegisterPayload): Promise<BackendUser> => {
    setIsLoading(true)
    try {
      const registered = await registerSellerApi(payload)
      setRawUser(registered)
      setUser(formatCustomerUser(registered))
      setAddresses(registered.addresses || [])
      return registered
    } finally {
      setIsLoading(false)
    }
  }

  const logout = async () => {
    setIsLoading(true)
    try {
      await logoutApi()
      purgePersistedAuthCredentials()
      setRawUser(null)
      setUser(null)
      setAddresses([])
    } finally {
      setIsLoading(false)
    }
  }

  const updateProfile = async (payload: UpdateProfilePayload) => {
    setIsLoading(true)
    try {
      const updated = await updateProfileApi(payload)
      setRawUser(updated)
      setUser(formatCustomerUser(updated))
      setAddresses(updated.addresses || [])
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        rawUser,
        addresses,
        isAuthenticated: Boolean(rawUser && rawUser.id),
        isLoading,
        login,
        register,
        registerSeller,
        logout,
        updateProfile,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
