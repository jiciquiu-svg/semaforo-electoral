'use client'

import Link from 'next/link'
import { AlertTriangle, CheckCircle, Info, Shield, ExternalLink } from 'lucide-react'

interface CandidateCardProps {
  candidato: {
    dni: string
    nombres: string
    partido: string
    cargo_postula: string
    nivel: string
    color: string
    mensaje: string
    puntaje_transparencia: number
    alertas: any[]
  }
}

const nivelIconos = {
  verde: <CheckCircle className="w-5 h-5 text-green-500" />,
  amarillo: <Info className="w-5 h-5 text-yellow-500" />,
  naranja: <AlertTriangle className="w-5 h-5 text-orange-500" />,
  rojo: <Shield className="w-5 h-5 text-red-600" />
}

const nivelColores = {
  verde: 'border-green-200 hover:border-green-300',
  amarillo: 'border-yellow-200 hover:border-yellow-300',
  naranja: 'border-orange-200 hover:border-orange-300',
  rojo: 'border-red-200 hover:border-red-300 animate-pulse-border'
}

export function CandidateCard({ candidato }: CandidateCardProps) {
  const scoreColor = 
    candidato.puntaje_transparencia >= 70 ? 'text-green-600' :
    candidato.puntaje_transparencia >= 40 ? 'text-yellow-600' :
    'text-red-600'

  return (
    <Link href={`/candidato/${candidato.dni}`}>
      <div className={`card-candidate ${nivelColores[candidato.nivel as keyof typeof nivelColores]} cursor-pointer`}>
        {/* Header */}
        <div className="p-4 border-b border-gray-100">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <h3 className="font-semibold text-gray-800 text-lg line-clamp-1">
                {candidato.nombres}
              </h3>
              <p className="text-sm text-gray-500">{candidato.partido}</p>
              <p className="text-xs text-gray-400 mt-0.5">
                {candidato.cargo_postula === 'presidente' ? '🇵🇪 Presidente' :
                 candidato.cargo_postula === 'senador' ? '🏛️ Senador' :
                 candidato.cargo_postula === 'diputado' ? '📋 Diputado' : 'Candidato'}
              </p>
            </div>
            <div className="flex flex-col items-end">
              <div className={`nivel-badge bg-${candidato.color}-500`}>
                {candidato.nivel.toUpperCase()}
              </div>
            </div>
          </div>
        </div>

        {/* Score */}
        <div className="px-4 py-2 bg-gray-50 flex justify-between items-center">
          <span className="text-xs text-gray-500">Índice de Transparencia</span>
          <div className="flex items-center gap-2">
            <div className="w-24 bg-gray-200 rounded-full h-2">
              <div 
                className={`h-2 rounded-full ${
                  candidato.puntaje_transparencia >= 70 ? 'bg-green-500' :
                  candidato.puntaje_transparencia >= 40 ? 'bg-yellow-500' : 'bg-red-500'
                }`}
                style={{ width: `${candidato.puntaje_transparencia}%` }}
              />
            </div>
            <span className={`font-bold text-sm ${scoreColor}`}>
              {candidato.puntaje_transparencia}
            </span>
          </div>
        </div>

        {/* Message */}
        <div className="p-4">
          <div className="flex items-start gap-2">
            {nivelIconos[candidato.nivel as keyof typeof nivelIconos]}
            <p className="text-sm text-gray-600 line-clamp-2 flex-1">
              {candidato.mensaje}
            </p>
          </div>
        </div>

        {/* Alert Count */}
        {candidato.alertas.length > 0 && (
          <div className="px-4 py-2 bg-red-50 border-t border-red-100">
            <div className="flex items-center gap-1 text-xs text-red-600">
              <AlertTriangle className="w-3 h-3" />
              <span>{candidato.alertas.length} alerta(s) detectada(s)</span>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="px-4 py-2 border-t border-gray-100 flex justify-between items-center text-xs text-gray-400">
          <span>Ver detalles completos</span>
          <ExternalLink className="w-3 h-3" />
        </div>
      </div>
    </Link>
  )
}