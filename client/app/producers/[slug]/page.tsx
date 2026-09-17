import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getProducerByIdApi, getProducerProductsApi } from '@/lib/api/producers'
import { ProducerProfilePage } from '@/components/knowledge/knowledge-pages'
import type { Producer } from '@/types/knowledge'
import { agricultureImages } from '@/data/images'

type Props = { params: Promise<{ slug: string }> }

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  try {
    const res = await getProducerByIdApi(slug)
    const p = res.data
    if (!p) return { title: 'Producer · FSO' }
    const desc = typeof p.producerStory === 'string' ? p.producerStory : p.producerStory?.body || p.businessDescription
    return { title: `${p.businessName} · FSO Producer`, description: desc }
  } catch {
    return { title: 'Producer · FSO' }
  }
}

export default async function Page({ params }: Props) {
  const { slug } = await params

  let producer: Producer | null = null
  try {
    const [res, prodRes] = await Promise.allSettled([
      getProducerByIdApi(slug),
      getProducerProductsApi(slug),
    ])
    const p = res.status === 'fulfilled' ? res.value?.data : null
    const linkedProducts = prodRes.status === 'fulfilled' && prodRes.value?.data?.products
      ? prodRes.value.data.products.map((item) => item.name)
      : []

    if (p && p.id) {
      const storyText = typeof p.producerStory === 'string'
        ? p.producerStory
        : p.producerStory?.body || p.producerStory?.headline || ''
      const story = storyText || p.businessDescription || 'Preserving living traditions from the land.'
      const detail = p.businessDescription || storyText || ''

      const journey = typeof p.producerStory === 'object' && p.producerStory && Array.isArray(p.producerStory.journey)
        ? p.producerStory.journey
        : null
      const timeline = journey && journey.length > 0
        ? journey.map((item: string) => {
            const parts = item.split(': ')
            return {
              year: parts[0] || 'Milestone',
              title: parts[0] || 'Journey',
              body: parts.slice(1).join(': ') || item,
            }
          })
        : [
            { year: 'Tradition', title: 'Generational Knowledge', body: 'Carrying forward centuries-old methods.' },
            { year: 'Present', title: 'Verified Heritage Sourcing', body: 'Directly partnered with Flash Sales Online.' },
          ]

      producer = {
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
        products: linkedProducts,
        timeline,
        stats: [
          { label: 'Generations', value: String(p.generationCount || '3+') },
          { label: 'Years Active', value: String(p.yearsInOperation || '25+') },
          { label: 'Purity', value: '100%' },
        ],
      }
    }
  } catch {}

  if (!producer) {
    notFound()
  }

  return <ProducerProfilePage producer={producer} />
}
