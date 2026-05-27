'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Trophy, Shield, TrendingUp, AlertTriangle, CheckCircle, XCircle,
  Scale, Briefcase, GraduationCap, Home, Coins, FileText,
  ChevronRight, Flame, Users, BarChart3, Eye, Zap
} from 'lucide-react'

// ============================================================
// DATOS DE LOS 3 CANDIDATOS (2 REALES + AGUJERO NEGRO)
// ============================================================

interface Candidato {
  id: string
  nombre: string
  partido: string
  color: string
  nivel: string
  porcentaje: number
  descripcion: string
  lema: string
  estadisticas: {
    educacion: { puntaje: number; detalle: string }
    trayectoria: { puntaje: number; detalle: string }
    contratos: { puntaje: number; detalle: string }
    propiedades: { puntaje: number; detalle: string }
    deudas: { puntaje: number; detalle: string }
    sanciones: { puntaje: number; detalle: string }
  }
}

const candidatosData: Candidato[] = [
  {
    id: '1',
    nombre: 'Keiko Fujimori Higuchi',
    partido: 'Fuerza Popular',
    color: '#ef4444',
    nivel: 'rojo',
    porcentaje: 17,
    descripcion: 'Candidata con mayor votación en primera vuelta (17%). Tres veces finalista.',
    lema: '¡Keiko presidente!',
    estadisticas: {
      educacion: { puntaje: 90, detalle: 'Maestría Columbia University, Licenciada Boston University' },
      trayectoria: { puntaje: 85, detalle: 'Congresista (2006-2011), 3 veces candidata presidencial' },
      contratos: { puntaje: 100, detalle: 'Sin contratos cuestionados' },
      propiedades: { puntaje: 80, detalle: '1 vehículo (Subaru Forester - embargado)' },
      deudas: { puntaje: 100, detalle: 'Sin deudas registradas' },
      sanciones: { puntaje: 30, detalle: 'Investigación fiscal en curso por presunta corrupción' }
    }
  },
  {
    id: '2',
    nombre: 'Roberto Sánchez Palomino',
    partido: 'Juntos por el Perú',
    color: '#3b82f6',
    nivel: 'amarillo',
    porcentaje: 12,
    descripcion: 'Segunda fuerza política (12%). Exministro de Trabajo, propuestas de izquierda moderada.',
    lema: 'Un nuevo Perú para todos',
    estadisticas: {
      educacion: { puntaje: 75, detalle: 'Psicólogo - Universidad Nacional Federico Villarreal' },
      trayectoria: { puntaje: 80, detalle: 'Exministro de Trabajo, Congresista, líder de izquierda moderada' },
      contratos: { puntaje: 85, detalle: 'Sin contratos cuestionados' },
      propiedades: { puntaje: 85, detalle: 'Propiedades declaradas dentro del rango normal' },
      deudas: { puntaje: 90, detalle: 'Sin deudas relevantes' },
      sanciones: { puntaje: 85, detalle: 'Sin sentencias firmes' }
    }
  },
  {
    id: '3',
    nombre: 'AGUJERO NEGRO',
    partido: 'NINGUNO DE LOS DOS',
    color: '#1e1e2f',
    nivel: 'vacio',
    porcentaje: 71,
    descripcion: '71% de peruanos que no votaron por ninguno de los dos candidatos. Votos en blanco, viciados, nulos o por otros partidos.',
    lema: 'No me representan',
    estadisticas: {
      educacion: { puntaje: 0, detalle: '⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛' },
      trayectoria: { puntaje: 0, detalle: '⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛' },
      contratos: { puntaje: 0, detalle: '⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛' },
      propiedades: { puntaje: 0, detalle: '⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛' },
      deudas: { puntaje: 0, detalle: '⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛' },
      sanciones: { puntaje: 0, detalle: '⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛' }
    }
  }
]

// ============================================================
// CATEGORÍAS (mismo peso)
// ============================================================

const CATEGORIAS = [
  { id: 'educacion', nombre: 'EDUCACIÓN', icono: GraduationCap, peso: 20 },
  { id: 'trayectoria', nombre: 'TRAYECTORIA', icono: Briefcase, peso: 25 },
  { id: 'contratos', nombre: 'CONTRATOS', icono: FileText, peso: 15 },
  { id: 'propiedades', nombre: 'PROPIEDADES', icono: Home, peso: 10 },
  { id: 'deudas', nombre: 'DEUDAS', icono: Coins, peso: 15 },
  { id: 'sanciones', nombre: 'SANCIONES', icono: Scale, peso: 15 }
]

// ============================================================
// COMPONENTE PRINCIPAL
// ============================================================

export default function SegundaVuelta() {
  const [candidatos] = useState<Candidato[]>(candidatosData)
  const [votos, setVotos] = useState<Record<string, string>>({})
  const [ganador, setGanador] = useState<Candidato | null>(null)
  const [mostrarDatos, setMostrarDatos] = useState(false)
  const [concurrencia, setConcurrencia] = useState(15840)

  // Simular concurrencia en tiempo real
  useEffect(() => {
    const interval = setInterval(() => {
      setConcurrencia(prev => prev + (Math.floor(Math.random() * 80) - 30))
    }, 4000)
    return () => clearInterval(interval)
  }, [])

  const votar = (categoriaId: string, ganadorId: string) => {
    setVotos(prev => ({ ...prev, [categoriaId]: ganadorId }))
  }

  const calcularGanador = () => {
    let puntos: Record<string, number> = { '1': 0, '2': 0, '3': 0 }
    
    CATEGORIAS.forEach(cat => {
      const ganadorId = votos[cat.id]
      if (ganadorId) {
        puntos[ganadorId] += cat.peso
      }
    })
    
    let maxPuntos = 0
    let ganadorId = ''
    for (const [id, pts] of Object.entries(puntos)) {
      if (pts > maxPuntos) {
        maxPuntos = pts
        ganadorId = id
      }
    }
    
    const ganadorEncontrado = candidatos.find(c => c.id === ganadorId)
    setGanador(ganadorEncontrado || null)
  }

  const reiniciar = () => {
    setVotos({})
    setGanador(null)
    setMostrarDatos(false)
  }

  // Pantalla de resultado final
  if (ganador) {
    const esAgujeroNegro = ganador.id === '3'
    return (
      <div className="min-h-screen flex items-center justify-center p-4 md:p-6 bg-olympus-bg">
        <motion.div
          initial={{ scale: 0.9, opacity: 0, rotateY: 0 }}
          animate={{ scale: 1, opacity: 1, rotateY: 360 }}
          transition={{ duration: 0.6 }}
          className="bg-olympus-surface rounded-2xl p-6 md:p-8 text-center max-w-md w-full shadow-[0_0_30px_rgba(0,242,254,0.2)] border border-olympus-cyan mx-4"
        >
          {esAgujeroNegro ? (
            <div className="text-6xl md:text-7xl mb-4">⚫</div>
          ) : (
            <div className="text-5xl md:text-6xl mb-4">🏆</div>
          )}
          <h2 className="text-xl md:text-2xl font-bold mb-2 text-olympus-text">
            {esAgujeroNegro ? 'EL PUEBLO HA HABLADO' : '¡GANADOR DE LA SEGUNDA VUELTA!'}
          </h2>
          <p className="text-lg md:text-xl font-bold mb-2 text-olympus-cyan">
            {ganador.nombre}
          </p>
          <p className="text-sm md:text-base text-olympus-muted mb-2">{ganador.partido}</p>
          <p className="text-xs md:text-sm text-olympus-muted mb-4">{ganador.descripcion}</p>
          <div className="bg-olympus-border rounded-lg p-3 mb-4">
            <span className="text-xl md:text-2xl font-bold text-olympus-cyan">{ganador.porcentaje}%</span>
            <span className="text-olympus-muted text-xs md:text-sm ml-2">de intención de voto</span>
          </div>
          <button
            onClick={reiniciar}
            className="w-full bg-olympus-mint text-zinc-950 px-4 md:px-6 py-3 rounded-xl font-bold active:scale-95 transition-all shadow-[0_0_15px_rgba(5,255,161,0.3)] text-sm md:text-base"
          >
            🔄 SIMULAR NUEVAMENTE
          </button>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-olympus-bg flex flex-col items-center p-3 md:p-8 overflow-x-hidden text-olympus-text">
      {/* Header Responsive */}
      <div className="w-full max-w-6xl flex flex-col md:flex-row justify-between items-center md:items-start mb-6 md:mb-8 px-2 gap-4">
        <div className="text-center md:text-left">
          <h1 className="text-olympus-cyan text-3xl md:text-4xl font-black tracking-tighter italic leading-none drop-shadow-[0_0_8px_rgba(0,242,254,0.5)]">
            SEGUNDA<br className="hidden md:block"/><span className="text-olympus-mint md:ml-0 ml-2">VUELTA 2026</span>
          </h1>
          <p className="text-olympus-muted text-[10px] md:text-xs mt-2 font-bold uppercase tracking-wider">7 de junio - Decisión final</p>
        </div>
        <div className="text-center md:text-right flex flex-col items-center md:items-end w-full md:w-auto bg-olympus-surface/50 md:bg-transparent p-3 md:p-0 rounded-xl">
          <div className="flex items-center gap-2 mb-2 justify-center md:justify-end">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-olympus-mint opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-olympus-mint shadow-[0_0_5px_rgba(5,255,161,1)]"></span>
            </span>
            <span className="text-olympus-mint text-[9px] md:text-[10px] font-black tracking-widest uppercase">
              {concurrencia.toLocaleString()} personas simulando ahora
            </span>
          </div>
          <div className="flex gap-2 justify-center md:justify-end">
            <div className="h-1.5 md:h-2 w-8 md:w-12 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
            <div className="h-1.5 md:h-2 w-8 md:w-12 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
            <div className="h-1.5 md:h-2 w-8 md:w-12 rounded-full bg-olympus-border" />
          </div>
        </div>
      </div>

      {/* Tarjetas de los 3 candidatos */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 w-full max-w-6xl mb-8 md:mb-10 px-2 md:px-0">
        {candidatos.map((cand) => (
          <motion.div
            key={cand.id}
            whileHover={{ y: -4, scale: 1.01 }}
            className={`relative rounded-2xl overflow-hidden cursor-pointer transition-all border border-olympus-border bg-olympus-surface shadow-lg p-5 md:p-6 text-center ${
              cand.id === '3' ? 'opacity-90 border-dashed border-olympus-muted' : ''
            }`}
            onClick={() => setMostrarDatos(true)}
          >
            {cand.id === '3' ? (
              <div className="w-20 h-20 md:w-24 md:h-24 mx-auto bg-black rounded-full flex items-center justify-center mb-4 border-2 border-olympus-border shadow-[inset_0_0_20px_rgba(0,0,0,0.8)]">
                <span className="text-4xl md:text-5xl opacity-50">⚫</span>
              </div>
            ) : (
              <div 
                className="w-20 h-20 md:w-24 md:h-24 mx-auto rounded-full flex items-center justify-center mb-4 overflow-hidden border-2 border-olympus-border shadow-[0_0_15px_rgba(0,242,254,0.1)] bg-olympus-bg"
              >
                <span className="text-2xl md:text-3xl text-olympus-text font-black" style={{ color: cand.color }}>{cand.nombre.charAt(0)}</span>
              </div>
            )}
            <h3 className="text-olympus-text font-bold text-base md:text-lg">{cand.nombre}</h3>
            <p className="text-olympus-muted text-xs md:text-sm mb-2">{cand.partido}</p>
            <div className="inline-block bg-olympus-bg border border-olympus-border rounded-full px-3 py-1 mb-3 shadow-inner">
              <span className="text-olympus-cyan font-bold text-base md:text-lg drop-shadow-[0_0_5px_rgba(0,242,254,0.5)]">{cand.porcentaje}%</span>
              <span className="text-olympus-muted text-[10px] md:text-xs ml-1">primera vuelta</span>
            </div>
            <p className="text-olympus-muted text-[10px] md:text-xs">{cand.descripcion}</p>
            
            {/* Adorno brillante en top */}
            {cand.id !== '3' && (
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-olympus-cyan to-transparent opacity-50" />
            )}
          </motion.div>
        ))}
      </div>

      {/* Botón para comenzar comparación Responsive */}
      {!mostrarDatos && (
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setMostrarDatos(true)}
          className="bg-olympus-mint text-zinc-950 font-bold px-6 md:px-12 py-4 md:py-5 rounded-2xl shadow-[0_0_20px_rgba(5,255,161,0.4)] flex flex-row items-center justify-center gap-2 md:gap-4 group transition-all border border-[#05ffa1]/50 w-[90%] md:w-auto"
        >
          <Flame className="text-zinc-900 group-hover:animate-pulse w-5 h-5 md:w-6 md:h-6" />
          <span className="text-sm md:text-xl text-center leading-tight">COMPARAR FINALISTAS</span>
          <ChevronRight className="hidden md:block" />
        </motion.button>
      )}

      {/* Panel de comparación Responsive */}
      <AnimatePresence>
        {mostrarDatos && (
          <motion.div
            initial={{ y: 500, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 500, opacity: 0 }}
            className="fixed bottom-0 left-0 right-0 bg-olympus-bg/95 backdrop-blur-xl rounded-t-3xl border-t border-olympus-border p-3 md:p-6 z-50 max-h-[85vh] md:max-h-[85vh] overflow-y-auto shadow-[0_-10px_40px_rgba(0,242,254,0.1)]"
          >
            <div className="flex justify-between items-center mb-4 md:mb-6 sticky top-0 bg-olympus-bg/95 py-3 md:py-4 z-10 border-b border-olympus-border">
              <h2 className="text-olympus-cyan font-bold text-base md:text-xl drop-shadow-[0_0_5px_rgba(0,242,254,0.5)]">📊 COMPARATIVA FINAL</h2>
              <button onClick={() => setMostrarDatos(false)} className="bg-olympus-surface border border-olympus-border px-3 py-1 rounded-lg text-olympus-muted hover:text-white text-[10px] md:text-sm transition-colors">
                CERRAR
              </button>
            </div>

            <div className="space-y-3 md:space-y-4">
              {CATEGORIAS.map((cat) => {
                const votado = votos[cat.id]
                return (
                  <div key={cat.id} className="grid grid-cols-[1fr_auto_1fr] gap-1 md:gap-2 items-center border-b border-olympus-border pb-2 md:pb-3 mb-2 md:mb-3">
                    {/* Keiko */}
                    <div 
                      onClick={() => votar(cat.id, '1')}
                      className={`p-2 md:p-3 rounded-xl cursor-pointer transition-all ${votado === '1' ? 'bg-olympus-surface border border-olympus-cyan shadow-[0_0_15px_rgba(0,242,254,0.15)]' : 'bg-transparent hover:bg-olympus-border/30 border border-transparent'}`}
                    >
                      <div className="flex flex-col xl:flex-row justify-between text-[10px] md:text-xs mb-1 gap-1">
                        <span className="text-olympus-text font-bold">Keiko</span>
                        <span className="text-olympus-cyan font-bold">{candidatosData[0].estadisticas[cat.id as keyof Candidato['estadisticas']].puntaje} pts</span>
                      </div>
                      <p className="text-olympus-muted text-[9px] md:text-[10px] line-clamp-2 md:line-clamp-none leading-tight">{candidatosData[0].estadisticas[cat.id as keyof Candidato['estadisticas']].detalle}</p>
                    </div>

                    {/* Categoría */}
                    <div className="text-center w-12 md:w-20">
                      <div className="flex justify-center mb-1">
                        <cat.icono size={16} className="text-olympus-muted md:w-5 md:h-5" />
                      </div>
                      <span className="text-olympus-muted text-[7px] md:text-[8px] font-bold uppercase tracking-tighter block">{cat.nombre}</span>
                    </div>

                    {/* Roberto Sánchez */}
                    <div 
                      onClick={() => votar(cat.id, '2')}
                      className={`p-2 md:p-3 rounded-xl cursor-pointer transition-all ${votado === '2' ? 'bg-olympus-surface border border-olympus-cyan shadow-[0_0_15px_rgba(0,242,254,0.15)]' : 'bg-transparent hover:bg-olympus-border/30 border border-transparent'}`}
                    >
                      <div className="flex flex-col xl:flex-row justify-between text-[10px] md:text-xs mb-1 gap-1">
                        <span className="text-olympus-text font-bold">Sánchez</span>
                        <span className="text-olympus-cyan font-bold">{candidatosData[1].estadisticas[cat.id as keyof Candidato['estadisticas']].puntaje} pts</span>
                      </div>
                      <p className="text-olympus-muted text-[9px] md:text-[10px] line-clamp-2 md:line-clamp-none leading-tight">{candidatosData[1].estadisticas[cat.id as keyof Candidato['estadisticas']].detalle}</p>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Opción Agujero Negro */}
            <div className="mt-4 md:mt-6 p-3 md:p-4 bg-olympus-surface rounded-xl border border-olympus-border shadow-lg">
              <div className="flex flex-col md:flex-row justify-between items-center gap-3 md:gap-0">
                <div className="flex items-center gap-2 md:gap-3">
                  <div className="w-8 h-8 md:w-10 md:h-10 bg-black rounded-full flex items-center justify-center border border-olympus-border shadow-inner">
                    <span className="text-sm md:text-xl opacity-50">⚫</span>
                  </div>
                  <div className="text-center md:text-left">
                    <p className="text-olympus-text font-bold text-xs md:text-sm">NINGUNO DE LOS DOS</p>
                    <p className="text-olympus-muted text-[9px] md:text-[10px]">71% de la población (primera vuelta)</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setGanador(candidatosData[2])
                    setMostrarDatos(false)
                  }}
                  className="bg-olympus-border hover:bg-olympus-border/80 text-olympus-text px-4 py-2 rounded-lg text-xs md:text-sm font-bold transition-all w-full md:w-auto"
                >
                  VOTAR POR NINGUNO
                </button>
              </div>
            </div>

            {/* Botón para declarar ganador entre los 2 */}
            <div className="mt-4 md:mt-6 flex gap-3 sticky bottom-0 bg-olympus-bg/95 py-3 md:py-4 z-10 border-t border-olympus-border">
              <button
                onClick={calcularGanador}
                disabled={Object.keys(votos).length < 3}
                className={`flex-1 py-3 md:py-4 rounded-xl font-black text-xs md:text-lg transition-all ${
                  Object.keys(votos).length >= 3
                    ? 'bg-olympus-cyan text-olympus-bg shadow-[0_0_20px_rgba(0,242,254,0.4)] active:scale-95'
                    : 'bg-olympus-surface border border-olympus-border text-olympus-muted cursor-not-allowed'
                }`}
              >
                {Object.keys(votos).length >= 3 
                  ? '✅ DECLARAR GANADOR' 
                  : `🔒 VOTA EN ${3 - Object.keys(votos).length} CATEGORÍAS MÁS`}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Efectos de fondo Opticlean */}
      <div className="fixed inset-0 pointer-events-none -z-10 bg-olympus-bg">
        <div className="absolute top-[-5%] md:top-[-10%] left-[-10%] w-[300px] md:w-[500px] h-[300px] md:h-[500px] bg-olympus-cyan/5 rounded-full blur-[80px] md:blur-[120px]" />
        <div className="absolute bottom-[-5%] md:bottom-[-10%] right-[-10%] w-[300px] md:w-[500px] h-[300px] md:h-[500px] bg-olympus-mint/5 rounded-full blur-[80px] md:blur-[120px]" />
      </div>
    </div>
  )
}
