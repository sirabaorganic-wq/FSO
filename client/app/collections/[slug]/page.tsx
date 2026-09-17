import { redirect } from 'next/navigation'

export default async function CollectionDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  redirect(`/shop/collection/${slug}`)
}
