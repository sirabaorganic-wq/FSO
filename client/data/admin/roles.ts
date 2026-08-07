import { RoleDefinition, PermissionGroup } from '@/types/admin'

export const mockPermissionGroups: PermissionGroup[] = [
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
  {
    category: 'System & Security',
    description: 'Administrative configuration, staff roles, and audit logs',
    permissions: [
      { id: 'users_manage', name: 'Manage Staff Users', description: 'Add, suspend, and edit admin user accounts' },
      { id: 'roles_manage', name: 'Manage Roles', description: 'Configure role permissions and security policies' },
      { id: 'settings_edit', name: 'System Settings', description: 'Modify payment gateways, shipping rules, and SEO' },
      { id: 'audit_view', name: 'View Audit Logs', description: 'Inspect full system activity timeline' },
    ],
  },
]

export const mockRoles: RoleDefinition[] = [
  {
    id: 'role-1',
    name: 'Super Admin',
    description: 'Full administrative access to all systems, settings, and financial controls.',
    userCount: 2,
    isSystem: true,
    permissions: ['all', 'orders_manage', 'refunds_process', 'analytics_view', 'reports_export', 'producer_approve', 'producer_edit', 'producer_payout', 'products_edit', 'products_approve', 'categories_manage', 'cms_edit', 'cms_publish', 'media_upload', 'banner_manage', 'users_manage', 'roles_manage', 'settings_edit', 'audit_view'],
  },
  {
    id: 'role-2',
    name: 'Content Editor',
    description: 'Manage articles, recipes, ingredient library, homepage hero, and media assets.',
    userCount: 4,
    isSystem: false,
    permissions: ['cms_edit', 'cms_publish', 'media_upload', 'banner_manage', 'categories_manage'],
  },
  {
    id: 'role-3',
    name: 'Operations Manager',
    description: 'Fulfill orders, track shipping logistics, handle inventory alerts and exports.',
    userCount: 3,
    isSystem: false,
    permissions: ['orders_manage', 'refunds_process', 'products_edit', 'reports_export'],
  },
  {
    id: 'role-4',
    name: 'Producer Manager',
    description: 'Review producer applications, verify legal compliance, and manage seller profiles.',
    userCount: 2,
    isSystem: false,
    permissions: ['producer_approve', 'producer_edit', 'products_approve'],
  },
  {
    id: 'role-5',
    name: 'Finance Admin',
    description: 'Manage seller payouts, inspect sales analytics, audit refunds, and tax compliance.',
    userCount: 2,
    isSystem: false,
    permissions: ['producer_payout', 'refunds_process', 'analytics_view', 'reports_export', 'audit_view'],
  },
  {
    id: 'role-6',
    name: 'Customer Support',
    description: 'Read-only access to customer profiles and orders for ticket resolution.',
    userCount: 5,
    isSystem: false,
    permissions: ['orders_manage', 'analytics_view'],
  },
]
