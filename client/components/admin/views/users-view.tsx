'use client'

import { useState } from 'react'
import Image from 'next/image'
import { ShieldCheck, Plus, Mail, CheckCircle2, XCircle, Key, Trash2, Edit } from 'lucide-react'
import { mockAdmins } from '@/data/admin/admins'
import { DataTable } from '../data-table'
import { AdminUser } from '@/types/admin'

export function UsersView() {
  const [users, setUsers] = useState<AdminUser[]>(mockAdmins)
  const [showAddModal, setShowAddModal] = useState(false)
  const [newAdminName, setNewAdminName] = useState('')
  const [newAdminEmail, setNewAdminEmail] = useState('')
  const [newAdminRole, setNewAdminRole] = useState<'Super Admin' | 'Content Editor' | 'Operations Manager' | 'Customer Support' | 'Finance Admin' | 'Producer Manager'>('Content Editor')

  const columns = [
    {
      key: 'user',
      header: 'Admin User',
      accessor: (item: AdminUser) => (
        <div className="flex items-center gap-3">
          <div className="relative size-8 rounded-full overflow-hidden border border-border shrink-0">
            <Image src={item.avatar} alt={item.name} fill className="object-cover" />
          </div>
          <div>
            <p className="font-semibold text-foreground">{item.name}</p>
            <p className="text-[10px] text-muted-foreground">{item.email}</p>
          </div>
        </div>
      ),
      sortable: true,
    },
    {
      key: 'role',
      header: 'Role & Dept',
      accessor: (item: AdminUser) => (
        <div>
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
            {item.role}
          </span>
          <p className="text-[10px] text-muted-foreground mt-0.5">{item.department}</p>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      accessor: (item: AdminUser) => (
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
            item.status === 'Active' ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' : 'bg-rose-500/10 text-rose-700'
          }`}
        >
          {item.status === 'Active' ? <CheckCircle2 className="size-3" /> : <XCircle className="size-3" />}
          {item.status}
        </span>
      ),
    },
    {
      key: '2fa',
      header: '2FA Security',
      accessor: (item: AdminUser) => (
        <span className="text-[10px] font-semibold text-muted-foreground">
          {item.twoFactorEnabled ? 'Enabled' : 'Disabled'}
        </span>
      ),
    },
    {
      key: 'lastActive',
      header: 'Last Active',
      accessor: (item: AdminUser) => <span className="text-xs text-muted-foreground">{item.lastActive}</span>,
    },
    {
      key: 'actions',
      header: 'Actions',
      accessor: (item: AdminUser) => (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setUsers(users.map((u) => (u.id === item.id ? { ...u, status: u.status === 'Active' ? 'Inactive' : 'Active' } : u)))
            }}
            className="text-[11px] font-bold text-primary hover:underline"
          >
            Toggle Status
          </button>
        </div>
      ),
    },
  ]

  const handleCreateAdmin = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newAdminName || !newAdminEmail) return
    const created: AdminUser = {
      id: `adm-${Date.now()}`,
      name: newAdminName,
      email: newAdminEmail,
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200',
      role: newAdminRole,
      status: 'Active',
      department: 'General Staff',
      lastActive: 'Just now',
      twoFactorEnabled: false,
      createdAt: new Date().toISOString().split('T')[0],
      permissions: ['cms_edit'],
    }
    setUsers([created, ...users])
    setNewAdminName('')
    setNewAdminEmail('')
    setShowAddModal(false)
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="eyebrow">Access Control</span>
          <h2 className="font-serif text-2xl font-bold text-foreground">Admin & Staff Users</h2>
        </div>
        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground hover:bg-primary/90 transition-all shadow-xs"
        >
          <Plus className="size-4" /> Add Admin User
        </button>
      </div>

      <DataTable
        data={users}
        columns={columns}
        searchPlaceholder="Search admin name or email..."
        searchKey={(u) => `${u.name} ${u.email} ${u.role}`}
        keyExtractor={(u) => u.id}
      />

      {/* Add Admin Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-2xl space-y-4">
            <h3 className="font-serif text-xl font-bold text-foreground">Add New Admin Account</h3>
            <form onSubmit={handleCreateAdmin} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={newAdminName}
                  onChange={(e) => setNewAdminName(e.target.value)}
                  className="w-full rounded-lg border border-border p-2 outline-none focus:border-ring"
                  placeholder="e.g. Rahul Sharma"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={newAdminEmail}
                  onChange={(e) => setNewAdminEmail(e.target.value)}
                  className="w-full rounded-lg border border-border p-2 outline-none focus:border-ring"
                  placeholder="name@flashsalesonline.in"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Assigned Role</label>
                <select
                  value={newAdminRole}
                  onChange={(e) => setNewAdminRole(e.target.value as any)}
                  className="w-full rounded-lg border border-border p-2 outline-none focus:border-ring"
                >
                  <option value="Content Editor">Content Editor</option>
                  <option value="Operations Manager">Operations Manager</option>
                  <option value="Producer Manager">Producer Manager</option>
                  <option value="Finance Admin">Finance Admin</option>
                  <option value="Customer Support">Customer Support</option>
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
                  Create Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
