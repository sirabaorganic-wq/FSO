'use client'

import { useState } from 'react'
import { Settings, ShieldCheck, CheckSquare, Square, Plus } from 'lucide-react'
import { mockRoles, mockPermissionGroups } from '@/data/admin/roles'

export function RolesView() {
  const [roles, setRoles] = useState(mockRoles)

  const togglePermission = (roleId: string, permId: string) => {
    setRoles(
      roles.map((role) => {
        if (role.id !== roleId) return role
        const hasPerm = role.permissions.includes(permId)
        const updatedPerms = hasPerm
          ? role.permissions.filter((p) => p !== permId)
          : [...role.permissions, permId]
        return { ...role, permissions: updatedPerms }
      })
    )
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="eyebrow">Security & Access Controls</span>
          <h2 className="font-serif text-2xl font-bold text-foreground">Roles & Permission Matrix</h2>
        </div>
        <button
          type="button"
          className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground hover:bg-primary/90 shadow-xs"
        >
          <Plus className="size-4" /> Create Custom Role
        </button>
      </div>

      {/* Role Cards List */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {roles.map((role) => (
          <div key={role.id} className="rounded-xl border border-border bg-surface p-4 shadow-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-serif text-lg font-bold text-foreground">{role.name}</span>
              <span className="rounded bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                {role.userCount} Users Assigned
              </span>
            </div>
            <p className="text-xs text-muted-foreground line-clamp-2">{role.description}</p>
          </div>
        ))}
      </div>

      {/* Interactive Permission Matrix */}
      <div className="rounded-xl border border-border bg-surface p-5 shadow-xs space-y-4">
        <h3 className="font-serif text-xl font-bold text-foreground border-b border-border/60 pb-3">
          Interactive Permission Matrix
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
              {mockPermissionGroups.map((group) => (
                <tr key={group.category} className="bg-surface-muted/20">
                  <td colSpan={roles.length + 1} className="p-3 font-bold text-primary text-xs uppercase tracking-wider bg-surface-muted/30">
                    {group.category} — {group.description}
                  </td>
                </tr>
              ))}
              {mockPermissionGroups.flatMap((g) => g.permissions).map((perm) => (
                <tr key={perm.id} className="hover:bg-surface-muted/30 transition-colors">
                  <td className="p-3">
                    <p className="font-semibold text-foreground">{perm.name}</p>
                    <p className="text-[10px] text-muted-foreground">{perm.description}</p>
                  </td>
                  {roles.map((role) => {
                    const isGranted = role.permissions.includes('all') || role.permissions.includes(perm.id)
                    return (
                      <td key={role.id} className="p-3 text-center">
                        <button
                          type="button"
                          onClick={() => togglePermission(role.id, perm.id)}
                          aria-label={`Toggle permission ${perm.name} for role ${role.name}`}
                          className="inline-flex items-center justify-center p-1 rounded hover:bg-surface-muted"
                        >
                          {isGranted ? (
                            <CheckSquare className="size-4 text-emerald-600" />
                          ) : (
                            <Square className="size-4 text-muted-foreground/40" />
                          )}
                        </button>
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
