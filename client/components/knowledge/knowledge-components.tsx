import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, Clock3, MapPin, Play, Quote } from 'lucide-react'
import type { Article, Ingredient, Producer, Recipe } from '@/types/knowledge'
import { BackButton } from '@/components/ui/back-button'

export function KnowledgeHero({
  eyebrow,
  title,
  intro,
  image,
  imageAlt = '',
  backHref = '/',
  backLabel = 'Back',
  hideBackButton = false,
}: {
  eyebrow: string
  title: string
  intro: string
  image: string
  imageAlt?: string
  backHref?: string
  backLabel?: string
  hideBackButton?: boolean
}) {
  return (
    <section className="border-b border-border bg-surface">
      <div className="container-shell pt-28 pb-16 md:pt-32 md:pb-24">
        {!hideBackButton && (
          <div className="mb-6">
            <BackButton fallbackHref={backHref} label={backLabel} variant="pill" />
          </div>
        )}
        <div className="grid gap-10 md:grid-cols-[0.9fr_1.1fr] md:items-end">
          <div>
            <p className="eyebrow">{eyebrow}</p>
            <h1 className="display mt-5 max-w-3xl text-6xl text-primary md:text-8xl">{title}</h1>
            <p className="mt-7 max-w-xl text-base leading-7 text-muted-foreground md:text-lg">{intro}</p>
          </div>
          <div className="relative aspect-[4/3] overflow-hidden bg-surface-muted">
            <Image src={image} alt={imageAlt} fill priority sizes="(max-width: 768px) 100vw, 50vw" className="object-cover" />
          </div>
        </div>
      </div>
    </section>
  )
}

export function ProducerCard({ producer }: { producer: Producer }) {
  return <article className="group"><Link href={`/producers/${producer.slug}`} className="block"><div className="relative aspect-[4/5] overflow-hidden bg-surface-muted"><Image src={producer.image} alt={`${producer.name} in ${producer.place}`} fill sizes="(max-width: 768px) 90vw, 30vw" className="object-cover transition-transform duration-300 group-hover:scale-105" /></div><div className="flex items-start justify-between gap-4 border-b border-border py-5"><div><p className="eyebrow">{producer.craft}</p><h2 className="mt-2 font-serif text-3xl text-primary">{producer.name}</h2><p className="mt-2 flex items-center gap-1 text-sm text-muted-foreground"><MapPin aria-hidden="true" className="size-4" />{producer.place}, {producer.state}</p></div><ArrowRight aria-hidden="true" className="mt-1 size-5 text-secondary transition-transform group-hover:translate-x-1" /></div></Link></article>
}

export function ArticleCard({ article, featured = false }: { article: Article; featured?: boolean }) {
  return <article className={featured ? 'grid gap-8 md:grid-cols-[1.2fr_0.8fr] md:items-end' : 'group'}><Link href={`/kitchen-wisdom/articles/${article.slug}`} className="block"><div className={`relative overflow-hidden bg-surface-muted ${featured ? 'aspect-[16/9]' : 'aspect-[4/3]'}`}><Image src={article.image} alt={article.title} fill sizes={featured ? '(max-width: 768px) 100vw, 65vw' : '(max-width: 768px) 90vw, 30vw'} className="object-cover transition-transform duration-300 group-hover:scale-105" /></div><div className="pt-5"><p className="eyebrow">{article.category} · {article.readTime}</p><h2 className={`${featured ? 'text-4xl md:text-5xl' : 'text-3xl'} mt-3 font-serif leading-none text-primary`}>{article.title}</h2><p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">{article.excerpt}</p><span className="mt-5 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-secondary">Read story <ArrowRight aria-hidden="true" className="size-4" /></span></div></Link></article>
}

export function RecipeCard({ recipe }: { recipe: Recipe }) {
  return <article className="group"><Link href={`/recipes/${recipe.slug}`}><div className="relative aspect-[4/3] overflow-hidden bg-surface-muted"><Image src={recipe.image} alt={recipe.title} fill sizes="(max-width: 768px) 90vw, 30vw" className="object-cover transition-transform duration-300 group-hover:scale-105" /></div><div className="pt-5"><p className="eyebrow">{recipe.region} · {recipe.time}</p><h2 className="mt-2 font-serif text-3xl text-primary">{recipe.title}</h2><p className="mt-2 text-sm text-muted-foreground">{recipe.cuisine} · {recipe.difficulty}</p></div></Link></article>
}

export function IngredientCard({ ingredient }: { ingredient: Ingredient }) {
  return <article className="group"><Link href={`/ingredients/${ingredient.slug}`}><div className="relative aspect-[4/3] overflow-hidden bg-surface-muted"><Image src={ingredient.image} alt={ingredient.name} fill sizes="(max-width: 768px) 90vw, 30vw" className="object-cover transition-transform duration-300 group-hover:scale-105" /></div><div className="pt-5"><p className="eyebrow">Ingredient library</p><h2 className="mt-2 font-serif text-3xl text-primary">{ingredient.name}</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">{ingredient.descriptor}</p></div></Link></article>
}

export function QuoteBlock({ children }: { children: React.ReactNode }) { return <blockquote className="border-y border-border py-8 text-center"><Quote aria-hidden="true" className="mx-auto size-6 text-accent" /><p className="mx-auto mt-4 max-w-2xl font-serif text-3xl leading-tight text-primary md:text-4xl">{children}</p></blockquote> }
export function NewsletterBand() { return <section className="bg-primary py-16 text-primary-foreground"><div className="container-shell flex flex-col gap-7 md:flex-row md:items-end md:justify-between"><div><p className="eyebrow text-accent">The FSO letter</p><h2 className="mt-3 max-w-xl font-serif text-4xl md:text-5xl">A little wisdom for the everyday kitchen.</h2></div><form className="flex w-full max-w-md gap-2" action="#newsletter"><label className="sr-only" htmlFor="knowledge-email">Email address</label><input id="knowledge-email" type="email" required placeholder="Your email address" className="min-h-12 min-w-0 flex-1 border border-primary-foreground/30 bg-transparent px-4 text-sm text-primary-foreground placeholder:text-primary-foreground/60" /><button className="min-h-12 bg-accent px-5 text-xs font-bold uppercase tracking-wider text-accent-foreground" type="submit">Subscribe</button></form></div></section> }
export function MethodStrip() { return <div className="grid gap-4 sm:grid-cols-3">{['Stone-ground', 'Wood-pressed', 'Hand-pounded'].map((method) => <div key={method} className="border-t border-border pt-4"><p className="eyebrow">Traditional method</p><p className="mt-2 font-serif text-2xl text-primary">{method}</p></div>)}</div> }
export function VideoPlaceholder({ label = 'A field note from the source' }: { label?: string }) { return <div className="relative grid aspect-video place-items-center overflow-hidden bg-primary text-primary-foreground"><div className="text-center"><span className="mx-auto grid size-14 place-items-center rounded-full border border-primary-foreground/60"><Play aria-hidden="true" className="ml-1 size-5" /></span><p className="mt-4 font-serif text-2xl">{label}</p><p className="mt-1 text-xs uppercase tracking-wider text-primary-foreground/60">Video coming soon</p></div></div> }
export function MetaLine({ children }: { children: React.ReactNode }) { return <p className="flex items-center gap-2 text-xs uppercase tracking-[0.14em] text-muted-foreground"><Clock3 aria-hidden="true" className="size-4" />{children}</p> }
