'use client'

interface Filters {
  partido: string
  region: string
  cargo: string
  nivel: string
  busqueda: string
}

interface FiltrosSidebarProps {
  filters: Filters
  onFilterChange: (filters: Filters) => void
}

export function FiltrosSidebar({ filters, onFilterChange }: FiltrosSidebarProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm sticky top-24">
      <h2 className="text-lg font-semibold text-gray-800 mb-4">Filtros</h2>
      {[
        { label: 'Partido', name: 'partido' },
        { label: 'Región', name: 'region' },
        { label: 'Cargo', name: 'cargo' },
        { label: 'Nivel', name: 'nivel' },
      ].map((filter) => (
        <div key={filter.name} className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">{filter.label}</label>
          <input
            type="text"
            value={filters[filter.name as keyof Filters]}
            onChange={(event) =>
              onFilterChange({
                ...filters,
                [filter.name]: event.target.value,
              })
            }
            className="search-input"
          />
        </div>
      ))}
    </div>
  )
}
