'use client'

import { useState, useEffect } from 'react'
import { ShieldCheck, Plus, CheckCircle2, XCircle, RefreshCw, AlertCircle, Trash2 } from 'lucide-react'
import { DataTable } from '../data-table'
import {
  getAdminUsersApi,
  createAdminSubadminApi,
  deleteAdminSubadminApi,
  type AdminUserItem,
} from '@/lib/api/admin'

export function UsersView() {
  const [users, setUsers] = useState<AdminUserItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [newAdminName, setNewAdminName] = useState('')
  const [newAdminEmail, setNewAdminEmail] = useState('')
  const [newAdminPassword, setNewAdminPassword] = useState('')
  const [newAdminRole, setNewAdminRole] = useState<'VENDOR_ONBOARDER' | 'BLOG_CREATOR'>('VENDOR_ONBOARDER')
  const [actionNotice, setActionNotice] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  const loadUsers = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await getAdminUsersApi()
      setUsers(data || [])
    } catch (err: unknown) {
      console.error('Failed to load users:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch user directory')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadUsers()
  }, [])

  const handleCreateSubadmin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newAdminName || !newAdminEmail || !newAdminPassword) return
    try {
      setActionLoading(true)
      await createAdminSubadminApi({
        name: newAdminName.trim(),
        email: newAdminEmail.trim(),
        password: newAdminPassword,
        role: newAdminRole,
      })
      setActionNotice(`Successfully created ${newAdminRole} account for ${newAdminEmail}`)
      setNewAdminName('')
      setNewAdminEmail('')
      setNewAdminPassword('')
      setShowAddModal(false)
      await loadUsers()
    } catch (err: unknown) {
      console.error('Failed to create subadmin:', err)
      setActionNotice(err instanceof Error ? err.message : 'Failed to create subadmin')
    } finally {
      setActionLoading(false)
    }
  }

  const handleDeleteSubadmin = async (id: string) => {
    if (!confirm('Are you sure you want to remove this operational sub-admin account?')) return
    try {
      setActionLoading(true)
      await deleteAdminSubadminApi(id)
      setActionNotice('Sub-admin account removed successfully')
      await loadUsers()
    } catch (err: unknown) {
      console.error('Failed to delete subadmin:', err)
      setActionNotice(err instanceof Error ? err.message : 'Failed to delete subadmin')
    } finally {
      setActionLoading(false)
    }
  }

  const columns = [
    {
      key: 'name',
      header: 'Staff User',
      accessor: (item: AdminUserItem) => (
        <div>
          <p className="font-semibold text-foreground">{item.name}</p>
          <p className="text-[10px] text-muted-foreground">{item.email}</p>
        </div>
      ),
      sortable: true,
    },
    {
      key: 'role',
      header: 'Assigned Role',
      accessor: (item: AdminUserItem) => (
        <div>
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary uppercase">
            {item.role}
          </span>
          {item.isAdmin && (
            <span className="ml-1.5 rounded-full bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-bold text-amber-700 dark:text-amber-300">
              SUPER ADMIN
            </span>
          )}
        </div>
      ),
      sortable: true,
    },
    {
      key: 'status',
      header: 'Account State',
      accessor: (item: AdminUserItem) => (
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
            !item.isBlocked
              ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
              : 'bg-rose-500/10 text-rose-700'
          }`}
        >
          {!item.isBlocked ? <CheckCircle2 className="size-3" /> : <XCircle className="size-3" />}
          {!item.isBlocked ? 'Active' : 'Blocked'}
        </span>
      ),
    },
    {
      key: 'totalOrders',
      header: 'Associated Orders',
      accessor: (item: AdminUserItem) => (
        <span className="text-xs font-semibold text-foreground">{item.totalOrders || 0}</span>
      ),
    },
    {
      key: 'createdAt',
      header: 'Member Since',
      accessor: (item: AdminUserItem) => (
        <span className="text-xs text-muted-foreground">
          {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : 'N/A'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      accessor: (item: AdminUserItem) => {
        const isSubadmin = ['vendor_onboarder', 'blog_creator'].includes(item.role.toLowerCase())
        if (!isSubadmin) return null
        return (
          <button
            type="button"
            onClick={() => handleDeleteSubadmin(item.id)}
            className="text-xs text-destructive hover:underline flex items-center gap-1"
          >
            <Trash2 className="size-3.5" /> Remove
          </button>
        )
      },
    },
  ]

  if (loading) {
    return (
      <div className="space-y-4 p-4 animate-pulse">
        <div className="h-8 w-48 bg-surface-muted rounded" />
        <div className="h-64 bg-surface-muted rounded-xl" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-8 text-center space-y-4">
        <AlertCircle className="size-10 text-destructive mx-auto" />
        <p className="text-sm font-semibold text-foreground">{error}</p>
        <button
          type="button"
          onClick={loadUsers}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground hover:bg-primary/90"
        >
          <RefreshCw className="size-3.5" /> Retry
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="eyebrow">Access Control & Staff Management</span>
          <h2 className="font-serif text-2xl font-bold text-foreground">Admin & Staff Users</h2>
        </div>
        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground hover:bg-primary/90 transition-all shadow-xs"
        >
          <Plus className="size-4" /> Create Staff Account
        </button>
      </div>

      {actionNotice && (
        <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-xs font-semibold text-primary flex items-center justify-between">
          <span>{actionNotice}</span>
          <button type="button" onClick={() => setActionNotice(null)} className="underline ml-2">
            Dismiss
          </button>
        </div>
      )}

      <DataTable
        data={users}
        columns={columns}
        searchKey={(u) => `${u.name} ${u.email} ${u.role}`}
        keyExtractor={(u) => u.id}
        searchPlaceholder="Filter users by name or email address..."
      />

      {/* Add Staff Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-xl border border-border bg-surface p-6 shadow-2xl space-y-4">
            <h3 className="font-serif text-lg font-bold text-foreground">Add Operational Sub-Admin</h3>
            <p className="text-xs text-muted-foreground">
              Create an administrative account with role-restricted operational authority.
            </p>
            <form onSubmit={handleCreateSubadmin} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold mb-1 text-foreground">Full Name</label>
                <input
                  type="text"
                  required
                  value={newAdminName}
                  onChange={(e) => setNewAdminName(e.target.value)}
                  placeholder="e.g. Ramesh Kumar"
                  className="w-full rounded-lg border border-border bg-background p-2.5 text-xs text-foreground outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1 text-foreground">Email Address</label>
                <input
                  type="email"
                  required
                  value={newAdminEmail}
                  onChange={(e) => setNewAdminEmail(e.target.value)}
                  placeholder="ramesh@heritagekitchen.in"
                  className="w-full rounded-lg border border-border bg-background p-2.5 text-xs text-foreground outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1 text-foreground">Password (min. 6 chars)</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={newAdminPassword}
                  onChange={(e) => setNewAdminPassword(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background p-2.5 text-xs text-foreground outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1 text-foreground">Sub-Admin Role</label>
                <select
                  value={newAdminRole}
                  onChange={(e) => setNewAdminRole(e.target.value as 'VENDOR_ONBOARDER' | 'BLOG_CREATOR')}
                  className="w-full rounded-lg border border-border bg-background p-2.5 text-xs text-foreground outline-none focus:border-primary"
                >
                  <option value="VENDOR_ONBOARDER">Vendor Onboarder (Review and approve producers)</option>
                  <option value="BLOG_CREATOR">Blog Creator (Author recipes and articles)</option>
                </select>
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="rounded-lg border border-border px-4 py-2 text-xs font-bold text-muted-foreground hover:bg-surface-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="rounded-lg bg-primary px-4 py-2 text-xs font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  {actionLoading ? 'Creating...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
