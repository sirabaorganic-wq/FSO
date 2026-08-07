'use client'

import { useState } from 'react'
import { AdminSidebar } from './admin-sidebar'
import { AdminTopbar } from './admin-topbar'
import { AdminCommandPalette } from './admin-command-palette'

import { DashboardView } from './views/dashboard-view'
import { UsersView } from './views/users-view'
import { CustomersView } from './views/customers-view'
import { ProducersView } from './views/producers-view'
import { ProducerApprovalsView } from './views/producer-approvals-view'
import { ProductsView } from './views/products-view'
import { CategoriesView } from './views/categories-view'
import { CollectionsView } from './views/collections-view'
import { OrdersView } from './views/orders-view'
import { ReviewsView } from './views/reviews-view'
import { ArticlesView } from './views/articles-view'
import { RecipesView } from './views/recipes-view'
import { IngredientsView } from './views/ingredients-view'
import { KitchenWisdomView } from './views/kitchen-wisdom-view'
import { HomepageView } from './views/homepage-view'
import { MediaLibraryView } from './views/media-library-view'
import { BannersView } from './views/banners-view'
import { CouponsView } from './views/coupons-view'
import { NotificationsView } from './views/notifications-view'
import { ReportsView } from './views/reports-view'
import { AnalyticsView } from './views/analytics-view'
import { SystemSettingsView } from './views/system-settings-view'
import { RolesView } from './views/roles-view'
import { ActivityView } from './views/activity-view'
import { HelpView } from './views/help-view'

export type AdminViewType =
  | 'dashboard'
  | 'users'
  | 'customers'
  | 'producers'
  | 'producer-approvals'
  | 'products'
  | 'categories'
  | 'collections'
  | 'orders'
  | 'reviews'
  | 'articles'
  | 'recipes'
  | 'ingredients'
  | 'kitchen-wisdom'
  | 'homepage'
  | 'media-library'
  | 'banners'
  | 'coupons'
  | 'notifications'
  | 'reports'
  | 'analytics'
  | 'system-settings'
  | 'roles'
  | 'activity'
  | 'help'

const viewTitles: Record<AdminViewType, { title: string; subtitle?: string }> = {
  dashboard: { title: 'Dashboard Overview', subtitle: 'Real-time marketplace revenue, fulfillment, and system status.' },
  users: { title: 'Admin & Staff Users', subtitle: 'Manage internal staff accounts, roles, and two-factor security.' },
  customers: { title: 'Customer Directory', subtitle: 'Manage customer accounts, purchasing history, and VIP cohorts.' },
  producers: { title: 'Producer Directory', subtitle: 'Directory of verified artisanal producers and regional performance.' },
  'producer-approvals': { title: 'Producer Approvals Queue', subtitle: 'Review and verify compliance documents and onboarding applications.' },
  products: { title: 'Product Catalog', subtitle: 'Curate product listings, pricing, inventory levels, and stock alerts.' },
  categories: { title: 'Category Taxonomy', subtitle: 'Organize products by traditional heritage processing methods.' },
  collections: { title: 'Curated Collections', subtitle: 'Manage seasonal, regional, and thematic product groupings.' },
  orders: { title: 'Order Management', subtitle: 'Track order fulfillment, shipment tracking, returns, and tax invoices.' },
  reviews: { title: 'Product Reviews', subtitle: 'Moderate customer ratings, feedback, and verified buyer reviews.' },
  articles: { title: 'Articles & Stories', subtitle: 'Publish heritage food science, bilona ghee guides, and producer stories.' },
  recipes: { title: 'Recipes CMS', subtitle: 'Manage traditional heirloom recipes and regional ingredient linkages.' },
  ingredients: { title: 'Ingredient Library', subtitle: 'Botanical archive of native Indian herbs, spices, and heritage grains.' },
  'kitchen-wisdom': { title: 'Kitchen Wisdom', subtitle: 'Configure kitchen wisdom pillars and editorial food guides.' },
  homepage: { title: 'Homepage Editor', subtitle: 'Visual block editor to reorder sections, hero banners, and featured stories.' },
  'media-library': { title: 'Media Library', subtitle: 'Store, tag, and organize product photos, videos, and compliance docs.' },
  banners: { title: 'Promotional Banners', subtitle: 'Configure homepage hero, category, and promotional banners.' },
  coupons: { title: 'Coupons & Offers', subtitle: 'Create discount codes, free shipping thresholds, and validity periods.' },
  notifications: { title: 'Notification Center', subtitle: 'Compose and schedule Push, Email, SMS, and In-App broadcasts.' },
  reports: { title: 'Marketplace Reports', subtitle: 'Generate and download GST tax, seller payout, and sales reports.' },
  analytics: { title: 'Deep Analytics', subtitle: 'Revenue trajectories, state-wise sales distribution, and growth charts.' },
  'system-settings': { title: 'System Settings', subtitle: 'Configure brand identity, payment gateways, shipping, and SEO.' },
  roles: { title: 'Roles & Permissions', subtitle: 'Permission matrix for Super Admin, Content Editor, and Operations.' },
  activity: { title: 'Activity & Audit Logs', subtitle: 'Comprehensive security audit log of all system actions.' },
  help: { title: 'Admin Documentation', subtitle: 'User manuals, keyboard shortcuts, and system health status.' },
}

export function AdminLayout({ view = 'dashboard' }: { view?: AdminViewType }) {
  const [collapsed, setCollapsed] = useState(false)
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false)

  const info = viewTitles[view] || viewTitles.dashboard

  return (
    <div className="min-h-screen bg-background text-foreground font-sans antialiased selection:bg-accent selection:text-accent-foreground">
      {/* Sidebar */}
      <AdminSidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />

      {/* Main Content Area */}
      <div
        className={`flex min-h-screen flex-col transition-all duration-300 ${
          collapsed ? 'pl-16' : 'pl-0 md:pl-64'
        }`}
      >
        {/* TopBar */}
        <AdminTopbar
          title={info.title}
          subtitle={info.subtitle}
          sidebarCollapsed={collapsed}
          onToggleSidebar={() => setCollapsed(!collapsed)}
          onOpenCommandPalette={() => setCommandPaletteOpen(true)}
        />

        {/* View Component Container */}
        <main className="flex-1 p-4 md:p-6 lg:p-8 max-w-[1600px] w-full mx-auto space-y-6">
          {view === 'dashboard' && <DashboardView />}
          {view === 'users' && <UsersView />}
          {view === 'customers' && <CustomersView />}
          {view === 'producers' && <ProducersView />}
          {view === 'producer-approvals' && <ProducerApprovalsView />}
          {view === 'products' && <ProductsView />}
          {view === 'categories' && <CategoriesView />}
          {view === 'collections' && <CollectionsView />}
          {view === 'orders' && <OrdersView />}
          {view === 'reviews' && <ReviewsView />}
          {view === 'articles' && <ArticlesView />}
          {view === 'recipes' && <RecipesView />}
          {view === 'ingredients' && <IngredientsView />}
          {view === 'kitchen-wisdom' && <KitchenWisdomView />}
          {view === 'homepage' && <HomepageView />}
          {view === 'media-library' && <MediaLibraryView />}
          {view === 'banners' && <BannersView />}
          {view === 'coupons' && <CouponsView />}
          {view === 'notifications' && <NotificationsView />}
          {view === 'reports' && <ReportsView />}
          {view === 'analytics' && <AnalyticsView />}
          {view === 'system-settings' && <SystemSettingsView />}
          {view === 'roles' && <RolesView />}
          {view === 'activity' && <ActivityView />}
          {view === 'help' && <HelpView />}
        </main>
      </div>

      {/* Quick Command Palette Popup */}
      <AdminCommandPalette open={commandPaletteOpen} onClose={() => setCommandPaletteOpen(false)} />
    </div>
  )
}
