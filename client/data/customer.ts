import type { Address, CartLine, CustomerUser, Notification, Order, PaymentMethod, Recommendation } from '@/types/customer'
import { agricultureImages } from '@/data/images'

export const customerUser: CustomerUser = { name: 'Ananya Rao', email: 'ananya.rao@example.com', phone: '+91 98765 43210', initials: 'AR', language: 'English', diet: 'Vegetarian', avatar: agricultureImages.farmer }
export const addresses: Address[] = [
  { id: 'home', label: 'Home', name: 'Ananya Rao', lines: ['18, 2nd Cross, Indiranagar', 'Bengaluru, Karnataka 560038'], phone: '+91 98765 43210', isDefault: true },
  { id: 'studio', label: 'Studio', name: 'Ananya Rao', lines: ['42, Residency Road', 'Bengaluru, Karnataka 560025'], phone: '+91 98765 43210', isDefault: false },
]
export const cartLines: CartLine[] = [
  { id: 'groundnut-oil', name: 'Cold-Pressed Groundnut Oil', producer: 'Sahyadri Oils', image: agricultureImages.oil, price: 480, quantity: 1, unit: '500 ml' },
  { id: 'lakadong-turmeric', name: 'Single-Origin Lakadong Turmeric', producer: 'Meghalaya Roots', image: agricultureImages.spice, price: 260, quantity: 2, unit: '100 g' },
]
export const orders: Order[] = [
  { id: 'FSO-2408-0192', date: '08 Aug 2026', status: 'In transit', total: 1000, items: cartLines, addressId: 'home', eta: '12–14 Aug 2026' },
  { id: 'FSO-2406-0148', date: '24 Jun 2026', status: 'Delivered', total: 620, items: [{ ...cartLines[0], id: 'coffee', name: 'Traditional Filter Coffee', producer: 'Malnad Coffee Works', image: agricultureImages.pantry, price: 620, quantity: 1, unit: '250 g' }], addressId: 'home', eta: 'Delivered 28 Jun 2026' },
]
export const wishlist: Recommendation[] = [
  { slug: 'wild-forest-honey', name: 'Wild Forest Honey', reason: 'A gentle sweetness from the forest edge', image: agricultureImages.tea, price: '₹540' },
  { slug: 'hand-pounded-red-rice', name: 'Hand-Pounded Red Rice', reason: 'A staple with its story intact', image: agricultureImages.grain, price: '₹310' },
]
export const recommendations: Recommendation[] = [
  { slug: 'traditional-filter-coffee', name: 'Traditional Filter Coffee', reason: 'For the morning ritual you already love', image: agricultureImages.pantry, price: '₹620' },
  { slug: 'stone-ground-ragi-flour', name: 'Stone-Ground Ragi Flour', reason: 'A nourishing everyday essential', image: agricultureImages.grain, price: '₹190' },
  { slug: 'wild-forest-honey', name: 'Wild Forest Honey', reason: 'A thoughtful pantry addition', image: agricultureImages.tea, price: '₹540' },
]
export const notifications: Notification[] = [
  { id: 'shipping', title: 'Your pantry is on its way', body: 'Order FSO-2408-0192 is moving through Bengaluru.', date: 'Today', unread: true },
  { id: 'story', title: 'A note from Meghalaya', body: 'Read the story behind Lakadong turmeric.', date: '02 Aug 2026', unread: false },
]
export const paymentMethods: PaymentMethod[] = [
  { id: 'upi', label: 'UPI', detail: 'ananya@upi', type: 'UPI' },
  { id: 'card', label: 'Visa ending 4242', detail: 'Expires 08/29', type: 'Card' },
  { id: 'cod', label: 'Cash on delivery', detail: 'Pay when your pantry arrives', type: 'COD' },
]
export const coupons = ['WELCOME10', 'SLOWPANTRY']
