'use client'

import { usePathname } from 'next/navigation'
import { LegalFooter as BaseLegalFooter } from '../LegalFooter'

export function LegalFooter() {
  const pathname = usePathname()
  
  // Evitar duplicación en la página de segunda vuelta, 
  // ya que esa página renderiza su propio LegalFooter directamente.
  if (pathname === '/segunda-vuelta') {
    return null
  }
  
  return <BaseLegalFooter />
}
