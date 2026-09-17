'use client'

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react'
import type { CartLine } from '@/types/customer'
import type { ProductDetail } from '@/types/product'
import type { BackendProduct } from './api/types'
import { toFrontendCartLine } from './api/mappers'
import { getCartApi, addToCartApi, updateCartItemApi, removeCartItemApi, clearCartApi, syncCartApi } from './api/cart'
import { getProductBySlugOrIdApi } from './api/products'
import { useAuth } from './auth-context'
import { useToast } from './toast'

interface CartContextType {
  items: CartLine[]
  itemCount: number
  subtotal: number
  deliveryFee: number
  total: number
  isLoading: boolean
  addToCart: (
    productId: string,
    quantity?: number,
    variant?: string | null,
    productData?: BackendProduct | ProductDetail | null
  ) => Promise<void>
  updateQuantity: (id: string, quantity: number) => Promise<void>
  removeFromCart: (id: string) => Promise<void>
  clearCart: () => Promise<void>
  refreshCart: () => Promise<void>
}

const CartContext = createContext<CartContextType | undefined>(undefined)

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartLine[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const { isAuthenticated } = useAuth()
  const { addToast } = useToast()

  // Hydrate guest cart from localStorage on mount
  useEffect(() => {
    try {
      const saved = typeof window !== 'undefined' ? localStorage.getItem('fso_guest_cart') : null
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed) && parsed.length > 0) {
          setItems(parsed)
        }
      }
    } catch {}
  }, [])

  // Persist guest cart to localStorage
  useEffect(() => {
    if (!isAuthenticated && typeof window !== 'undefined') {
      try {
        localStorage.setItem('fso_guest_cart', JSON.stringify(items))
      } catch {}
    }
  }, [items, isAuthenticated])

  const refreshCart = useCallback(async () => {
    if (!isAuthenticated) return
    setIsLoading(true)
    try {
      const backendItems = await getCartApi()
      if (Array.isArray(backendItems)) {
        setItems(backendItems.map(toFrontendCartLine))
      }
    } catch (err) {
      console.error('Failed to load cart:', err)
    } finally {
      setIsLoading(false)
    }
  }, [isAuthenticated])

  // Reload cart whenever auth state changes
  useEffect(() => {
    if (isAuthenticated) {
      // If there are guest items, sync with server
      if (items.length > 0) {
        const toSync = items.map((i) => ({ productId: i.id, quantity: i.quantity, variant: i.unit }))
        syncCartApi(toSync)
          .then((synced) => {
            setItems(synced.map(toFrontendCartLine))
            try {
              if (typeof window !== 'undefined') localStorage.removeItem('fso_guest_cart')
            } catch {}
          })
          .catch(() => refreshCart())
      } else {
        refreshCart()
      }
    }
  }, [isAuthenticated, refreshCart]) // eslint-disable-line react-hooks/exhaustive-deps

  const addToCart = async (
    productId: string,
    quantity: number = 1,
    variant?: string | null,
    productData?: BackendProduct | ProductDetail | null
  ) => {
    setIsLoading(true)
    try {
      if (isAuthenticated) {
        const updated = await addToCartApi(productId, quantity, variant)
        setItems(updated.map(toFrontendCartLine))
      } else {
        // Guest mode: extract authentic product data from passed object or fetch it from API
        let resolvedProduct: { name: string; price: number; image: string; producer: string; unit: string }
        if (productData) {
          const isDetail = 'shortDescription' in productData
          const name = productData.name
          let price = 0
          if (typeof productData.price === 'number') {
            price = productData.price
          } else if (typeof productData.price === 'string') {
            price = parseInt(productData.price.replace(/[^0-9]/g, '')) || 0
          }
          let image = '/images/pantry.jpg'
          if (isDetail && Array.isArray((productData as ProductDetail).images) && (productData as ProductDetail).images.length > 0) {
            image = (productData as ProductDetail).images[0].src
          } else if ('image' in productData && (productData as BackendProduct).image) {
            image = (productData as BackendProduct).image!
          }
          let producer = 'Heritage Producer'
          if (isDetail && (productData as ProductDetail).producer?.name) {
            producer = (productData as ProductDetail).producer.name
          } else if ('vendor' in productData && typeof (productData as BackendProduct).vendor === 'object' && (productData as BackendProduct).vendor?.businessName) {
            producer = (productData as BackendProduct).vendor!.businessName
          }
          const unit = variant || productData.packSize || 'Standard'
          resolvedProduct = { name, price, image, producer, unit }
        } else {
          // Fallback fetch from real backend API so we never use fabricated data
          const fetched = await getProductBySlugOrIdApi(productId)
          if (!fetched) {
            throw new Error('Product unavailable')
          }
          resolvedProduct = {
            name: fetched.name,
            price: fetched.price,
            image: fetched.image || '/images/pantry.jpg',
            producer: typeof fetched.vendor === 'object' && fetched.vendor?.businessName ? fetched.vendor.businessName : 'Heritage Producer',
            unit: variant || fetched.packSize || 'Standard',
          }
        }

        setItems((prev) => {
          const existingIndex = prev.findIndex((item) => item.id === productId)
          if (existingIndex > -1) {
            const copy = [...prev]
            copy[existingIndex] = {
              ...copy[existingIndex],
              quantity: copy[existingIndex].quantity + quantity,
            }
            return copy
          }
          return [
            ...prev,
            {
              id: productId,
              name: resolvedProduct.name,
              producer: resolvedProduct.producer,
              image: resolvedProduct.image,
              price: resolvedProduct.price,
              quantity,
              unit: resolvedProduct.unit,
            },
          ]
        })
      }
      addToast({
        title: 'Added to basket',
        description: 'Your considered ingredient was added to the pantry basket.',
        variant: 'success',
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not add item to basket.'
      addToast({
        title: 'Unable to add item',
        description: msg,
        variant: 'error',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const updateQuantity = async (id: string, quantity: number) => {
    if (quantity <= 0) {
      return removeFromCart(id)
    }

    setIsLoading(true)
    try {
      if (isAuthenticated) {
        const updated = await updateCartItemApi(id, quantity)
        setItems(updated.map(toFrontendCartLine))
      } else {
        setItems((prev) =>
          prev.map((item) => (item.id === id ? { ...item, quantity } : item))
        )
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not update quantity.'
      addToast({
        title: 'Cart update failed',
        description: msg,
        variant: 'error',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const removeFromCart = async (id: string) => {
    setIsLoading(true)
    try {
      if (isAuthenticated) {
        const updated = await removeCartItemApi(id)
        setItems(updated.map(toFrontendCartLine))
      } else {
        setItems((prev) => prev.filter((item) => item.id !== id))
      }
      addToast({
        title: 'Item removed',
        description: 'Item was removed from your cart.',
        variant: 'default',
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not remove item.'
      addToast({
        title: 'Remove failed',
        description: msg,
        variant: 'error',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const clearCart = async () => {
    setIsLoading(true)
    try {
      if (isAuthenticated) {
        await clearCartApi()
      }
      setItems([])
      try {
        if (typeof window !== 'undefined') localStorage.removeItem('fso_guest_cart')
      } catch {}
    } catch (err) {
      console.error('Failed to clear cart:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const { itemCount, subtotal, deliveryFee, total } = useMemo(() => {
    const count = items.reduce((sum, item) => sum + item.quantity, 0)
    const sub = items.reduce((sum, item) => sum + item.price * item.quantity, 0)
    const fee = sub >= 999 || sub === 0 ? 0 : 80
    return {
      itemCount: count,
      subtotal: sub,
      deliveryFee: fee,
      total: sub + fee,
    }
  }, [items])

  return (
    <CartContext.Provider
      value={{
        items,
        itemCount,
        subtotal,
        deliveryFee,
        total,
        isLoading,
        addToCart,
        updateQuantity,
        removeFromCart,
        clearCart,
        refreshCart,
      }}
    >
      {children}
    </CartContext.Provider>
  )
}

export function useCart(): CartContextType {
  const context = useContext(CartContext)
  if (!context) {
    throw new Error('useCart must be used within a CartProvider')
  }
  return context
}
