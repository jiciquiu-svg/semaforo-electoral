'use client'

import { AlertTriangle, TrendingUp, Users, Building, Briefcase } from 'lucide-react'

interface AlertasListProps {
  alertas: Array<{
    tipo: string
    valor: string
    descripcion: string
    fuente: string
    gravedad: string
  }>
}

const iconoPorTipo = {
  variacion_patrimonial_alta: <TrendingUp className="w-5 h-5 text-red-500" />,
  variacion_patrimonial_media: <TrendingUp className="w-5 h-5 text-orange-500" />,
  concentracion_aportes_peligrosa: <Users className="w-5 h-5 text-red-500" />,
  concentracion_aportes_alerta: <Users className="w-5 h-5 text-orange-500" />,
  contratos_familiares: <Building className="w-5 h-5 text-red-500" />,
}

export function AlertasList({ alertas }: AlertasListProps) {
  if (!alertas || alertas.length === 0) {
    return (
      <div className="text-center py-10 text-gray-500">
        <AlertTriangle className="w-12 h-12 mx-auto mb-2 text-gray-300" />
        <p>No se detectaron alertas para este candidato</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
        <p className="text-red-700 text-sm">
          ⚠️ Este candidato tiene {alertas.length} alerta(s) que requieren tu atención.
          Revisa cada una y verifica las fuentes oficiales.
        </p>
      </div>

      {alertas.map((alerta, idx) => (
        <div 
          key={idx}
          className={`border rounded-lg p-4 ${
            alerta.gravedad === 'alta' 
              ? 'border-red-200 bg-red-50' 
              : 'border-orange-200 bg-orange-50'
          }`}
        >
          <div className="flex items-start gap-3">
            {iconoPorTipo[alerta.tipo as keyof typeof iconoPorTipo] || <AlertTriangle className="w-5 h-5 text-orange-500" />}
            <div className="flex-1">
              <h4 className="font-semibold text-gray-800">
                {alerta.tipo === 'variacion_patrimonial_alta' && '📈 Variación Patrimonial Alta'}
                {alerta.tipo === 'variacion_patrimonial_media' && '📈 Variación Patrimonial Media'}
                {alerta.tipo === 'concentracion_aportes_peligrosa' && '🎯 Concentración de Aportes Peligrosa'}
                {alerta.tipo === 'concentracion_aportes_alerta' && '🎯 Concentración de Aportes'}
                {alerta.tipo === 'contratos_familiares' && '🏢 Contratos a Familiares'}
              </h4>
              <p className="text-gray-700 mt-1">{alerta.descripcion}</p>
              <div className="flex justify-between items-center mt-3">
                <span className="text-xs text-gray-500">Fuente: {alerta.fuente}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  alerta.gravedad === 'alta' ? 'bg-red-200 text-red-700' : 'bg-orange-200 text-orange-700'
                }`}>
                  {alerta.gravedad === 'alta' ? 'Gravedad Alta' : 'Gravedad Media'}
                </span>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}