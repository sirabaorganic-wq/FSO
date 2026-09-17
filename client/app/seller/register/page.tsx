import type { Metadata } from 'next'
import { SellerRegisterCard } from '@/components/seller/seller-register-card'

export const metadata: Metadata = {
  title: 'Producer & Seller Registration | Flash Sales Online',
  description:
    'Join over 450+ indigenous farmers, artisan producers, and traditional craft collectives on Flash Sales Online. Direct-to-consumer marketplace with integrated logistics and origin provenance.',
}

export default function SellerRegisterPage() {
  return (
    <main className="min-h-screen bg-background py-8 sm:py-14 px-4 sm:px-6 lg:px-8">
      <SellerRegisterCard />
    </main>
  )
}
