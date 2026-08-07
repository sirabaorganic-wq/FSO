import type { Metadata } from 'next'
import { ArticlesPage } from '@/components/knowledge/knowledge-pages'
export const metadata: Metadata = { title: 'Articles', description: 'Editorial stories about food heritage, traditional methods and regional kitchens.' }
export default function Page() { return <ArticlesPage /> }
