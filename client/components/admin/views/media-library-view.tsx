'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Image as ImageIcon, Upload, Grid, List, Folder, Tag, Info, Trash2, X, Plus } from 'lucide-react'
import { MediaItem } from '@/types/admin'

export function MediaLibraryView() {
  const [mediaList, setMediaList] = useState<MediaItem[]>([])
  const [selectedFolder, setSelectedFolder] = useState<string>('All')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [uploadNotice, setUploadNotice] = useState<string | null>(null)

  const folders = ['All', 'Products', 'Producers', 'Articles', 'Banners', 'System']

  const filteredMedia = selectedFolder === 'All'
    ? mediaList
    : mediaList.filter((m) => m.folder === selectedFolder)

  const handleSimulateUpload = (e: React.FormEvent) => {
    e.preventDefault()
    setUploadNotice('Asset upload pipeline: In production, images upload directly to S3 / Cloudinary CDN.')
    setTimeout(() => {
      setShowUploadModal(false)
      setUploadNotice(null)
    }, 2000)
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="eyebrow">Asset Management</span>
          <h2 className="font-serif text-2xl font-bold text-foreground">Media Library & CDN</h2>
          <span className="inline-block mt-1 rounded bg-surface-muted border border-border px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
            STATIC CONFIG / ASSET CDN
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowUploadModal(true)}
            className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground hover:bg-primary/90 transition-all shadow-xs"
          >
            <Upload className="size-4" /> Upload Assets
          </button>
        </div>
      </div>

      {/* Folders & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-3">
        <div className="flex flex-wrap gap-1.5">
          {folders.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setSelectedFolder(f)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                selectedFolder === f
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'bg-surface border border-border text-muted-foreground hover:text-foreground'
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1 bg-surface border border-border p-1 rounded-lg">
          <button
            type="button"
            onClick={() => setViewMode('grid')}
            className={`p-1.5 rounded ${viewMode === 'grid' ? 'bg-surface-muted text-foreground' : 'text-muted-foreground'}`}
            aria-label="Grid view"
          >
            <Grid className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => setViewMode('list')}
            className={`p-1.5 rounded ${viewMode === 'list' ? 'bg-surface-muted text-foreground' : 'text-muted-foreground'}`}
            aria-label="List view"
          >
            <List className="size-4" />
          </button>
        </div>
      </div>

      {/* Empty State vs List */}
      {filteredMedia.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/80 p-12 text-center text-xs text-muted-foreground bg-surface">
          <ImageIcon className="size-10 mx-auto mb-3 opacity-40 text-primary" />
          <h3 className="font-serif text-base font-bold text-foreground">No Media Assets in &quot;{selectedFolder}&quot;</h3>
          <p className="mt-1 max-w-md mx-auto">
            The media CDN catalog currently contains no uploaded assets in this folder. Click &apos;Upload Assets&apos; to stage photography or certificates.
          </p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {filteredMedia.map((item) => (
            <div
              key={item.id}
              onClick={() => setSelectedMedia(item)}
              className="group relative cursor-pointer rounded-xl border border-border bg-surface overflow-hidden shadow-2xs hover:border-primary/60 transition-all"
            >
              <div className="relative aspect-square w-full bg-surface-muted">
                <Image src={item.url} alt={item.altText} fill className="object-cover group-hover:scale-105 transition-transform duration-300" />
              </div>
              <div className="p-2.5 text-xs">
                <p className="font-semibold text-foreground truncate">{item.name}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{item.size} • {item.folder}</p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-surface overflow-hidden text-xs">
          <table className="w-full text-left border-collapse">
            <thead className="bg-surface-muted/50 border-b border-border text-[10px] uppercase font-bold text-muted-foreground">
              <tr>
                <th className="p-3">Asset</th>
                <th className="p-3">Filename</th>
                <th className="p-3">Folder</th>
                <th className="p-3">Dimensions & Size</th>
                <th className="p-3">Uploaded By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {filteredMedia.map((item) => (
                <tr key={item.id} onClick={() => setSelectedMedia(item)} className="hover:bg-surface-muted/40 cursor-pointer">
                  <td className="p-3">
                    <div className="relative size-10 rounded border border-border overflow-hidden">
                      <Image src={item.url} alt={item.altText} fill className="object-cover" />
                    </div>
                  </td>
                  <td className="p-3 font-semibold text-foreground">{item.name}</td>
                  <td className="p-3 text-muted-foreground">{item.folder}</td>
                  <td className="p-3 text-muted-foreground">{item.dimensions} ({item.size})</td>
                  <td className="p-3 text-muted-foreground">{item.uploadedBy}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border/60 pb-2">
              <h3 className="font-serif text-lg font-bold text-foreground">Upload Media Assets</h3>
              <button type="button" onClick={() => setShowUploadModal(false)} className="text-muted-foreground hover:text-foreground">
                <X className="size-4" />
              </button>
            </div>
            <form onSubmit={handleSimulateUpload} className="space-y-4 text-xs">
              <div className="rounded-xl border-2 border-dashed border-border p-6 text-center space-y-2 bg-surface-muted/30">
                <Upload className="size-8 mx-auto text-primary opacity-60" />
                <p className="font-semibold text-foreground">Drag and drop images or documents</p>
                <p className="text-[10px] text-muted-foreground">Supported formats: JPEG, PNG, WebP, SVG, PDF up to 10MB</p>
              </div>

              {uploadNotice && (
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-2.5 text-[11px] text-amber-700 dark:text-amber-300">
                  {uploadNotice}
                </div>
              )}

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="rounded-lg border border-border px-4 py-2 font-semibold hover:bg-surface-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-primary px-4 py-2 font-bold text-primary-foreground hover:bg-primary/90"
                >
                  Upload
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
