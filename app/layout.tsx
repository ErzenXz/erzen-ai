import './globals.css';
import type { Metadata } from 'next';
import { Inter, Roboto_Mono } from 'next/font/google';
import { ThemeProvider } from '@/components/theme-provider';
import { Analytics } from "@vercel/analytics/react"
import { ClerkProvider } from '@clerk/nextjs'
import { dark } from '@clerk/themes'

// Primary font for headings and UI elements
const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  weight: ['400', '500', '600', '700'],
});

// Monospace font for code and technical content
const robotoMono = Roboto_Mono({
  subsets: ['latin'],
  variable: '--font-roboto-mono',
});

export const metadata: Metadata = {
  title: {
    default: 'ErzenAI',
    template: '%s | ErzenAI'
  },
  description: 'Create professional content, generate high-quality code, and streamline your workflow with ErzenAI - the intelligent AI assistant for productivity and creativity.',
  keywords: ['AI content generation', 'AI code assistant', 'productivity tool', 'ErzenAI', 'machine learning'],
  creator: 'ErzenAI Team',
  publisher: 'ErzenAI',
  icons: {
    icon: [
      { url: '/icon0.svg', type: 'image/svg+xml' },
      { url: '/favicon.ico', sizes: 'any' }
    ],
    apple: [
      { url: '/apple-icon.png', sizes: '180x180' },
    ],
    shortcut: '/favicon.ico',
  },
  manifest: '/manifest.json',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#171717' }
  ],
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1
  }
};

export default function RootLayout({
  children,
}: {
  readonly children: React.ReactNode;
}) {
  return (
    <ClerkProvider
      appearance={{
        baseTheme: dark,
        variables: {
          colorPrimary: '#6366f1',   // Tailwind indigo-500 equivalent
          colorText: '#ffffff',
          colorBackground: '#0a0a0a',
        },
      }}
    >
      <html lang="en" suppressHydrationWarning className={`${inter.variable} ${robotoMono.variable}`}>
        <body className={inter.className}>
          <ThemeProvider
            attribute="data-theme"
            defaultTheme="system"
            enableSystem
            enableColorScheme
            themes={["light", "dark", "blue", "green", "purple", "yellow", "pink", "orange", "teal", "gray", "system"]}
          >
            {children}
            <Analytics />
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}