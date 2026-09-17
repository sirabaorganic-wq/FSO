'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import React, { useEffect, useState } from 'react'
import { Bell, Check, Heart, MapPin, Package, Settings, Truck, AlertCircle, Loader2 } from 'lucide-react'
import type { Order, Recommendation } from '@/types/customer'
import {
  AccountShell,
  AddressCard,
  CartItem,
  CartSummary,
  CheckoutStepper,
  OrderCard,
  ProfileCard,
  RecommendationGrid,
} from './customer-components'
import { useAuth } from '@/lib/auth-context'
import { useCart } from '@/lib/cart-context'
import { useToast } from '@/lib/toast'
import { getMyOrdersApi, getOrderByIdApi, createOrderApi, trackOrderPublicApi } from '@/lib/api/orders'
import { getWishlistApi } from '@/lib/api/wishlist'
import { createRazorpayOrderApi, verifyPaymentApi, getPaymentStatusApi } from '@/lib/api/payments'
import { toFrontendOrder, toFrontendAddress } from '@/lib/api/mappers'
import { BackButton } from '@/components/ui/back-button'

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      resolve(false)
      return
    }
    if ((window as any).Razorpay) {
      resolve(true)
      return
    }
    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.async = true
    script.onload = () => resolve(true)
    script.onerror = () => resolve(false)
    document.body.appendChild(script)
  })
}

export function AccountOverview() {
  const { user, addresses } = useAuth()
  const [orders, setOrders] = useState<Order[]>([])
  const [wishlist, setWishlist] = useState<Recommendation[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let isMounted = true
    async function loadData() {
      try {
        const [ordersData, wishlistData] = await Promise.allSettled([
          getMyOrdersApi(),
          getWishlistApi(),
        ])

        if (isMounted) {
          if (ordersData.status === 'fulfilled' && Array.isArray(ordersData.value)) {
            setOrders(ordersData.value.map(toFrontendOrder))
          }
          if (wishlistData.status === 'fulfilled' && Array.isArray(wishlistData.value)) {
            setWishlist(
              wishlistData.value.map((p) => ({
                slug: p.slug,
                name: p.name,
                reason: p.category || 'Heritage staple',
                image: p.image || '/images/pantry.jpg',
                price: `₹${p.price.toLocaleString('en-IN')}`,
              }))
            )
          }
        }
      } catch (err) {
        console.error('Failed to load account overview:', err)
      } finally {
        if (isMounted) setLoading(false)
      }
    }
    loadData()
    return () => {
      isMounted = false
    }
  }, [])

  return (
    <AccountShell current="Overview">
      <div className="space-y-10">
        <ProfileCard user={user || undefined} />
        <div className="grid gap-4 sm:grid-cols-3">
          <Quick label="Orders" value={String(orders.length)} icon={<Package />} href="/account/orders" />
          <Quick label="Wishlist" value={String(wishlist.length)} icon={<Heart />} href="/account/wishlist" />
          <Quick label="Addresses" value={String(addresses.length)} icon={<MapPin />} href="/account/addresses" />
        </div>

        <Section title="Recent orders" href="/account/orders">
          {loading ? (
            <div className="flex items-center gap-3 py-8 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Loading your orders...
            </div>
          ) : orders.length > 0 ? (
            <div className="space-y-3">
              {orders.slice(0, 3).map((order) => (
                <OrderCard key={order.id} order={order} />
              ))}
            </div>
          ) : (
            <div className="border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              No orders placed yet. Explore the pantry to find heritage ingredients.
            </div>
          )}
        </Section>

        {wishlist.length > 0 && (
          <Section title="Saved for later" href="/account/wishlist">
            <RecommendationGrid items={wishlist.slice(0, 3)} />
          </Section>
        )}

        <Section title="A little kitchen wisdom">
          <div className="border border-border bg-primary p-8 text-primary-foreground">
            <p className="eyebrow text-accent">From the journal</p>
            <h2 className="display mt-3 max-w-xl text-4xl">The grain bowl is older than the trend.</h2>
            <Link
              href="/kitchen-wisdom/articles/heritage-grains"
              className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-accent hover:underline"
            >
              Read the story →
            </Link>
          </div>
        </Section>
      </div>
    </AccountShell>
  )
}

function Quick({ label, value, icon, href }: { label: string; value: string; icon: React.ReactNode; href: string }) {
  return (
    <Link href={href} className="border border-border bg-surface p-5 hover:border-secondary transition-colors block">
      <span className="text-secondary">{icon}</span>
      <p className="mt-6 text-3xl font-semibold">{value}</p>
      <p className="mt-1 text-sm text-muted-foreground">{label}</p>
    </Link>
  )
}

function Section({ title, href, children }: { title: string; href?: string; children: React.ReactNode }) {
  return (
    <section>
      <div className="mb-5 flex items-end justify-between border-b border-border pb-3">
        <h2 className="font-serif text-3xl">{title}</h2>
        {href ? (
          <Link href={href} className="text-sm font-bold text-secondary hover:underline">
            View all
          </Link>
        ) : null}
      </div>
      {children}
    </section>
  )
}

export function ProfilePage() {
  const { rawUser, updateProfile } = useAuth()
  const { addToast } = useToast()

  const [name, setName] = useState(rawUser?.name || '')
  const [phone, setPhone] = useState(rawUser?.phone || '')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (rawUser) {
      setName(rawUser.name || '')
      setPhone(rawUser.phone || '')
    }
  }, [rawUser])

  const handleSave = async () => {
    setSaving(true)
    try {
      await updateProfile({ name, phone })
      addToast({
        title: 'Profile updated',
        description: 'Your details have been saved successfully.',
        variant: 'success',
      })
    } catch (err) {
      addToast({
        title: 'Update failed',
        description: err instanceof Error ? err.message : 'Could not save profile changes.',
        variant: 'error',
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <AccountShell current="Profile">
      <div className="max-w-2xl space-y-8">
        <div>
          <p className="eyebrow">Personal details</p>
          <h2 className="display mt-3 text-5xl">Your profile</h2>
        </div>
        <ProfileCard />
        <div className="space-y-5 border-t border-border pt-6">
          <h3 className="font-serif text-2xl">Preferences</h3>
          <div>
            <label className="text-xs font-bold uppercase tracking-wider" htmlFor="prof-name">
              Full name
            </label>
            <input
              id="prof-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-2 min-h-12 w-full border border-input bg-background px-4"
            />
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-wider" htmlFor="prof-email">
              Email
            </label>
            <input
              id="prof-email"
              value={rawUser?.email || ''}
              disabled
              className="mt-2 min-h-12 w-full border border-input bg-surface-muted px-4 text-muted-foreground cursor-not-allowed"
            />
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-wider" htmlFor="prof-phone">
              Phone
            </label>
            <input
              id="prof-phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="mt-2 min-h-12 w-full border border-input bg-background px-4"
            />
          </div>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="min-h-11 bg-primary px-5 text-sm font-bold text-primary-foreground hover:bg-secondary disabled:opacity-50 transition-colors"
          >
            {saving ? 'Saving...' : 'Save changes'}
          </button>
        </div>
      </div>
    </AccountShell>
  )
}

export function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('All orders')
  const [search, setSearch] = useState('')

  useEffect(() => {
    async function loadOrders() {
      try {
        const raw = await getMyOrdersApi()
        if (Array.isArray(raw)) {
          setOrders(raw.map(toFrontendOrder))
        }
      } catch (err) {
        console.error('Failed to load orders:', err)
      } finally {
        setLoading(false)
      }
    }
    loadOrders()
  }, [])

  const filteredOrders = orders.filter((o) => {
    if (filter === 'Delivered' && o.status !== 'Delivered') return false
    if (filter === 'In transit' && o.status !== 'In transit') return false
    if (search.trim() && !o.id.toLowerCase().includes(search.trim().toLowerCase())) return false
    return true
  })

  return (
    <AccountShell current="Orders">
      <div className="space-y-8">
        <div>
          <p className="eyebrow">Your pantry, in motion</p>
          <h2 className="display mt-3 text-5xl">Orders</h2>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            aria-label="Search orders"
            placeholder="Search order number"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="min-h-11 flex-1 border border-input bg-background px-4"
          />
          <select
            aria-label="Filter orders"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="min-h-11 border border-input bg-background px-4"
          >
            <option>All orders</option>
            <option>Delivered</option>
            <option>In transit</option>
          </select>
        </div>

        {loading ? (
          <div className="flex items-center gap-3 py-12 text-sm text-muted-foreground">
            <Loader2 className="size-5 animate-spin" /> Loading your orders...
          </div>
        ) : filteredOrders.length > 0 ? (
          <div className="space-y-3">
            {filteredOrders.map((order) => (
              <OrderCard key={order.id} order={order} />
            ))}
          </div>
        ) : (
          <div className="border border-dashed border-border p-12 text-center">
            <Package className="mx-auto mb-3 text-secondary size-8" />
            <h3 className="font-serif text-2xl">No orders found</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              {search ? 'Try adjusting your search criteria.' : 'Your pantry orders will appear here once placed.'}
            </p>
            <Link
              href="/shop"
              className="mt-6 inline-flex min-h-11 items-center bg-primary px-5 text-sm font-bold text-primary-foreground"
            >
              Explore the pantry
            </Link>
          </div>
        )}
      </div>
    </AccountShell>
  )
}

export function OrderDetailPage({ id }: { id: string }) {
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadOrder() {
      try {
        let backendOrder
        try {
          backendOrder = await getOrderByIdApi(id)
        } catch {
          backendOrder = await trackOrderPublicApi(id)
        }

        if (backendOrder && backendOrder.id) {
          setOrder(toFrontendOrder(backendOrder))
        } else {
          setError('Order not found.')
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unable to retrieve order details.')
      } finally {
        setLoading(false)
      }
    }
    loadOrder()
  }, [id])

  if (loading) {
    return (
      <AccountShell current="Orders">
        <div className="py-20 flex items-center justify-center gap-3 text-muted-foreground">
          <Loader2 className="size-6 animate-spin" /> Loading order details...
        </div>
      </AccountShell>
    )
  }

  if (error || !order) {
    return (
      <AccountShell current="Orders">
        <div className="border border-dashed border-border p-12 text-center">
          <AlertCircle className="mx-auto mb-3 text-destructive size-8" />
          <h2 className="font-serif text-3xl">Order Not Found</h2>
          <p className="mt-2 text-sm text-muted-foreground">{error || 'We could not locate this order.'}</p>
          <Link
            href="/account/orders"
            className="mt-6 inline-flex min-h-11 items-center bg-primary px-5 text-sm font-bold text-primary-foreground"
          >
            ← Back to all orders
          </Link>
        </div>
      </AccountShell>
    )
  }

  return (
    <AccountShell current="Orders">
      <div className="space-y-8">
        <Link href="/account/orders" className="text-sm text-muted-foreground hover:text-secondary">
          ← All orders
        </Link>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Order detail</p>
            <h2 className="display mt-3 text-5xl">{order.id}</h2>
            <p className="mt-3 text-sm text-muted-foreground">Placed {order.date}</p>
          </div>
          <span className="border border-success/40 px-3 py-2 text-sm font-bold text-success">{order.status}</span>
        </div>
        <div className="grid gap-8 lg:grid-cols-[1.3fr_0.7fr]">
          <div className="space-y-5">
            <div className="border border-border bg-surface p-6">
              <h3 className="font-serif text-2xl">Items purchased</h3>
              {order.items.map((item) => (
                <CartItem key={item.id} line={item} onChange={() => undefined} />
              ))}
            </div>
            <div className="border border-border bg-surface p-6">
              <h3 className="font-serif text-2xl">Shipment timeline</h3>
              <div className="mt-6 space-y-5">
                <Timeline title="Order confirmed" detail={order.date} done />
                <Timeline title="Packed with care" detail="Your ingredients are ready to travel" done />
                <Timeline title="Arriving soon" detail={order.eta} done={order.status !== 'Processing'} />
              </div>

              {order.shipments && order.shipments.length > 0 ? (
                <div className="mt-6 border-t border-border pt-4 space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Carrier & Tracking Details</h4>
                  {order.shipments.map((s, idx) => (
                    <div key={idx} className="flex flex-wrap items-center justify-between gap-2 text-sm bg-surface-muted/60 p-3 rounded-lg">
                      <div>
                        <p className="font-semibold">{s.courierName || 'Standard Delivery'}</p>
                        {s.awbCode ? <p className="text-xs text-muted-foreground font-mono">AWB: {s.awbCode}</p> : null}
                      </div>
                      {s.trackingUrl ? (
                        <a
                          href={s.trackingUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs font-bold text-secondary hover:underline"
                        >
                          Track Package →
                        </a>
                      ) : s.awbCode ? (
                        <span className="text-xs font-medium text-muted-foreground">Dispatched</span>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
          <div className="space-y-5">
            <div className="border border-border bg-surface p-6">
              <h3 className="font-serif text-2xl">Total payment</h3>
              <p className="mt-3 text-3xl font-bold font-serif">₹{order.total.toLocaleString('en-IN')}</p>
              <p className="mt-1 text-xs text-muted-foreground">Inclusive of all taxes & delivery fees</p>
            </div>
            <div className="border border-border bg-surface p-6">
              <h3 className="font-serif text-2xl">Need help?</h3>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                Our care team is here for questions about your order, ingredients, or delivery.
              </p>
              <button type="button" className="mt-5 text-sm font-bold text-secondary hover:underline">
                Contact support →
              </button>
            </div>
          </div>
        </div>
      </div>
    </AccountShell>
  )
}

function Timeline({ title, detail, done }: { title: string; detail: string; done: boolean }) {
  return (
    <div className="flex gap-4">
      <span
        className={`mt-1 grid size-6 shrink-0 place-items-center rounded-full border ${
          done ? 'border-success bg-success text-primary-foreground' : 'border-border'
        }`}
      >
        {done ? <Check size={14} /> : null}
      </span>
      <div>
        <p className="font-semibold">{title}</p>
        <p className="mt-1 text-sm text-muted-foreground">{detail}</p>
      </div>
    </div>
  )
}

export function WishlistPage() {
  const [wishlist, setWishlist] = useState<Recommendation[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadWishlist() {
      try {
        const raw = await getWishlistApi()
        if (Array.isArray(raw)) {
          setWishlist(
            raw.map((p) => ({
              slug: p.slug,
              name: p.name,
              reason: p.category || 'Heritage staple',
              image: p.image || '/images/pantry.jpg',
              price: `₹${p.price.toLocaleString('en-IN')}`,
            }))
          )
        }
      } catch (err) {
        console.error('Failed to load wishlist:', err)
      } finally {
        setLoading(false)
      }
    }
    loadWishlist()
  }, [])

  return (
    <AccountShell current="Wishlist">
      <div className="space-y-8">
        <div>
          <p className="eyebrow">Saved for later</p>
          <h2 className="display mt-3 text-5xl">Your wishlist</h2>
        </div>
        {loading ? (
          <div className="py-12 flex items-center gap-3 text-muted-foreground">
            <Loader2 className="size-5 animate-spin" /> Loading your saved pantry items...
          </div>
        ) : wishlist.length > 0 ? (
          <RecommendationGrid items={wishlist} />
        ) : (
          <div className="border border-dashed border-border p-12 text-center">
            <Heart className="mx-auto mb-3 text-secondary size-8" />
            <h3 className="font-serif text-2xl">Your wishlist is waiting</h3>
            <p className="mt-2 text-sm text-muted-foreground">When something feels right, save it here for later.</p>
            <Link
              href="/shop"
              className="mt-6 inline-flex min-h-11 items-center bg-primary px-5 text-sm font-bold text-primary-foreground"
            >
              Explore ingredients
            </Link>
          </div>
        )}
      </div>
    </AccountShell>
  )
}

export function AddressesPage() {
  const { rawUser } = useAuth()
  const addresses = (rawUser?.addresses || []).map(toFrontendAddress)

  return (
    <AccountShell current="Addresses">
      <div className="space-y-8">
        <div className="flex items-end justify-between">
          <div>
            <p className="eyebrow">Delivery details</p>
            <h2 className="display mt-3 text-5xl">Address book</h2>
          </div>
          <button type="button" className="min-h-11 bg-primary px-4 text-sm font-bold text-primary-foreground">
            Add address
          </button>
        </div>
        {addresses.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {addresses.map((address) => (
              <AddressCard key={address.id} address={address} editable />
            ))}
          </div>
        ) : (
          <div className="border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
            No saved delivery addresses yet. Addresses you use at checkout will appear here.
          </div>
        )}
      </div>
    </AccountShell>
  )
}

export function NotificationsPage() {
  return (
    <AccountShell current="Notifications">
      <div className="space-y-8">
        <div>
          <p className="eyebrow">Stay close to the source</p>
          <h2 className="display mt-3 text-5xl">Notifications</h2>
        </div>
        <div className="border border-border bg-surface p-6 text-center text-sm text-muted-foreground">
          <Bell className="mx-auto mb-2 text-secondary size-6" />
          You have no new notifications. Order tracking and harvest notes will appear here.
        </div>
      </div>
    </AccountShell>
  )
}

export function SettingsPage() {
  return (
    <AccountShell current="Settings">
      <div className="max-w-2xl space-y-8">
        <div>
          <p className="eyebrow">Your preferences</p>
          <h2 className="display mt-3 text-5xl">Settings</h2>
        </div>
        <div className="space-y-5 border-t border-border pt-6">
          <h3 className="font-serif text-2xl">Communication preferences</h3>
          <label className="flex items-center justify-between border-b border-border py-4 text-sm">
            <span>Order status updates</span>
            <input type="checkbox" defaultChecked />
          </label>
          <label className="flex items-center justify-between border-b border-border py-4 text-sm">
            <span>Kitchen Wisdom journal updates</span>
            <input type="checkbox" defaultChecked />
          </label>
        </div>
      </div>
    </AccountShell>
  )
}

export function CartPage() {
  const { items, updateQuantity, clearCart } = useCart()
  const router = useRouter()

  return (
    <main className="container-shell py-28 sm:py-32">
      <div className="mb-6">
        <BackButton fallbackHref="/shop" label="Continue shopping" variant="ghost" />
      </div>
      <div className="flex items-end justify-between border-b border-border pb-6">
        <div>
          <p className="eyebrow">Your considered pantry</p>
          <h1 className="display mt-3 text-6xl">Cart</h1>
        </div>
        {items.length > 0 && (
          <button
            type="button"
            onClick={() => clearCart()}
            className="text-xs font-bold text-muted-foreground hover:text-destructive transition-colors"
          >
            Clear cart
          </button>
        )}
      </div>
      {items.length > 0 ? (
        <div className="mt-12 grid gap-12 lg:grid-cols-[1fr_360px]">
          <div>
            <div className="flex items-center gap-2 border border-success/30 bg-success/10 p-4 text-sm mb-6">
              <Truck size={18} className="text-success shrink-0" /> Free delivery on orders over ₹999
            </div>
            {items.map((line) => (
              <CartItem key={line.id} line={line} onChange={updateQuantity} />
            ))}
          </div>
          <CartSummary lines={items} onProceedToCheckout={() => router.push('/checkout')} />
        </div>
      ) : (
        <Empty
          title="Your cart is waiting"
          copy="When something feels right, it will be here."
          href="/shop"
          action="Explore the pantry"
        />
      )}
    </main>
  )
}

export function CheckoutPage() {
  const router = useRouter()
  const { items, subtotal, deliveryFee, total, refreshCart } = useCart()
  const { rawUser, isAuthenticated } = useAuth()
  const { addToast } = useToast()

  const [active, setActive] = useState(1)
  const [submitting, setSubmitting] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<'razorpay' | 'cod'>('razorpay')

  const [shippingName, setShippingName] = useState(rawUser?.name || '')
  const [street, setStreet] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  const [postalCode, setPostalCode] = useState('')
  const [phone, setPhone] = useState(rawUser?.phone || '')

  // Pre-fill from user addresses if available
  useEffect(() => {
    if (rawUser?.addresses && rawUser.addresses.length > 0) {
      const def = rawUser.addresses.find((a) => a.isDefault) || rawUser.addresses[0]
      setShippingName(def.name || rawUser.name || '')
      setStreet(def.street || '')
      setCity(def.city || '')
      setState(def.state || '')
      setPostalCode(def.postalCode || '')
      setPhone(def.phone || rawUser.phone || '')
    }
  }, [rawUser])

  const handlePlaceOrder = async () => {
    if (!isAuthenticated) {
      addToast({
        title: 'Sign in required',
        description: 'Please sign in or create an account to complete your order.',
        variant: 'error',
      })
      router.push('/auth/login')
      return
    }

    if (items.length === 0) {
      addToast({
        title: 'Your cart is empty',
        description: 'Please add ingredients before checking out.',
        variant: 'error',
      })
      router.push('/shop')
      return
    }

    setSubmitting(true)

    try {
      // 1. Create order in PostgreSQL backend
      const orderPayload = {
        orderItems: items.map((i) => ({
          productId: i.productId || i.id,
          quantity: i.quantity,
          variant: i.unit,
        })),
        shippingAddress: {
          name: shippingName || rawUser?.name || 'Patron',
          address: street || 'Heritage Quarter',
          city: city || 'New Delhi',
          state: state || 'Delhi',
          postalCode: postalCode || '110001',
          country: 'India',
          phone: phone || rawUser?.phone || '+91 98765 43210',
        },
        paymentMethod,
      }

      const createdOrder = await createOrderApi(orderPayload)

      // Synchronize frontend cart with backend (backend transaction clears the cart)
      await refreshCart()
      try {
        if (typeof window !== 'undefined') localStorage.removeItem('fso_guest_cart')
      } catch {}

      if (paymentMethod === 'cod') {
        router.push(`/checkout/success?orderId=${encodeURIComponent(createdOrder.orderNumber || createdOrder.id)}&method=cod`)
        return
      }

      // Online payment via official Razorpay Checkout
      const scriptLoaded = await loadRazorpayScript()
      if (!scriptLoaded) {
        addToast({
          title: 'Payment gateway error',
          description: 'Failed to load Razorpay Checkout. Your order was created and is pending payment.',
          variant: 'error',
        })
        router.push(`/checkout/success?orderId=${encodeURIComponent(createdOrder.orderNumber || createdOrder.id)}&status=pending_payment`)
        return
      }

      // Obtain backend-authoritative Razorpay order
      const rzpData = await createRazorpayOrderApi(createdOrder.id)

      const options = {
        key: rzpData.keyId,
        amount: rzpData.amount,
        currency: rzpData.currency || 'INR',
        name: 'Flash Sales Online',
        description: `Order ${createdOrder.orderNumber || createdOrder.id}`,
        order_id: rzpData.id || rzpData.orderId,
        handler: async (response: {
          razorpay_payment_id: string
          razorpay_order_id: string
          razorpay_signature: string
        }) => {
          setSubmitting(true)
          try {
            const verification = await verifyPaymentApi({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              orderId: createdOrder.id,
            })

            if (verification.success && verification.paymentStatus === 'CAPTURED') {
              router.push(`/checkout/success?orderId=${encodeURIComponent(createdOrder.orderNumber || createdOrder.id)}&status=captured`)
            } else {
              router.push(`/checkout/success?orderId=${encodeURIComponent(createdOrder.orderNumber || createdOrder.id)}&status=pending_payment`)
            }
          } catch (verifyErr) {
            console.error('Verification error:', verifyErr)
            router.push(`/checkout/success?orderId=${encodeURIComponent(createdOrder.orderNumber || createdOrder.id)}&status=failed`)
          } finally {
            setSubmitting(false)
          }
        },
        prefill: {
          name: shippingName || rawUser?.name,
          email: rawUser?.email,
          contact: phone || rawUser?.phone,
        },
        theme: {
          color: '#1a365d',
        },
        modal: {
          ondismiss: () => {
            setSubmitting(false)
            addToast({
              title: 'Payment cancelled',
              description: 'Payment was not completed. Your order has been saved and can be paid later.',
              variant: 'default',
            })
            router.push(`/checkout/success?orderId=${encodeURIComponent(createdOrder.orderNumber || createdOrder.id)}&status=pending_payment`)
          },
        },
      }

      const rzp = new (window as any).Razorpay(options)
      rzp.open()
      setSubmitting(false)
    } catch (err) {
      addToast({
        title: 'Order placement failed',
        description: err instanceof Error ? err.message : 'Could not complete order. Please try again.',
        variant: 'error',
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="container-shell py-28 sm:py-32">
      <div className="mb-6">
        <BackButton fallbackHref="/cart" label="Back to cart" variant="ghost" />
      </div>
      <div className="mb-8">
        <p className="eyebrow">A calm final step</p>
        <h1 className="display mt-3 text-6xl">Checkout</h1>
      </div>
      <CheckoutStepper active={active} />
      <div className="mt-10 grid gap-12 lg:grid-cols-[1fr_360px]">
        <div className="space-y-8">
          <CheckoutPanel step={1} title="Delivery address" active={active} onContinue={() => setActive(2)}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="text-xs font-bold uppercase tracking-wider" htmlFor="chk-name">
                  Full name
                </label>
                <input
                  id="chk-name"
                  value={shippingName}
                  onChange={(e) => setShippingName(e.target.value)}
                  className="mt-2 min-h-12 w-full border border-input bg-background px-4"
                  placeholder="Recipient name"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs font-bold uppercase tracking-wider" htmlFor="chk-street">
                  Street address
                </label>
                <input
                  id="chk-street"
                  value={street}
                  onChange={(e) => setStreet(e.target.value)}
                  className="mt-2 min-h-12 w-full border border-input bg-background px-4"
                  placeholder="House/flat no, street, locality"
                />
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-wider" htmlFor="chk-city">
                  City
                </label>
                <input
                  id="chk-city"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="mt-2 min-h-12 w-full border border-input bg-background px-4"
                  placeholder="City"
                />
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-wider" htmlFor="chk-state">
                  State
                </label>
                <input
                  id="chk-state"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  className="mt-2 min-h-12 w-full border border-input bg-background px-4"
                  placeholder="State"
                />
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-wider" htmlFor="chk-postal">
                  PIN code
                </label>
                <input
                  id="chk-postal"
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value)}
                  className="mt-2 min-h-12 w-full border border-input bg-background px-4"
                  placeholder="6-digit PIN"
                />
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-wider" htmlFor="chk-phone">
                  Phone
                </label>
                <input
                  id="chk-phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="mt-2 min-h-12 w-full border border-input bg-background px-4"
                  placeholder="+91 Phone"
                />
              </div>
            </div>
          </CheckoutPanel>

          <CheckoutPanel step={2} title="Delivery method" active={active} onContinue={() => setActive(3)}>
            <label className="flex gap-3 border border-border p-4 bg-surface cursor-pointer">
              <input type="radio" name="delivery" defaultChecked className="mt-1" />
              <span className="text-sm">
                <strong>Standard heritage delivery</strong>
                <br />
                <span className="text-muted-foreground">
                  3–5 business days · {deliveryFee === 0 ? 'Free delivery' : `₹${deliveryFee}`}
                </span>
              </span>
            </label>
          </CheckoutPanel>

          <CheckoutPanel step={3} title="Payment" active={active} onContinue={() => setActive(4)}>
            <div className="space-y-3">
              <label className="flex gap-3 border border-border p-4 bg-surface cursor-pointer">
                <input
                  type="radio"
                  name="payment"
                  checked={paymentMethod === 'razorpay'}
                  onChange={() => setPaymentMethod('razorpay')}
                  className="mt-1"
                />
                <span className="text-sm">
                  <strong>Online Payment (Razorpay)</strong>
                  <br />
                  <span className="text-muted-foreground">UPI, Cards, Net Banking (100% Encrypted)</span>
                </span>
              </label>
              <label className="flex gap-3 border border-border p-4 bg-surface cursor-pointer">
                <input
                  type="radio"
                  name="payment"
                  checked={paymentMethod === 'cod'}
                  onChange={() => setPaymentMethod('cod')}
                  className="mt-1"
                />
                <span className="text-sm">
                  <strong>Cash on delivery</strong>
                  <br />
                  <span className="text-muted-foreground">Pay when your pantry arrives at your door</span>
                </span>
              </label>
            </div>
          </CheckoutPanel>

          <CheckoutPanel step={4} title="Review & place order" active={active} onContinue={() => undefined}>
            <p className="text-sm leading-6 text-muted-foreground">
              By placing this order, you agree to our delivery and cancellation terms. Your order is processed securely
              through our PostgreSQL-verified backend.
            </p>
            <button
              type="button"
              onClick={handlePlaceOrder}
              disabled={submitting}
              className="mt-5 inline-flex min-h-12 items-center justify-center bg-primary px-6 text-sm font-bold text-primary-foreground hover:bg-secondary disabled:opacity-50 transition-colors"
            >
              {submitting ? 'Placing order...' : 'Place order'} <Check className="ml-2" size={16} />
            </button>
          </CheckoutPanel>
        </div>
        <CartSummary checkout lines={items} />
      </div>
    </main>
  )
}

function CheckoutPanel({
  step,
  title,
  active,
  onContinue,
  children,
}: {
  step: number
  title: string
  active: number
  onContinue: () => void
  children: React.ReactNode
}) {
  const open = active === step
  return (
    <section className={`border border-border bg-surface p-6 ${open ? '' : 'opacity-60'}`}>
      <div className="flex items-center gap-3">
        <span
          className={`grid size-8 place-items-center rounded-full ${
            active > step ? 'bg-success text-primary-foreground' : 'border border-border'
          }`}
        >
          {active > step ? <Check size={15} /> : step}
        </span>
        <h2 className="font-serif text-2xl">{title}</h2>
      </div>
      {open ? (
        <div className="mt-6">
          {children}
          {step < 4 ? (
            <button
              type="button"
              onClick={onContinue}
              className="mt-6 min-h-11 bg-primary px-5 text-sm font-bold text-primary-foreground hover:bg-secondary transition-colors"
            >
              Continue
            </button>
          ) : null}
        </div>
      ) : null}
    </section>
  )
}

export function SuccessPage({ failed = false }: { failed?: boolean }) {
  const searchParams = useSearchParams()
  const orderId = searchParams.get('orderId') || 'FSO-CONFIRMED'
  const isCod = searchParams.get('method') === 'cod'

  const [authoritativeState, setAuthoritativeState] = useState<{
    status: string
    paymentStatus: string
    loading: boolean
  }>({
    status: 'PENDING',
    paymentStatus: isCod ? 'PENDING' : 'PENDING',
    loading: true,
  })

  useEffect(() => {
    let isMounted = true
    async function fetchStatus() {
      if (!orderId || orderId === 'FSO-CONFIRMED') {
        if (isMounted) setAuthoritativeState((s) => ({ ...s, loading: false }))
        return
      }
      try {
        const res = await getPaymentStatusApi(orderId)
        if (isMounted && res) {
          setAuthoritativeState({
            status: res.status,
            paymentStatus: res.paymentStatus,
            loading: false,
          })
          return
        }
      } catch {
        // Fallback: fetch order details directly
        try {
          const ord = await getOrderByIdApi(orderId)
          if (isMounted && ord) {
            setAuthoritativeState({
              status: ord.status,
              paymentStatus: ord.paymentStatus || 'PENDING',
              loading: false,
            })
            return
          }
        } catch {
          if (isMounted) setAuthoritativeState((s) => ({ ...s, loading: false }))
        }
      }
    }
    fetchStatus()
    return () => {
      isMounted = false
    }
  }, [orderId, isCod])

  const isCaptured = authoritativeState.paymentStatus === 'CAPTURED'
  const isFailed = failed || authoritativeState.paymentStatus === 'FAILED'

  const eyebrow = isFailed
    ? 'Payment needs attention'
    : isCaptured
    ? 'Payment verified · Order confirmed'
    : isCod
    ? 'Order confirmed · Cash on Delivery'
    : 'Order created · Payment pending'

  const title = isFailed
    ? 'Your order is still safe.'
    : isCaptured
    ? 'A thoughtful order, on its way.'
    : isCod
    ? 'A thoughtful order, on its way.'
    : 'Order recorded in our pantry.'

  const message = isFailed
    ? 'Payment was not completed. You can retry payment without losing your order items.'
    : isCaptured
    ? `Order ${orderId} is confirmed and payment has been authoritatively verified. We will notify you when it ships.`
    : isCod
    ? `Order ${orderId} is confirmed under Cash on Delivery. Please keep exact change ready upon delivery.`
    : `Order ${orderId} has been created in our database with status PENDING. Complete payment to confirm order.`

  return (
    <main className="container-shell flex min-h-[calc(100vh-5rem)] items-center justify-center py-32">
      <div className="max-w-2xl text-center">
        <div
          className={`mx-auto grid size-20 place-items-center rounded-full ${
            isFailed
              ? 'bg-destructive/10 text-destructive'
              : isCaptured || isCod
              ? 'bg-success/10 text-success'
              : 'bg-primary/10 text-primary'
          }`}
        >
          {isFailed ? '!' : isCaptured || isCod ? <Check size={32} /> : <Package size={32} />}
        </div>
        <p className="eyebrow mt-8">{eyebrow}</p>
        <h1 className="display mt-3 text-6xl">{title}</h1>
        <p className="mx-auto mt-5 max-w-lg text-sm leading-6 text-muted-foreground">{message}</p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            href={isFailed ? '/checkout' : `/account/orders`}
            className="min-h-12 bg-primary px-6 py-3 text-sm font-bold text-primary-foreground hover:bg-secondary transition-colors"
          >
            {isFailed ? 'Retry payment' : 'View all orders'}
          </Link>
          <Link
            href="/shop"
            className="min-h-12 border border-border px-6 py-3 text-sm font-bold hover:border-secondary transition-colors"
          >
            Continue shopping
          </Link>
        </div>
      </div>
    </main>
  )
}

function Empty({ title, copy, href, action }: { title: string; copy: string; href: string; action: string }) {
  return (
    <div className="border border-dashed border-border p-16 text-center">
      <Heart className="mx-auto text-secondary size-8" />
      <h2 className="mt-5 font-serif text-3xl">{title}</h2>
      <p className="mt-2 text-sm text-muted-foreground">{copy}</p>
      <Link
        href={href}
        className="mt-6 inline-flex min-h-11 items-center bg-primary px-5 text-sm font-bold text-primary-foreground hover:bg-secondary transition-colors"
      >
        {action}
      </Link>
    </div>
  )
}
