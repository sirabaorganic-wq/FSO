import type { Metadata } from 'next'
import { getProducersApi } from '@/lib/api/producers'
import { ProducersPage } from '@/components/knowledge/knowledge-pages'
import type { Producer } from '@/types/knowledge'
import { agricultureImages } from '@/data/images'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Meet the Producers · FSO',
  description: 'Discover the people and traditional crafts behind FSO ingredients.',
}

export default async function Page() {
  let producers: Producer[] = []
  try {
    const res = await getProducersApi()
    if (res.data && Array.isArray(res.data)) {
      producers = res.data.map((p) => {
        const storyText = typeof p.producerStory === 'string'
          ? p.producerStory
          : p.producerStory?.body || p.producerStory?.headline || ''
        const story = storyText || p.businessDescription || 'Preserving living traditions from the land.'
        const detail = p.businessDescription || storyText || ''
        return {
          slug: p.slug || p.id,
          name: p.businessName,
          person: 'Master Artisan',
          place: [p.village, p.district].filter(Boolean).join(', ') || 'Rural India',
          state: p.address?.state || p.region || 'India',
          craft: Array.isArray(p.traditionalExpertise) && p.traditionalExpertise.length > 0
            ? p.traditionalExpertise.join(' · ')
            : p.producerType || 'Traditional Foods',
          image: p.logo || agricultureImages.farmer,
          portrait: p.logo || agricultureImages.workshop,
          story,
          detail,
          products: [],
          timeline: [],
          stats: [
            { label: 'Generations', value: String(p.generationCount || '3+') },
            { label: 'Years Active', value: String(p.yearsInOperation || '25+') },
            { label: 'Purity', value: '100%' },
          ],
        }
      })
    }
  } catch (err) {
    console.error('Failed to load producers:', err)
  }

  return <ProducersPage producers={producers} />
}

