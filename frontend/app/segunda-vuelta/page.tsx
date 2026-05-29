'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, Flame, AlertTriangle, Shield, CheckCircle, ChevronRight, Info } from 'lucide-react'
import { getSessionId, hasVoted, registrarVoto } from '@/lib/session'
import { ChatBox } from './ChatBox'
import { LegalFooter } from '@/components/LegalFooter'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001'

interface SubOption {
  id: string
  name: string
  color: string
}

interface Candidate {
  id: string
  name: string
  party: string
  color: string
  suboptions?: SubOption[]
}

const candidatosData: Candidate[] = [
  {
    id: '1',
    name: 'Keiko Fujimori Higuchi',
    party: 'Fuerza Popular',
    color: '#f97316'
  },
  {
    id: '2',
    name: 'Roberto Sánchez Palomino',
    party: 'Juntos por el Perú',
    color: '#ef4444'
  },
  {
    id: '3',
    name: 'NINGUNO DE LOS DOS',
    party: 'NINGUNO DE LOS DOS',
    color: '#6b7280',
    suboptions: [
      { id: '3', name: 'Ninguno', color: '#6b7280' },
      { id: '4', name: 'Aún no sabe', color: '#eab308' },
      { id: '5', name: 'No votará', color: '#8b5cf6' }
    ]
  }
]

function renderPartyLogo(id: string) {
  if (id === '1') {
    return (
      <div className="w-12 h-12 relative select-none rounded-full overflow-hidden shadow-lg border border-orange-500/20 bg-[#0a0b0d] flex items-center justify-center">
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
      <div className="w-12 h-12 relative select-none rounded-full overflow-hidden shadow-lg border border-red-500/20 bg-white flex items-center justify-center p-1">
        <img 
          src="/logo_juntos_por_el_peru.svg" 
          alt="Juntos por el Perú" 
          className="w-full h-full object-contain pointer-events-none" 
        />
      </div>
    )
  }
  return (
    <div className="w-12 h-12 bg-black rounded-full flex items-center justify-center shadow-2xl relative border border-slate-700 overflow-hidden select-none">
      <div className="absolute inset-0 bg-gradient-to-tr from-slate-900 via-zinc-800 to-neutral-900 opacity-60"></div>
      <div className="w-8 h-8 rounded-full bg-[#070b13] border border-slate-800/80 shadow-[inset_0_0_10px_rgba(0,0,0,0.9)] flex items-center justify-center">
        <span className="text-sm opacity-60">⚫</span>
      </div>
      <div className="absolute inset-0.5 border border-dashed border-slate-600/30 rounded-full animate-[spin_20s_linear_infinite]"></div>
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
      let candidateName = ''
      let candidateId = ''
      
      const rootMatch = candidatosData.find(c => c.id === selectedCandidate)
      if (rootMatch) {
        if (rootMatch.suboptions) {
          const subMatch = rootMatch.suboptions.find(s => s.id === selectedCandidate)
          candidateName = subMatch ? subMatch.name : rootMatch.name
          candidateId = selectedCandidate
        } else {
          candidateName = rootMatch.name
          candidateId = rootMatch.id
        }
      } else {
        // Encontrar en suboptions del candidato '3'
        const rootThree = candidatosData.find(c => c.id === '3')
        const subMatch = rootThree?.suboptions?.find(s => s.id === selectedCandidate)
        if (subMatch) {
          candidateName = subMatch.name
          candidateId = subMatch.id
        }
      }

      if (!candidateId || !candidateName) {
        setVotoRegistrando(false)
        return
      }

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

      const registrado = await registrarVoto(sessionId, candidateId, candidateName, {})
      if (registrado) {
        if (!isDevMode) {
          setYaVoto(true)
          localStorage.setItem('voted_candidate_id', candidateId)
        } else {
          // Retroalimentación visual temporal en desarrollo
          alert(`✅ Voto registrado (Modo desarrollo bypass activo): ${candidateName}`)
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
    <div className="min-h-screen bg-[#070b13] flex flex-col justify-between p-4 md:p-6 overflow-y-auto text-[#f4f6fa] select-none font-sans">
      
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

      {/* Main Grid: Balotaje Cards (max-w-4xl mx-auto for 40% more compact visual presentation) */}
      <main className="max-w-4xl mx-auto w-full grid grid-cols-1 md:grid-cols-3 gap-4 my-4 flex-grow items-center">
        {candidatosData.map((cand) => {
          const esSeleccionado = cand.suboptions 
            ? ['3', '4', '5'].includes(selectedCandidate || '')
            : selectedCandidate === cand.id
          
          const porcentajeEnVivo = obtenerPorcentajeVoto(cand.id)
          const votosCount = obtenerVotosCount(cand.id)

          return (
            <div 
              key={cand.id}
              onClick={() => {
                // If it doesn't have suboptions, clicking the card selects the candidate
                if (!yaVoto && !cand.suboptions) setSelectedCandidate(cand.id)
              }}
              className={`flex flex-col items-center justify-between h-[270px] bg-[#111c2e] border rounded-2xl p-4 shadow-2xl transition-all duration-300 relative group text-center overflow-hidden ${
                yaVoto || cand.suboptions ? 'cursor-default' : 'cursor-pointer active:scale-[0.98]'
              } ${
                esSeleccionado 
                  ? '' 
                  : (yaVoto ? 'border-[#1b2a47] opacity-40' : 'border-[#1b2a47] hover:border-[#00f2fe]/40')
              }`}
              style={
                esSeleccionado 
                  ? { 
                      borderColor: cand.id === '3' 
                        ? (selectedCandidate === '4' ? '#eab308' : selectedCandidate === '5' ? '#8b5cf6' : '#6b7280') 
                        : cand.color,
                      boxShadow: `0 0 20px ${
                        cand.id === '3' 
                          ? (selectedCandidate === '4' ? 'rgba(234,179,8,0.25)' : selectedCandidate === '5' ? 'rgba(139,92,246,0.25)' : 'rgba(107,114,128,0.25)') 
                          : cand.id === '1' ? 'rgba(249,115,22,0.25)' : 'rgba(239,68,68,0.25)'
                      }`
                    }
                  : {}
              }
            >
              {/* Glowing Top Horizontal Line (center-illuminated gradient, fading to transparent at the sides) */}
              <div 
                className={`absolute top-0 left-0 right-0 h-[2px] transition-all duration-300 z-10 ${
                  esSeleccionado 
                    ? 'opacity-100' 
                    : 'bg-gradient-to-r from-transparent via-[#00f2fe]/40 to-transparent opacity-100 group-hover:via-[#00f2fe]/80'
                }`} 
                style={{
                  background: esSeleccionado 
                    ? `linear-gradient(to right, transparent, ${
                        cand.id === '3' 
                          ? (selectedCandidate === '4' ? '#eab308' : selectedCandidate === '5' ? '#8b5cf6' : '#6b7280') 
                          : cand.color
                      }, transparent)`
                    : undefined
                }}
              />

              {/* Logo & Giant Checkmark Overlay with dynamic complementary opacities */}
              <div className="relative flex items-center justify-center mb-3">
                <motion.div 
                  animate={esSeleccionado && !cand.suboptions ? { opacity: [1, 0, 1] } : { opacity: 1 }}
                  transition={esSeleccionado && !cand.suboptions ? { repeat: Infinity, duration: 3, ease: "easeInOut" } : undefined}
                  className="w-full flex justify-center items-center"
                >
                  {renderPartyLogo(cand.id)}
                </motion.div>
                
                {esSeleccionado && !cand.suboptions && (
                  <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
                    <motion.div
                      animate={{ opacity: [0, 1, 0] }}
                      transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
                    >
                      <CheckCircle2 
                        className="w-12 h-12 bg-[#111c2e] text-[#20df92] rounded-full shadow-[0_0_15px_rgba(32,223,146,0.25)]" 
                        strokeWidth={1.2}
                      />
                    </motion.div>
                  </div>
                )}
              </div>

              {/* Candidate name & Party (symmetrical card content) */}
              <div className="flex flex-col items-center flex-grow justify-center w-full">
                <h3 className="font-black text-sm md:text-base text-white tracking-tight leading-snug text-center line-clamp-2 min-h-[40px] flex items-center justify-center">
                  {cand.name}
                </h3>
                <p className="text-xs md:text-sm text-[#00f2fe] font-mono mt-1 uppercase tracking-widest font-extrabold">
                  {cand.party}
                </p>

                {/* Suboptions buttons (rendered only if not voted and suboptions exist) */}
                {!yaVoto && cand.suboptions && (
                  <div className="flex flex-col gap-1.5 w-full mt-2 z-20">
                    {cand.suboptions.map((sub) => {
                      const esSubSeleccionado = selectedCandidate === sub.id
                      return (
                        <button
                          key={sub.id}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation() // Prevent card click
                            setSelectedCandidate(sub.id)
                          }}
                          className={`w-full py-1 px-3 rounded-full text-[9px] md:text-xs font-bold transition-all border ${
                            esSubSeleccionado
                              ? ''
                              : 'bg-[#070b13]/55 border-[#1b2a47] text-[#788da5] hover:border-[#00f2fe]/60 hover:text-white'
                          }`}
                          style={
                            esSubSeleccionado
                              ? {
                                  backgroundColor: sub.color,
                                  color: '#070b13',
                                  borderColor: sub.color,
                                  boxShadow: `0 0 10px ${sub.color}66`
                                }
                              : undefined
                          }
                        >
                          {sub.name}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Progress and Live Results */}
              <div className="border-t border-[#1b2a47] w-full pt-2 mt-auto">
                {yaVoto ? (
                  cand.suboptions ? (
                    <div className="flex flex-col gap-1.5 w-full mt-1 text-left">
                      {cand.suboptions.map((sub) => {
                        const subPorcentaje = obtenerPorcentajeVoto(sub.id)
                        const subVotos = obtenerVotosCount(sub.id)
                        const esSubSeleccionado = selectedCandidate === sub.id
                        return (
                          <div key={sub.id} className="flex flex-col gap-0.5 w-full">
                            <div className="flex justify-between items-end">
                              <span className="text-[7.5px] text-[#788da5] font-mono uppercase tracking-tight">{sub.name}:</span>
                              <span 
                                className="text-[9.5px] font-black font-mono leading-none"
                                style={{ color: esSubSeleccionado ? sub.color : '#ffffff' }}
                              >
                                {subPorcentaje} ({subVotos})
                              </span>
                            </div>
                            <div className="w-full bg-[#070b13] rounded-full h-1 overflow-hidden border border-[#1b2a47]/40">
                              <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: subPorcentaje }}
                                transition={{ duration: 1.5, ease: "easeOut" }}
                                className="h-full rounded-full"
                                style={{ backgroundColor: sub.color }}
                              />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="flex flex-col gap-1 w-full">
                      <div className="flex justify-between items-end">
                        <span className="text-[9px] text-[#788da5] font-mono uppercase tracking-widest">Intención de Voto:</span>
                        <span 
                          className="text-sm md:text-base font-black font-mono leading-none"
                          style={{ color: esSeleccionado ? cand.color : '#ffffff' }}
                        >
                          {porcentajeEnVivo}
                        </span>
                      </div>
                      <div className="w-full bg-[#070b13] rounded-full h-1.5 overflow-hidden border border-[#1b2a47]/50">
                        <motion.div 
                           initial={{ width: 0 }}
                           animate={{ width: porcentajeEnVivo }}
                           transition={{ duration: 1.5, ease: "easeOut" }}
                           className={`h-full rounded-full ${
                             cand.id === '1' ? 'bg-orange-500' : 'bg-red-500'
                           }`}
                        />
                      </div>
                      <span className="text-[7.5px] text-[#788da5] font-mono text-right leading-none">
                        {votosCount.toLocaleString()} votos
                      </span>
                    </div>
                  )
                ) : (
                  cand.suboptions ? (
                    <div className="flex items-center justify-center py-1 text-[8px] font-mono font-bold text-[#788da5] tracking-widest uppercase">
                      ELIGE UNA OPCIÓN ARRIBA
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-2 py-1 text-[9px] font-mono font-bold text-[#00f2fe] tracking-widest uppercase animate-pulse">
                      SELECCIONAR
                    </div>
                  )
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
              whileHover={selectedCandidate && !votoRegistrando ? { scale: 1.05 } : {}}
              whileTap={selectedCandidate && !votoRegistrando ? { scale: 0.95 } : {}}
              onClick={confirmarVoto}
              disabled={!selectedCandidate || votoRegistrando}
              className={`font-bold px-6 md:px-12 py-4 md:py-5 rounded-2xl flex flex-row items-center justify-center gap-2 md:gap-4 group transition-all border w-[90%] md:w-auto ${
                selectedCandidate && !votoRegistrando
                  ? 'cursor-pointer active:scale-95'
                  : 'cursor-not-allowed'
              }`}
              style={
                selectedCandidate
                  ? {
                      backgroundColor: '#20df92',
                      borderColor: 'transparent',
                      boxShadow: '0 0 20px rgba(32, 223, 146, 0.4)',
                      color: '#000000',
                      opacity: votoRegistrando ? 0.7 : 1
                    }
                  : {
                      backgroundColor: '#111c2e',
                      borderColor: '#1b2a47',
                      color: '#ffffff',
                      opacity: 1
                    }
              }
            >
              <Flame 
                className="group-hover:animate-pulse w-5 h-5 md:w-6 md:h-6" 
                style={{ color: selectedCandidate ? '#000000' : '#ffffff' }}
              />
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
      <footer className="flex flex-col md:flex-row justify-between items-center border border-[#1b2a47] bg-[#111c2e]/60 px-4 py-3 rounded-2xl gap-2 font-mono text-[9px] text-[#788da5] mb-6">
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

      {/* Floating Chat Box and Legal Footer */}
      <ChatBox />
      <LegalFooter />
    </div>
  )
}
