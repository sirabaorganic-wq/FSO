'use client'

import { useState } from 'react'
import Image from 'next/image'
import { FileText, Plus, Eye, Calendar, Sparkles, CheckCircle2, Clock } from 'lucide-react'
import { mockCMSArticles } from '@/data/admin/articles'
import { CMSArticle } from '@/types/admin'

export function ArticlesView() {
  const [articles, setArticles] = useState<CMSArticle[]>(mockCMSArticles)
  const [showEditor, setShowEditor] = useState(false)
  const [title, setTitle] = useState('')
  const [excerpt, setExcerpt] = useState('')
  const [author, setAuthor] = useState('Diya Kulkarni')
  const [category, setCategory] = useState('Heritage Processing')

  const handleCreateArticle = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title) return
    const newArt: CMSArticle = {
      id: `art-${Date.now()}`,
      title,
      slug: title.toLowerCase().replace(/\s+/g, '-'),
      excerpt: excerpt || title,
      content: 'Full article body content written in CMS rich editor...',
      author,
      category,
      readTime: '5 min read',
      image: 'https://images.unsplash.com/photo-1509358271058-acd22cc93898?auto=format&fit=crop&w=1200&q=85',
      status: 'Published',
      publishDate: new Date().toISOString().split('T')[0],
      views: 0,
      likes: 0,
      featured: false,
    }
    setArticles([newArt, ...articles])
    setTitle('')
    setExcerpt('')
    setShowEditor(false)
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="eyebrow">CMS Editorial</span>
          <h2 className="font-serif text-2xl font-bold text-foreground">Kitchen Wisdom Articles</h2>
        </div>
        <button
          type="button"
          onClick={() => setShowEditor(true)}
          className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground hover:bg-primary/90 transition-all shadow-xs"
        >
          <Plus className="size-4" /> Create New Article
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {articles.map((art) => (
          <div key={art.id} className="rounded-xl border border-border bg-surface p-5 shadow-xs flex flex-col justify-between space-y-3">
            <div>
              <div className="relative h-40 w-full rounded-lg overflow-hidden border border-border mb-3">
                <Image src={art.image} alt={art.title} fill className="object-cover" />
                <span className="absolute top-2 left-2 rounded-full bg-primary text-primary-foreground px-2 py-0.5 text-[10px] font-bold">
                  {art.category}
                </span>
                <span
                  className={`absolute top-2 right-2 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                    art.status === 'Published' ? 'bg-emerald-500 text-white' : 'bg-amber-500 text-white'
                  }`}
                >
                  {art.status}
                </span>
              </div>
              <h3 className="font-serif text-lg font-bold text-foreground leading-snug">{art.title}</h3>
              <p className="text-xs text-muted-foreground mt-1 line-clamp-3">{art.excerpt}</p>
            </div>

            <div className="border-t border-border/60 pt-3 flex items-center justify-between text-[11px] text-muted-foreground">
              <span>By {art.author} • {art.readTime}</span>
              <span className="font-semibold text-foreground">{art.views} Reads</span>
            </div>
          </div>
        ))}
      </div>

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
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEditor(false)}
                  className="rounded-lg border border-border px-4 py-2 font-bold text-muted-foreground hover:bg-surface-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-primary px-4 py-2 font-bold text-primary-foreground hover:bg-primary/90"
                >
                  Publish Article
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
