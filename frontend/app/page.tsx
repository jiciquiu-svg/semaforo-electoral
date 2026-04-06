'use client'

import { useState, useEffect } from 'react'
import { SearchBar } from '@/components/search/SearchBar'
import { CandidateCard } from '@/components/candidate/CandidateCard'
import { StatsCards } from '@/components/dashboard/StatsCards'
import { PartidosRanking } from '@/components/dashboard/PartidosRanking'
import { FiltrosSidebar } from '@/components/filters/FiltrosSidebar'
import { useCandidatos } from '@/hooks/useCandidatos'
import { Loader2 } from 'lucide-react'

export default function HomePage() {
  const [filters, setFilters] = useState({
    partido: '',
    region: '',
    cargo: '',
    nivel: '',
    busqueda: ''
  })
  
  const { candidatos, loading, error, total, estadisticas } = useCandidatos(filters)

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      {/* Hero Section */}
      <div className="text-center mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-primary mb-2">
          Candidato al Desnudo
        </h1>
        <p className="text-gray-600 text-lg">
          Conoce a los 10,000+ candidatos de las elecciones Perú 2026
        </p>
        <p className="text-sm text-gray-500 mt-1">
          Datos verificados de fuentes oficiales: JNE, ONPE, CGR, Poder Judicial
        </p>
      </div>

      {/* Stats Cards */}
      <StatsCards estadisticas={estadisticas} />

      {/* Search Bar */}
      <div className="my-6">
        <SearchBar 
          onSearch={(term) => setFilters({ ...filters, busqueda: term })}
        />
      </div>

      {/* Filters and Results */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar Filters */}
        <div className="lg:w-80 flex-shrink-0">
          <FiltrosSidebar 
            filters={filters}
            onFilterChange={setFilters}
          />
        </div>

        {/* Results Grid */}
        <div className="flex-1">
          {loading ? (
            <div className="flex justify-center items-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <span className="ml-2 text-gray-600">Cargando candidatos...</span>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
              Error al cargar datos: {error}
            </div>
          ) : candidatos.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-xl">
              <p className="text-gray-500 text-lg">No se encontraron candidatos</p>
              <p className="text-gray-400 text-sm mt-1">Intenta con otros filtros</p>
            </div>
          ) : (
            <>
              <div className="mb-4 text-sm text-gray-500">
                Mostrando {candidatos.length} de {total} candidatos
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                {candidatos.map((candidato) => (
                  <CandidateCard key={candidato.dni} candidato={candidato} />
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Partidos Ranking */}
      <div className="mt-10">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Ranking de Partidos</h2>
        <PartidosRanking />
      </div>
    </div>
  )
}