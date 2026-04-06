'use client'

interface JudicialInfoProps {
  candidato: any
}

export function JudicialInfo({ candidato }: JudicialInfoProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-xl font-semibold text-gray-800">Antecedentes Judiciales</h3>
      <p className="text-gray-600">{candidato.alertas?.length > 0 ? 'El candidato presenta alertas judiciales importantes.' : 'No hay antecedentes judiciales registrados.'}</p>
      <div className="grid gap-3">
        {candidato.alertas?.map((alerta: any, index: number) => (
          <div key={index} className="rounded-xl border border-gray-100 bg-red-50 p-4">
            <p className="font-semibold text-gray-800">{alerta.tipo}</p>
            <p className="text-gray-600 mt-1">{alerta.descripcion}</p>
            <p className="text-xs text-gray-500 mt-2">Fuente: {alerta.fuente}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
