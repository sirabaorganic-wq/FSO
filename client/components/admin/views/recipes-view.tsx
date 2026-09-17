'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { UtensilsCrossed, Plus, Clock, RefreshCw, AlertCircle } from 'lucide-react'
import { getAdminRecipesApi } from '@/lib/api/admin'

interface RecipeItem {
  id: string
  title: string
  slug: string
  region?: string
  prepTime?: string
  cookTime?: string
  ingredientsCount?: number
  difficulty?: string
  image?: string
  coverImage?: string
}

export function RecipesView() {
  const [recipes, setRecipes] = useState<RecipeItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadRecipes = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await getAdminRecipesApi()
      setRecipes(Array.isArray(data) ? data : [])
    } catch (err: unknown) {
      console.error('Failed to load recipes:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch recipes')
      setRecipes([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadRecipes()
  }, [])

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="eyebrow">CMS Heirloom Recipes</span>
          <h2 className="font-serif text-2xl font-bold text-foreground">Traditional Recipes Library</h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadRecipes}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-semibold hover:bg-surface-muted transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-xs font-medium text-destructive">
          <AlertCircle className="size-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="py-16 text-center text-xs text-muted-foreground">
          <RefreshCw className="size-6 animate-spin mx-auto mb-2 text-primary" />
          Loading recipes from database...
        </div>
      ) : recipes.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/80 p-12 text-center text-xs text-muted-foreground bg-surface">
          <UtensilsCrossed className="size-10 mx-auto mb-3 opacity-40 text-primary" />
          <h3 className="font-serif text-base font-bold text-foreground">No Recipes in Database</h3>
          <p className="mt-1 max-w-md mx-auto">
            The database currently contains zero heirloom recipes. Published recipes linking traditional cooking methods will appear here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {recipes.map((rcp) => (
            <div key={rcp.id} className="rounded-xl border border-border bg-surface p-5 shadow-xs space-y-3">
              {(rcp.image || rcp.coverImage) && (
                <div className="relative h-40 w-full rounded-lg overflow-hidden border border-border">
                  <Image src={rcp.image || rcp.coverImage || ''} alt={rcp.title} fill className="object-cover" />
                  {rcp.region && (
                    <span className="absolute top-2 left-2 rounded-full bg-secondary text-secondary-foreground px-2 py-0.5 text-[10px] font-bold">
                      {rcp.region}
                    </span>
                  )}
                </div>
              )}
              <div>
                <h3 className="font-serif text-lg font-bold text-foreground">{rcp.title}</h3>
                <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                  {rcp.prepTime && (
                    <span className="flex items-center gap-1"><Clock className="size-3.5" /> Prep: {rcp.prepTime}</span>
                  )}
                  {rcp.ingredientsCount !== undefined && (
                    <>
                      <span>•</span>
                      <span>{rcp.ingredientsCount} Ingredients</span>
                    </>
                  )}
                </div>
              </div>
              {rcp.difficulty && (
                <div className="border-t border-border/60 pt-3 flex items-center justify-between text-xs">
                  <span className="font-semibold text-emerald-700 dark:text-emerald-400">{rcp.difficulty}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
