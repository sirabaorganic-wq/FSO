import { SellerPortal } from '@/components/seller/seller-portal'
export const metadata = { title: 'Edit Product' }
export default async function ProductEditPage({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; return <SellerPortal view="product-detail" id={id} /> }
