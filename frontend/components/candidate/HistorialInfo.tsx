'use client'

interface HistorialInfoProps {
  candidato: any
}

export function HistorialInfo({ candidato }: HistorialInfoProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-xl font-semibold text-gray-800">Historial Público</h3>
      <p className="text-gray-600">Información pública y trayectoria política disponible.</p>
      <div className="rounded-xl border border-gray-100 bg-white p-4">
        <p className="text-sm text-gray-500">Partido</p>
        <p className="text-lg font-semibold text-gray-900">{candidato.partido}</p>
      </div>
      <div className="rounded-xl border border-gray-100 bg-white p-4">
        <p className="text-sm text-gray-500">Cargo postula</p>
        <p className="text-lg font-semibold text-gray-900">{candidato.cargo_postula}</p>
      </div>
    </div>
  )
}
