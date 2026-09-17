import { SellerPortal } from '@/components/seller/seller-portal'

export const metadata = { title: 'Order Detail - FSO Seller Portal' }

export default async function SellerOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <SellerPortal view="order-detail" id={id} />
}

