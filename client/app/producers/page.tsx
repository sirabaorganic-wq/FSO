import type { Metadata } from 'next'
import { ProducersPage } from '@/components/knowledge/knowledge-pages'
export const metadata: Metadata = { title: 'Meet the Producers', description: 'Discover the people and traditional crafts behind FSO ingredients.' }
export default function Page() { return <ProducersPage /> }
