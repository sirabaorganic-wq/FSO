'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { Sparkles, Plus, RefreshCw, AlertCircle } from 'lucide-react'
import { getAdminIngredientsApi } from '@/lib/api/admin'

interface IngredientItem {
  id: string
  name: string
  slug?: string
  hindiName?: string
  botanicalName?: string
  originState?: string
  description?: string
  image?: string
  healthBenefits?: string[]
}

export function IngredientsView() {
  const [ingredients, setIngredients] = useState<IngredientItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadIngredients = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await getAdminIngredientsApi()
      setIngredients(Array.isArray(data) ? data : [])
    } catch (err: unknown) {
      console.error('Failed to load ingredients:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch ingredients')
      setIngredients([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadIngredients()
  }, [])

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="eyebrow">Botanical & Heritage Archive</span>
          <h2 className="font-serif text-2xl font-bold text-foreground">Ingredient Encyclopedia</h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadIngredients}
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
          Loading ingredients from database...
        </div>
      ) : ingredients.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/80 p-12 text-center text-xs text-muted-foreground bg-surface">
          <Sparkles className="size-10 mx-auto mb-3 opacity-40 text-primary" />
          <h3 className="font-serif text-base font-bold text-foreground">No Botanical Ingredients in Database</h3>
          <p className="mt-1 max-w-md mx-auto">
            The database currently contains zero botanical ingredient profiles. Curated ingredient records will appear here once saved.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {ingredients.map((ing) => (
            <div key={ing.id} className="rounded-xl border border-border bg-surface p-5 shadow-xs space-y-3">
              {ing.image && (
                <div className="relative h-36 w-full rounded-lg overflow-hidden border border-border">
                  <Image src={ing.image} alt={ing.name} fill className="object-cover" />
                  {ing.originState && (
                    <span className="absolute top-2 left-2 rounded-full bg-accent text-accent-foreground px-2 py-0.5 text-[10px] font-bold">
                      Origin: {ing.originState}
                    </span>
                  )}
                </div>
              )}
              <div>
                {(ing.hindiName || ing.botanicalName) && (
                  <span className="text-[10px] font-bold text-secondary uppercase tracking-wider">
                    {ing.hindiName ? `${ing.hindiName} • ` : ''}{ing.botanicalName}
                  </span>
                )}
                <h3 className="font-serif text-lg font-bold text-foreground">{ing.name}</h3>
                {ing.description && (
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{ing.description}</p>
                )}
              </div>
              {Array.isArray(ing.healthBenefits) && ing.healthBenefits.length > 0 && (
                <div className="border-t border-border/60 pt-3 text-xs space-y-1">
                  <p className="font-semibold text-foreground">Health Benefits:</p>
                  <div className="flex flex-wrap gap-1">
                    {ing.healthBenefits.map((b, i) => (
                      <span key={i} className="rounded bg-surface-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                        {b}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
