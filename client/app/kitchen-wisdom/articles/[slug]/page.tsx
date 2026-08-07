import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { articles, getArticle } from '@/data/knowledge'
import { ArticleDetailPage } from '@/components/knowledge/knowledge-pages'

type Props = { params: Promise<{ slug: string }> }
export function generateStaticParams() { return articles.map((article) => ({ slug: article.slug })) }
export async function generateMetadata({ params }: Props): Promise<Metadata> { const { slug } = await params; const article = getArticle(slug); return { title: article?.title ?? 'Article', description: article?.excerpt } }
export default async function Page({ params }: Props) { const { slug } = await params; const article = getArticle(slug); if (!article) notFound(); return <ArticleDetailPage article={article} /> }
