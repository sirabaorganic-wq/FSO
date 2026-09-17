'use client'

import React, { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, Heart, Plus, Check } from 'lucide-react'
import { SiteHeader } from '@/components/layout/site-header'
import { SiteFooter } from '@/components/layout/site-footer'
import { BackButton } from '@/components/ui/back-button'
import { ProductGallery } from '@/components/product/product-gallery'
import {
  ArticleCard,
  FAQAccordion,
  NutritionCard,
  ProducerProfileCard,
  ProductHero,
  ProductInfo,
  ProductSectionTitle,
  RecipeCard,
  ReviewCard,
  SpecificationTable,
} from '@/components/product/product-sections'
import type { ProductDetail } from '@/types/product'
import type { DiscoveryProduct } from '@/types/discovery'
import { useCart } from '@/lib/cart-context'
import { useAuth } from '@/lib/auth-context'
import { useToast } from '@/lib/toast'
import { toggleWishlistApi } from '@/lib/api/wishlist'

export function ProductDetailPage({
  product,
  related = [],
}: {
  product: ProductDetail
  related?: DiscoveryProduct[]
}) {
  const { addToCart, isLoading: isCartLoading } = useCart()
  const { isAuthenticated } = useAuth()
  const { addToast } = useToast()
  const [isWishlisted, setIsWishlisted] = useState(false)
  const [wishlistLoading, setWishlistLoading] = useState(false)

  const handleAddToBasket = async () => {
    await addToCart(product.id || product.slug, 1, null, product)
  }

  const handleToggleWishlist = async () => {
    if (!isAuthenticated) {
      addToast({
        title: 'Sign in required',
        description: 'Please sign in to save items to your wishlist.',
        variant: 'error',
      })
      return
    }

    setWishlistLoading(true)
    try {
      const res = await toggleWishlistApi(product.slug)
      const added = res.wishlist.includes(product.slug)
      setIsWishlisted(added)
      addToast({
        title: added ? 'Added to wishlist' : 'Removed from wishlist',
        description: res.message,
        variant: 'success',
      })
    } catch (err) {
      addToast({
        title: 'Wishlist error',
        description: err instanceof Error ? err.message : 'Could not update wishlist.',
        variant: 'error',
      })
    } finally {
      setWishlistLoading(false)
    }
  }

  return (
    <>
      <SiteHeader />
      <main id="main-content">
        <div className="container-shell py-10 sm:py-16 lg:py-20">
          <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
            <nav aria-label="Breadcrumb" className="text-xs text-muted-foreground flex items-center">
              <Link href="/shop" className="hover:text-foreground">
                Shop
              </Link>
              <span className="mx-2">/</span>
              <span className="text-foreground font-medium truncate max-w-[240px] sm:max-w-none">{product.name}</span>
            </nav>
            <BackButton fallbackHref="/shop" label="Back to shop" variant="pill" className="text-xs" />
          </div>
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(360px,0.95fr)] lg:items-start lg:gap-16">
            <ProductGallery images={product.images} name={product.name} />
            <div className="lg:sticky lg:top-28">
              <ProductHero product={product} />
              <div className="mt-6">
                <ProductInfo product={product} />
              </div>
              <div className="mt-6 flex gap-3">
                <button
                  type="button"
                  onClick={handleAddToBasket}
                  disabled={isCartLoading}
                  className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors duration-200 hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                >
                  <Plus className="size-4" aria-hidden="true" /> Add to basket
                </button>
                <button
                  type="button"
                  aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
                  onClick={handleToggleWishlist}
                  disabled={wishlistLoading}
                  className={`inline-flex size-12 items-center justify-center border transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                    isWishlisted
                      ? 'border-accent bg-accent text-accent-foreground'
                      : 'border-border text-foreground hover:border-primary hover:text-secondary'
                  }`}
                >
                  <Heart className={`size-5 ${isWishlisted ? 'fill-current' : ''}`} aria-hidden="true" />
                </button>
              </div>
              <p className="mt-3 text-center text-xs text-muted-foreground">
                A considered pantry staple, delivered with its source story.
              </p>
            </div>
          </div>

          <section className="mx-auto mt-20 max-w-reading border-t border-border pt-16 lg:mt-28" id="story">
            <ProductSectionTitle eyebrow="The story in the bottle" title="An everyday ingredient, made with patience." />
            <p className="mt-8 text-lg leading-relaxed text-muted-foreground">{product.story}</p>
            <div className="mt-10 grid gap-8 border-y border-border py-8 sm:grid-cols-3">
              <div>
                <p className="eyebrow">Ingredients</p>
                <p className="mt-2 text-sm leading-relaxed text-foreground">{product.ingredients.join(' · ')}</p>
              </div>
              <div>
                <p className="eyebrow">Best for</p>
                <p className="mt-2 text-sm leading-relaxed text-foreground">{product.uses.join(' · ')}</p>
              </div>
              <div>
                <p className="eyebrow">From</p>
                <p className="mt-2 text-sm leading-relaxed text-foreground">{product.region}</p>
              </div>
            </div>
          </section>

          <section className="mx-auto mt-20 max-w-content lg:mt-28" id="producer-story">
            <ProductSectionTitle
              eyebrow="People of the source"
              title="Meet the family behind the method"
              intro="Trust becomes tangible when you know the hands, place and practice behind an ingredient."
            />
            <div className="mt-10">
              <ProducerProfileCard product={product} />
            </div>
          </section>

          <section className="mx-auto mt-20 max-w-content lg:mt-28">
            <ProductSectionTitle eyebrow="Nourishment, simply" title="What is in every pour" />
            <div className="mt-10">
              <NutritionCard items={product.nutrition} />
            </div>
          </section>

          {product.recipes && product.recipes.length > 0 && (
            <section className="mx-auto mt-20 max-w-content lg:mt-28">
              <ProductSectionTitle eyebrow="In your kitchen" title="Recipes for everyday rituals" />
              <div className="mt-10 grid gap-8 md:grid-cols-2">
                {product.recipes.map((recipe) => (
                  <RecipeCard key={recipe.title} recipe={recipe} />
                ))}
              </div>
            </section>
          )}

          <section className="mx-auto mt-20 max-w-content lg:mt-28">
            <ProductSectionTitle eyebrow="The practical details" title="Good to know" />
            <div className="mt-10 grid gap-12 lg:grid-cols-[1.15fr_0.85fr]">
              <SpecificationTable items={product.specifications} />
              <div>
                <p className="eyebrow">Storage guide</p>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  Keep closed in a cool, dry cupboard away from direct sunlight. Small changes in colour and aroma are
                  natural for a minimally processed food.
                </p>
              </div>
            </div>
          </section>

          {product.faqs && product.faqs.length > 0 && (
            <section className="mx-auto mt-20 max-w-reading lg:mt-28">
              <ProductSectionTitle eyebrow="Questions, answered" title="A little more clarity" />
              <div className="mt-8">
                <FAQAccordion items={product.faqs} />
              </div>
            </section>
          )}

          <section className="mx-auto mt-20 max-w-content lg:mt-28">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
              <ProductSectionTitle eyebrow="From kitchens like yours" title="What people are saying" />
              <span className="text-sm text-muted-foreground">{product.reviewCount} verified reviews</span>
            </div>
            <div className="mt-10 grid gap-4 md:grid-cols-2">
              {product.reviews.length > 0 ? (
                product.reviews.map((review) => <ReviewCard key={review.name + review.date} review={review} />)
              ) : (
                <div className="col-span-2 border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                  Be the first to share your kitchen experience with this ingredient.
                </div>
              )}
            </div>
          </section>

          {related && related.length > 0 && (
            <section className="mx-auto mt-20 max-w-content lg:mt-28">
              <ProductSectionTitle eyebrow="Keep exploring" title="More from the source" />
              <div className="mt-10 grid gap-8 md:grid-cols-3">
                {related.map((item) => (
                  <Link key={item.slug} href={`/shop/product/${item.slug}`} className="group">
                    <div className="relative aspect-[4/3] overflow-hidden bg-surface-muted">
                      <Image
                        src={item.image}
                        alt={item.name}
                        fill
                        sizes="(max-width: 768px) 90vw, 33vw"
                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    </div>
                    <p className="eyebrow mt-4">{item.region}</p>
                    <h3 className="mt-2 font-serif text-3xl text-foreground group-hover:text-secondary transition-colors">
                      {item.name}
                    </h3>
                    <span className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-secondary">
                      Explore <ArrowRight className="size-4" aria-hidden="true" />
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {product.articles && (
            <section className="mx-auto mt-20 max-w-content border-t border-border pt-16 lg:mt-28">
              <ProductSectionTitle eyebrow="Kitchen Wisdom" title={product.articles.title} intro={product.articles.excerpt} />
              <div className="mt-10">
                <ArticleCard article={product.articles} />
              </div>
            </section>
          )}
        </div>
      </main>
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-background/95 p-3 backdrop-blur md:hidden">
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-foreground">{product.name}</p>
            <p className="text-xs text-muted-foreground">
              {product.price} · {product.packSize}
            </p>
          </div>
          <button
            type="button"
            onClick={handleAddToBasket}
            className="min-h-11 bg-primary px-5 text-sm font-semibold text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Add to basket
          </button>
        </div>
      </div>
      <SiteFooter />
    </>
  )
}
