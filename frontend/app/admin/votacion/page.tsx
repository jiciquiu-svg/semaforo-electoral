'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  TrendingUp, 
  Users, 
  MousePointer2, 
  Trophy, 
  Clock, 
  RefreshCcw,
  BarChart3,
  ChevronRight
} from 'lucide-react'

interface CandidatoStat {
  candidato_dni: string
  candidato_nombre: string
  partido: string
  votos_ganados: number
  fichas_abiertas: number
  total_interacciones: number
}

interface Resumen {
  total_votos_simulados: number
  total_fichas_abiertas: number
  total_comparativas: number
  total_usuarios: number
}

export default function DashboardVotacion() {
  const [resumen, setResumen] = useState<Resumen | null>(null)
  const [ranking, setRanking] = useState<CandidatoStat[]>([])
  const [loading, setLoading] = useState(true)
  const [ultimoUpdate, setUltimoUpdate] = useState(new Date())

  const fetchData = async () => {
    try {
      const res = await fetch('http://localhost:8001/api/analytics/estadisticas?horas=24')
      const data = await res.json()
      setResumen(data.resumen_votacion)
      setRanking(data.ranking_candidatos || [])
      setUltimoUpdate(new Date())
      setLoading(false)
    } catch (error) {
      console.error("Error fetching stats:", error)
    }
  }

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 10000) // Actualizar cada 10s
    return () => clearInterval(interval)
  }, [])

  if (loading && !resumen) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
        >
          <RefreshCcw className="text-blue-500 w-12 h-12" />
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 md:p-8 font-sans">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
          <div>
            <h1 className="text-4xl font-black tracking-tighter italic flex items-center gap-3">
              <BarChart3 className="text-blue-500" size={36} />
              CONTROL PANEL <span className="text-blue-500">ANALYTICS</span>
            </h1>
            <p className="text-slate-400 font-medium flex items-center gap-2 mt-1">
              <Clock size={14} /> Última actualización: {ultimoUpdate.toLocaleTimeString()}
            </p>
          </div>
          <div className="bg-blue-500/10 border border-blue-500/20 px-4 py-2 rounded-full text-blue-400 text-xs font-black tracking-widest uppercase animate-pulse">
            ● LIVE MONITORING SYSTEM
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <StatCard 
            title="VOTOS FINALES" 
            value={resumen?.total_votos_simulados || 0} 
            icon={Trophy} 
            color="bg-yellow-500" 
          />
          <StatCard 
            title="SESSIONS ÚNICAS" 
            value={resumen?.total_usuarios || 0} 
            icon={Users} 
            color="bg-blue-500" 
          />
          <StatCard 
            title="FICHAS ABIERTAS" 
            value={resumen?.total_fichas_abiertas || 0} 
            icon={MousePointer2} 
            color="bg-purple-500" 
          />
          <StatCard 
            title="CATEGORÍAS VOTADAS" 
            value={resumen?.total_comparativas || 0} 
            icon={TrendingUp} 
            color="bg-green-500" 
          />
        </div>

        {/* Tab Selection */}
        <div className="flex gap-4 mb-8">
          <button className="px-6 py-2 bg-blue-600 rounded-full text-sm font-black tracking-tighter shadow-lg shadow-blue-500/20">
            📊 VISTA GRÁFICA
          </button>
          <button className="px-6 py-2 bg-white/5 border border-white/10 rounded-full text-sm font-black text-slate-400 hover:text-white transition-all">
            📋 VISTA DE TABLA
          </button>
        </div>

        {/* Ranking List (Gráfica) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          <div className="bg-slate-900/50 backdrop-blur-xl rounded-[2.5rem] border border-white/5 p-8">
            <h2 className="text-2xl font-black mb-8 flex items-center gap-3">
              <TrendingUp className="text-green-500" />
              RANKING DE ELECCIÓN POPULAR
            </h2>

            <div className="space-y-4">
              {ranking.slice(0, 5).map((cand, idx) => (
                <RankingRow 
                  key={cand.candidato_dni} 
                  candidate={cand} 
                  index={idx} 
                  topScore={ranking[0].votos_ganados} 
                />
              ))}
            </div>
          </div>

          <div className="bg-slate-900/50 backdrop-blur-xl rounded-[2.5rem] border border-white/5 p-8 flex flex-col items-center justify-center text-center">
            <BarChart3 size={120} className="text-white/5 mb-6" />
            <h3 className="text-xl font-bold text-slate-500">GRÁFICAS DE TENDENCIAS</h3>
            <p className="text-slate-600 text-sm mt-2 max-w-xs">Las series temporales y diagramas de flujo se activarán al superar las 10,000 sesiones únicas.</p>
          </div>
        </div>

        {/* Detailed Table Section */}
        <div className="bg-slate-900/50 backdrop-blur-xl rounded-[2.5rem] border border-white/5 overflow-hidden">
          <div className="p-8 border-b border-white/5 flex justify-between items-center">
            <h2 className="text-2xl font-black flex items-center gap-3">
              <BarChart3 className="text-blue-500" />
              DATOS EN BRUTO (TABLA DETALLADA)
            </h2>
            <div className="text-[10px] font-black tracking-widest text-slate-500 uppercase">
              MOSTRANDO {ranking.length} CANDIDATOS
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-white/5">
                  <th className="px-8 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Puesto</th>
                  <th className="px-8 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Candidato / Partido</th>
                  <th className="px-8 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Votos Finales</th>
                  <th className="px-8 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Fichas Abiertas</th>
                  <th className="px-8 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Interacciones</th>
                  <th className="px-8 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Tasa de Conversión</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {ranking.map((cand, idx) => {
                  const conversion = ((cand.votos_ganados / (cand.fichas_abiertas || 1)) * 100).toFixed(1);
                  return (
                    <tr key={cand.candidato_dni} className="hover:bg-white/5 transition-colors">
                      <td className="px-8 py-5">
                        <span className="text-lg font-black italic text-slate-600">#{idx + 1}</span>
                      </td>
                      <td className="px-8 py-5">
                        <div className="font-black text-white">{cand.candidato_nombre}</div>
                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">{cand.partido}</div>
                      </td>
                      <td className="px-8 py-5 text-center">
                        <span className="px-3 py-1 bg-blue-500/10 text-blue-400 rounded-full font-black text-sm">
                          {cand.votos_ganados.toLocaleString()}
                        </span>
                      </td>
                      <td className="px-8 py-5 text-center font-bold text-slate-400">
                        {cand.fichas_abiertas.toLocaleString()}
                      </td>
                      <td className="px-8 py-5 text-center font-bold text-slate-500">
                        {cand.total_interacciones.toLocaleString()}
                      </td>
                      <td className="px-8 py-5 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <span className={`text-sm font-black ${Number(conversion) > 50 ? 'text-green-500' : 'text-yellow-500'}`}>
                            {conversion}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

function StatCard({ title, value, icon: Icon, color }: any) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-slate-900/50 backdrop-blur-md p-6 rounded-[2rem] border border-white/5 group hover:border-white/10 transition-all"
    >
      <div className="flex justify-between items-start mb-4">
        <div className={`p-3 rounded-2xl ${color} bg-opacity-20 text-white`}>
          <Icon size={24} />
        </div>
        <div className="text-slate-500">
          <ChevronRight size={20} />
        </div>
      </div>
      <div className="text-3xl font-black mb-1">{value.toLocaleString()}</div>
      <div className="text-xs font-bold text-slate-500 tracking-widest uppercase">{title}</div>
    </motion.div>
  )
}

function RankingRow({ candidate, index, topScore }: { candidate: CandidatoStat, index: number, topScore: number }) {
  const percentage = (candidate.votos_ganados / topScore) * 100

  return (
    <motion.div 
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      className="group bg-white/5 hover:bg-white/10 p-5 rounded-2xl border border-transparent hover:border-white/5 transition-all flex items-center gap-6"
    >
      <div className="w-10 text-2xl font-black text-slate-700 italic">#{index + 1}</div>
      <div className="flex-grow">
        <div className="flex justify-between items-end mb-2">
          <div>
            <h4 className="font-black text-lg leading-none">{candidate.candidato_nombre}</h4>
            <p className="text-slate-500 text-xs font-bold uppercase tracking-tighter mt-1">{candidate.partido}</p>
          </div>
          <div className="text-right">
            <div className="text-xl font-black text-blue-400">{candidate.votos_ganados.toLocaleString()}</div>
            <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Election Wins</div>
          </div>
        </div>
        <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${percentage}%` }}
            className="h-full bg-gradient-to-r from-blue-600 to-blue-400 rounded-full"
          />
        </div>
        <div className="flex gap-4 mt-3">
          <span className="text-[10px] font-bold text-slate-500 uppercase">
            <MousePointer2 size={10} className="inline mr-1" />
            {candidate.fichas_abiertas} Clicks
          </span>
          <span className="text-[10px] font-bold text-slate-500 uppercase">
            <RefreshCcw size={10} className="inline mr-1" />
            {candidate.total_interacciones} Interacciones
          </span>
        </div>
      </div>
    </motion.div>
  )
}
