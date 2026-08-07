import type { Metadata } from 'next'
import { SiteHeader } from '@/components/layout/site-header'
import { ShopLanding } from '@/components/shop/shop-landing'

export const metadata: Metadata = {
  title: 'Shop the Pantry',
  description: 'Discover considered everyday ingredients from India’s growers, makers and traditional kitchens.',
  alternates: { canonical: '/shop' },
}

export default function ShopPage() {
  return <><SiteHeader /><ShopLanding /></>
}
