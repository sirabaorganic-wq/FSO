import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getProducer, producers } from '@/data/knowledge'
import { ProducerProfilePage } from '@/components/knowledge/knowledge-pages'

type Props = { params: Promise<{ slug: string }> }
export function generateStaticParams() { return producers.map((producer) => ({ slug: producer.slug })) }
export async function generateMetadata({ params }: Props): Promise<Metadata> { const { slug } = await params; const producer = getProducer(slug); return { title: producer?.name ?? 'Producer', description: producer?.story } }
export default async function Page({ params }: Props) { const { slug } = await params; const producer = getProducer(slug); if (!producer) notFound(); return <ProducerProfilePage producer={producer} /> }
