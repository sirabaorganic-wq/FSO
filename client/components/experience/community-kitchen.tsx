'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Heart, Bookmark, MessageSquare, Share2, Plus, Sparkles } from 'lucide-react'
import { mockCommunityPosts } from '@/data/community'
import { CommunityPost } from '@/types/experience'

export function CommunityKitchen() {
  const [posts, setPosts] = useState<CommunityPost[]>(mockCommunityPosts)
  const [likedIds, setLikedIds] = useState<string[]>(['post-1'])
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [postTitle, setPostTitle] = useState('')
  const [postContent, setPostContent] = useState('')

  const toggleLike = (id: string) => {
    if (likedIds.includes(id)) {
      setLikedIds(likedIds.filter((i) => i !== id))
      setPosts(posts.map((p) => (p.id === id ? { ...p, likesCount: p.likesCount - 1 } : p)))
    } else {
      setLikedIds([...likedIds, id])
      setPosts(posts.map((p) => (p.id === id ? { ...p, likesCount: p.likesCount + 1 } : p)))
    }
  }

  const handleCreatePost = (e: React.FormEvent) => {
    e.preventDefault()
    if (!postTitle || !postContent) return
    const newPost: CommunityPost = {
      id: `post-${Date.now()}`,
      authorName: 'Sunita Rao',
      authorAvatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200',
      authorCity: 'Bengaluru',
      title: postTitle,
      content: postContent,
      likesCount: 1,
      savesCount: 0,
      commentsCount: 0,
      createdAt: 'Just now',
      tags: ['Family Tradition', 'Heritage Recipe'],
    }
    setPosts([newPost, ...posts])
    setPostTitle('')
    setPostContent('')
    setShowCreateModal(false)
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="eyebrow text-secondary">Stories & Recipes from Real Kitchens</span>
          <h1 className="font-serif text-3xl font-bold text-foreground">Community Kitchen</h1>
        </div>
        <button
          type="button"
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground hover:bg-primary/90 transition-all shadow-xs"
        >
          <Plus className="size-4" /> Share Kitchen Story
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {posts.map((post) => {
          const isLiked = likedIds.includes(post.id)
          return (
            <div key={post.id} className="rounded-xl border border-border bg-surface p-5 shadow-xs space-y-3 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center gap-3 border-b border-border/60 pb-3">
                  <div className="relative size-10 rounded-full overflow-hidden border border-border shrink-0">
                    <Image src={post.authorAvatar} alt={post.authorName} fill className="object-cover" />
                  </div>
                  <div>
                    <p className="font-bold text-foreground text-xs">{post.authorName}</p>
                    <p className="text-[10px] text-muted-foreground">{post.authorCity} • {post.createdAt}</p>
                  </div>
                </div>

                {post.image && (
                  <div className="relative h-44 w-full rounded-lg overflow-hidden border border-border">
                    <Image src={post.image} alt={post.title} fill className="object-cover" />
                  </div>
                )}

                <div>
                  <h3 className="font-serif text-lg font-bold text-foreground leading-snug">{post.title}</h3>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{post.content}</p>
                </div>

                {post.producerMention && (
                  <div className="rounded-lg bg-surface-muted/50 p-2 text-[10px] text-primary font-semibold border border-primary/20">
                    💚 Producer Appreciation: {post.producerMention}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between border-t border-border/60 pt-3 text-xs">
                <button
                  type="button"
                  onClick={() => toggleLike(post.id)}
                  className={`flex items-center gap-1 font-bold ${isLiked ? 'text-rose-600' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  <Heart className={`size-4 ${isLiked ? 'fill-rose-600' : ''}`} />
                  <span>{post.likesCount}</span>
                </button>
                <span className="flex items-center gap-1 text-muted-foreground">
                  <MessageSquare className="size-4" /> {post.commentsCount}
                </span>
                <span className="flex items-center gap-1 text-muted-foreground">
                  <Bookmark className="size-4" /> {post.savesCount}
                </span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Share Story Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-2xl space-y-4">
            <h3 className="font-serif text-xl font-bold text-foreground">Share Your Kitchen Story</h3>
            <form onSubmit={handleCreatePost} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold mb-1">Story Headline</label>
                <input
                  type="text"
                  required
                  value={postTitle}
                  onChange={(e) => setPostTitle(e.target.value)}
                  className="w-full rounded-lg border border-border p-2 outline-none focus:border-ring"
                  placeholder="e.g. My grandmother's morning ghee ritual"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Story & Recipe Memories</label>
                <textarea
                  rows={4}
                  required
                  value={postContent}
                  onChange={(e) => setPostContent(e.target.value)}
                  className="w-full rounded-lg border border-border p-2 outline-none focus:border-ring"
                  placeholder="Share how this ingredient or tradition impacted your family..."
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="rounded-lg border border-border px-4 py-2 font-bold text-muted-foreground hover:bg-surface-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-primary px-4 py-2 font-bold text-primary-foreground hover:bg-primary/90"
                >
                  Post Story
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
