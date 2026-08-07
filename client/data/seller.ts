import type { SellerCustomer, SellerDocument, SellerNotification, SellerOrder, SellerPayout, SellerProduct, SellerReview } from '@/types/seller'

const img = (id: string) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=800&q=80`
export const sellerProfile = { name: 'Saraswati Oil Mill', owner: 'Meera Devi', place: 'Bharatpur, Rajasthan', completion: 78, initials: 'SO', story: 'Three generations of slow, wood-pressed oils made with seeds sourced from nearby farms.' }
export const sellerProducts: SellerProduct[] = [
  { id: 'p-01', name: 'Cold-Pressed Groundnut Oil', sku: 'SOM-GNO-1L', category: 'Oils & Ghee', price: 780, inventory: 42, status: 'Published', image: img('photo-1474979266404-7eaacbcd87c5'), sold: 128 },
  { id: 'p-02', name: 'Stoneground Besan', sku: 'SOM-BES-500', category: 'Grains & Flours', price: 220, inventory: 9, status: 'Published', image: img('photo-1509358271058-acd22cc93898'), sold: 86 },
  { id: 'p-03', name: 'Haldi Powder, Wildcrafted', sku: 'SOM-HAL-100', category: 'Spices', price: 180, inventory: 0, status: 'Out of Stock', image: img('photo-1596040033229-a9821ebd058d'), sold: 74 },
  { id: 'p-04', name: 'Mustard Oil, Kachi Ghani', sku: 'SOM-MUS-1L', category: 'Oils & Ghee', price: 640, inventory: 21, status: 'Draft', image: img('photo-1474979266404-7eaacbcd87c5'), sold: 0 },
  { id: 'p-05', name: 'Jaggery Blocks', sku: 'SOM-JAG-500', category: 'Pantry', price: 190, inventory: 58, status: 'Published', image: img('photo-1532336414038-cf19250c5757'), sold: 52 },
]
export const sellerOrders: SellerOrder[] = [
  { id: 'FSO-10482', customer: 'Ananya Rao', date: 'Today, 10:42 AM', items: 2, total: 1000, status: 'New', payment: 'Paid via UPI', location: 'Bengaluru', product: 'Groundnut Oil + Besan' },
  { id: 'FSO-10481', customer: 'Kavya Menon', date: 'Today, 9:18 AM', items: 1, total: 780, status: 'Processing', payment: 'Paid via Card', location: 'Mumbai', product: 'Cold-Pressed Groundnut Oil' },
  { id: 'FSO-10477', customer: 'Rohan Shah', date: 'Yesterday, 4:20 PM', items: 3, total: 1_150, status: 'Shipped', payment: 'Paid via UPI', location: 'Pune', product: 'Oil + Jaggery + Besan' },
  { id: 'FSO-10470', customer: 'Nisha Iyer', date: '12 Jun 2026', items: 1, total: 780, status: 'Delivered', payment: 'Paid via UPI', location: 'Chennai', product: 'Cold-Pressed Groundnut Oil' },
]
export const sellerCustomers: SellerCustomer[] = [
  { id: 'c-01', name: 'Ananya Rao', email: 'ananya@example.com', location: 'Bengaluru', orders: 8, spend: 6240, wishlist: 3, lastOrder: 'Today' },
  { id: 'c-02', name: 'Kavya Menon', email: 'kavya@example.com', location: 'Mumbai', orders: 5, spend: 3460, wishlist: 1, lastOrder: 'Today' },
  { id: 'c-03', name: 'Rohan Shah', email: 'rohan@example.com', location: 'Pune', orders: 3, spend: 2150, wishlist: 4, lastOrder: 'Yesterday' },
  { id: 'c-04', name: 'Nisha Iyer', email: 'nisha@example.com', location: 'Chennai', orders: 2, spend: 1560, wishlist: 0, lastOrder: '12 Jun 2026' },
]
export const sellerReviews: SellerReview[] = [
  { id: 'r-01', customer: 'Ananya Rao', product: 'Cold-Pressed Groundnut Oil', rating: 5, date: 'Today', body: 'The aroma is incredible and it arrived beautifully packed. This tastes like the oil my grandmother used.', replied: false },
  { id: 'r-02', customer: 'Kavya Menon', product: 'Stoneground Besan', rating: 5, date: 'Yesterday', body: 'A pantry staple now. The texture makes the best pakoras.', replied: true },
  { id: 'r-03', customer: 'Rohan Shah', product: 'Jaggery Blocks', rating: 4, date: '10 Jun 2026', body: 'Lovely flavour and clean finish. Would love a smaller pack too.', replied: false },
]
export const sellerDocuments: SellerDocument[] = [
  { id: 'fssai', label: 'FSSAI registration', description: 'Food safety and standards registration', status: 'Verified', updated: 'Updated 02 May 2026' },
  { id: 'gst', label: 'GST certificate', description: 'Goods and services tax registration', status: 'Verified', updated: 'Updated 02 May 2026' },
  { id: 'pan', label: 'PAN card', description: 'Business identity document', status: 'Pending', updated: 'Submitted 11 Jun 2026' },
  { id: 'bank', label: 'Bank account', description: 'Payout account verification', status: 'Verified', updated: 'Updated 02 May 2026' },
  { id: 'address', label: 'Address proof', description: 'Pickup location verification', status: 'Missing', updated: 'Required to complete profile' },
]
export const sellerPayouts: SellerPayout[] = [
  { id: 'PAY-2084', date: '10 Jun 2026', amount: 18420, status: 'Paid', reference: 'UTR 28401920' },
  { id: 'PAY-2071', date: '03 Jun 2026', amount: 12980, status: 'Paid', reference: 'UTR 28377104' },
  { id: 'PAY-2058', date: '27 May 2026', amount: 16800, status: 'Paid', reference: 'UTR 28342011' },
]
export const sellerNotifications: SellerNotification[] = [
  { id: 'n-01', title: 'New order received', body: 'FSO-10482 is ready for confirmation.', time: '12 min ago', unread: true },
  { id: 'n-02', title: 'Low stock alert', body: 'Stoneground Besan has 9 units remaining.', time: '2 hr ago', unread: true },
  { id: 'n-03', title: 'New review', body: 'Ananya left a 5-star review on Groundnut Oil.', time: 'Yesterday', unread: false },
]
export const salesData = [42, 58, 48, 72, 64, 88, 76, 94, 84, 106, 98, 124]
