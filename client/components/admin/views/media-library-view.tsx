'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Image as ImageIcon, Upload, Grid, List, Folder, Tag, Info, Trash2, X } from 'lucide-react'
import { mockMediaItems } from '@/data/admin/homepage'
import { MediaItem } from '@/types/admin'

export function MediaLibraryView() {
  const [mediaList, setMediaList] = useState<MediaItem[]>(mockMediaItems)
  const [selectedFolder, setSelectedFolder] = useState<string>('All')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null)
  const [showUploadModal, setShowUploadModal] = useState(false)

  const folders = ['All', 'Products', 'Producers', 'Articles', 'Banners', 'System']

  const filteredMedia = selectedFolder === 'All'
    ? mediaList
    : mediaList.filter((m) => m.folder === selectedFolder)

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="eyebrow">Asset Management</span>
          <h2 className="font-serif text-2xl font-bold text-foreground">Media Library</h2>
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
        <div className="flex items-center gap-2 overflow-x-auto">
          {folders.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setSelectedFolder(f)}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                selectedFolder === f
                  ? 'bg-primary text-primary-foreground shadow-2xs'
                  : 'bg-surface border border-border text-foreground hover:bg-surface-muted'
              }`}
            >
              <Folder className="size-3.5" />
              <span>{f}</span>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1 border border-border rounded-lg p-0.5 bg-surface">
          <button
            type="button"
            onClick={() => setViewMode('grid')}
            className={`p-1.5 rounded ${viewMode === 'grid' ? 'bg-surface-muted text-foreground' : 'text-muted-foreground'}`}
          >
            <Grid className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => setViewMode('list')}
            className={`p-1.5 rounded ${viewMode === 'list' ? 'bg-surface-muted text-foreground' : 'text-muted-foreground'}`}
          >
            <List className="size-4" />
          </button>
        </div>
      </div>

      {/* Grid or List */}
      {viewMode === 'grid' ? (
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

      {/* Media Details Drawer */}
      {selectedMedia && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/40 backdrop-blur-xs">
          <div className="h-full w-full max-w-md bg-surface p-6 shadow-2xl space-y-4 overflow-y-auto animate-in slide-in-from-right duration-200">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <h3 className="font-serif text-xl font-bold text-foreground">Media Inspector</h3>
              <button type="button" onClick={() => setSelectedMedia(null)} className="text-muted-foreground hover:text-foreground">
                <X className="size-5" />
              </button>
            </div>
            <div className="relative aspect-video w-full rounded-xl overflow-hidden border border-border">
              <Image src={selectedMedia.url} alt={selectedMedia.altText} fill className="object-cover" />
            </div>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold mb-1">Filename</label>
                <input type="text" value={selectedMedia.name} readOnly className="w-full rounded border border-border p-2 bg-surface-muted/30" />
              </div>
              <div>
                <label className="block font-semibold mb-1">Alt Text (Accessibility & SEO)</label>
                <textarea rows={2} defaultValue={selectedMedia.altText} className="w-full rounded border border-border p-2 outline-none focus:border-ring" />
              </div>
              <div>
                <label className="block font-semibold mb-1">Tags</label>
                <div className="flex flex-wrap gap-1">
                  {selectedMedia.tags.map((t) => (
                    <span key={t} className="rounded bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                      #{t}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Upload Modal Simulation */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-2xl space-y-4">
            <h3 className="font-serif text-xl font-bold text-foreground">Upload Media Files</h3>
            <div className="border-2 border-dashed border-border rounded-xl p-8 text-center space-y-2 bg-surface-muted/20">
              <Upload className="size-8 text-muted-foreground mx-auto" />
              <p className="text-xs font-bold text-foreground">Drag & drop files here or click to browse</p>
              <p className="text-[10px] text-muted-foreground">Supports JPG, PNG, WEBP, MP4 (Max 25MB)</p>
            </div>
            <div className="flex items-center justify-end gap-2">
              <button type="button" onClick={() => setShowUploadModal(false)} className="rounded-lg border border-border px-4 py-2 text-xs font-bold text-muted-foreground hover:bg-surface-muted">
                Cancel
              </button>
              <button type="button" onClick={() => setShowUploadModal(false)} className="rounded-lg bg-primary px-4 py-2 text-xs font-bold text-primary-foreground hover:bg-primary/90">
                Start Uploading
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
