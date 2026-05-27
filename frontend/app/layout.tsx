import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Candidato al Desnudo - Transparencia Electoral Perú 2026',
  description: 'Conoce a tus candidatos: historial judicial, patrimonio, financiamiento y más. Vota informado.',
}

export const viewport: Viewport = {
  themeColor: '#1e3a8a',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

import { LegalFooter } from '@/components/layout/LegalFooter'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className={`${inter.className} bg-gray-50 text-gray-900 antialiased min-h-screen flex flex-col`}>
        <main className="flex-grow">
          {children}
        </main>
        <LegalFooter />
      </body>
    </html>
  )
}