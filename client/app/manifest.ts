import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'FLASH SALES ONLINE | India\'s Heritage Kitchen Marketplace',
    short_name: 'FSO India',
    description: 'Good food begins at the source. Authentic everyday ingredients direct from small-batch artisanal producers.',
    start_url: '/',
    display: 'standalone',
    background_color: '#f7f4ed',
    theme_color: '#173e28',
    icons: [
      {
        src: '/images/fso-brand-logo.jpeg',
        sizes: '192x192',
        type: 'image/jpeg',
      },
      {
        src: '/images/fso-brand-logo.jpeg',
        sizes: '512x512',
        type: 'image/jpeg',
      },
    ],
  }
}
