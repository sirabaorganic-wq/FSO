import { OrderDetailPage } from '@/components/customer/customer-pages'
export default async function OrderDetailRoute({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; return <OrderDetailPage id={id} /> }
