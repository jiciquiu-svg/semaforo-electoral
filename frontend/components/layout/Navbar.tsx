import Link from 'next/link'

export function Navbar() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 border-b border-gray-200 backdrop-blur-md shadow-sm">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <Link href="/" className="text-lg font-bold text-primary">Candidato al Desnudo</Link>
        <nav className="hidden md:flex items-center gap-4 text-sm text-gray-600">
          <Link href="/">Inicio</Link>
          <Link href="/">Candidatos</Link>
          <a href="#" className="hover:text-primary">Contacto</a>
          <Link href="/segunda-vuelta" className="bg-slate-900 px-3 py-1 rounded-md text-white hover:text-yellow-400 transition-colors font-medium">
            🗳️ SEGUNDA VUELTA
          </Link>
        </nav>
      </div>
    </header>
  )
}
