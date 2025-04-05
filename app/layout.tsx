import './globals.css';
import type { Metadata } from 'next';
import { Inter, Roboto_Mono } from 'next/font/google';
import { ThemeProvider } from '@/components/theme-provider';
import { Analytics } from "@vercel/analytics/react"

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
  title: 'ErzenAI - AI-powered content generation',
  description: 'ErzenAI is a powerful AI tool that helps you generate content, code, and more with ease.',
};

export default function RootLayout({
  children,
}: {
  readonly children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning className={`${inter.variable} ${robotoMono.variable}`}>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}