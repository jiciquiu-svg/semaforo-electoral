'use client'

import { useParams } from 'next/navigation'
import { useState, useEffect } from 'react'
import { useCandidato } from '@/hooks/useCandidato'
import { NivelBadge } from '@/components/candidate/NivelBadge'
import { AlertasList } from '@/components/candidate/AlertasList'
import { JudicialInfo } from '@/components/candidate/JudicialInfo'
import { EconomicoInfo } from '@/components/candidate/EconomicoInfo'
import { HistorialInfo } from '@/components/candidate/HistorialInfo'
import { FuentesList } from '@/components/candidate/FuentesList'
import { ComparadorButton } from '@/components/candidate/ComparadorButton'
import { Loader2, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function CandidateDetailPage() {
  const { dni } = useParams()
  const { candidato, loading, error } = useCandidato(dni as string)
  const [activeTab, setActiveTab] = useState('judicial')

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="ml-2 text-gray-600">Cargando perfil...</span>
      </div>
    )
  }

  if (error || !candidato) {
    return (
      <div className="container mx-auto px-4 py-10">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          Error al cargar el candidato: {error}
        </div>
        <Link href="/" className="inline-flex items-center gap-2 mt-4 text-primary hover:underline">
          <ArrowLeft className="w-4 h-4" />
          Volver al inicio
        </Link>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl">
      {/* Back Button */}
      <Link href="/" className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-4">
        <ArrowLeft className="w-4 h-4" />
        Volver a candidatos
      </Link>

      {/* Header */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden mb-6">
        <div className={`h-2 bg-${candidato.color}-500`} />
        <div className="p-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-800">
                {candidato.nombres}
              </h1>
              <p className="text-gray-500 mt-1">{candidato.partido}</p>
              <p className="text-sm text-gray-400 mt-0.5">
                DNI: {candidato.dni} | {candidato.cargo_postula === 'presidente' ? 'Candidato a Presidente' : 
                   candidato.cargo_postula === 'senador' ? 'Candidato a Senador' : 'Candidato a Diputado'}
              </p>
            </div>
            <div className="text-right">
              <NivelBadge nivel={candidato.nivel} />
              <ComparadorButton candidato={candidato} />
            </div>
          </div>

          {/* Main Message */}
          <div className={`mt-4 p-3 rounded-lg ${
            candidato.nivel === 'rojo' ? 'bg-red-50 border border-red-200' :
            candidato.nivel === 'naranja' ? 'bg-orange-50 border border-orange-200' :
            candidato.nivel === 'amarillo' ? 'bg-yellow-50 border border-yellow-200' :
            'bg-green-50 border border-green-200'
          }`}>
            <p className="font-medium">{candidato.mensaje}</p>
          </div>

          {/* Score */}
          <div className="mt-4 flex items-center gap-3">
            <span className="text-sm text-gray-500">Índice de Transparencia:</span>
            <div className="flex items-center gap-2">
              <div className="w-32 bg-gray-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full ${
                    candidato.puntaje_transparencia >= 70 ? 'bg-green-500' :
                    candidato.puntaje_transparencia >= 40 ? 'bg-yellow-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${candidato.puntaje_transparencia}%` }}
                />
              </div>
              <span className={`font-bold ${
                candidato.puntaje_transparencia >= 70 ? 'text-green-600' :
                candidato.puntaje_transparencia >= 40 ? 'text-yellow-600' : 'text-red-600'
              }`}>
                {candidato.puntaje_transparencia}/100
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="border-b border-gray-200">
          <nav className="flex overflow-x-auto">
            <button
              onClick={() => setActiveTab('judicial')}
              className={`px-6 py-3 text-sm font-medium transition-colors ${
                activeTab === 'judicial'
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              ⚖️ Antecedentes Judiciales
            </button>
            <button
              onClick={() => setActiveTab('economico')}
              className={`px-6 py-3 text-sm font-medium transition-colors ${
                activeTab === 'economico'
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              💰 Patrimonio y Financiamiento
            </button>
            <button
              onClick={() => setActiveTab('historial')}
              className={`px-6 py-3 text-sm font-medium transition-colors ${
                activeTab === 'historial'
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              📜 Historial Público
            </button>
            <button
              onClick={() => setActiveTab('alertas')}
              className={`px-6 py-3 text-sm font-medium transition-colors ${
                activeTab === 'alertas'
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              ⚠️ Alertas ({candidato.alertas?.length || 0})
            </button>
            <button
              onClick={() => setActiveTab('fuentes')}
              className={`px-6 py-3 text-sm font-medium transition-colors ${
                activeTab === 'fuentes'
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              📋 Fuentes
            </button>
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'judicial' && <JudicialInfo candidato={candidato} />}
          {activeTab === 'economico' && <EconomicoInfo candidato={candidato} />}
          {activeTab === 'historial' && <HistorialInfo candidato={candidato} />}
          {activeTab === 'alertas' && <AlertasList alertas={candidato.alertas || []} />}
          {activeTab === 'fuentes' && <FuentesList fuentes={candidato.fuentes || []} />}
        </div>
      </div>
    </div>
  )
}