'use client'

import { useState, useEffect } from 'react'
import { Settings, ShieldCheck, CheckSquare, Square, RefreshCw } from 'lucide-react'
import { getAdminUsersApi, type AdminUserItem } from '@/lib/api/admin'

interface RoleItem {
  id: string
  name: string
  roleKey: string
  description: string
  permissions: string[]
}

const SYSTEM_ROLES: RoleItem[] = [
  {
    id: 'role-1',
    name: 'Super Admin',
    roleKey: 'admin',
    description: 'Full administrative access to all systems, settings, and financial controls.',
    permissions: ['all'],
  },
  {
    id: 'role-2',
    name: 'Operations Manager',
    roleKey: 'operations_manager',
    description: 'Manages logistics, orders, fulfillment tracking, and inventory updates.',
    permissions: ['orders_manage', 'refunds_process', 'analytics_view', 'products_edit', 'products_approve', 'categories_manage'],
  },
  {
    id: 'role-3',
    name: 'Finance Admin',
    roleKey: 'finance_admin',
    description: 'Handles seller payouts, GST compliance, invoice verification, and refund reconciliations.',
    permissions: ['orders_manage', 'refunds_process', 'analytics_view', 'reports_export', 'producer_payout'],
  },
  {
    id: 'role-4',
    name: 'Producer Onboarder',
    roleKey: 'vendor_onboarder',
    description: 'Inspects verification documents, licenses, certificates, and reviews producer onboarding applications.',
    permissions: ['producer_approve', 'producer_edit', 'analytics_view'],
  },
  {
    id: 'role-5',
    name: 'Content & Editorial',
    roleKey: 'content_editor',
    description: 'Manages Kitchen Wisdom articles, heirloom recipes, glossary terms, and homepage banners.',
    permissions: ['cms_edit', 'cms_publish', 'media_upload', 'banner_manage'],
  },
]

const PERMISSION_GROUPS = [
  {
    category: 'Marketplace & Sales',
    description: 'Control orders, refunds, and financial reporting',
    permissions: [
      { id: 'orders_manage', name: 'Manage Orders', description: 'View, edit, fulfill and cancel customer orders' },
      { id: 'refunds_process', name: 'Process Refunds', description: 'Approve and trigger return refunds' },
      { id: 'analytics_view', name: 'View Analytics', description: 'Access revenue metrics and sales performance' },
      { id: 'reports_export', name: 'Export Reports', description: 'Generate and download financial reports' },
    ],
  },
  {
    category: 'Producer Management',
    description: 'Onboard and inspect artisanal producers',
    permissions: [
      { id: 'producer_approve', name: 'Approve Producers', description: 'Review verification documents and onboard producers' },
      { id: 'producer_edit', name: 'Edit Producer Profiles', description: 'Modify producer stories, addresses, and details' },
      { id: 'producer_payout', name: 'Manage Payouts', description: 'Trigger bank transfers and commission holds' },
    ],
  },
  {
    category: 'Catalog & Products',
    description: 'Curate products, pricing, inventory, and categories',
    permissions: [
      { id: 'products_edit', name: 'Edit Products', description: 'Create and update product details and pricing' },
      { id: 'products_approve', name: 'Approve Listings', description: 'Review seller submitted products for listing' },
      { id: 'categories_manage', name: 'Manage Categories', description: 'Create and organize categories and collections' },
    ],
  },
  {
    category: 'Content Management (CMS)',
    description: 'Manage homepage, articles, recipes, and media',
    permissions: [
      { id: 'cms_edit', name: 'Create & Edit Content', description: 'Draft articles, recipes, and homepage sections' },
      { id: 'cms_publish', name: 'Publish Content', description: 'Publish content live to the storefront' },
      { id: 'media_upload', name: 'Media Library Access', description: 'Upload and organize media assets' },
      { id: 'banner_manage', name: 'Manage Banners', description: 'Create and schedule promotional banners' },
    ],
  },
]

export function RolesView() {
  const [roles, setRoles] = useState(SYSTEM_ROLES)
  const [userCounts, setUserCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let isMounted = true
    getAdminUsersApi()
      .then((users: AdminUserItem[]) => {
        if (!isMounted) return
        const counts: Record<string, number> = {}
        users.forEach((u) => {
          const r = (u.role || 'customer').toLowerCase()
          counts[r] = (counts[r] || 0) + 1
          if (u.isAdmin) counts['admin'] = (counts['admin'] || 0) + 1
        })
        setUserCounts(counts)
      })
      .catch(() => {})
      .finally(() => {
        if (isMounted) setLoading(false)
      })
    return () => {
      isMounted = false
    }
  }, [])

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="eyebrow">Security & Access Controls</span>
          <h2 className="font-serif text-2xl font-bold text-foreground">Roles & Capability Matrix</h2>
          <span className="inline-block mt-1 rounded bg-surface-muted border border-border px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
            STATIC CONFIG / RBAC REFERENCE
          </span>
        </div>
      </div>

      {/* Role Cards List */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {roles.map((role) => (
          <div key={role.id} className="rounded-xl border border-border bg-surface p-4 shadow-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-serif text-lg font-bold text-foreground">{role.name}</span>
              <span className="rounded bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                {loading ? '...' : `${userCounts[role.roleKey] || 0} Users Assigned`}
              </span>
            </div>
            <p className="text-xs text-muted-foreground line-clamp-2">{role.description}</p>
          </div>
        ))}
      </div>

      {/* Interactive Permission Matrix */}
      <div className="rounded-xl border border-border bg-surface p-5 shadow-xs space-y-4">
        <h3 className="font-serif text-xl font-bold text-foreground border-b border-border/60 pb-3">
          RBAC Capability Matrix
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-surface-muted/50 border-b border-border text-[10px] font-bold uppercase text-muted-foreground">
              <tr>
                <th className="p-3 w-64">Permission Function</th>
                {roles.map((role) => (
                  <th key={role.id} className="p-3 text-center min-w-28">
                    {role.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {PERMISSION_GROUPS.map((group) => (
                <tr key={group.category} className="bg-surface-muted/20">
                  <td colSpan={roles.length + 1} className="p-3 font-bold text-primary text-xs uppercase tracking-wider bg-surface-muted/30">
                    {group.category} — {group.description}
                  </td>
                </tr>
              ))}
              {PERMISSION_GROUPS.flatMap((g) => g.permissions).map((perm) => (
                <tr key={perm.id} className="hover:bg-surface-muted/30 transition-colors">
                  <td className="p-3">
                    <p className="font-semibold text-foreground">{perm.name}</p>
                    <p className="text-[10px] text-muted-foreground">{perm.description}</p>
                  </td>
                  {roles.map((role) => {
                    const isGranted = role.permissions.includes('all') || role.permissions.includes(perm.id)
                    return (
                      <td key={role.id} className="p-3 text-center">
                        <div className="inline-flex items-center justify-center p-1">
                          {isGranted ? (
                            <CheckSquare className="size-4 text-emerald-600" />
                          ) : (
                            <Square className="size-4 text-muted-foreground/40" />
                          )}
                        </div>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
