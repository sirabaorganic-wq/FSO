export type CustomerUser = {
  name: string
  email: string
  phone: string
  initials: string
  language: string
  diet: string
  avatar: string
}

export type Address = { id: string; label: string; name: string; lines: string[]; phone: string; isDefault: boolean }
export type CartLine = { id: string; name: string; producer: string; image: string; price: number; quantity: number; unit: string }
export type Order = { id: string; date: string; status: 'Delivered' | 'In transit' | 'Processing'; total: number; items: CartLine[]; addressId: string; eta: string }
export type Notification = { id: string; title: string; body: string; date: string; unread: boolean }
export type PaymentMethod = { id: string; label: string; detail: string; type: 'UPI' | 'Card' | 'Wallet' | 'COD' }
export type Recommendation = { slug: string; name: string; reason: string; image: string; price: string }
