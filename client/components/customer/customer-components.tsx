'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import React, { useState } from 'react'
import { ArrowRight, Check, Minus, Plus, ShieldCheck, Trash2, LogOut, AlertCircle } from 'lucide-react'
import type { Address, CartLine, CustomerUser, Order, Recommendation } from '@/types/customer'
import { recommendations } from '@/data/customer'
import { useAuth, getDashboardRouteForUser } from '@/lib/auth-context'
import { useCart } from '@/lib/cart-context'
import { sendEmailOtpApi } from '@/lib/api/auth'
import { BackButton } from '@/components/ui/back-button'

export function AuthCard({ mode }: { mode: 'login' | 'register' | 'forgot' | 'otp' }) {
  const router = useRouter()
  const { login, register } = useAuth()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [otp, setOtp] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)

  const titles = {
    login: 'Welcome back',
    register: 'Create your account',
    forgot: 'Reset your password',
    otp: 'Check your inbox',
  }
  const descriptions = {
    login: 'Your pantry, stories, and saved discoveries are waiting.',
    register: 'Keep your favourite ingredients close and your orders in one calm place.',
    forgot: 'Enter your email and we will send a secure reset link.',
    otp: `We sent a verification code to ${email || 'your email'}.`,
  }

  const handleSendOtp = async () => {
    if (!email) {
      setError('Please enter your email address first.')
      return
    }
    setError(null)
    setLoading(true)
    try {
      await sendEmailOtpApi(email)
      setOtpSent(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send verification code.')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      if (mode === 'login') {
        const loggedInUser = await login(email, password)
        const targetRoute = getDashboardRouteForUser(loggedInUser)
        router.push(targetRoute)
      } else if (mode === 'register') {
        if (password !== confirmPassword) {
          setError('Passwords do not match.')
          setLoading(false)
          return
        }

        if (!otpSent) {
          // If OTP has not been sent, send it and prompt for code
          await sendEmailOtpApi(email)
          setOtpSent(true)
          setLoading(false)
          return
        }

        if (!otp) {
          setError('Please enter the 6-digit verification code sent to your email.')
          setLoading(false)
          return
        }

        const registeredUser = await register({
          name,
          email,
          password,
          phone: phone || undefined,
          emailOtp: otp,
        })
        const targetRoute = getDashboardRouteForUser(registeredUser)
        router.push(targetRoute)
      } else if (mode === 'forgot') {
        setSubmitted(true)
      } else if (mode === 'otp') {
        setSubmitted(true)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="container-shell flex min-h-[calc(100vh-5rem)] items-center justify-center py-20">
      <div className="grid w-full max-w-5xl overflow-hidden border border-border bg-surface shadow-[var(--shadow-soft)] md:grid-cols-[0.9fr_1.1fr]">
        <div className="hidden min-h-[560px] bg-primary p-12 text-primary-foreground md:flex md:flex-col md:justify-between">
          <div>
            <p className="eyebrow text-accent">Flash Sales Online</p>
            <h1 className="display mt-6 max-w-sm text-6xl">Good food begins with knowing where it came from.</h1>
          </div>
          <p className="max-w-xs text-sm leading-6 opacity-75">
            A considered pantry for people who care about the hands, places, and methods behind what they eat.
          </p>
        </div>
        <div className="p-6 sm:p-12">
          <BackButton fallbackHref="/" label="Back to the pantry" variant="ghost" className="text-xs" />
          <div className="mt-12 max-w-md">
            <p className="eyebrow">{mode === 'otp' ? 'Verification' : 'Your account'}</p>
            <h2 className="display mt-3 text-5xl">{titles[mode]}</h2>
            <p className="mt-4 text-sm leading-6 text-muted-foreground">{descriptions[mode]}</p>

            {error && (
              <div className="mt-6 flex items-start gap-3 border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
                <AlertCircle className="size-5 shrink-0 mt-0.5" />
                <p>{error}</p>
              </div>
            )}

            {submitted ? (
              <div className="mt-10 border border-success/40 bg-success/10 p-5 text-sm leading-6">
                <Check className="mb-3 text-success" />
                <strong>All set.</strong> If an account exists with that address, instructions have been sent.
              </div>
            ) : (
              <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
                {mode === 'otp' ? (
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider" htmlFor="otp">
                      Six-digit code
                    </label>
                    <input
                      id="otp"
                      inputMode="numeric"
                      maxLength={6}
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      required
                      className="mt-2 min-h-14 w-full border border-input bg-background px-4 text-center text-xl tracking-[0.5em]"
                      placeholder="000000"
                    />
                  </div>
                ) : mode !== 'forgot' ? (
                  <>
                    {mode === 'register' && (
                      <div>
                        <label className="text-xs font-bold uppercase tracking-wider" htmlFor="reg-name">
                          Full name
                        </label>
                        <input
                          id="reg-name"
                          type="text"
                          required
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          className="mt-2 min-h-12 w-full border border-input bg-background px-4"
                          placeholder="Your full name"
                        />
                      </div>
                    )}
                    <div>
                      <label className="text-xs font-bold uppercase tracking-wider" htmlFor="email-addr">
                        Email address
                      </label>
                      <input
                        id="email-addr"
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="mt-2 min-h-12 w-full border border-input bg-background px-4"
                        placeholder="you@example.com"
                      />
                    </div>
                    {mode === 'register' && (
                      <div>
                        <label className="text-xs font-bold uppercase tracking-wider" htmlFor="reg-phone">
                          Phone number (optional)
                        </label>
                        <input
                          id="reg-phone"
                          type="tel"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          className="mt-2 min-h-12 w-full border border-input bg-background px-4"
                          placeholder="+91 98765 43210"
                        />
                      </div>
                    )}
                    <div>
                      <label className="text-xs font-bold uppercase tracking-wider" htmlFor="password">
                        Password
                      </label>
                      <div className="relative mt-2">
                        <input
                          id="password"
                          type={showPassword ? 'text' : 'password'}
                          required
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="min-h-12 w-full border border-input bg-background px-4 pr-16"
                          placeholder="Your password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((value) => !value)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 px-3 text-xs text-muted-foreground"
                        >
                          {showPassword ? 'Hide' : 'Show'}
                        </button>
                      </div>
                    </div>
                    {mode === 'login' ? (
                      <label className="flex items-center gap-2 text-sm">
                        <input type="checkbox" defaultChecked /> Remember me
                      </label>
                    ) : (
                      <>
                        <div>
                          <label className="text-xs font-bold uppercase tracking-wider" htmlFor="confirm-password">
                            Confirm password
                          </label>
                          <input
                            id="confirm-password"
                            type="password"
                            required
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="mt-2 min-h-12 w-full border border-input bg-background px-4"
                            placeholder="Repeat your password"
                          />
                        </div>
                        {otpSent ? (
                          <div>
                            <div className="flex items-center justify-between">
                              <label className="text-xs font-bold uppercase tracking-wider" htmlFor="reg-otp">
                                Email Verification Code
                              </label>
                              <button
                                type="button"
                                onClick={handleSendOtp}
                                disabled={loading}
                                className="text-xs text-secondary underline hover:opacity-80"
                              >
                                Resend code
                              </button>
                            </div>
                            <input
                              id="reg-otp"
                              inputMode="numeric"
                              maxLength={6}
                              required
                              value={otp}
                              onChange={(e) => setOtp(e.target.value)}
                              className="mt-2 min-h-12 w-full border border-input bg-background px-4 tracking-widest"
                              placeholder="6-digit OTP from your email"
                            />
                          </div>
                        ) : null}
                      </>
                    )}
                  </>
                ) : (
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider" htmlFor="forgot-email">
                      Email address
                    </label>
                    <input
                      id="forgot-email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="mt-2 min-h-12 w-full border border-input bg-background px-4"
                      placeholder="you@example.com"
                    />
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="flex min-h-12 w-full items-center justify-center gap-2 bg-primary px-5 text-sm font-bold text-primary-foreground hover:bg-secondary disabled:opacity-50 transition-colors"
                >
                  {loading
                    ? 'Please wait...'
                    : mode === 'login'
                    ? 'Sign in'
                    : mode === 'register'
                    ? otpSent
                      ? 'Verify & Create account'
                      : 'Send verification code'
                    : 'Send secure link'}{' '}
                  <ArrowRight size={16} />
                </button>
                {mode === 'login' ? (
                  <Link
                    href="/auth/forgot-password"
                    className="block text-center text-sm text-muted-foreground hover:text-secondary"
                  >
                    Forgot password?
                  </Link>
                ) : null}
              </form>
            )}
            <div className="mt-10 border-t border-border pt-6 text-center text-sm text-muted-foreground">
              {mode === 'login' ? (
                <>
                  New here?{' '}
                  <Link href="/auth/register" className="font-bold text-secondary">
                    Create an account
                  </Link>
                </>
              ) : (
                <>
                  Already have an account?{' '}
                  <Link href="/auth/login" className="font-bold text-secondary">
                    Sign in
                  </Link>
                </>
              )}
            </div>
            <div className="mt-4 text-center text-xs text-muted-foreground border-t border-border/50 pt-3">
              Are you an artisan producer or maker?{' '}
              <Link href="/seller/register" className="font-bold text-accent hover:underline">
                Register as a Seller →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}

export function AccountShell({ children, current }: { children: React.ReactNode; current: string }) {
  const { user, logout } = useAuth()
  const router = useRouter()

  const links = [
    ['Overview', '/account'],
    ['Profile', '/account/profile'],
    ['Orders', '/account/orders'],
    ['Wishlist', '/account/wishlist'],
    ['Addresses', '/account/addresses'],
    ['Notifications', '/account/notifications'],
    ['Settings', '/account/settings'],
  ]

  const firstName = user ? user.name.split(' ')[0] : 'Patron'

  const handleLogout = async () => {
    await logout()
    router.push('/')
  }

  return (
    <main className="container-shell py-28 sm:py-32">
      <div className="mb-6">
        <BackButton fallbackHref="/shop" label="Back to pantry" variant="ghost" />
      </div>
      <div className="mb-12 flex flex-col justify-between gap-5 border-b border-border pb-8 md:flex-row md:items-end">
        <div>
          <p className="eyebrow">Your account</p>
          <h1 className="display mt-3 text-6xl">Hello, {firstName}.</h1>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex min-h-11 items-center gap-2 border border-border px-4 text-sm font-bold text-muted-foreground hover:border-destructive hover:text-destructive transition-colors"
          >
            <LogOut size={16} /> Sign out
          </button>
          <Link
            href="/shop"
            className="inline-flex min-h-11 items-center gap-2 border border-border px-4 text-sm font-bold hover:border-secondary hover:text-secondary transition-colors"
          >
            Continue shopping <ArrowRight size={16} />
          </Link>
        </div>
      </div>
      <div className="grid gap-12 lg:grid-cols-[220px_1fr]">
        <aside>
          <nav aria-label="Account navigation" className="flex gap-1 overflow-x-auto lg:flex-col">
            {links.map(([label, href]) => (
              <Link
                key={label}
                href={href}
                className={`whitespace-nowrap border-b-2 px-3 py-3 text-sm ${
                  current === label
                    ? 'border-secondary font-bold text-secondary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                {label}
              </Link>
            ))}
          </nav>
        </aside>
        <div>{children}</div>
      </div>
    </main>
  )
}

export function ProfileCard({ user: propUser }: { user?: CustomerUser }) {
  const { user: authUser } = useAuth()
  const user = propUser || authUser

  if (!user) {
    return (
      <div className="flex flex-col gap-5 border border-border bg-surface p-6 sm:flex-row sm:items-center">
        <div>
          <p className="text-xl font-semibold">Not signed in</p>
          <p className="mt-1 text-sm text-muted-foreground">Sign in to access your orders and saved pantry.</p>
        </div>
        <Link href="/auth/login" className="sm:ml-auto inline-flex min-h-10 items-center bg-primary px-4 text-sm font-bold text-primary-foreground">
          Sign in
        </Link>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5 border border-border bg-surface p-6 sm:flex-row sm:items-center">
      <div className="relative size-20 shrink-0 overflow-hidden rounded-full bg-surface-muted">
        <Image src={user.avatar} alt="" fill sizes="80px" className="object-cover" />
      </div>
      <div>
        <p className="text-xl font-semibold">{user.name}</p>
        <p className="mt-1 text-sm text-muted-foreground">{user.email}</p>
        <p className="mt-2 text-xs font-bold uppercase tracking-wider text-secondary">{user.diet} pantry</p>
      </div>
      <Link href="/account/profile" className="sm:ml-auto text-sm font-bold text-secondary">
        Edit profile
      </Link>
    </div>
  )
}

export function AddressCard({ address, editable = false }: { address: Address; editable?: boolean }) {
  return (
    <div className="border border-border bg-surface p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-bold">
            {address.label}{' '}
            {address.isDefault ? <span className="ml-2 text-xs font-normal text-secondary">Default</span> : null}
          </p>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            {address.name}
            <br />
            {address.lines.map((line) => (
              <span key={line}>
                {line}
                <br />
              </span>
            ))}
            {address.phone}
          </p>
        </div>
        {editable ? (
          <button type="button" aria-label={`Edit ${address.label} address`} className="text-sm text-secondary">
            Edit
          </button>
        ) : null}
      </div>
    </div>
  )
}

export function OrderCard({ order }: { order: Order }) {
  return (
    <Link href={`/account/order/${order.id}`} className="block border border-border bg-surface p-5 hover:border-secondary transition-colors">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-bold">{order.id}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Placed {order.date} · {order.items.length} {order.items.length === 1 ? 'item' : 'items'}
          </p>
        </div>
        <span className="border border-success/40 px-3 py-1 text-xs font-bold text-success">{order.status}</span>
      </div>
      <div className="mt-5 flex items-end justify-between border-t border-border pt-4">
        <p className="text-sm text-muted-foreground">Arrives {order.eta}</p>
        <p className="font-bold">₹{order.total.toLocaleString('en-IN')}</p>
      </div>
    </Link>
  )
}

export function RecommendationGrid({ items = recommendations }: { items?: Recommendation[] }) {
  return (
    <div className="grid gap-5 sm:grid-cols-3">
      {items.map((item) => (
        <Link key={item.slug} href={`/shop/product/${item.slug}`} className="group block">
          <div className="relative aspect-[4/3] overflow-hidden bg-surface-muted">
            <Image
              src={item.image}
              alt={item.name}
              fill
              sizes="(max-width: 640px) 90vw, 30vw"
              className="object-cover transition-transform duration-300 group-hover:scale-105"
            />
          </div>
          <p className="mt-4 text-xs uppercase tracking-wider text-secondary">{item.reason}</p>
          <h3 className="mt-1 font-serif text-2xl group-hover:text-secondary transition-colors">{item.name}</h3>
          <p className="mt-2 font-bold">{item.price}</p>
        </Link>
      ))}
    </div>
  )
}

export function CartItem({ line, onChange }: { line: CartLine; onChange: (id: string, quantity: number) => void }) {
  return (
    <div className="flex gap-4 border-b border-border py-5">
      <div className="relative size-24 shrink-0 overflow-hidden bg-surface-muted">
        <Image src={line.image} alt={line.name} fill sizes="96px" className="object-cover" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-semibold">{line.name}</p>
        <p className="mt-1 text-sm text-muted-foreground">{line.producer} · {line.unit}</p>
        <div className="mt-4 flex items-center gap-3">
          <div className="flex items-center border border-border">
            <button
              type="button"
              aria-label={`Decrease ${line.name} quantity`}
              onClick={() => onChange(line.id, Math.max(0, line.quantity - 1))}
              className="grid size-9 place-items-center"
            >
              <Minus size={14} />
            </button>
            <span className="w-8 text-center text-sm">{line.quantity}</span>
            <button
              type="button"
              aria-label={`Increase ${line.name} quantity`}
              onClick={() => onChange(line.id, line.quantity + 1)}
              className="grid size-9 place-items-center"
            >
              <Plus size={14} />
            </button>
          </div>
          <button
            type="button"
            onClick={() => onChange(line.id, 0)}
            className="text-xs text-muted-foreground hover:text-destructive transition-colors"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
      <p className="font-bold">₹{(line.price * line.quantity).toLocaleString('en-IN')}</p>
    </div>
  )
}

export function CartSummary({
  lines: propLines,
  checkout = false,
  onProceedToCheckout,
}: {
  lines?: CartLine[]
  checkout?: boolean
  onProceedToCheckout?: () => void
}) {
  const { items: cartItems, subtotal: liveSubtotal, deliveryFee: liveDelivery, total: liveTotal } = useCart()

  const lines = propLines || cartItems
  const subtotal = propLines ? lines.reduce((sum, item) => sum + item.price * item.quantity, 0) : liveSubtotal
  const delivery = propLines ? (subtotal >= 999 || subtotal === 0 ? 0 : 80) : liveDelivery
  const total = propLines ? subtotal + delivery : liveTotal

  return (
    <div className="border border-border bg-surface p-6">
      <p className="eyebrow">{checkout ? 'Your order' : 'Summary'}</p>
      <div className="mt-5 space-y-3 text-sm">
        <div className="flex justify-between">
          <span>Subtotal</span>
          <span>₹{subtotal.toLocaleString('en-IN')}</span>
        </div>
        <div className="flex justify-between">
          <span>Delivery</span>
          <span>{delivery ? `₹${delivery}` : 'Free'}</span>
        </div>
        <div className="flex justify-between">
          <span>Taxes</span>
          <span>Included</span>
        </div>
        <div className="flex justify-between border-t border-border pt-4 text-base font-bold">
          <span>Total</span>
          <span>₹{total.toLocaleString('en-IN')}</span>
        </div>
      </div>
      {!checkout ? (
        onProceedToCheckout ? (
          <button
            type="button"
            onClick={onProceedToCheckout}
            className="mt-6 flex min-h-12 w-full items-center justify-center gap-2 bg-primary text-sm font-bold text-primary-foreground hover:bg-secondary transition-colors"
          >
            Go to checkout <ArrowRight size={16} />
          </button>
        ) : (
          <Link
            href="/checkout"
            className="mt-6 flex min-h-12 w-full items-center justify-center gap-2 bg-primary text-sm font-bold text-primary-foreground hover:bg-secondary transition-colors"
          >
            Go to checkout <ArrowRight size={16} />
          </Link>
        )
      ) : null}
      <p className="mt-4 flex items-center justify-center gap-2 text-xs text-muted-foreground">
        <ShieldCheck size={14} /> Secure checkout preview
      </p>
    </div>
  )
}

export function CheckoutStepper({ active = 1 }: { active?: number }) {
  return (
    <div className="flex items-center gap-2 overflow-x-auto border-y border-border py-4">
      {['Address', 'Delivery', 'Payment', 'Review'].map((step, index) => (
        <div key={step} className="flex min-w-max items-center gap-2 text-xs font-bold uppercase tracking-wider">
          <span
            className={`grid size-7 place-items-center rounded-full border ${
              index + 1 <= active
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border text-muted-foreground'
            }`}
          >
            {index + 1 < active ? <Check size={14} /> : index + 1}
          </span>
          <span className={index + 1 === active ? 'text-foreground' : 'text-muted-foreground'}>{step}</span>
          {index < 3 ? <span className="mx-1 text-border">/</span> : null}
        </div>
      ))}
    </div>
  )
}
