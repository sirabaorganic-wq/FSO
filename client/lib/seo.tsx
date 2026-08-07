import React from 'react'

export function OrganizationSchema() {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'FLASH SALES ONLINE',
    alternateName: 'FSO India',
    url: 'https://flashsalesonline.in',
    logo: 'https://flashsalesonline.in/images/fso-brand-logo.jpeg',
    description: "India's Heritage Kitchen Marketplace for small-batch artisanal producers, Bilona ghee, and wood-pressed oils.",
    address: {
      '@type': 'PostalAddress',
      addressCountry: 'IN',
    },
    sameAs: [
      'https://instagram.com/flashsalesonline',
      'https://facebook.com/flashsalesonline',
    ],
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}

export function ProductSchema({
  name,
  description,
  image,
  price,
  sku,
  rating,
  reviewCount,
  producerName,
}: {
  name: string
  description: string
  image: string
  price: number
  sku: string
  rating?: number
  reviewCount?: number
  producerName?: string
}) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name,
    description,
    image: [image],
    sku,
    brand: {
      '@type': 'Brand',
      name: producerName || 'FLASH SALES ONLINE',
    },
    offers: {
      '@type': 'Offer',
      priceCurrency: 'INR',
      price,
      availability: 'https://schema.org/InStock',
      url: 'https://flashsalesonline.in/shop',
    },
    ...(rating && reviewCount
      ? {
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: rating,
            reviewCount,
          },
        }
      : {}),
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}

export function RecipeSchema({
  title,
  description,
  image,
  prepTime,
  cookTime,
  author,
  yieldServings,
}: {
  title: string
  description: string
  image: string
  prepTime?: string
  cookTime?: string
  author: string
  yieldServings?: string
}) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Recipe',
    name: title,
    description,
    image: [image],
    author: {
      '@type': 'Person',
      name: author,
    },
    prepTime: 'PT15M',
    cookTime: 'PT25M',
    recipeYield: yieldServings || '4 servings',
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}

export function ArticleSchema({
  title,
  description,
  image,
  author,
  datePublished,
}: {
  title: string
  description: string
  image: string
  author: string
  datePublished: string
}) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: title,
    description,
    image: [image],
    author: {
      '@type': 'Person',
      name: author,
    },
    publisher: {
      '@type': 'Organization',
      name: 'FLASH SALES ONLINE',
      logo: {
        '@type': 'ImageObject',
        url: 'https://flashsalesonline.in/images/fso-brand-logo.jpeg',
      },
    },
    datePublished,
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}

export function BreadcrumbSchema({
  items,
}: {
  items: { name: string; url: string }[]
}) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: `https://flashsalesonline.in${item.url}`,
    })),
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}
