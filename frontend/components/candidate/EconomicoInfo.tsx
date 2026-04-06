'use client'

interface EconomicoInfoProps {
  candidato: any
}

export function EconomicoInfo({ candidato }: EconomicoInfoProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-xl font-semibold text-gray-800">Patrimonio y Financiamiento</h3>
      <p className="text-gray-600">Resumen de los indicadores financieros disponibles para este candidato.</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-gray-100 bg-white p-4">
          <p className="text-sm text-gray-500">Índice de Transparencia</p>
          <p className="text-2xl font-bold text-gray-900">{candidato.puntaje_transparencia ?? '—'}</p>
        </div>
        <div className="rounded-xl border border-gray-100 bg-white p-4">
          <p className="text-sm text-gray-500">Nivel</p>
          <p className="text-2xl font-bold text-gray-900">{candidato.nivel}</p>
        </div>
      </div>
      <p className="text-gray-600">Revisa las alertas financieras y los vínculos patrimoniales en la sección de alertas.</p>
    </div>
  )
}
