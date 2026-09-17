import Link from 'next/link'
import { ArrowRight, Heart, Leaf, MapPin, ShieldCheck, Sprout, Star } from 'lucide-react'
import { processingMethods, states } from '@/data/home'
import { agricultureImages } from '@/data/images'
import { ImageCard } from '@/components/ui/image-card'
import { SectionHeading } from '@/components/ui/section-heading'
import type { BackendCategory, BackendProduct, BackendVendor, BackendArticle } from '@/lib/api/types'

export function TrustIndicators() {
  const items = [
    ['Source transparent', 'Know who made it and where it began.', ShieldCheck],
    ['Everyday by design', 'Better staples for the kitchen you actually use.', Sprout],
    ['Rooted in tradition', 'Old methods, thoughtfully brought forward.', Leaf],
  ] as const
  return <section className="border-b border-border bg-background" aria-label="Our commitments"><div className="container-shell grid gap-6 py-8 md:grid-cols-3">{items.map(([title, copy, Icon]) => <div key={title} className="flex gap-4"><Icon className="mt-1 size-5 shrink-0 text-secondary" aria-hidden="true" /><div><p className="font-bold">{title}</p><p className="mt-1 text-sm leading-6 text-muted-foreground">{copy}</p></div></div>)}</div></section>
}

export function CategoriesSection({ categories = [] }: { categories?: BackendCategory[] }) {
  const displayCategories = categories.slice(0, 5)
  return (
    <section id="categories" className="container-shell py-[var(--space-section)]">
      <SectionHeading
        eyebrow="Start with the everyday"
        title="A better pantry is built one ingredient at a time."
        copy="We look for the foods that quietly shape a kitchen: the oil you cook with, the grain you return to, the spice that makes a meal feel like home."
        action="Browse all categories"
        actionHref="/shop#categories"
      />
      {displayCategories.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-4">
          {displayCategories.map((category, index) => (
            <Link
              key={category.id || category.slug}
              href={`/shop/category/${category.slug}`}
              className={`group ${index === 0 ? 'md:col-span-2' : ''}`}
            >
              <ImageCard
                src={category.image || agricultureImages.pantry}
                alt={category.name}
                className={`aspect-[4/5] ${index === 0 ? 'md:aspect-[8/5]' : ''}`}
              />
              <div className="flex items-start justify-between gap-4 border-b border-border py-5">
                <div>
                  <p className="eyebrow mb-2">
                    {category.count ? `${category.count} product${category.count === 1 ? '' : 's'}` : 'Heritage'}
                  </p>
                  <h3 className="font-serif text-3xl text-primary group-hover:text-secondary">
                    {category.name}
                  </h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {category.description || 'Authentic, source-verified heritage staples'}
                  </p>
                </div>
                <ArrowRight
                  className="mt-1 size-5 shrink-0 text-secondary transition-transform group-hover:translate-x-1"
                  aria-hidden="true"
                />
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground py-8">Categories are currently being indexed.</p>
      )}
    </section>
  )
}

export function StorySection() {
  return <section id="story" className="bg-surface-deep py-[var(--space-section)]"><div className="container-shell grid items-center gap-12 lg:grid-cols-[0.8fr_1.2fr]"><div><p className="eyebrow mb-5">Why it matters</p><h2 className="display max-w-xl text-6xl text-primary md:text-8xl">The kitchen is where the future gets made.</h2><p className="mt-8 max-w-lg text-base leading-8 text-foreground/80">The choices we make every day add up. When we choose ingredients with a known source, we support living soils, resilient farms, and the people who carry our food traditions forward.</p><a href="#wisdom" className="mt-8 inline-flex min-h-11 items-center gap-3 text-xs font-extrabold uppercase tracking-[0.16em] text-secondary">Our point of view <ArrowRight className="size-4" aria-hidden="true" /></a></div><div className="grid grid-cols-2 gap-4"><ImageCard src="https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=1000&q=85" alt="Hands preparing traditional food" className="aspect-[3/4]" /><div className="flex flex-col justify-end gap-4 pb-2">{['Trace the ingredient back to its beginning.', 'Learn the method that makes it matter.', 'Make a considered choice for your table.'].map((copy, index) => <div key={copy} className="border-l-2 border-secondary pl-5"><p className="font-serif text-4xl leading-none text-primary">0{index + 1}</p><p className="mt-2 text-sm leading-6 text-muted-foreground">{copy}</p></div>)}</div></div></div></section>
}

export function ProducersSection({ producers = [] }: { producers?: BackendVendor[] }) {
  return (
    <section id="producers" className="container-shell py-[var(--space-section)]">
      <SectionHeading
        eyebrow="Meet the makers"
        title="The people behind the pantry."
        copy="A marketplace is only as meaningful as the relationships inside it. Start with the producers who make everyday ingredients extraordinary."
        action="Meet all producers"
        actionHref="/producers"
      />
      {producers.length > 0 ? (
        <div className="grid gap-5 md:grid-cols-3">
          {producers.map((producer) => {
            const place = [producer.village, producer.district, producer.address?.state || producer.region].filter(Boolean).join(', ') || 'India'
            const craft = Array.isArray(producer.traditionalExpertise) && producer.traditionalExpertise.length > 0
              ? producer.traditionalExpertise.join(' · ')
              : producer.producerType || 'Traditional Foods'
            const storyText = typeof producer.producerStory === 'string'
              ? producer.producerStory
              : producer.producerStory?.body || producer.producerStory?.headline || ''
            const detail = storyText || producer.businessDescription || 'Preserving living traditions from the land.'
            return (
              <Link
                href={`/producers/${producer.slug || producer.id}`}
                key={producer.id}
                className="group"
              >
                <ImageCard
                  src={producer.logo || agricultureImages.farmer}
                  alt={producer.businessName}
                  className="aspect-[4/5]"
                />
                <div className="py-5">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-secondary">
                    <MapPin className="size-3" aria-hidden="true" />
                    {place}
                  </div>
                  <h3 className="mt-3 font-serif text-4xl text-primary group-hover:text-secondary">
                    {producer.businessName}
                  </h3>
                  <p className="mt-2 text-sm font-semibold">{craft}</p>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground line-clamp-3">
                    {detail}
                  </p>
                </div>
              </Link>
            )
          })}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground py-8">Producer stories are being verified.</p>
      )}
    </section>
  )
}

export function ProductsSection({ products = [] }: { products?: BackendProduct[] }) {
  return (
    <section id="shop" className="bg-primary py-[var(--space-section)] text-primary-foreground">
      <div className="container-shell">
        <SectionHeading
          eyebrow="A considered selection"
          title="Ingredients with a point of view."
          copy="Start small. Bring home the things you will use, made by people you will remember."
          action="Shop the full pantry"
          actionHref="/shop"
          inverted
        />
        {products.length > 0 ? (
          <div className="grid gap-5 md:grid-cols-3">
            {products.map((product) => {
              const producerName = typeof product.vendor === 'object' && product.vendor?.businessName
                ? product.vendor.businessName
                : 'Heritage Partner'
              const region = product.originRegion || product.originState || 'India'
              const tag = product.tag || product.category || 'Heritage'
              return (
                <article key={product.id} className="group">
                  <div className="relative aspect-[4/5] overflow-hidden bg-surface">
                    <ImageCard
                      src={product.image || agricultureImages.pantry}
                      alt={product.name}
                      className="absolute inset-0 h-full w-full"
                    />
                    <span className="absolute left-4 top-4 bg-accent px-3 py-2 text-[10px] font-extrabold uppercase tracking-wider text-accent-foreground">
                      {tag}
                    </span>
                    <Link
                      href={`/shop/product/${product.slug}`}
                      aria-label={`View ${product.name}`}
                      className="absolute right-4 top-4 grid size-11 place-items-center bg-background/90 text-primary hover:text-secondary"
                    >
                      <Heart aria-hidden="true" />
                    </Link>
                  </div>
                  <div className="border-b border-primary-foreground/20 py-5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-accent">{region}</p>
                        <h3 className="mt-2 font-serif text-3xl">
                          <Link href={`/shop/product/${product.slug}`} className="hover:text-accent">
                            {product.name}
                          </Link>
                        </h3>
                      </div>
                      <span className="font-semibold">₹{product.price.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs text-primary-foreground/70">
                      <span>{producerName}</span>
                      <span>{product.processingMethod || 'Artisan Method'}</span>
                      {product.rating && (
                        <span className="inline-flex items-center gap-1">
                          <Star className="size-3 fill-accent text-accent" aria-hidden="true" /> {product.rating}
                        </span>
                      )}
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        ) : (
          <p className="text-sm text-primary-foreground/70 py-8">Pantry collection is being updated.</p>
        )}
      </div>
    </section>
  )
}

export function WisdomSection({ articles = [] }: { articles?: BackendArticle[] }) {
  return (
    <section id="wisdom" className="container-shell py-[var(--space-section)]">
      <SectionHeading
        eyebrow="Kitchen wisdom"
        title="A little more knowledge for the table."
        action="Visit the journal"
        actionHref="/kitchen-wisdom"
      />
      {articles.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-3">
          {articles.map((article, index) => (
            <Link
              href={`/kitchen-wisdom/articles/${article.slug}`}
              key={article.id}
              className={`group ${index === 0 ? 'md:col-span-2' : ''}`}
            >
              <ImageCard
                src={article.image || agricultureImages.pantry}
                alt={article.title}
                className={`aspect-[16/10] ${index === 0 ? 'md:aspect-[16/8]' : ''}`}
              />
              <div className="py-5">
                <p className="eyebrow mb-3">
                  {article.category} · {article.readTime || '5 min read'}
                </p>
                <h3 className="font-serif text-4xl leading-none text-primary group-hover:text-secondary md:text-5xl">
                  {article.title}
                </h3>
                <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
                  {article.excerpt}
                </p>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground py-8">Articles are being prepared for publication.</p>
      )}
    </section>
  )
}

export function MethodsSection() {
  return <section id="methods" className="border-y border-border bg-muted py-[var(--space-section)]"><div className="container-shell grid gap-10 lg:grid-cols-[0.8fr_1.2fr]"><div><p className="eyebrow mb-4">The method is the message</p><h2 className="display max-w-md text-6xl text-primary md:text-8xl">Good things take the time they need.</h2></div><div className="grid gap-0 sm:grid-cols-2">{processingMethods.map((method, index) => <div key={method} className="border-t border-border py-7 sm:px-6"><div className="flex items-center justify-between"><span className="font-serif text-3xl text-primary">{method}</span><span className="font-mono text-xs text-secondary">0{index + 1}</span></div><p className="mt-3 max-w-xs text-sm leading-6 text-muted-foreground">A slower process that keeps more of the ingredient&apos;s character intact.</p></div>)}</div></div></section>
}

export function StatesSection() {
  return <section id="states" className="container-shell py-[var(--space-section)]"><div className="grid gap-10 lg:grid-cols-[0.7fr_1.3fr]"><div><p className="eyebrow mb-4">A country on your plate</p><h2 className="display max-w-md text-6xl text-primary md:text-8xl">Explore India by state.</h2><p className="mt-6 max-w-sm text-sm leading-7 text-muted-foreground">Every region has a pantry of its own. Follow the ingredients, methods, and stories back to the places that shaped them.</p></div><div className="grid grid-cols-2 border-t border-border sm:grid-cols-3">{states.map((state) => <a href="#shop" key={state} className="group flex min-h-28 items-end justify-between border-b border-border p-4 hover:bg-surface"><span className="font-serif text-2xl text-primary group-hover:text-secondary">{state}</span><ArrowRight className="size-4 text-secondary" aria-hidden="true" /></a>)}</div></div></section>
}

export function PartnerSection() {
  return <section className="bg-secondary py-[var(--space-section)] text-secondary-foreground"><div className="container-shell grid items-center gap-8 md:grid-cols-[1fr_auto]"><div><p className="eyebrow text-secondary-foreground/70">For those who make</p><h2 className="display mt-4 max-w-3xl text-6xl md:text-8xl">Your craft belongs at the table.</h2><p className="mt-6 max-w-xl text-sm leading-7 text-secondary-foreground/80">Are you a farmer, miller, maker, or keeper of a food tradition? We would like to know your story.</p></div><a href="#newsletter" className="inline-flex min-h-12 items-center justify-center gap-3 self-end border border-secondary-foreground/50 px-6 text-xs font-extrabold uppercase tracking-[0.16em] hover:bg-secondary-foreground hover:text-secondary">Become a producer partner <ArrowRight className="size-4" aria-hidden="true" /></a></div></section>
}

export function NewsletterSection() {
  return <section id="newsletter" className="container-shell py-[var(--space-section)]"><div className="grid gap-8 border-y border-border py-10 md:grid-cols-[1fr_1fr] md:items-center"><div><p className="eyebrow mb-4">The FSO letter</p><h2 className="display text-5xl text-primary md:text-7xl">Good things, sent thoughtfully.</h2></div><form className="flex flex-col gap-3 sm:flex-row" action="#newsletter"><label htmlFor="email" className="sr-only">Your email address</label><input id="email" name="email" type="email" required placeholder="Your email address" className="min-h-12 flex-1 border-b border-border bg-transparent px-0 text-sm outline-none placeholder:text-muted-foreground focus:border-primary" /><button type="submit" className="inline-flex min-h-12 items-center justify-center gap-2 bg-primary px-5 text-xs font-extrabold uppercase tracking-[0.14em] text-primary-foreground hover:bg-secondary">Subscribe <ArrowRight className="size-4" aria-hidden="true" /></button></form></div></section>
}
