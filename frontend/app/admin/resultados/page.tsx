// app/admin/resultados/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'

// Usamos la misma lógica de conexión del frontend al backend
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001'

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
          {estadisticas?.votos_por_candidato?.map((cand: any, idx: number) => {
            // Asignar colores según el candidato
            let candColor = "bg-olympus-cyan"
            let glow = "shadow-[0_0_15px_rgba(0,242,254,0.5)]"
            let textColor = "text-olympus-cyan"
            let borderClass = "border-olympus-cyan"
            let bgGradient = "from-olympus-cyan/10"
            let winnerTagColor = "bg-olympus-cyan text-zinc-900"
            
            if (cand.candidato_nombre.includes("Keiko")) {
              candColor = "bg-red-500"
              glow = "shadow-[0_0_15px_rgba(239,68,68,0.5)]"
              textColor = "text-red-400"
              borderClass = "border-red-500/50"
              bgGradient = "from-red-500/10"
              winnerTagColor = "bg-red-500 text-white"
            } else if (cand.candidato_nombre.includes("Roberto") || cand.candidato_nombre.includes("Sánchez")) {
              candColor = "bg-blue-500"
              glow = "shadow-[0_0_15px_rgba(59,130,246,0.5)]"
              textColor = "text-blue-400"
              borderClass = "border-blue-500/50"
              bgGradient = "from-blue-500/10"
              winnerTagColor = "bg-blue-500 text-white"
            } else if (cand.candidato_nombre.includes("AGUJERO") || cand.candidato_nombre.includes("NINGUNO")) {
              candColor = "bg-gray-400"
              glow = "shadow-[0_0_15px_rgba(156,163,175,0.5)]"
              textColor = "text-gray-400"
              borderClass = "border-gray-500/50"
              bgGradient = "from-gray-500/10"
              winnerTagColor = "bg-gray-400 text-zinc-900"
            }

            // Para destacar al ganador
            const isWinner = idx === 0 && cand.votos > 0;

            return (
              <motion.div 
                key={idx}
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: idx * 0.1 }}
                className={`bg-olympus-surface border rounded-2xl p-6 relative overflow-hidden group transition-all ${isWinner ? `${borderClass} bg-gradient-to-r ${bgGradient} to-transparent` : 'border-olympus-border hover:border-olympus-border/80'}`}
              >
                {isWinner && (
                  <div className={`absolute top-0 right-0 ${winnerTagColor} text-[10px] font-bold px-3 py-1 rounded-bl-xl uppercase`}>
                    Líder Actual
                  </div>
                )}
                
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-2 mt-2">
                  <div className="flex items-center gap-3">
                    <div className="text-xl md:text-3xl font-black text-white">
                      {cand.candidato_nombre}
                    </div>
                  </div>
                  <div className="text-left md:text-right w-full md:w-auto flex justify-between md:block items-end">
                    <div className={`text-4xl md:text-5xl font-black ${textColor} leading-none`}>
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
                    className={`h-full rounded-full ${candColor} ${glow}`}
                  />
                  {/* Etiqueta de porcentaje dentro de la barra en pantallas grandes */}
                  <span className="absolute inset-y-0 right-2 hidden md:flex items-center text-[10px] font-bold text-white/50">
                    {cand.porcentaje}%
                  </span>
                </div>
              </motion.div>
            )
          })}
          
          {(!estadisticas?.votos_por_candidato || estadisticas.votos_por_candidato.length === 0) && (
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
