'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { FileText, Plus, Eye, Calendar, Sparkles, AlertCircle, RefreshCw } from 'lucide-react'
import { getAdminArticlesApi } from '@/lib/api/admin'

interface ArticleItem {
  id: string
  title: string
  slug: string
  excerpt?: string
  content?: string
  author?: string
  category?: string
  readTime?: string
  image?: string
  coverImage?: string
  status?: string
  published?: boolean
  publishDate?: string
  views?: number
  likes?: number
  featured?: boolean
}

export function ArticlesView() {
  const [articles, setArticles] = useState<ArticleItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showEditor, setShowEditor] = useState(false)
  const [title, setTitle] = useState('')
  const [excerpt, setExcerpt] = useState('')
  const [author, setAuthor] = useState('Diya Kulkarni')
  const [category, setCategory] = useState('Heritage Processing')
  const [creationNotice, setCreationNotice] = useState<string | null>(null)

  const loadArticles = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await getAdminArticlesApi()
      setArticles(Array.isArray(data) ? data : [])
    } catch (err: unknown) {
      console.error('Failed to load articles:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch articles')
      setArticles([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadArticles()
  }, [])

  const handleCreateArticle = (e: React.FormEvent) => {
    e.preventDefault()
    setCreationNotice(
      'New editorial publication is staged. In production, drafts require CMS Editorial review before live indexation.'
    )
    setTimeout(() => {
      setShowEditor(false)
      setCreationNotice(null)
    }, 2500)
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="eyebrow">CMS Editorial</span>
          <h2 className="font-serif text-2xl font-bold text-foreground">Kitchen Wisdom Articles</h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadArticles}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-semibold hover:bg-surface-muted transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            type="button"
            onClick={() => setShowEditor(true)}
            className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground hover:bg-primary/90 transition-all shadow-xs"
          >
            <Plus className="size-4" /> Create New Article
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-xs font-medium text-destructive">
          <AlertCircle className="size-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="py-16 text-center text-xs text-muted-foreground">
          <RefreshCw className="size-6 animate-spin mx-auto mb-2 text-primary" />
          Loading articles from database...
        </div>
      ) : articles.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/80 p-12 text-center text-xs text-muted-foreground bg-surface">
          <FileText className="size-10 mx-auto mb-3 opacity-40 text-primary" />
          <h3 className="font-serif text-base font-bold text-foreground">No Articles Published</h3>
          <p className="mt-1 max-w-md mx-auto">
            The database currently has no published editorial articles. Use the button above to author new kitchen wisdom guides.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {articles.map((art) => (
            <div
              key={art.id}
              className="rounded-xl border border-border bg-surface p-5 shadow-xs flex flex-col justify-between space-y-3"
            >
              <div>
                {(art.image || art.coverImage) && (
                  <div className="relative h-40 w-full rounded-lg overflow-hidden border border-border mb-3">
                    <Image
                      src={art.image || art.coverImage || ''}
                      alt={art.title}
                      fill
                      className="object-cover"
                    />
                    {art.category && (
                      <span className="absolute top-2 left-2 rounded-full bg-primary text-primary-foreground px-2 py-0.5 text-[10px] font-bold">
                        {art.category}
                      </span>
                    )}
                    <span className="absolute top-2 right-2 rounded-full bg-emerald-500 text-white px-2 py-0.5 text-[10px] font-bold">
                      {art.published ? 'Published' : 'Draft'}
                    </span>
                  </div>
                )}
                <h3 className="font-serif text-lg font-bold text-foreground leading-snug">{art.title}</h3>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-3">{art.excerpt || art.content}</p>
              </div>

              <div className="border-t border-border/60 pt-3 flex items-center justify-between text-[11px] text-muted-foreground">
                <span>By {art.author || 'FSO Editorial'}</span>
                <span className="font-semibold text-foreground">{art.views || 0} Reads</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Editor Modal */}
      {showEditor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl border border-border bg-surface p-6 shadow-2xl space-y-4">
            <h3 className="font-serif text-xl font-bold text-foreground">Create Editorial Article</h3>
            <form onSubmit={handleCreateArticle} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold mb-1">Article Headline</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full rounded-lg border border-border p-2 outline-none focus:border-ring"
                  placeholder="e.g. The Science of Vaagai Wood Oil Pressing"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Excerpt Summary</label>
                <textarea
                  rows={3}
                  value={excerpt}
                  onChange={(e) => setExcerpt(e.target.value)}
                  className="w-full rounded-lg border border-border p-2 outline-none focus:border-ring"
                  placeholder="Short introductory summary for cards..."
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold mb-1">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full rounded-lg border border-border p-2 outline-none"
                  >
                    <option value="Heritage Processing">Heritage Processing</option>
                    <option value="Culinary Science">Culinary Science</option>
                    <option value="Producer Stories">Producer Stories</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold mb-1">Author</label>
                  <input
                    type="text"
                    value={author}
                    onChange={(e) => setAuthor(e.target.value)}
                    className="w-full rounded-lg border border-border p-2 outline-none"
                  />
                </div>
              </div>

              {creationNotice && (
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-2.5 text-[11px] text-amber-700 dark:text-amber-300">
                  {creationNotice}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEditor(false)}
                  className="rounded-lg border border-border px-4 py-2 font-semibold hover:bg-surface-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-primary px-4 py-2 font-bold text-primary-foreground hover:bg-primary/90"
                >
                  Save Draft
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
