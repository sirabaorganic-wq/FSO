import { HomePage } from '@/components/home/homepage'

export default function Page() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'FLASH SALES ONLINE',
    description: "India's Heritage Kitchen Marketplace",
    url: 'https://flashsalesonline.in',
  }

  return <><HomePage /><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} /></>
}
