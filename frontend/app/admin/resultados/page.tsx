// app/admin/resultados/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'

// Usamos la misma lógica de conexión del frontend al backend
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001'

interface OpcionCandidato {
  id: string
  name: string
  party: string
  colorClass: string
  glow: string
  borderClass: string
  textClass: string
  bgGradient: string
  winnerTag: string
}

const OPCIONES: OpcionCandidato[] = [
  { 
    id: '1', 
    name: 'Keiko Fujimori Higuchi', 
    party: 'Fuerza Popular', 
    colorClass: 'bg-orange-500', 
    glow: 'shadow-[0_0_15px_rgba(249,115,22,0.5)]', 
    borderClass: 'border-orange-500/50', 
    textClass: 'text-orange-400', 
    bgGradient: 'from-orange-500/10', 
    winnerTag: 'bg-orange-500 text-white' 
  },
  { 
    id: '2', 
    name: 'Roberto Sánchez Palomino', 
    party: 'Juntos por el Perú', 
    colorClass: 'bg-red-500', 
    glow: 'shadow-[0_0_15px_rgba(239,68,68,0.5)]', 
    borderClass: 'border-red-500/50', 
    textClass: 'text-red-400', 
    bgGradient: 'from-red-500/10', 
    winnerTag: 'bg-red-500 text-white' 
  },
  { 
    id: '3', 
    name: 'Ninguno (voto blanco/viciado)', 
    party: 'Voto en blanco / viciado', 
    colorClass: 'bg-gray-500', 
    glow: 'shadow-[0_0_15px_rgba(107,114,128,0.5)]', 
    borderClass: 'border-gray-500/50', 
    textClass: 'text-gray-400', 
    bgGradient: 'from-gray-500/10', 
    winnerTag: 'bg-gray-500 text-white' 
  },
  { 
    id: '4', 
    name: 'Aún no sabe (indeciso)', 
    party: 'Indeciso', 
    colorClass: 'bg-yellow-500', 
    glow: 'shadow-[0_0_15px_rgba(234,179,8,0.5)]', 
    borderClass: 'border-yellow-500/50', 
    textClass: 'text-yellow-400', 
    bgGradient: 'from-yellow-500/10', 
    winnerTag: 'bg-yellow-500 text-zinc-900' 
  },
  { 
    id: '5', 
    name: 'No votará (abstención declarada)', 
    party: 'Abstención', 
    colorClass: 'bg-purple-500', 
    glow: 'shadow-[0_0_15px_rgba(139,92,246,0.5)]', 
    borderClass: 'border-purple-500/50', 
    textClass: 'text-purple-400', 
    bgGradient: 'from-purple-500/10', 
    winnerTag: 'bg-purple-500 text-white' 
  }
]

export default function ResultadosPage() {
  const [estadisticas, setEstadisticas] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Función de autopolling (cada 5 segundos para que sea "en tiempo real")
    const fetchStats = () => {
      fetch(`${API_URL}/api/segunda-vuelta/estadisticas`)
        .then(res => res.json())
        .then(data => {
          setEstadisticas(data)
          setLoading(false)
        })
        .catch(err => {
          console.error("Error fetching stats:", err)
          setLoading(false)
        })
    }

    // Primera carga
    fetchStats()
    
    // Intervalo de actualización en tiempo real
    const interval = setInterval(fetchStats, 5000)
    return () => clearInterval(interval)
  }, [])

  if (loading) return (
    <div className="min-h-screen bg-olympus-bg flex flex-col items-center justify-center gap-4">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-olympus-cyan"></div>
      <p className="text-olympus-cyan font-bold tracking-widest animate-pulse">CARGANDO BASE DE DATOS...</p>
    </div>
  )

  // Fusionar las opciones estáticas con las estadísticas dinámicas
  const processedOpciones: any[] = []
  const matchedIds = new Set<string>()

  OPCIONES.forEach(op => {
    const match = estadisticas?.votos_por_candidato?.find((c: any) => String(c.candidato_id) === op.id)
    const votos = match ? Number(match.votos) : 0
    const total = estadisticas?.total_votos || 0
    const porcentaje = total > 0 ? Number(((votos * 100) / total).toFixed(2)) : 0
    processedOpciones.push({
      ...op,
      votos,
      porcentaje
    })
    if (match) {
      matchedIds.add(op.id)
    }
  })

  // Agregar cualquier otra opción devuelta por el backend que no esté en la lista estática
  estadisticas?.votos_por_candidato?.forEach((c: any) => {
    const idStr = String(c.candidato_id)
    if (!matchedIds.has(idStr)) {
      const total = estadisticas?.total_votos || 0
      const votos = Number(c.votos)
      const porcentaje = total > 0 ? Number(((votos * 100) / total).toFixed(2)) : 0
      processedOpciones.push({
        id: idStr,
        name: c.candidato_nombre || `Opción ${idStr}`,
        party: 'OTRO',
        colorClass: 'bg-olympus-cyan',
        glow: 'shadow-[0_0_15px_rgba(0,242,254,0.5)]',
        borderClass: 'border-olympus-cyan',
        textClass: 'text-olympus-cyan',
        bgGradient: 'from-olympus-cyan/10',
        winnerTag: 'bg-olympus-cyan text-zinc-900',
        votos,
        porcentaje
      })
    }
  })

  // Ordenar de mayor a menor votación
  processedOpciones.sort((a, b) => b.votos - a.votos)

  return (
    <div className="min-h-screen bg-olympus-bg p-4 md:p-8 text-olympus-text font-sans">
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
          <h1 className="text-3xl md:text-4xl font-black text-olympus-cyan drop-shadow-[0_0_8px_rgba(0,242,254,0.5)] flex items-center gap-3">
            <span>📊</span> RESULTADOS EN VIVO
          </h1>
          <div className="flex items-center gap-2 bg-olympus-surface border border-olympus-border px-4 py-2 rounded-full">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500 shadow-[0_0_8px_rgba(239,68,68,1)]"></span>
            </span>
            <span className="text-xs font-bold text-olympus-muted tracking-widest">TRANSMITIENDO</span>
          </div>
        </div>
        
        {/* Total de votos */}
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="bg-olympus-surface border border-olympus-border rounded-3xl p-8 mb-10 text-center shadow-[0_0_30px_rgba(0,0,0,0.5)] relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-olympus-mint to-transparent opacity-50"></div>
          <div className="text-6xl md:text-7xl font-black text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]">
            {estadisticas?.total_votos?.toLocaleString() || 0}
          </div>
          <div className="text-olympus-mint font-bold tracking-widest uppercase mt-4 text-xs md:text-sm">
            Votos Totales Procesados
          </div>
        </motion.div>

        {/* Resultados por candidato */}
        <div className="space-y-6">
          {processedOpciones.map((cand: any, idx: number) => {
            // Para destacar al ganador
            const isWinner = idx === 0 && cand.votos > 0;

            return (
              <motion.div 
                key={cand.id}
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: idx * 0.05 }}
                className={`bg-olympus-surface border rounded-2xl p-6 relative overflow-hidden group transition-all ${isWinner ? `${cand.borderClass} bg-gradient-to-r ${cand.bgGradient} to-transparent` : 'border-olympus-border hover:border-olympus-border/80'}`}
              >
                {isWinner && (
                  <div className={`absolute top-0 right-0 ${cand.winnerTag} text-[10px] font-bold px-3 py-1 rounded-bl-xl uppercase`}>
                    Líder Actual
                  </div>
                )}
                
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-2 mt-2">
                  <div className="flex items-center gap-3">
                    <div>
                      <div className="text-xl md:text-3xl font-black text-white">
                        {cand.name}
                      </div>
                      <div className="text-xs font-mono text-olympus-muted uppercase tracking-wider mt-0.5">
                        {cand.party}
                      </div>
                    </div>
                  </div>
                  <div className="text-left md:text-right w-full md:w-auto flex justify-between md:block items-end">
                    <div className={`text-4xl md:text-5xl font-black ${cand.textClass} leading-none`}>
                      {cand.votos.toLocaleString()}
                    </div>
                    <div className="text-olympus-muted font-bold text-sm md:text-base mt-1">
                      {cand.porcentaje}% de los votos
                    </div>
                  </div>
                </div>
                
                {/* Barra de progreso Opticlean */}
                <div className="w-full bg-olympus-bg/80 rounded-full h-4 md:h-5 border border-olympus-border/50 overflow-hidden shadow-inner relative">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${cand.porcentaje}%` }}
                    transition={{ duration: 1.5, ease: "easeOut" }}
                    className={`h-full rounded-full ${cand.colorClass} ${cand.glow}`}
                  />
                  {/* Etiqueta de porcentaje dentro de la barra en pantallas grandes */}
                  <span className="absolute inset-y-0 right-2 hidden md:flex items-center text-[10px] font-bold text-white/50">
                    {cand.porcentaje}%
                  </span>
                </div>
              </motion.div>
            )
          })}
          
          {processedOpciones.length === 0 && (
            <div className="text-center p-8 bg-olympus-surface border border-olympus-border rounded-xl border-dashed">
              <p className="text-olympus-muted font-bold">Aún no hay votos registrados.</p>
              <p className="text-xs text-olympus-muted mt-2">Los resultados aparecerán aquí automáticamente.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
