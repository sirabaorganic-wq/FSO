import type { Metadata } from 'next'
import { WisdomPage } from '@/components/knowledge/knowledge-pages'
export const metadata: Metadata = { title: 'Kitchen Wisdom', description: 'Stories, recipes and ingredient knowledge for everyday Indian kitchens.' }
export default function Page() { return <WisdomPage /> }
