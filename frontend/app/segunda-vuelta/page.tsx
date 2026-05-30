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
      <div
        className="w-10 h-10 relative select-none rounded-full overflow-hidden shadow-lg border border-orange-500/20 bg-[#0a0b0d] flex items-center justify-center shrink-0"
        style={{ width: '40px', height: '40px', minWidth: '40px', minHeight: '40px' }}
      >
        <img
          src="/logo_fuerza_popular.svg"
          alt="Fuerza Popular"
          className="w-full h-full object-contain pointer-events-none"
          width={40}
          height={40}
          style={{ width: '100%', height: '100%' }}
        />
      </div>
    )
  }
  if (id === '2') {
    return (
      <div
        className="w-10 h-10 relative select-none rounded-full overflow-hidden shadow-lg border border-red-500/20 bg-white flex items-center justify-center p-1 shrink-0"
        style={{ width: '40px', height: '40px', minWidth: '40px', minHeight: '40px' }}
      >
        <img
          src="/logo_juntos_por_el_peru.svg"
          alt="Juntos por el Perú"
          className="w-full h-full object-contain pointer-events-none"
          width={32}
          height={32}
          style={{ width: '80%', height: '80%' }}
        />
      </div>
    )
  }
  return (
    <div
      className="w-10 h-10 bg-black rounded-full flex items-center justify-center shadow-2xl relative border border-slate-700 overflow-hidden select-none shrink-0"
      style={{ width: '40px', height: '40px', minWidth: '40px', minHeight: '40px' }}
    >
      <div className="absolute inset-0 bg-gradient-to-tr from-slate-900 via-zinc-800 to-neutral-900 opacity-60"></div>
      <div
        className="w-6 h-6 rounded-full bg-[#070b13] border border-slate-800/80 shadow-[inset_0_0_10px_rgba(0,0,0,0.9)] flex items-center justify-center"
        style={{ width: '24px', height: '24px', minWidth: '24px', minHeight: '24px' }}
      >
        <span className="text-xs opacity-60">⚫</span>
      </div>
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
    <div className="min-h-screen bg-[#070b13] flex flex-col justify-between p-3 pb-6 overflow-y-auto text-[#f4f6fa] select-none font-sans">

      {/* Header Panel */}
      <header className="relative flex flex-col sm:flex-row justify-between items-center border border-[#1b2a47] bg-[#111c2e] p-4 rounded-2xl shadow-lg gap-2">
        <div className="absolute top-0 left-0 w-full sm:w-2 h-1 sm:h-full bg-[#00f2fe]"></div>
        <div className="text-center sm:text-left">
          <h1 className="text-lg md:text-xl font-normal tracking-tight text-white flex items-center justify-center sm:justify-start gap-2 leading-none">
            7 de junio - Segunda Vuelta - DECISION FINAL
          </h1>
        </div>

        {/* Live counter */}
        <div className="flex items-center gap-2 bg-[#070b13] border border-[#1b2a47] px-4 py-1.5 rounded-full">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#05ffa1] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#05ffa1]"></span>
          </span>
          <span className="text-[9px] md:text-[10px] font-mono font-bold text-[#05ffa1] tracking-widest uppercase">
            {concurrencia.toLocaleString()} en linea
          </span>
        </div>
      </header>

      {/* Main Grid: Balotaje Cards (optimizado compacto) */}
      <main className="max-w-4xl mx-auto w-full grid grid-cols-2 md:grid-cols-3 gap-3 my-2 flex-grow items-stretch">
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
              className={`flex flex-col justify-between bg-[#111c2e] border rounded-2xl p-3 shadow-2xl transition-all duration-300 relative group overflow-hidden gap-2 ${yaVoto || cand.suboptions ? 'cursor-default' : 'cursor-pointer active:scale-[0.98]'
                } ${esSeleccionado
                  ? ''
                  : (yaVoto ? 'border-[#1b2a47] opacity-40' : 'border-[#1b2a47] hover:border-[#00f2fe]/40')
                } ${cand.id === '3' ? 'col-span-2 md:col-span-1' : 'col-span-1'
                } h-auto min-h-[130px] ${cand.id === '3' && yaVoto ? 'max-h-none' : 'max-h-[160px]'}`}
              style={
                esSeleccionado
                  ? {
                    borderColor: cand.id === '3'
                      ? (selectedCandidate === '4' ? '#eab308' : selectedCandidate === '5' ? '#8b5cf6' : '#6b7280')
                      : cand.color,
                    boxShadow: `0 0 15px ${cand.id === '3'
                      ? (selectedCandidate === '4' ? 'rgba(234,179,8,0.2)' : selectedCandidate === '5' ? 'rgba(139,92,246,0.2)' : 'rgba(107,114,128,0.2)')
                      : cand.id === '1' ? 'rgba(249,115,22,0.2)' : 'rgba(239,68,68,0.2)'
                      }`
                  }
                  : {}
              }
            >
              {/* Glowing Top Horizontal Line */}
              <div
                className={`absolute top-0 left-0 right-0 h-[2px] transition-all duration-300 z-10 ${esSeleccionado
                  ? 'opacity-100'
                  : 'bg-gradient-to-r from-transparent via-[#00f2fe]/40 to-transparent opacity-100 group-hover:via-[#00f2fe]/80'
                  }`}
                style={{
                  background: esSeleccionado
                    ? `linear-gradient(to right, transparent, ${cand.id === '3'
                      ? (selectedCandidate === '4' ? '#eab308' : selectedCandidate === '5' ? '#8b5cf6' : '#6b7280')
                      : cand.color
                    }, transparent)`
                    : undefined
                }}
              />

              {/* Flex row en móvil para poner el texto a la derecha del logo */}
              <div className="flex flex-row md:flex-col items-center md:text-center gap-3 w-full">
                {/* Logo & Giant Checkmark Overlay */}
                <div className="relative shrink-0 flex items-center justify-center" style={{ width: '40px', height: '40px' }}>
                  <div
                    className={`flex justify-center items-center ${esSeleccionado && !cand.suboptions ? 'animate-logo-fade' : ''
                      }`}
                    style={{ width: '40px', height: '40px' }}
                  >
                    {renderPartyLogo(cand.id)}
                  </div>

                  {esSeleccionado && !cand.suboptions && (
                    <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none animate-check-fade">
                      <CheckCircle2
                        className="w-10 h-10 bg-[#111c2e] text-[#20df92] rounded-full shadow-[0_0_10px_rgba(32,223,146,0.2)]"
                        strokeWidth={1.5}
                      />
                    </div>
                  )}
                </div>

                {/* Candidate name & Party */}
                <div className="flex flex-col items-center flex-grow min-w-0 w-full text-center">
                  {cand.id !== '3' ? (
                    <>
                      <h3 className="font-medium text-xs md:text-sm text-white tracking-tight leading-tight text-center line-clamp-2 w-full">
                        {cand.name}
                      </h3>
                      <p className="text-[9px] md:text-xs text-[#00f2fe] font-mono mt-0.5 uppercase tracking-wider font-semibold text-center w-full">
                        {cand.party}
                      </p>
                    </>
                  ) : (
                    yaVoto ? (
                      <>
                        <h3 className="font-medium text-xs md:text-sm text-white tracking-tight leading-tight text-center line-clamp-2 w-full">
                          Ninguno de los dos
                        </h3>
                        <p className="text-[9px] md:text-xs text-gray-400 font-mono mt-0.5 uppercase tracking-wider text-center w-full">
                          Voto Blanco / Viciado
                        </p>
                      </>
                    ) : (
                      <h3 className="font-medium text-xs md:text-sm text-white tracking-tight leading-tight text-center line-clamp-2 w-full mb-1">
                        Ninguno de los dos
                      </h3>
                    )
                  )}

                  {/* Suboptions buttons */}
                  {!yaVoto && cand.suboptions && (
                    <div className="grid grid-cols-3 gap-2 mt-1 mb-3 w-full z-20">
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
                            className={`
                              h-10 flex flex-col items-center justify-center
                              rounded-lg border border-white/20 bg-white/5
                              transition-all hover:bg-white/10 active:scale-95 text-center p-1 w-full overflow-hidden
                              ${esSubSeleccionado
                                ? 'border-mint bg-mint/10'
                                : ''
                              }
                            `}
                          >
                            <span
                              className={`font-mono text-[9px] md:text-xs uppercase tracking-wider font-semibold text-center px-1 break-words hyphens-auto w-full leading-tight ${esSubSeleccionado ? 'text-mint' : 'text-[#00f2fe]'
                                }`}
                            >
                              {sub.name.toUpperCase()}
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Progress and Live Results */}
              <div className="border-t border-[#1b2a47] w-full pt-2">
                {yaVoto ? (
                  cand.suboptions ? (
                    <div className="flex flex-col gap-1 w-full mt-1 text-left">
                      {cand.suboptions.map((sub) => {
                        const subPorcentaje = obtenerPorcentajeVoto(sub.id)
                        const subVotos = obtenerVotosCount(sub.id)
                        const esSubSeleccionado = selectedCandidate === sub.id
                        return (
                          <div key={sub.id} className="flex flex-col gap-0.5 w-full">
                            <div className="flex justify-between items-end">
                              <span className="text-[7.5px] text-[#788da5] font-mono uppercase tracking-tight">{sub.name}:</span>
                              <span
                                className="text-[9.5px] font-mono leading-none"
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
                    <div className="flex flex-col gap-1 w-full text-left md:text-center">
                      <div className="flex justify-between items-end md:flex-col md:items-center">
                        <span className="text-[9px] text-[#788da5] font-mono uppercase tracking-widest">Intención:</span>
                        <span
                          className="text-xs font-mono leading-none"
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
                          className={`h-full rounded-full ${cand.id === '1' ? 'bg-orange-500' : 'bg-red-500'
                            }`}
                        />
                      </div>
                      <span className="text-[7.5px] text-[#788da5] font-mono text-right md:text-center leading-none">
                        {votosCount.toLocaleString()} votos
                      </span>
                    </div>
                  )
                ) : (
                  cand.suboptions ? (
                    <div className="flex items-center justify-center py-1 text-[8px] font-mono font-medium text-[#788da5] tracking-widest uppercase">
                      ELIGE UNA OPCIÓN ARRIBA
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-2 py-1 text-[9px] font-mono font-medium text-[#00f2fe] tracking-widest uppercase animate-pulse">
                      SELECCIONAR
                    </div>
                  )
                )}
              </div>
            </div>
          )
        })}
      </main>

      {/* Botón de Confirmación Compacto Inline */}
      <div className="w-full max-w-4xl mx-auto mt-4 px-1">
        <AnimatePresence>
          {!yaVoto ? (
            <motion.button
              whileHover={selectedCandidate && !votoRegistrando ? { scale: 1.02 } : {}}
              whileTap={selectedCandidate && !votoRegistrando ? { scale: 0.98 } : {}}
              onClick={confirmarVoto}
              disabled={!selectedCandidate || votoRegistrando}
              className={`w-full py-3 rounded-xl font-semibold text-base transition-all flex flex-row items-center justify-center gap-2 border ${selectedCandidate && !votoRegistrando
                ? 'cursor-pointer active:scale-95'
                : 'cursor-not-allowed'
                }`}
              style={
                selectedCandidate
                  ? {
                    backgroundColor: '#20df92',
                    borderColor: 'transparent',
                    boxShadow: '0 0 15px rgba(32, 223, 146, 0.3)',
                    color: '#000000',
                    opacity: votoRegistrando ? 0.7 : 1
                  }
                  : {
                    backgroundColor: '#111c2e',
                    borderColor: '#1b2a47',
                    color: '#ffffff',
                    opacity: 0.5
                  }
              }
            >
              <Flame
                className="w-5 h-5"
                style={{ color: selectedCandidate ? '#000000' : '#ffffff' }}
              />
              <span className="tracking-wider uppercase">
                {votoRegistrando ? 'REGISTRANDO VOTO...' : (selectedCandidate ? '✅ CONFIRMA TU VOTO' : '🔒 SELECCIONA UNA OPCIÓN')}
              </span>
            </motion.button>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-[#111c2e] border border-[#1b2a47]/50 py-3 rounded-xl text-xs font-semibold text-[#05ffa1] font-mono flex items-center justify-center gap-2 shadow-inner w-full text-center"
            >
              <CheckCircle className="w-4 h-4 shrink-0" /> VOTO REGISTRADO (DISPOSITIVO CON RESTRICCIÓN DE UN SOLO VOTO)
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer Info Panel */}
      <footer className="flex flex-col md:flex-row justify-between items-center border border-[#1b2a47] bg-[#111c2e]/60 px-4 py-3 rounded-2xl gap-2 font-mono text-[9px] text-[#788da5] mb-6">
        <div className="flex items-center gap-1">
          <span className="text-[#05ffa1] font-bold">VOTO LIBRE - FISCALIZACION CIUDADNA AUTOMATIZADA</span>
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
