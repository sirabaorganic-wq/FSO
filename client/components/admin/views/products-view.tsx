'use client'

import { useState } from 'react'
import Image from 'next/image'
import { ShoppingBag, Plus, Star, Edit, Trash2, Eye, AlertTriangle, CheckCircle } from 'lucide-react'
import { mockAdminProducts } from '@/data/admin/products'
import { DataTable } from '../data-table'
import { AdminProduct } from '@/types/admin'

export function ProductsView() {
  const [products, setProducts] = useState<AdminProduct[]>(mockAdminProducts)
  const [editProduct, setEditProduct] = useState<AdminProduct | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [newName, setNewName] = useState('')
  const [newPrice, setNewPrice] = useState(500)
  const [newCategory, setNewCategory] = useState('Vedic Ghee & Butter')

  const columns = [
    {
      key: 'product',
      header: 'Product Catalog Item',
      accessor: (p: AdminProduct) => (
        <div className="flex items-center gap-3">
          <div className="relative size-10 rounded-lg overflow-hidden border border-border shrink-0">
            <Image src={p.image} alt={p.name} fill className="object-cover" />
          </div>
          <div>
            <p className="font-semibold text-foreground leading-tight">{p.name}</p>
            <p className="text-[10px] text-muted-foreground">SKU: {p.sku} • {p.producerName}</p>
          </div>
        </div>
      ),
      sortable: true,
    },
    {
      key: 'category',
      header: 'Category',
      accessor: (p: AdminProduct) => <span className="text-xs text-muted-foreground">{p.category}</span>,
    },
    {
      key: 'price',
      header: 'Price & Sales',
      accessor: (p: AdminProduct) => (
        <div>
          <span className="font-serif font-bold text-foreground">₹{p.price}</span>
          <p className="text-[10px] text-emerald-700 dark:text-emerald-400 font-semibold">{p.salesCount} sold (₹{p.revenue.toLocaleString('en-IN')})</p>
        </div>
      ),
      sortable: true,
    },
    {
      key: 'stock',
      header: 'Stock Inventory',
      accessor: (p: AdminProduct) => (
        <span
          className={`inline-flex items-center gap-1 font-bold text-xs ${
            p.stock === 0
              ? 'text-rose-600'
              : p.stock < 20
              ? 'text-amber-600'
              : 'text-emerald-700 dark:text-emerald-400'
          }`}
        >
          {p.stock === 0 ? <AlertTriangle className="size-3.5" /> : null}
          {p.stock} units
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      accessor: (p: AdminProduct) => (
        <span
          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${
            p.status === 'Published'
              ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
              : p.status === 'Draft'
              ? 'bg-surface-muted text-muted-foreground'
              : 'bg-rose-500/10 text-rose-700'
          }`}
        >
          {p.status}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      accessor: (p: AdminProduct) => (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setEditProduct(p)}
            className="text-[11px] font-bold text-primary hover:underline"
          >
            Quick Edit
          </button>
        </div>
      ),
    },
  ]

  const handleCreateProduct = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newName) return
    const created: AdminProduct = {
      id: `prd-${Date.now()}`,
      slug: newName.toLowerCase().replace(/\s+/g, '-'),
      name: newName,
      producerName: 'Bundelkhand Artisans',
      producerId: 'prod-301',
      category: newCategory,
      price: newPrice,
      stock: 50,
      sku: `SKU-${Math.floor(Math.random() * 9000 + 1000)}`,
      status: 'Published',
      salesCount: 0,
      revenue: 0,
      rating: 5.0,
      image: 'https://images.unsplash.com/photo-1509358271058-acd22cc93898?auto=format&fit=crop&w=1200&q=85',
      createdAt: new Date().toISOString().split('T')[0],
      featured: false,
    }
    setProducts([created, ...products])
    setNewName('')
    setShowAddModal(false)
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="eyebrow">Catalog Management</span>
          <h2 className="font-serif text-2xl font-bold text-foreground">Marketplace Products</h2>
        </div>
        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground hover:bg-primary/90 transition-all shadow-xs"
        >
          <Plus className="size-4" /> Add New Product
        </button>
      </div>

      <DataTable
        data={products}
        columns={columns}
        searchPlaceholder="Search product title, SKU or category..."
        searchKey={(p) => `${p.name} ${p.sku} ${p.category} ${p.producerName}`}
        keyExtractor={(p) => p.id}
      />

      {/* Quick Edit Drawer */}
      {editProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-2xl space-y-4">
            <h3 className="font-serif text-xl font-bold text-foreground">Edit &quot;{editProduct.name}&quot;</h3>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold mb-1">Price (₹)</label>
                <input
                  type="number"
                  value={editProduct.price}
                  onChange={(e) => setEditProduct({ ...editProduct, price: Number(e.target.value) })}
                  className="w-full rounded-lg border border-border p-2 outline-none focus:border-ring"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Stock Count</label>
                <input
                  type="number"
                  value={editProduct.stock}
                  onChange={(e) => setEditProduct({ ...editProduct, stock: Number(e.target.value) })}
                  className="w-full rounded-lg border border-border p-2 outline-none focus:border-ring"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Status</label>
                <select
                  value={editProduct.status}
                  onChange={(e) => setEditProduct({ ...editProduct, status: e.target.value as any })}
                  className="w-full rounded-lg border border-border p-2 outline-none focus:border-ring"
                >
                  <option value="Published">Published</option>
                  <option value="Draft">Draft</option>
                  <option value="Out of Stock">Out of Stock</option>
                </select>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditProduct(null)}
                className="rounded-lg border border-border px-4 py-2 font-bold text-muted-foreground hover:bg-surface-muted"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setProducts(products.map((p) => (p.id === editProduct.id ? editProduct : p)))
                  setEditProduct(null)
                }}
                className="rounded-lg bg-primary px-4 py-2 font-bold text-primary-foreground hover:bg-primary/90"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Product Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-2xl space-y-4">
            <h3 className="font-serif text-xl font-bold text-foreground">Add New Product</h3>
            <form onSubmit={handleCreateProduct} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold mb-1">Product Title</label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full rounded-lg border border-border p-2 outline-none focus:border-ring"
                  placeholder="e.g. Malabar Organic Pepper"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Price (₹)</label>
                <input
                  type="number"
                  required
                  value={newPrice}
                  onChange={(e) => setNewPrice(Number(e.target.value))}
                  className="w-full rounded-lg border border-border p-2 outline-none focus:border-ring"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Category</label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="w-full rounded-lg border border-border p-2 outline-none focus:border-ring"
                >
                  <option value="Vedic Ghee & Butter">Vedic Ghee & Butter</option>
                  <option value="Cold Pressed Oils">Cold Pressed Oils</option>
                  <option value="Wild Honey & Preserves">Wild Honey & Preserves</option>
                  <option value="Himalayan Spices">Himalayan Spices</option>
                  <option value="Heirloom Grains">Heirloom Grains</option>
                </select>
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="rounded-lg border border-border px-4 py-2 font-semibold text-muted-foreground hover:bg-surface-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-primary px-4 py-2 font-bold text-primary-foreground hover:bg-primary/90"
                >
                  Save Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
