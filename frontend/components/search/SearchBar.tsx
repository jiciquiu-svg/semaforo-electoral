'use client'

import { useState } from 'react'

interface SearchBarProps {
  onSearch: (term: string) => void
}

export function SearchBar({ onSearch }: SearchBarProps) {
  const [term, setTerm] = useState('')

  return (
    <div className="flex gap-2">
      <input
        type="text"
        value={term}
        onChange={(event) => setTerm(event.target.value)}
        placeholder="Buscar candidato, partido o cargo"
        className="search-input"
      />
      <button
        onClick={() => onSearch(term)}
        className="px-4 py-3 rounded-lg bg-primary text-white font-semibold hover:bg-secondary transition"
      >
        Buscar
      </button>
    </div>
  )
}
