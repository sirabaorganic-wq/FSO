import { SellerPortal } from '@/components/seller/seller-portal'
export const metadata = { title: 'Order Detail' }
export default async function SellerOrderDetailPage({ params }: { params: Promise<{ id: string }> }) { await params; return <SellerPortal view="orders" /> }
