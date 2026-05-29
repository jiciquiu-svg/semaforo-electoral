import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Páginas permitidas: Segunda Vuelta, Resultados en vivo, y Panel de Analíticas (dashboard)
  const allowedPaths = [
    '/segunda-vuelta',
    '/admin/resultados',
    '/admin/votacion'
  ]

  // Permitir si es una de las páginas permitidas, una llamada a la API local, o un recurso estático (imágenes, fuentes, etc.)
  if (
    allowedPaths.includes(pathname) ||
    pathname.startsWith('/api') ||
    pathname.includes('.')
  ) {
    return NextResponse.next()
  }

  // Redirigir todas las demás páginas (como la página de inicio /, candidatos, juegos, etc.) a /segunda-vuelta
  return NextResponse.redirect(new URL('/segunda-vuelta', request.url))
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
