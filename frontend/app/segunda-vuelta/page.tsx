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
      <div className={\`min-h-screen flex items-center justify-center p-6 \${esAgujeroNegro ? 'bg-gradient-to-br from-gray-900 to-black' : 'bg-gradient-to-br from-yellow-400 to-orange-500'}\`}>
        <motion.div
          initial={{ scale: 0.9, opacity: 0, rotateY: 0 }}
          animate={{ scale: 1, opacity: 1, rotateY: 360 }}
          transition={{ duration: 0.6 }}
          className="bg-white rounded-2xl p-8 text-center max-w-md shadow-2xl"
        >
          {esAgujeroNegro ? (
            <div className="text-7xl mb-4">⚫</div>
          ) : (
            <div className="text-6xl mb-4">🏆</div>
          )}
          <h2 className="text-2xl font-bold mb-2">
            {esAgujeroNegro ? 'EL PUEBLO HA HABLADO' : '¡GANADOR DE LA SEGUNDA VUELTA!'}
          </h2>
          <p className="text-xl font-bold mb-2" style={{ color: ganador.color }}>
            {ganador.nombre}
          </p>
          <p className="text-gray-600 mb-2">{ganador.partido}</p>
          <p className="text-sm text-gray-500 mb-4">{ganador.descripcion}</p>
          <div className="bg-gray-100 rounded-lg p-3 mb-4">
            <span className="text-2xl font-bold text-gray-800">{ganador.porcentaje}%</span>
            <span className="text-gray-500 text-sm ml-2">de intención de voto</span>
          </div>
          <button
            onClick={reiniciar}
            className="w-full bg-blue-600 text-white px-6 py-3 rounded-xl font-bold active:scale-95 transition-all"
          >
            🔄 SIMULAR NUEVAMENTE
          </button>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center p-4 md:p-8 overflow-x-hidden">
      {/* Header con info de segunda vuelta */}
      <div className="w-full max-w-6xl flex justify-between items-center mb-8 px-2">
        <div>
          <h1 className="text-white text-3xl font-black tracking-tighter italic leading-none">
            SEGUNDA<br/><span className="text-red-500">VUELTA 2026</span>
          </h1>
          <p className="text-white/40 text-xs mt-2 font-bold uppercase tracking-wider">7 de junio - Decisión final</p>
        </div>
        <div className="text-right">
          <div className="flex items-center gap-2 mb-2 justify-end">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
            <span className="text-green-400 text-[10px] font-black tracking-widest uppercase">
              {concurrencia.toLocaleString()} personas simulando ahora
            </span>
          </div>
          <div className="flex gap-2 justify-end">
            <div className="h-2 w-12 rounded-full bg-red-500" />
            <div className="h-2 w-12 rounded-full bg-blue-500" />
            <div className="h-2 w-12 rounded-full bg-gray-700" />
          </div>
        </div>
      </div>

      {/* Tarjetas de los 3 candidatos */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-6xl mb-10">
        {candidatos.map((cand) => (
          <motion.div
            key={cand.id}
            whileHover={{ y: -8, scale: 1.02 }}
            className={\`relative rounded-2xl overflow-hidden cursor-pointer transition-all \${
              cand.id === '3' ? 'bg-gradient-to-b from-gray-800 to-gray-900 border border-white/10' : ''
            }\`}
            style={{ backgroundColor: cand.id !== '3' ? cand.color + '20' : undefined }}
            onClick={() => setMostrarDatos(true)}
          >
            {cand.id === '3' && (
              <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg...')] opacity-10" />
            )}
            <div className="p-6 text-center">
              {cand.id === '3' ? (
                <div className="w-24 h-24 mx-auto bg-black rounded-full flex items-center justify-center mb-4 border-2 border-gray-600">
                  <span className="text-5xl">⚫</span>
                </div>
              ) : (
                <div 
                  className="w-24 h-24 mx-auto rounded-full flex items-center justify-center mb-4 overflow-hidden border-4 border-white shadow-xl"
                  style={{ backgroundColor: cand.color }}
                >
                  <span className="text-3xl text-white font-black">{cand.nombre.charAt(0)}</span>
                </div>
              )}
              <h3 className="text-white font-bold text-lg">{cand.nombre}</h3>
              <p className="text-white/60 text-sm mb-2">{cand.partido}</p>
              <div className="inline-block bg-white/10 rounded-full px-3 py-1 mb-3">
                <span className="text-white font-bold text-lg">{cand.porcentaje}%</span>
                <span className="text-white/40 text-xs ml-1">primera vuelta</span>
              </div>
              <p className="text-white/50 text-xs">{cand.descripcion}</p>
            </div>
            <div className="h-1 w-full bg-gradient-to-r from-transparent via-white/30 to-transparent" />
          </motion.div>
        ))}
      </div>

      {/* Botón para comenzar comparación */}
      {!mostrarDatos && (
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setMostrarDatos(true)}
          className="bg-white text-black font-black px-12 py-5 rounded-2xl shadow-2xl flex items-center gap-4 group transition-all"
        >
          <Flame className="text-orange-500 group-hover:animate-pulse" />
          <span className="text-xl">COMPARAR CANDIDATOS FINALISTAS</span>
          <ChevronRight />
        </motion.button>
      )}

      {/* Panel de comparación */}
      <AnimatePresence>
        {mostrarDatos && (
          <motion.div
            initial={{ y: 500, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 500, opacity: 0 }}
            className="fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur-xl rounded-t-3xl border-t border-white/10 p-6 z-50 max-h-[85vh] overflow-y-auto"
          >
            <div className="flex justify-between items-center mb-6 sticky top-0 bg-slate-900/95 py-2">
              <h2 className="text-white font-bold text-xl">📊 COMPARATIVA FINAL</h2>
              <button onClick={() => setMostrarDatos(false)} className="text-white/40 hover:text-white text-sm">
                CERRAR
              </button>
            </div>

            <div className="space-y-4">
              {CATEGORIAS.map((cat) => {
                const votado = votos[cat.id]
                return (
                  <div key={cat.id} className="grid grid-cols-3 gap-2 items-center">
                    {/* Keiko */}
                    <div 
                      onClick={() => votar(cat.id, '1')}
                      className={\`p-3 rounded-xl cursor-pointer transition-all \${votado === '1' ? 'bg-red-600/30 border border-red-500' : 'bg-white/5 hover:bg-white/10'}\`}
                    >
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-white/60">Keiko</span>
                        <span className="text-red-400 font-bold">{candidatosData[0].estadisticas[cat.id as keyof typeof candidatosData[0].estadisticas].puntaje} pts</span>
                      </div>
                      <p className="text-white text-[10px] line-clamp-2">{candidatosData[0].estadisticas[cat.id as keyof typeof candidatosData[0].estadisticas].detalle}</p>
                    </div>

                    {/* Categoría */}
                    <div className="text-center">
                      <div className="flex justify-center mb-1">
                        <cat.icono size={20} className="text-white/40" />
                      </div>
                      <span className="text-white/50 text-[8px] font-bold uppercase tracking-tighter">{cat.nombre}</span>
                    </div>

                    {/* Roberto Sánchez */}
                    <div 
                      onClick={() => votar(cat.id, '2')}
                      className={\`p-3 rounded-xl cursor-pointer transition-all \${votado === '2' ? 'bg-blue-600/30 border border-blue-500' : 'bg-white/5 hover:bg-white/10'}\`}
                    >
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-white/60">Sánchez</span>
                        <span className="text-blue-400 font-bold">{candidatosData[1].estadisticas[cat.id as keyof typeof candidatosData[1].estadisticas].puntaje} pts</span>
                      </div>
                      <p className="text-white text-[10px] line-clamp-2">{candidatosData[1].estadisticas[cat.id as keyof typeof candidatosData[1].estadisticas].detalle}</p>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Opción Agujero Negro */}
            <div className="mt-6 p-4 bg-gray-800/50 rounded-xl border border-gray-700">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-black rounded-full flex items-center justify-center">
                    <span className="text-xl">⚫</span>
                  </div>
                  <div>
                    <p className="text-white font-bold text-sm">NINGUNO DE LOS DOS</p>
                    <p className="text-white/40 text-[10px]">71% de la población (primera vuelta)</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setGanador(candidatosData[2])
                    setMostrarDatos(false)
                  }}
                  className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg text-sm font-bold transition-all"
                >
                  VOTAR POR NINGUNO
                </button>
              </div>
            </div>

            {/* Botón para declarar ganador entre los 2 */}
            <div className="mt-6 flex gap-3 sticky bottom-0 bg-slate-900/95 py-4">
              <button
                onClick={calcularGanador}
                disabled={Object.keys(votos).length < 3}
                className={\`flex-1 py-4 rounded-xl font-black text-lg transition-all \${
                  Object.keys(votos).length >= 3
                    ? 'bg-gradient-to-r from-red-600 to-blue-600 text-white shadow-xl active:scale-95'
                    : 'bg-white/10 text-white/30 cursor-not-allowed'
                }\`}
              >
                {Object.keys(votos).length >= 3 
                  ? '✅ DECLARAR GANADOR DE LA SEGUNDA VUELTA' 
                  : \`🔒 VOTA EN \${3 - Object.keys(votos).length} CATEGORÍAS MÁS\`}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Efectos de fondo */}
      <div className="fixed inset-0 pointer-events-none -z-10">
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-red-600/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-blue-600/20 rounded-full blur-[120px]" />
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-gray-800/20 rounded-full blur-[100px]" />
      </div>
    </div>
  )
}
