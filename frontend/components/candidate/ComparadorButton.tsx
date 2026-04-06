'use client'

import Link from 'next/link'

interface ComparadorButtonProps {
  candidato: any
}

export function ComparadorButton({ candidato }: ComparadorButtonProps) {
  return (
    <Link
      href={`/candidato/${candidato.dni}?compare=true`}
      className="inline-flex items-center gap-2 rounded-full border border-primary px-4 py-2 text-sm font-semibold text-primary hover:bg-primary/5"
    >
      Comparar
    </Link>
  )
}
