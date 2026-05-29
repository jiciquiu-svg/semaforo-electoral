'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, Flame, AlertTriangle, Shield, CheckCircle, ChevronRight, Info } from 'lucide-react'
import { getSessionId, hasVoted, registrarVoto } from '@/lib/session'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001'

interface Candidate {
  id: string
  name: string
  party: string
}

const candidatosData: Candidate[] = [
  {
    id: '1',
    name: 'Keiko Fujimori Higuchi',
    party: 'Fuerza Popular',
  },
  {
    id: '2',
    name: 'Roberto Sánchez Palomino',
    party: 'Juntos por el Perú',
  },
  {
    id: '3',
    name: 'NINGUNO DE LOS DOS',
    party: 'NINGUNO DE LOS DOS',
  }
]

function renderPartyLogo(id: string) {
  if (id === '1') {
    return (
      <div className="w-20 h-20 relative select-none rounded-full overflow-hidden shadow-lg border border-orange-500/20 bg-[#0a0b0d] flex items-center justify-center">
        <img 
          src="/logo_fuerza_popular.svg" 
          alt="Fuerza Popular" 
          className="w-full h-full object-contain pointer-events-none" 
        />
      </div>
    )
  }
  if (id === '2') {
    return (
      <div className="w-20 h-20 relative select-none rounded-full overflow-hidden shadow-lg border border-emerald-500/20 bg-white flex items-center justify-center p-1">
        <img 
          src="/logo_juntos_por_el_peru.svg" 
          alt="Juntos por el Perú" 
          className="w-full h-full object-contain pointer-events-none" 
        />
      </div>
    )
  }
  return (
    <div className="w-20 h-20 bg-black rounded-full flex items-center justify-center shadow-2xl relative border border-slate-700 overflow-hidden select-none">
      <div className="absolute inset-0 bg-gradient-to-tr from-slate-900 via-zinc-800 to-neutral-900 opacity-60"></div>
      <div className="w-14 h-14 rounded-full bg-[#070b13] border border-slate-800/80 shadow-[inset_0_0_15px_rgba(0,0,0,0.9)] flex items-center justify-center">
        <span className="text-2xl opacity-60">⚫</span>
      </div>
      <div className="absolute inset-1 border border-dashed border-slate-600/30 rounded-full animate-[spin_20s_linear_infinite]"></div>
    </div>
  )
}

export default function SegundaVueltaPage() {
  const [selectedCandidate, setSelectedCandidate] = useState<string | null>(null)
  const [yaVoto, setYaVoto] = useState(false)
  const [sessionId, setSessionId] = useState('')
  const [votoRegistrando, setVotoRegistrando] = useState(false)
  const [concurrencia, setConcurrencia] = useState(33037)
  const [estadisticas, setEstadisticas] = useState<any>(null)
  const [isDevMode, setIsDevMode] = useState(false)

  // Detectar automáticamente si es un entorno local de desarrollo
  const checkDevMode = () => {
    if (typeof window === 'undefined') return false
    const host = window.location.hostname
    const isLocal = (
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host.startsWith('192.168.') ||
      host.startsWith('10.') ||
      host.endsWith('.local')
    )
    return process.env.NODE_ENV === 'development' || isLocal
  }

  // Cargar sesión, verificar si el dispositivo ya votó e iniciar polling
  useEffect(() => {
    const dev = checkDevMode()
    setIsDevMode(dev)

    const id = getSessionId()
    if (id) {
      setSessionId(id)
      hasVoted(id).then(votado => {
        // El bloqueo por voto previo solo se aplica si NO estamos en modo desarrollo local
        if (votado && !dev) {
          setYaVoto(true)
          const localVote = localStorage.getItem('voted_candidate_id')
          if (localVote) setSelectedCandidate(localVote)
        }
      })
    }

    const fetchStats = () => {
      fetch(`${API_URL}/api/segunda-vuelta/estadisticas`)
        .then(res => res.json())
        .then(data => setEstadisticas(data))
        .catch(err => console.error("Error fetching stats:", err))
    }

    fetchStats()
    const interval = setInterval(fetchStats, 3000)

    const concInterval = setInterval(() => {
      setConcurrencia(prev => prev + (Math.floor(Math.random() * 40) - 18))
    }, 4000)

    return () => {
      clearInterval(interval)
      clearInterval(concInterval)
    }
  }, [])

  // Confirmar y registrar el voto
  const confirmarVoto = async () => {
    if (votoRegistrando || !selectedCandidate) return
    // Si ya votó y no es dev mode, bloquear
    if (yaVoto && !isDevMode) return

    setVotoRegistrando(true)
    try {
      const candidatoObj = candidatosData.find(c => c.id === selectedCandidate)
      if (!candidatoObj) return

      // Anti-bot check: verificar que no haya votado antes en producción
      if (!isDevMode) {
        const yaRegistrado = await hasVoted(sessionId)
        if (yaRegistrado) {
          setYaVoto(true)
          alert('⚠️ Este dispositivo ya registró un voto previamente.')
          setVotoRegistrando(false)
          return
        }
      }

      const registrado = await registrarVoto(sessionId, candidatoObj.id, candidatoObj.name, {})
      if (registrado) {
        if (!isDevMode) {
          setYaVoto(true)
          localStorage.setItem('voted_candidate_id', candidatoObj.id)
        } else {
          // Retroalimentación visual temporal en desarrollo
          alert(`✅ Voto registrado (Modo desarrollo bypass activo): ${candidatoObj.name}`)
          setSelectedCandidate(null)
        }
        
        // Polling inmediato para refrescar estadísticas
        const res = await fetch(`${API_URL}/api/segunda-vuelta/estadisticas`)
        const data = await res.json()
        setEstadisticas(data)
      } else {
        alert('Error al registrar voto. Por favor reintente.')
      }
    } catch (err) {
      console.error(err)
    } finally {
      setVotoRegistrando(false)
    }
  }

  // Obtener estadísticas de votación en vivo
  const obtenerPorcentajeVoto = (candId: string) => {
    if (!estadisticas || !estadisticas.votos_por_candidato) return '0%'
    const match = estadisticas.votos_por_candidato.find((c: any) => c.candidato_id === candId)
    return match ? `${match.porcentaje}%` : '0%'
  }

  const obtenerVotosCount = (candId: string) => {
    if (!estadisticas || !estadisticas.votos_por_candidato) return 0
    const match = estadisticas.votos_por_candidato.find((c: any) => c.candidato_id === candId)
    return match ? match.votos : 0
  }

  return (
    <div className="min-h-screen bg-[#070b13] flex flex-col justify-between p-4 md:p-6 overflow-hidden text-[#f4f6fa] select-none font-sans">
      
      {/* Header Panel */}
      <header className="relative flex flex-col sm:flex-row justify-between items-center border border-[#1b2a47] bg-[#111c2e] p-4 rounded-2xl shadow-lg gap-2">
        <div className="absolute top-0 left-0 w-full sm:w-2 h-1 sm:h-full bg-[#00f2fe]"></div>
        <div className="text-center sm:text-left">
          <h1 className="text-xl md:text-2xl font-black tracking-tight text-white flex items-center justify-center sm:justify-start gap-2 leading-none italic">
            SEGUNDA VUELTA 2026
          </h1>
          <p className="text-[9px] md:text-[10px] text-[#788da5] font-mono mt-1 uppercase tracking-wider">
            7 DE JUNIO - DECISIÓN FINAL // FISCALIZACIÓN CIUDADANA AUTOMATIZADA
          </p>
        </div>
        
        {/* Live counter */}
        <div className="flex items-center gap-2 bg-[#070b13] border border-[#1b2a47] px-4 py-1.5 rounded-full">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#05ffa1] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#05ffa1]"></span>
          </span>
          <span className="text-[9px] md:text-[10px] font-mono font-bold text-[#05ffa1] tracking-widest uppercase">
            {concurrencia.toLocaleString()} PERSONAS SIMULANDO AHORA
          </span>
        </div>
      </header>

      {/* Main Grid: Balotaje Cards */}
      <main className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 my-4 flex-grow items-center">
        {candidatosData.map((cand) => {
          const esSeleccionado = selectedCandidate === cand.id
          const porcentajeEnVivo = obtenerPorcentajeVoto(cand.id)
          const votosCount = obtenerVotosCount(cand.id)

          return (
            <div 
              key={cand.id}
              onClick={() => {
                if (!yaVoto) setSelectedCandidate(cand.id)
              }}
              className={`flex flex-col items-center justify-between h-[340px] bg-[#111c2e] border rounded-2xl p-6 shadow-2xl transition-all duration-300 relative group text-center overflow-hidden ${
                yaVoto ? 'cursor-default' : 'cursor-pointer active:scale-[0.98]'
              } ${
                esSeleccionado 
                  ? 'border-[#05ffa1] shadow-[0_0_25px_rgba(5,255,161,0.25)]' 
                  : (yaVoto ? 'border-[#1b2a47] opacity-40' : 'border-[#1b2a47] hover:border-[#00f2fe]/40')
              }`}
            >
              {/* Glowing Top Horizontal Line (center-illuminated gradient, fading to transparent at the sides) */}
              <div className={`absolute top-0 left-0 right-0 h-[2.5px] transition-all duration-300 z-10 ${
                esSeleccionado 
                  ? 'bg-gradient-to-r from-transparent via-[#05ffa1] to-transparent opacity-100' 
                  : 'bg-gradient-to-r from-transparent via-[#00f2fe]/40 to-transparent opacity-100 group-hover:via-[#00f2fe]/80'
              }`} />

              {/* Logo & Giant Checkmark Overlay */}
              <div className="relative flex items-center justify-center mb-6">
                <div className={`transition-opacity duration-200 ${esSeleccionado ? 'opacity-20' : 'opacity-100'}`}>
                  {renderPartyLogo(cand.id)}
                </div>
                
                {esSeleccionado && (
                  <div className="absolute inset-0 flex items-center justify-center z-10">
                    <CheckCircle2 className="w-20 h-20 text-[#05ffa1] drop-shadow-[0_0_15px_rgba(5,255,161,0.6)] bg-[#111c2e] rounded-full animate-pulse" />
                  </div>
                )}
              </div>

              {/* Candidate name & Party (symmetrical card content) */}
              <div className="flex flex-col items-center flex-grow justify-center">
                <h3 className="font-black text-lg md:text-xl text-white tracking-tight leading-snug">
                  {cand.name}
                </h3>
                <p className="text-xs text-[#788da5] font-mono mt-2 uppercase tracking-widest font-semibold">
                  {cand.party}
                </p>
              </div>

              {/* Progress and Live Results */}
              <div className="border-t border-[#1b2a47] w-full pt-4 mt-auto">
                {yaVoto ? (
                  <div className="flex flex-col gap-2 w-full">
                    <div className="flex justify-between items-end">
                      <span className="text-[9px] text-[#788da5] font-mono uppercase tracking-widest">Intención de Voto:</span>
                      <span className={`text-xl font-black font-mono leading-none ${esSeleccionado ? 'text-[#05ffa1]' : 'text-white'}`}>
                        {porcentajeEnVivo}
                      </span>
                    </div>
                    <div className="w-full bg-[#070b13] rounded-full h-2 overflow-hidden border border-[#1b2a47]/50">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: porcentajeEnVivo }}
                        transition={{ duration: 1.5, ease: "easeOut" }}
                        className={`h-full rounded-full ${
                          cand.id === '1' ? 'bg-orange-500' : (cand.id === '2' ? 'bg-emerald-500' : 'bg-slate-500')
                        }`}
                      />
                    </div>
                    <span className="text-[8px] text-[#788da5] font-mono text-right leading-none">
                      {votosCount.toLocaleString()} votos
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2 py-1.5 text-[9px] font-mono font-bold text-[#00f2fe] tracking-widest uppercase animate-pulse">
                    SELECCIONAR
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </main>

      {/* Confirmation Button with original Comparar Finalistas styles */}
      <div className="flex flex-col items-center gap-2 my-2 w-full">
        <AnimatePresence>
          {!yaVoto ? (
            <motion.button
              whileHover={selectedCandidate ? { scale: 1.05 } : {}}
              whileTap={selectedCandidate ? { scale: 0.95 } : {}}
              onClick={confirmarVoto}
              disabled={!selectedCandidate || votoRegistrando}
              className={`font-bold px-6 md:px-12 py-4 md:py-5 rounded-2xl flex flex-row items-center justify-center gap-2 md:gap-4 group transition-all border w-[90%] md:w-auto ${
                selectedCandidate && !votoRegistrando
                  ? 'bg-olympus-mint text-zinc-950 shadow-[0_0_20px_rgba(5,255,161,0.4)] border-[#05ffa1]/50 cursor-pointer active:scale-95'
                  : 'bg-[#111c2e]/60 border-[#1b2a47] text-[#788da5] cursor-not-allowed opacity-50'
              }`}
            >
              <Flame className={`group-hover:animate-pulse w-5 h-5 md:w-6 md:h-6 ${selectedCandidate ? 'text-zinc-900' : 'text-[#788da5]'}`} />
              <span className="text-sm md:text-xl text-center leading-tight uppercase tracking-wider font-extrabold">
                {votoRegistrando ? 'REGISTRANDO VOTO...' : 'CONFIRMA TU VOTO'}
              </span>
              <ChevronRight className="hidden md:block" />
            </motion.button>
          ) : (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-[#111c2e] border border-[#1b2a47]/50 px-6 py-3.5 rounded-full text-xs font-bold text-[#05ffa1] font-mono flex items-center gap-2 shadow-inner"
            >
              <CheckCircle className="w-4 h-4" /> VOTO REGISTRADO (DISPOSITIVO CON RESTRICCIÓN DE UN SOLO VOTO)
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer Info Panel */}
      <footer className="flex flex-col md:flex-row justify-between items-center border border-[#1b2a47] bg-[#111c2e]/60 px-4 py-3 rounded-2xl gap-2 font-mono text-[9px] text-[#788da5]">
        <div className="flex items-center gap-1">
          <span>TIPO DE AMBIENTE: {isDevMode ? <span className="text-[#05ffa1] font-bold">DESARROLLO (VOTO LIBRE BYPASS)</span> : <span className="text-rose-500 font-bold">PRODUCCIÓN (RESTRICCIÓN LOCK ACTIVA)</span>}</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 bg-[#05ffa1] rounded-full animate-ping"></span>
            DISPOSITIVO LOCK: {isDevMode ? 'DESACTIVADO (BYPASS)' : 'ACTIVO'}
          </span>
          <span>
            VOTO ÚNICO PWA v2.2
          </span>
        </div>
      </footer>
    </div>
  )
}
