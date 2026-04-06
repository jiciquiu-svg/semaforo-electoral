'use client'

interface FuentesListProps {
  fuentes: Array<{ nombre: string; url?: string }> 
}

export function FuentesList({ fuentes }: FuentesListProps) {
  if (!fuentes || fuentes.length === 0) {
    return <p className="text-gray-600">No hay fuentes registradas para este candidato.</p>
  }

  return (
    <div className="space-y-3">
      {fuentes.map((fuente, index) => (
        <div key={index} className="rounded-xl border border-gray-100 bg-white p-4">
          <p className="font-semibold text-gray-800">{fuente.nombre}</p>
          {fuente.url && (
            <a href={fuente.url} className="text-sm text-primary hover:underline" target="_blank" rel="noreferrer">
              Ver fuente
            </a>
          )}
        </div>
      ))}
    </div>
  )
}
