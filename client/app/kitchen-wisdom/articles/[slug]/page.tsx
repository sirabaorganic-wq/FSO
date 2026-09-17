import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getArticleBySlugApi } from '@/lib/api/content'
import { toFrontendArticle } from '@/lib/api/mappers'
import { getArticle } from '@/data/knowledge'
import { ArticleDetailPage } from '@/components/knowledge/knowledge-pages'

type Props = { params: Promise<{ slug: string }> }

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  try {
    const res = await getArticleBySlugApi(slug)
    if (res?.data) {
      return { title: `${res.data.title} · Kitchen Wisdom`, description: res.data.excerpt }
    }
  } catch {}
  const article = getArticle(slug)
  return { title: article?.title ?? 'Article · Kitchen Wisdom', description: article?.excerpt }
}

export default async function Page({ params }: Props) {
  const { slug } = await params

  let article: ReturnType<typeof toFrontendArticle> | ReturnType<typeof getArticle> | null = null
  try {
    const res = await getArticleBySlugApi(slug)
    if (res?.data && res.data.title) {
      article = toFrontendArticle(res.data)
    }
  } catch {}

  if (!article) {
    article = getArticle(slug) || null
  }

  if (!article) notFound()
  return <ArticleDetailPage article={article} />
}
