import Image from 'next/image'
import Link from 'next/link'
import { Heart, MapPin, Star } from 'lucide-react'
import type { DiscoveryArticle, DiscoveryCategory, DiscoveryCollection, DiscoveryProducer, DiscoveryProduct } from '@/types/discovery'

export function ProductCard({ product }: { product: DiscoveryProduct }) {
  const href = `/shop/product/${product.slug}`
  return <article className="group flex flex-col gap-4">
    <div className="relative aspect-[4/5] overflow-hidden bg-muted">
      <Image src={product.image} alt={product.name} fill sizes="(max-width: 640px) 85vw, (max-width: 1024px) 42vw, 23vw" className="object-cover transition-transform duration-500 ease-out group-hover:scale-105" />
      <button type="button" aria-label={`Save ${product.name}`} className="absolute right-3 top-3 grid size-11 place-items-center bg-background/90 text-foreground transition-colors hover:text-secondary"><Heart aria-hidden="true" /></button>
      <span className="absolute bottom-3 left-3 bg-background/90 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-foreground">{product.tags[0] || 'Heritage'}</span>
    </div>
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-3"><p className="eyebrow">{product.category}</p><span className="flex items-center gap-1 text-xs text-muted-foreground"><Star className="size-3 fill-accent text-accent" aria-hidden="true" /> {product.rating}</span></div>
      <h3 className="font-serif text-2xl leading-[1.05] text-foreground"><Link href={href} className="hover:text-secondary">{product.name}</Link></h3>
      <p className="text-sm text-muted-foreground">{product.producer} · {product.region}</p>
      <div className="flex items-center justify-between gap-3 border-t border-border pt-3"><span className="text-xs text-muted-foreground">{product.method}</span><span className="text-sm font-semibold text-foreground">{product.price}</span></div>
    </div>
  </article>
}

export function CategoryCard({ category }: { category: DiscoveryCategory }) {
  return <Link href={`/shop/category/${category.slug}`} className="group relative block min-h-80 overflow-hidden bg-muted"><Image src={category.image} alt="" fill sizes="(max-width: 768px) 88vw, 30vw" className="object-cover transition-transform duration-500 ease-out group-hover:scale-105" /><div className="absolute inset-0 bg-gradient-to-t from-primary/90 via-primary/15 to-transparent" /><div className="absolute inset-x-0 bottom-0 flex flex-col gap-2 p-6 text-primary-foreground"><p className="eyebrow text-accent">{category.descriptor}</p><h3 className="font-serif text-3xl">{category.name}</h3><p className="max-w-xs text-sm leading-6 text-primary-foreground/75">{category.count} ingredients to explore</p></div></Link>
}

export function CollectionCard({ collection }: { collection: DiscoveryCollection }) {
  const count = Array.isArray(collection.productSlugs) ? collection.productSlugs.length : 0
  return <Link href={`/shop/collection/${collection.slug}`} className="group flex min-h-96 flex-col justify-end overflow-hidden bg-muted p-6 text-primary-foreground relative"><Image src={collection.image} alt="" fill sizes="(max-width: 768px) 88vw, 33vw" className="object-cover transition-transform duration-700 group-hover:scale-105" /><div className="absolute inset-0 bg-gradient-to-t from-primary/95 via-primary/30 to-transparent" /><div className="relative z-10 flex flex-col gap-2"><p className="eyebrow text-accent">{collection.eyebrow}</p><h3 className="font-serif text-4xl leading-none">{collection.name}</h3><p className="max-w-sm text-sm leading-6 text-primary-foreground/75">{count} considered ingredients · {collection.region}</p></div></Link>
}

export function ProducerCard({ producer }: { producer: DiscoveryProducer }) {
  return <Link href={`/producers/${producer.slug}`} className="group grid grid-cols-[7rem_1fr] gap-5 border-t border-border py-5 md:grid-cols-[10rem_1fr] md:gap-7"><div className="relative aspect-square overflow-hidden bg-muted"><Image src={producer.image} alt={producer.name} fill sizes="160px" className="object-cover transition-transform duration-500 group-hover:scale-105" /></div><div className="flex flex-col justify-center gap-2"><p className="eyebrow">{producer.craft}</p><h3 className="font-serif text-3xl text-foreground group-hover:text-secondary">{producer.name}</h3><p className="flex items-center gap-1 text-sm text-muted-foreground"><MapPin className="size-3.5" aria-hidden="true" /> {producer.place}</p><p className="max-w-md text-sm leading-6 text-muted-foreground">{producer.detail}</p></div></Link>
}

export function ArticleCard({ article }: { article: DiscoveryArticle }) {
  return <Link href={`/kitchen-wisdom/articles/${article.slug}`} className="group flex flex-col gap-4"><div className="relative aspect-[4/3] overflow-hidden bg-muted"><Image src={article.image} alt="" fill sizes="(max-width: 768px) 88vw, 31vw" className="object-cover transition-transform duration-500 group-hover:scale-105" /></div><div className="flex flex-col gap-2"><p className="eyebrow">{article.category} · {article.readTime}</p><h3 className="font-serif text-2xl leading-tight text-foreground group-hover:text-secondary">{article.title}</h3><p className="text-sm leading-6 text-muted-foreground">{article.excerpt}</p></div></Link>
}
