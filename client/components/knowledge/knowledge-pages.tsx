import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, Check, ChevronDown } from 'lucide-react'
import type { Article, Ingredient, Producer, Recipe } from '@/types/knowledge'
import { articles, ingredients, producers, recipes, states } from '@/data/knowledge'
import { KnowledgeSearch } from './knowledge-search'
import { ArticleCard, IngredientCard, KnowledgeHero, MethodStrip, NewsletterBand, ProducerCard, QuoteBlock, RecipeCard, VideoPlaceholder } from './knowledge-components'
import { BackButton } from '@/components/ui/back-button'

export function ProducersPage({ producers: propProducers }: { producers?: Producer[] } = {}) {
  const displayProducers = propProducers ?? producers
  const heroImage = displayProducers[0]?.image || producers[0]?.image
  return (
    <>
      <KnowledgeHero
        eyebrow="People behind every ingredient"
        title="Meet the hands that feed us."
        intro="A living directory of producers, growers and makers who keep India’s everyday food traditions in motion."
        image={heroImage}
        imageAlt="Producer working in a field"
      />
      <main id="main-content" className="container-shell py-20">
        <div className="grid gap-12 lg:grid-cols-[0.7fr_1.3fr]">
          <aside className="lg:sticky lg:top-28 lg:self-start">
            <p className="eyebrow">Find a producer</p>
            <div className="mt-4"><KnowledgeSearch /></div>
            <div className="mt-8">
              <p className="eyebrow">Explore by state</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {states.map((state) => (
                  <Link
                    key={state.slug}
                    href={`/producers?state=${state.slug}`}
                    className="border border-border px-3 py-2 text-xs font-bold uppercase tracking-wider hover:border-secondary hover:text-secondary"
                  >
                    {state.name}
                  </Link>
                ))}
              </div>
            </div>
          </aside>
          <section>
            <div className="flex items-end justify-between border-b border-border pb-5">
              <div>
                <p className="eyebrow">Featured makers</p>
                <h2 className="mt-2 font-serif text-4xl text-primary">People, not profiles.</h2>
              </div>
              <p className="hidden text-sm text-muted-foreground md:block">
                {displayProducers.length} stories to begin with
              </p>
            </div>
            {displayProducers.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                <p className="font-serif text-2xl text-primary">No producers found</p>
                <p className="mt-2 text-sm">Check back soon as more traditional makers join.</p>
              </div>
            ) : (
              <div className="mt-8 grid gap-10 md:grid-cols-2">
                {displayProducers.map((producer) => (
                  <ProducerCard key={producer.slug} producer={producer} />
                ))}
              </div>
            )}
          </section>
        </div>
        <section className="mt-24 border-y border-border py-16">
          <div className="grid gap-10 md:grid-cols-[0.8fr_1.2fr] md:items-center">
            <div>
              <p className="eyebrow">A living map</p>
              <h2 className="mt-3 font-serif text-5xl text-primary">India, told through its kitchens.</h2>
              <p className="mt-5 max-w-md text-sm leading-6 text-muted-foreground">
                Explore the landscapes, methods and ingredients that make each region distinct.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {states.map((state) => (
                <Link
                  key={state.slug}
                  href={`/producers?state=${state.slug}`}
                  className="group relative aspect-[4/3] overflow-hidden"
                >
                  <Image
                    src={state.image}
                    alt={state.name}
                    fill
                    sizes="(max-width: 768px) 45vw, 25vw"
                    className="object-cover transition-transform group-hover:scale-105"
                  />
                  <span className="absolute inset-x-3 bottom-3 font-serif text-2xl text-primary-foreground">
                    {state.name}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>
        <section className="mt-24 grid gap-8 bg-surface-muted p-8 md:grid-cols-[1fr_auto] md:items-center md:p-12">
          <div>
            <p className="eyebrow">For the makers</p>
            <h2 className="mt-3 font-serif text-4xl text-primary">Your knowledge deserves a wider table.</h2>
            <p className="mt-4 max-w-xl text-sm leading-6 text-muted-foreground">
              If you are preserving a regional ingredient or traditional method, we would love to hear your story.
            </p>
          </div>
          <Link
            href="/seller/register"
            className="inline-flex min-h-12 items-center justify-center gap-2 bg-primary px-5 text-xs font-bold uppercase tracking-wider text-primary-foreground hover:bg-secondary transition-colors"
          >
            Become a producer <ArrowRight aria-hidden="true" className="size-4" />
          </Link>
        </section>
      </main>
    </>
  )
}


export function ProducerProfilePage({ producer }: { producer: Producer }) {
  return (
    <>
      <KnowledgeHero
        eyebrow={`${producer.craft} · ${producer.state}`}
        title={producer.name}
        intro={`${producer.person} · ${producer.place}, ${producer.state}. ${producer.story}`}
        image={producer.image}
        imageAlt={`${producer.name} in ${producer.place}`}
        backHref="/producers"
        backLabel="Back to all producers"
      />
      <main id="main-content" className="container-shell py-16 sm:py-20">
        <div className="mb-8">
          <BackButton fallbackHref="/producers" label="Back to all producers" variant="ghost" />
        </div>
        <div className="grid gap-16 lg:grid-cols-[1.2fr_0.8fr]">
          <div>
            <p className="eyebrow">The story</p>
            <h2 className="mt-4 font-serif text-5xl text-primary">A craft carried by people.</h2>
            <p className="mt-6 max-w-2xl text-base leading-8 text-muted-foreground">{producer.detail}</p>
            <div className="mt-12 grid gap-8 sm:grid-cols-3">
              {producer.stats.map((stat) => (
                <div key={stat.label} className="border-t border-border pt-4">
                  <p className="font-serif text-4xl text-primary">{stat.value}</p>
                  <p className="mt-1 text-xs uppercase tracking-wider text-muted-foreground">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="relative aspect-[4/5] overflow-hidden">
            <Image src={producer.portrait} alt={`${producer.person}, portrait`} fill sizes="(max-width: 768px) 90vw, 35vw" className="object-cover" />
          </div>
        </div>
        <section className="mt-24">
          <p className="eyebrow">The journey</p>
          <h2 className="mt-3 font-serif text-5xl text-primary">What stays, what changes.</h2>
          <div className="mt-10 grid gap-8 md:grid-cols-3">
            {producer.timeline.map((item) => (
              <div key={item.year} className="border-t-2 border-secondary pt-5">
                <p className="font-mono text-sm text-secondary">{item.year}</p>
                <h3 className="mt-3 font-serif text-3xl text-primary">{item.title}</h3>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">{item.body}</p>
              </div>
            ))}
          </div>
        </section>
        <section className="mt-24 grid gap-10 md:grid-cols-2">
          <div>
            <p className="eyebrow">Traditional knowledge</p>
            <h2 className="mt-3 font-serif text-4xl text-primary">Method is memory.</h2>
            <p className="mt-5 text-sm leading-7 text-muted-foreground">{producer.detail} The work is measured by touch, sound and season—not by a dashboard.</p>
            <div className="mt-8"><MethodStrip /></div>
          </div>
          <VideoPlaceholder label={`Inside ${producer.name}`} />
        </section>
        <section className="mt-24 border-t border-border pt-10">
          <p className="eyebrow">From this producer</p>
          <div className="mt-6 flex flex-wrap gap-3">
            {producer.products.map((product) => (
              <span key={product} className="border border-border px-4 py-3 text-sm text-primary">{product}</span>
            ))}
          </div>
        </section>
        <section className="mt-24"><QuoteBlock>Trust begins when a product can tell you who made it.</QuoteBlock></section>
      </main>
      <NewsletterBand />
    </>
  )
}

export function WisdomPage() {
  return (
    <>
      <KnowledgeHero
        eyebrow="The FSO journal"
        title="Kitchen wisdom, kept alive."
        intro="Stories, recipes and ingredient knowledge for people who want to cook with more context."
        image={articles[0].image}
        imageAlt={articles[0].title}
        backHref="/"
        backLabel="Back to Marketplace"
      />
      <main id="main-content" className="container-shell py-20">
        <section>
          <div className="flex items-end justify-between border-b border-border pb-5">
            <div>
              <p className="eyebrow">Editor&apos;s pick</p>
              <h2 className="mt-2 font-serif text-4xl text-primary">A place to begin</h2>
            </div>
            <Link
              href="/kitchen-wisdom/articles"
              className="hidden items-center gap-2 text-xs font-bold uppercase tracking-wider text-secondary md:flex"
            >
              All stories <ArrowRight aria-hidden="true" className="size-4" />
            </Link>
          </div>
          <div className="mt-8">
            <ArticleCard article={articles[0]} featured />
          </div>
        </section>
        <section className="mt-24">
          <div className="border-b border-border pb-5">
            <p className="eyebrow">Explore the archive</p>
            <h2 className="mt-2 font-serif text-4xl text-primary">Learn by landscape, method and season.</h2>
          </div>
          <div className="mt-8 grid gap-10 md:grid-cols-3">
            {articles.slice(1).map((article) => (
              <ArticleCard key={article.slug} article={article} />
            ))}
            <Link href="/recipes" className="group border-t border-border pt-5">
              <p className="eyebrow">Recipes</p>
              <h3 className="mt-2 font-serif text-3xl text-primary">Cook the story.</h3>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                Practical recipes built around ingredients with a point of view.
              </p>
              <span className="mt-5 inline-flex text-secondary">
                <ArrowRight aria-hidden="true" />
              </span>
            </Link>
          </div>
        </section>
      </main>
      <NewsletterBand />
    </>
  )
}

export function ArticlesPage() {
  return (
    <>
      <div className="container-shell pt-32 pb-4">
        <div className="mb-6">
          <BackButton fallbackHref="/" label="Back to Marketplace" variant="pill" />
        </div>
        <p className="eyebrow">Kitchen wisdom</p>
        <h1 className="display mt-4 max-w-3xl text-7xl text-primary">The stories behind the way we eat.</h1>
      </div>
      <main id="main-content" className="container-shell py-16">
        <div className="grid gap-10 md:grid-cols-2">
          {articles.map((article) => (
            <ArticleCard
              key={article.slug}
              article={article}
              featured={article.slug === articles[0].slug}
            />
          ))}
        </div>
      </main>
      <NewsletterBand />
    </>
  )
}

export function ArticleDetailPage({ article }: { article: Article }) {
  return (
    <>
      <KnowledgeHero
        eyebrow={`${article.category} · ${article.readTime}`}
        title={article.title}
        intro={`${article.excerpt} Written by ${article.author} · ${article.published}.`}
        image={article.image}
        imageAlt={article.title}
        backHref="/kitchen-wisdom/articles"
        backLabel="Back to all stories"
      />
      <main id="main-content" className="container-shell py-16 sm:py-20">
        <div className="mx-auto max-w-3xl mb-8">
          <BackButton fallbackHref="/kitchen-wisdom/articles" label="Back to all stories" variant="ghost" />
        </div>
        <div className="mx-auto max-w-3xl">
          <div className="sticky top-24 z-10 mb-12 h-1 bg-surface-muted">
            <div className="h-full w-1/3 bg-accent" aria-label="Reading progress" />
          </div>
          <p className="eyebrow">In this story</p>
          <nav aria-label="Table of contents" className="mt-4 grid gap-2 border-l-2 border-border pl-4 text-sm text-muted-foreground">
            <a href="#beginning">The beginning</a>
            <a href="#method">The method</a>
            <a href="#kitchen">The everyday kitchen</a>
          </nav>
          <div className="mt-12 space-y-7 text-lg leading-8 text-foreground">
            <div id="beginning">{article.body[0]}</div>
            <QuoteBlock>{article.quote}</QuoteBlock>
            <div id="method">{article.body[1]}</div>
            <div id="kitchen">{article.body[2]}</div>
          </div>
          <div className="mt-14 border-t border-border pt-8">
            <p className="eyebrow">Related reading</p>
            <div className="mt-4 flex flex-wrap gap-3">
              {article.related.map((slug) => (
                <Link key={slug} href={`/kitchen-wisdom/articles/${slug}`} className="border border-border px-4 py-3 text-sm hover:border-secondary hover:text-secondary">
                  Read another story <ArrowRight aria-hidden="true" className="ml-2 inline size-4" />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </main>
      <NewsletterBand />
    </>
  )
}

export function RecipesPage() {
  return (
    <>
      <KnowledgeHero
        eyebrow="From the FSO kitchen"
        title="Recipes worth passing on."
        intro="Cook with ingredients that have a place, a method and a story."
        image={recipes[0].image}
        imageAlt={recipes[0].title}
        backHref="/"
        backLabel="Back to Marketplace"
      />
      <main id="main-content" className="container-shell py-20">
        <div className="mb-10 flex flex-wrap gap-2">
          {['All regions', 'South India', 'Maharashtra', 'Everyday', 'Festive'].map((filter) => (
            <button
              type="button"
              key={filter}
              className="border border-border px-4 py-3 text-xs font-bold uppercase tracking-wider hover:border-secondary hover:text-secondary"
            >
              {filter}
            </button>
          ))}
        </div>
        <div className="grid gap-10 md:grid-cols-2">
          {recipes.map((recipe) => (
            <RecipeCard key={recipe.slug} recipe={recipe} />
          ))}
        </div>
      </main>
    </>
  )
}

export function RecipeDetailPage({ recipe }: { recipe: Recipe }) {
  return (
    <>
      <KnowledgeHero
        eyebrow={`${recipe.region} · ${recipe.cuisine}`}
        title={recipe.title}
        intro={`${recipe.story} ${recipe.time} · ${recipe.servings} · ${recipe.difficulty}.`}
        image={recipe.image}
        imageAlt={recipe.title}
        backHref="/recipes"
        backLabel="Back to all recipes"
      />
      <main id="main-content" className="container-shell py-16 sm:py-20">
        <div className="mb-8">
          <BackButton fallbackHref="/recipes" label="Back to all recipes" variant="ghost" />
        </div>
        <div className="grid gap-16 lg:grid-cols-[0.8fr_1.2fr]">
          <aside className="lg:sticky lg:top-28 lg:self-start">
            <p className="eyebrow">What you need</p>
            <ul className="mt-5 space-y-3 text-sm leading-6">
              {recipe.ingredients.map((item) => (
                <li key={item} className="flex gap-3"><Check aria-hidden="true" className="mt-1 size-4 text-secondary" />{item}</li>
              ))}
            </ul>
          </aside>
          <div>
            <p className="eyebrow">The method</p>
            <h2 className="mt-3 font-serif text-5xl text-primary">Let the ingredients lead.</h2>
            <ol className="mt-10 space-y-8">
              {recipe.steps.map((step, index) => (
                <li key={step} className="grid grid-cols-[2.5rem_1fr] gap-4 border-t border-border pt-5">
                  <span className="font-serif text-3xl text-secondary">{String(index + 1).padStart(2, '0')}</span>
                  <p className="text-base leading-7">{step}</p>
                </li>
              ))}
            </ol>
            <div className="mt-16 bg-surface-muted p-8">
              <p className="eyebrow">Kitchen tips</p>
              <ul className="mt-4 space-y-3 text-sm leading-6 text-muted-foreground">{recipe.tips.map((tip) => <li key={tip}>— {tip}</li>)}</ul>
            </div>
          </div>
        </div>
      </main>
    </>
  )
}

export function IngredientsPage() {
  return (
    <>
      <KnowledgeHero
        eyebrow="The ingredient library"
        title="Know what is in your kitchen."
        intro="An encyclopedia of the grains, spices, oils and sweeteners that shape everyday Indian food."
        image={ingredients[0].image}
        imageAlt={ingredients[0].name}
        backHref="/"
        backLabel="Back to Marketplace"
      />
      <main id="main-content" className="container-shell py-20">
        <div className="grid gap-10 md:grid-cols-2">
          {ingredients.map((ingredient) => (
            <IngredientCard key={ingredient.slug} ingredient={ingredient} />
          ))}
        </div>
      </main>
      <NewsletterBand />
    </>
  )
}

export function IngredientDetailPage({ ingredient }: { ingredient: Ingredient }) {
  return (
    <>
      <KnowledgeHero
        eyebrow={`Ingredient library · ${ingredient.origin}`}
        title={ingredient.name}
        intro={ingredient.descriptor}
        image={ingredient.image}
        imageAlt={ingredient.name}
        backHref="/ingredients"
        backLabel="Back to ingredient library"
      />
      <main id="main-content" className="container-shell py-16 sm:py-20">
        <div className="mb-8">
          <BackButton fallbackHref="/ingredients" label="Back to ingredient library" variant="ghost" />
        </div>
        <div className="grid gap-16 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-14">
            <section>
              <p className="eyebrow">History</p>
              <h2 className="mt-3 font-serif text-5xl text-primary">A living ingredient.</h2>
              <p className="mt-5 max-w-2xl text-base leading-8 text-muted-foreground">{ingredient.history}</p>
            </section>
            <section>
              <p className="eyebrow">Regional importance</p>
              <p className="mt-5 max-w-2xl text-base leading-8 text-muted-foreground">{ingredient.regionalImportance}</p>
            </section>
            <section>
              <p className="eyebrow">Traditional uses</p>
              <div className="mt-5 flex flex-wrap gap-3">
                {ingredient.uses.map((use) => <span key={use} className="border border-border px-4 py-3 text-sm">{use}</span>)}
              </div>
            </section>
          </div>
          <aside className="h-fit bg-surface-muted p-8 lg:sticky lg:top-28">
            <p className="eyebrow">Good to know</p>
            <p className="mt-5 text-sm leading-7 text-muted-foreground">{ingredient.storage}</p>
            <div className="mt-8 border-t border-border pt-6">
              <p className="eyebrow">Cooking tips</p>
              <ul className="mt-4 space-y-3 text-sm leading-6">{ingredient.tips.map((tip) => <li key={tip}>— {tip}</li>)}</ul>
            </div>
          </aside>
        </div>
        <section className="mt-24 border-t border-border pt-10">
          <p className="eyebrow">Frequently asked</p>
          <div className="mt-6 divide-y divide-border">
            {ingredient.faqs.map((faq) => (
              <details key={faq.question} className="group py-5">
                <summary className="flex cursor-pointer list-none items-center justify-between font-serif text-2xl text-primary">
                  {faq.question}
                  <ChevronDown aria-hidden="true" className="size-5 transition-transform group-open:rotate-180" />
                </summary>
                <p className="mt-4 max-w-2xl text-sm leading-7 text-muted-foreground">{faq.answer}</p>
              </details>
            ))}
          </div>
        </section>
        <section className="mt-24"><QuoteBlock>When we know the ingredient, we cook with more care.</QuoteBlock></section>
      </main>
      <NewsletterBand />
    </>
  )
}
