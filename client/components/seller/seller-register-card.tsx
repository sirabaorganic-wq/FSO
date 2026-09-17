'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import {
  ShieldCheck,
  Sparkles,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Building2,
  MapPin,
  Lock,
  ArrowRight,
  Send,
  HelpCircle,
  Truck,
  Flame,
  Award,
} from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { sendEmailOtpApi } from '@/lib/api/auth'
import { BackButton } from '@/components/ui/back-button'
import { agricultureImages, logoUrl } from '@/data/images'

const BUSINESS_TYPES = [
  { value: 'artisan', label: 'Artisan & Craft Producer', desc: 'Small batch, handmade heritage treasures' },
  { value: 'farmer', label: 'Farmer / Cultivator', desc: 'Direct from organic and regenerative farms' },
  { value: 'cooperative', label: 'Cooperative / FPO', desc: 'Farmer collectives and producer societies' },
  { value: 'traditional_producer', label: 'Traditional Craft Lineage', desc: 'Ancestral techniques & culinary lineage' },
  { value: 'women_collective', label: "Women's Self-Help Collective", desc: 'Women-led rural micro-enterprises' },
  { value: 'family_business', label: 'Family Heritage Business', desc: 'Generational recipes and artisanal pantry' },
  { value: 'processor', label: 'Natural Food Processor', desc: 'Stone-milled flours, cold-pressed oils' },
  { value: 'manufacturer', label: 'Eco Manufacturer', desc: 'Certified clean sustainable production' },
  { value: 'other', label: 'Speciality Origin Producer', desc: 'Regional delicacies & indigenous crafts' },
]

const INDIAN_STATES = [
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chhattisgarh',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
  'Andaman and Nicobar Islands',
  'Chandigarh',
  'Delhi',
  'Jammu and Kashmir',
  'Ladakh',
  'Puducherry',
]

export function SellerRegisterCard() {
  const router = useRouter()
  const { registerSeller } = useAuth()

  // Form states
  const [businessName, setBusinessName] = useState('')
  const [businessType, setBusinessType] = useState('artisan')
  const [contactPerson, setContactPerson] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('Karnataka')
  const [postalCode, setPostalCode] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [emailOtp, setEmailOtp] = useState('')
  const [termsAccepted, setTermsAccepted] = useState(false)

  // UI / Action states
  const [showPassword, setShowPassword] = useState(false)
  const [otpSent, setOtpSent] = useState(false)
  const [otpCooldown, setOtpCooldown] = useState(0)
  const [sendingOtp, setSendingOtp] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Countdown timer for OTP resend
  useEffect(() => {
    if (otpCooldown <= 0) return
    const timer = setInterval(() => {
      setOtpCooldown((prev) => Math.max(0, prev - 1))
    }, 1000)
    return () => clearInterval(timer)
  }, [otpCooldown])

  const handleSendOtp = async () => {
    if (!email || !email.includes('@')) {
      setError('Please enter a valid official email address first.')
      return
    }
    setError(null)
    setSendingOtp(true)
    try {
      await sendEmailOtpApi(email.toLowerCase().trim())
      setOtpSent(true)
      setOtpCooldown(60)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not send verification code.')
    } finally {
      setSendingOtp(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Validation
    if (!businessName.trim()) {
      setError('Business or Farm name is required.')
      return
    }
    if (!contactPerson.trim()) {
      setError('Contact person name is required.')
      return
    }
    let cleanPhone = phone.trim().replace(/\D/g, '')
    if (cleanPhone.length === 12 && cleanPhone.startsWith('91')) {
      cleanPhone = cleanPhone.slice(2)
    } else if (cleanPhone.length === 11 && cleanPhone.startsWith('0')) {
      cleanPhone = cleanPhone.slice(1)
    }
    if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
      setError('Please enter a valid 10-digit Indian mobile number (starting with 6, 7, 8, or 9).')
      return
    }
    if (!email.trim() || !email.includes('@')) {
      setError('Please enter a valid email address.')
      return
    }
    if (!city.trim() || !state.trim()) {
      setError('Please provide your city and state.')
      return
    }
    const cleanPin = postalCode.trim()
    if (!/^\d{6}$/.test(cleanPin)) {
      setError('Postal PIN code must be a 6-digit number.')
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters long.')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    if (!otpSent) {
      setError('Please verify your email address by requesting a verification code.')
      return
    }
    if (!emailOtp.trim()) {
      setError('Please enter the 6-digit verification code sent to your email.')
      return
    }
    if (!termsAccepted) {
      setError('Please agree to the Producer Heritage & Quality Charter.')
      return
    }

    setLoading(true)
    try {
      await registerSeller({
        businessName: businessName.trim(),
        businessType,
        contactPerson: contactPerson.trim(),
        phone: cleanPhone,
        email: email.toLowerCase().trim(),
        password,
        city: city.trim(),
        state: state.trim(),
        postalCode: cleanPin,
        emailOtp: emailOtp.trim(),
      })

      setSuccess(true)
      setTimeout(() => {
        router.push('/seller')
      }, 1500)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Registration failed. Please check your details.')
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-6xl">
      <div className="mb-6 flex items-center justify-between">
        <BackButton fallbackHref="/" label="Back to Marketplace" variant="pill" />
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>Already registered as a producer?</span>
          <Link
            href="/auth/login"
            className="font-bold text-secondary hover:underline underline-offset-4"
          >
            Sign in here
          </Link>
        </div>
      </div>

      <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-xl grid lg:grid-cols-12">
        {/* Left Side: Heritage Producer Showcase */}
        <div className="relative hidden lg:flex lg:col-span-5 flex-col justify-between p-10 text-white overflow-hidden bg-foreground">
          {/* Background image with overlay */}
          <div className="absolute inset-0 z-0">
            <Image
              src={agricultureImages.harvest}
              alt="Artisan producers working the land"
              fill
              className="object-cover opacity-35 filter saturate-75"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-900/80 to-stone-950/60" />
          </div>

          {/* Top content */}
          <div className="relative z-10 space-y-6">
            <div className="flex items-center gap-3">
              <div className="relative size-11 overflow-hidden rounded-xl border border-white/20 shadow-md">
                <Image src={logoUrl} alt="FSO Logo" fill className="object-cover" />
              </div>
              <div>
                <span className="text-xs uppercase font-extrabold tracking-widest text-amber-400">
                  Flash Sales Online
                </span>
                <p className="text-base font-serif font-bold text-white leading-none">
                  Producer Alliance
                </p>
              </div>
            </div>

            <div className="space-y-3 pt-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 text-xs font-semibold text-amber-300">
                <Sparkles className="size-3.5 text-amber-400" />
                <span>Zero Listing Commission on Heritage Batches</span>
              </div>
              <h1 className="text-3xl font-serif font-bold tracking-tight text-white leading-tight">
                Bring your terroir to patrons across India.
              </h1>
              <p className="text-sm text-stone-300 leading-relaxed font-sans">
                Join over 450+ verified indigenous farmers, multi-generational artisans, and women-led
                collectives. We handle digital storytelling, compliance, and integrated cold logistics.
              </p>
            </div>
          </div>

          {/* Middle Value Props */}
          <div className="relative z-10 my-8 space-y-4 rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-md">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 rounded-lg bg-emerald-500/20 p-2 text-emerald-400">
                <ShieldCheck className="size-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-white">Geographical Provenance Protected</p>
                <p className="text-xs text-stone-300">Your craft story and regional GI origin are highlighted with pride.</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="mt-0.5 rounded-lg bg-amber-500/20 p-2 text-amber-400">
                <Truck className="size-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-white">Pan-India Courier & Pickup</p>
                <p className="text-xs text-stone-300">Doorstep pickups via Shiprocket and specialized cold-chain options.</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="mt-0.5 rounded-lg bg-secondary/20 p-2 text-secondary">
                <Award className="size-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-white">Direct & Transparent Payouts</p>
                <p className="text-xs text-stone-300">Fast Razorpay settlement cycles directly into your registered bank account.</p>
              </div>
            </div>
          </div>

          {/* Bottom Trust Badge */}
          <div className="relative z-10 pt-4 border-t border-white/10 flex items-center justify-between text-xs text-stone-400">
            <span>Authenticity Verified</span>
            <span className="flex items-center gap-1.5 text-stone-300">
              <Flame className="size-3.5 text-amber-400" />
              Heritage Stewardship
            </span>
          </div>
        </div>

        {/* Right Side: Registration Form */}
        <div className="lg:col-span-7 p-6 sm:p-10 flex flex-col justify-between">
          <div>
            <div className="mb-6">
              <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-secondary mb-1">
                <Building2 className="size-3.5" />
                <span>Producer Onboarding</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-serif font-bold text-foreground">
                Register Your Collective or Farm
              </h2>
              <p className="mt-1.5 text-sm text-muted-foreground">
                Fill in your enterprise details below. Once registered, you will gain immediate access
                to the Producer Portal.
              </p>
            </div>

            {error && (
              <div className="mb-6 flex items-start gap-3 rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive animate-in fade-in">
                <AlertCircle className="size-5 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Registration incomplete</p>
                  <p className="text-xs mt-0.5">{error}</p>
                </div>
              </div>
            )}

            {success && (
              <div className="mb-6 flex items-start gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-700 dark:text-emerald-300 animate-in fade-in">
                <CheckCircle2 className="size-5 shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
                <div>
                  <p className="font-bold">Welcome to Flash Sales Online!</p>
                  <p className="text-xs mt-0.5">Your producer account has been established. Redirecting to your dashboard...</p>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Section 1: Business Identity */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground border-b border-border pb-2">
                  <span className="flex size-5 items-center justify-center rounded-full bg-secondary/20 text-secondary text-[10px] font-extrabold">
                    1
                  </span>
                  <span>Craft & Enterprise Details</span>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5 sm:col-span-2">
                    <label htmlFor="businessName" className="text-xs font-bold text-foreground">
                      Business or Collective Name <span className="text-destructive">*</span>
                    </label>
                    <input
                      id="businessName"
                      type="text"
                      required
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      placeholder="e.g. Nilgiri Mountain Honey Collective"
                      className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="businessType" className="text-xs font-bold text-foreground">
                      Producer Category <span className="text-destructive">*</span>
                    </label>
                    <select
                      id="businessType"
                      value={businessType}
                      onChange={(e) => setBusinessType(e.target.value)}
                      className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      {BUSINESS_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="contactPerson" className="text-xs font-bold text-foreground">
                      Primary Contact Person <span className="text-destructive">*</span>
                    </label>
                    <input
                      id="contactPerson"
                      type="text"
                      required
                      value={contactPerson}
                      onChange={(e) => setContactPerson(e.target.value)}
                      placeholder="e.g. Rajesh Kumar"
                      className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: Contact & Regional Provenance */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground border-b border-border pb-2">
                  <span className="flex size-5 items-center justify-center rounded-full bg-secondary/20 text-secondary text-[10px] font-extrabold">
                    2
                  </span>
                  <span>Contact & Terroir Provenance</span>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label htmlFor="phone" className="text-xs font-bold text-foreground">
                      Mobile Number (WhatsApp Enabled) <span className="text-destructive">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-sm font-semibold text-muted-foreground">
                        +91
                      </span>
                      <input
                        id="phone"
                        type="tel"
                        required
                        maxLength={10}
                        value={phone}
                        onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                        placeholder="9876543210"
                        className="w-full rounded-xl border border-input bg-background pl-12 pr-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="city" className="text-xs font-bold text-foreground">
                      City / Village <span className="text-destructive">*</span>
                    </label>
                    <input
                      id="city"
                      type="text"
                      required
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="e.g. Chikmagalur"
                      className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="state" className="text-xs font-bold text-foreground">
                      State / Union Territory <span className="text-destructive">*</span>
                    </label>
                    <select
                      id="state"
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      {INDIAN_STATES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="postalCode" className="text-xs font-bold text-foreground">
                      Postal PIN Code <span className="text-destructive">*</span>
                    </label>
                    <input
                      id="postalCode"
                      type="text"
                      required
                      maxLength={6}
                      value={postalCode}
                      onChange={(e) => setPostalCode(e.target.value.replace(/\D/g, ''))}
                      placeholder="577101"
                      className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                </div>
              </div>

              {/* Section 3: Credentials & OTP Verification */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground border-b border-border pb-2">
                  <span className="flex size-5 items-center justify-center rounded-full bg-secondary/20 text-secondary text-[10px] font-extrabold">
                    3
                  </span>
                  <span>Credentials & Email Authentication</span>
                </div>

                <div className="space-y-4">
                  {/* Official Email + Send OTP button */}
                  <div className="space-y-1.5">
                    <label htmlFor="email" className="text-xs font-bold text-foreground">
                      Official Business Email <span className="text-destructive">*</span>
                    </label>
                    <div className="flex gap-2">
                      <input
                        id="email"
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="producer@heritagecollective.in"
                        className="flex-1 rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                      <button
                        type="button"
                        onClick={handleSendOtp}
                        disabled={sendingOtp || otpCooldown > 0 || !email}
                        className="shrink-0 inline-flex items-center gap-1.5 rounded-xl border border-secondary/40 bg-secondary/10 px-4 py-2.5 text-xs font-bold text-secondary hover:bg-secondary/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {sendingOtp ? (
                          <span className="animate-spin size-3.5 border-2 border-secondary border-t-transparent rounded-full" />
                        ) : (
                          <Send className="size-3.5" />
                        )}
                        <span>
                          {otpCooldown > 0
                            ? `Resend in ${otpCooldown}s`
                            : otpSent
                            ? 'Resend Code'
                            : 'Send Code'}
                        </span>
                      </button>
                    </div>
                    {otpSent && (
                      <p className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1 mt-1">
                        <CheckCircle2 className="size-3.5" />
                        <span>A 6-digit verification code was sent to {email}.</span>
                      </p>
                    )}
                  </div>

                  {/* Verification Code input */}
                  {otpSent && (
                    <div className="space-y-1.5 animate-in fade-in">
                      <label htmlFor="emailOtp" className="text-xs font-bold text-foreground">
                        Enter 6-Digit Email Verification Code <span className="text-destructive">*</span>
                      </label>
                      <input
                        id="emailOtp"
                        type="text"
                        required
                        maxLength={6}
                        value={emailOtp}
                        onChange={(e) => setEmailOtp(e.target.value.trim())}
                        placeholder="e.g. 123456"
                        className="w-full max-w-xs rounded-xl border border-input bg-background px-3.5 py-2.5 text-base tracking-widest font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    </div>
                  )}

                  {/* Password & Confirm Password */}
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label htmlFor="password" className="text-xs font-bold text-foreground">
                          Create Password <span className="text-destructive">*</span>
                        </label>
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                        >
                          {showPassword ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                          <span>{showPassword ? 'Hide' : 'Show'}</span>
                        </button>
                      </div>
                      <input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="At least 6 characters"
                        className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label htmlFor="confirmPassword" className="text-xs font-bold text-foreground">
                        Confirm Password <span className="text-destructive">*</span>
                      </label>
                      <input
                        id="confirmPassword"
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Re-enter password"
                        className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Charter Agreement */}
              <div className="rounded-2xl border border-border/80 bg-surface-muted/40 p-4 space-y-2">
                <label className="flex items-start gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={termsAccepted}
                    onChange={(e) => setTermsAccepted(e.target.checked)}
                    className="mt-1 size-4 rounded border-border text-secondary focus:ring-secondary cursor-pointer"
                  />
                  <span className="text-xs text-muted-foreground leading-relaxed">
                    I pledge to uphold the <strong className="text-foreground">FSO Producer Heritage Charter</strong>:
                    honoring authentic production practices, true regional origin, and transparent ingredient traceability.
                  </span>
                </label>
              </div>

              {/* Action buttons */}
              <div className="pt-2 flex flex-col sm:flex-row items-center gap-4">
                <button
                  type="submit"
                  disabled={loading || success}
                  className="w-full sm:w-auto flex-1 inline-flex items-center justify-center gap-2 rounded-2xl bg-secondary px-8 py-3.5 text-sm font-bold text-secondary-foreground shadow-md hover:bg-secondary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform active:scale-[0.99]"
                >
                  {loading ? (
                    <>
                      <span className="animate-spin size-4 border-2 border-secondary-foreground border-t-transparent rounded-full" />
                      <span>Creating Producer Account...</span>
                    </>
                  ) : (
                    <>
                      <span>Complete Producer Registration</span>
                      <ArrowRight className="size-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          <div className="mt-8 pt-6 border-t border-border flex flex-wrap items-center justify-between gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <ShieldCheck className="size-4 text-secondary" />
              <span>Protected by 256-bit SSL & FSO Data Privacy Policy</span>
            </div>
            <Link
              href="/contact"
              className="hover:text-foreground inline-flex items-center gap-1 underline-offset-4 hover:underline"
            >
              <HelpCircle className="size-3.5" />
              <span>Questions? Contact Producer Support</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
