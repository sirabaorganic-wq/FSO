import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Cormorant_Garamond, Manrope } from 'next/font/google'
import { AppProviders } from './providers'
import './globals.css'

const serif = Cormorant_Garamond({ subsets: ['latin'], variable: '--font-display', weight: ['500', '600', '700'] })
const sans = Manrope({ subsets: ['latin'], variable: '--font-body', weight: ['400', '500', '600', '700', '800'] })

export const metadata: Metadata = {
  metadataBase: new URL('https://flashsalesonline.in'),
  title: { default: 'FLASH SALES ONLINE | India\'s Heritage Kitchen Marketplace', template: '%s | FLASH SALES ONLINE' },
  description: 'Good food begins at the source. Discover authentic everyday ingredients, the producers behind them, and the wisdom of India\'s kitchens.',
  alternates: { canonical: '/' },
  openGraph: { title: 'FLASH SALES ONLINE', description: 'India\'s Heritage Kitchen Marketplace', type: 'website', url: 'https://flashsalesonline.in' },
  twitter: { card: 'summary_large_image', title: 'FLASH SALES ONLINE', description: 'Good food begins at the source.' },
}

export const viewport: Viewport = {
  colorScheme: 'light dark',
  themeColor: [{ media: '(prefers-color-scheme: light)', color: '#f7f4ed' }, { media: '(prefers-color-scheme: dark)', color: '#17221a' }],
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${serif.variable} ${sans.variable}`}>
      <body className="antialiased">
        <AppProviders>{children}</AppProviders>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
