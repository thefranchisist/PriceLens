import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  metadataBase: new URL('https://pricelens-open-prices.the-franchis-5813.chatgpt.site'),
  title: 'PriceLens — Scan it. Price it. Shop smarter.',
  description:
    'Scan supermarket barcodes, compare nearby prices, and contribute fresh local prices to an open global community.',
  openGraph: {
    title: 'PriceLens',
    description: 'Scan it. Price it. Shop smarter.',
    images: [{ url: '/og.png', width: 1731, height: 909, alt: 'PriceLens barcode scanning preview' }],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'PriceLens',
    description: 'Scan it. Price it. Shop smarter.',
    images: ['/og.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
