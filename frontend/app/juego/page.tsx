'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  GraduationCap, 
  Briefcase, 
  FileText, 
  Home, 
  Coins, 
  Scale, 
  Trophy, 
  Users, 
  ChevronRight,
  TrendingUp,
  Flame
} from 'lucide-react'

// ============================================================
// DATOS DE LOS 6 CANDIDATOS (ESTILO ORIGINAL - SIN FOTOS)
// ============================================================

interface Candidato {
  id: string
  nombre: string
  partido: string
  color: string
  nivel: string
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
    nombre: 'César Acuña Peralta',
    partido: 'Alianza para el Progreso (APP)',
    color: '#eab308',
    nivel: 'amarillo',
    estadisticas: {
      educacion: { puntaje: 95, detalle: 'Doctorado Univ. Complutense, Maestría UNI, Ing. Químico' },
      trayectoria: { puntaje: 85, detalle: 'Gobernador La Libertad, Alcalde Trujillo, Congresista' },
      contratos: { puntaje: 60, detalle: 'Vínculos con consorcios educativos propios' },
      propiedades: { puntaje: 30, detalle: '25 inmuebles y 158 vehículos registrados' },
      deudas: { puntaje: 100, detalle: 'Sin deudas coactivas registradas' },
      sanciones: { puntaje: 50, detalle: 'Sentencia por pensión alimentaria (archivada)' }
    }
  },
  {
    id: '2',
    nombre: 'Ricardo Belmont Cassinelli',
    partido: 'Partido Cívico Obras',
    color: '#3b82f6',
    nivel: 'verde',
    estadisticas: {
      educacion: { puntaje: 60, detalle: 'Bachiller en Administración - Universidad de Lima' },
      trayectoria: { puntaje: 75, detalle: 'Alcalde de Lima (2 periodos), Fundador de RBC' },
      contratos: { puntaje: 100, detalle: 'Sin contratos con el estado cuestionados' },
      propiedades: { puntaje: 90, detalle: 'Patrimonio estándar para su trayectoria' },
      deudas: { puntaje: 100, detalle: 'Sin deudas tributarias pendientes' },
      sanciones: { puntaje: 100, detalle: 'Sin sanciones judiciales vigentes' }
    }
  },
  {
    id: '3',
    nombre: 'Rafael López Aliaga',
    partido: 'Renovación Popular',
    color: '#f97316',
    nivel: 'naranja',
    estadisticas: {
      educacion: { puntaje: 85, detalle: 'Magister Administración - Pacífico, Ing. Industrial' },
      trayectoria: { puntaje: 80, detalle: 'Alcalde de Lima, Empresario Ferroviario y Hotelero' },
      contratos: { puntaje: 70, detalle: 'Concesiones ferroviarias supervisadas' },
      propiedades: { puntaje: 60, detalle: '10 empresas vinculadas (ACRES, Peru Hotel)' },
      deudas: { puntaje: 100, detalle: 'Sin deudas personales directas' },
      sanciones: { puntaje: 100, detalle: 'Sin sentencias penales' }
    }
  },
  {
    id: '4',
    nombre: 'Jorge Nieto Montesinos',
    partido: 'Partido del Buen Gobierno',
    color: '#22c55e',
    nivel: 'verde',
    estadisticas: {
      educacion: { puntaje: 65, detalle: 'Sociología - PUCP, Estudios en México' },
      trayectoria: { puntaje: 60, detalle: 'Ex Ministro de Cultura y Defensa, Politólogo' },
      contratos: { puntaje: 100, detalle: 'Perfil técnico sin contratos observados' },
      propiedades: { puntaje: 75, detalle: '5 inmuebles declarados (Lima y CDMX)' },
      deudas: { puntaje: 100, detalle: 'Sin deudas en el sistema' },
      sanciones: { puntaje: 100, detalle: 'Limpio de antecedentes' }
    }
  },
  {
    id: '5',
    nombre: 'Keiko Fujimori Higuchi',
    partido: 'Fuerza Popular',
    color: '#ef4444',
    nivel: 'rojo',
    estadisticas: {
      educacion: { puntaje: 90, detalle: 'Maestría Columbia, Licenciada Boston University' },
      trayectoria: { puntaje: 85, detalle: 'Congresista con mayor votación, 3 veces finalista' },
      contratos: { puntaje: 100, detalle: 'No registra contratos directos con el estado' },
      propiedades: { puntaje: 80, detalle: 'Sin grandes patrimonios a su nombre' },
      deudas: { puntaje: 100, detalle: 'Finanzas partidarias bajo fiscalización' },
      sanciones: { puntaje: 30, detalle: 'Investigación por lavado de activos y organización criminal' }
    }
  },
  {
    id: '6',
    nombre: 'Carlos Álvarez Loayza',
    partido: 'País para Todos',
    color: '#10b981',
    nivel: 'verde',
    estadisticas: {
      educacion: { puntaje: 20, detalle: 'No registra grados académicos oficiales' },
      trayectoria: { puntaje: 30, detalle: 'Trayectoria artística, sin cargos públicos' },
      contratos: { puntaje: 70, detalle: 'Contratos por servicios artísticos municipales' },
      propiedades: { puntaje: 75, detalle: '6 inmuebles y vehículos de gama alta' },
      deudas: { puntaje: 100, detalle: 'Sin reportes negativos' },
      sanciones: { puntaje: 100, detalle: 'Sin antecedentes penales' }
    }
  }
]

// ============================================================
// CATEGORÍAS
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

export default function JuegoOriginal() {
  const [candidatos] = useState<Candidato[]>(candidatosData)
  const [eliminados, setEliminados] = useState<string[]>([])
  const [votos, setVotos] = useState<Record<string, string>>({})
  const [ganadorFinal, setGanadorFinal] = useState<Candidato | null>(null)
  const [mostrarDatos, setMostrarDatos] = useState(false)
  const [concurrencia, setConcurrencia] = useState(12450)
  const [sessionId, setSessionId] = useState('')

  // Inicializar SessionID y Carga
  useEffect(() => {
    let sid = localStorage.getItem('elections_session_id')
    if (!sid) {
      sid = Math.random().toString(36).substring(2, 15)
      localStorage.setItem('elections_session_id', sid)
    }
    setSessionId(sid)
  }, [])

  // Simular concurrencia
  useEffect(() => {
    const interval = setInterval(() => {
      setConcurrencia(prev => prev + (Math.floor(Math.random() * 100) - 45))
    }, 3000)
    return () => clearInterval(interval)
  }, [])

  // Helper para analíticas
  const registrarEvento = async (tipo: string, cand: Candidato) => {
    try {
      await fetch('http://localhost:8001/api/analytics/registrar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidato_dni: cand.id,
          candidato_nombre: cand.nombre,
          partido: cand.partido,
          tipo_visita: tipo,
          session_id: localStorage.getItem('elections_session_id') || 'anon'
        })
      })
    } catch (e) { console.error(e) }
  }

  const activos = candidatos.filter(c => !eliminados.includes(c.id))
  const actual = activos[0]
  const retador = activos[1]

  useEffect(() => {
    if (activos.length === 1 && !ganadorFinal) {
      setGanadorFinal(activos[0])
    }
  }, [activos, ganadorFinal])

  const votar = (categoriaId: string, ganadorId: string) => {
    setVotos(prev => ({ ...prev, [categoriaId]: ganadorId }))
    const cand = ganadorId === actual.id ? actual : retador
    registrarEvento('voto_categoria', cand)
  }

  const finalizarRonda = () => {
    let puntosActual = 0
    let puntosRetador = 0
    CATEGORIAS.forEach(cat => {
      const ganador = votos[cat.id]
      if (ganador === actual.id) puntosActual += cat.peso
      else if (ganador === retador.id) puntosRetador += cat.peso
    })
    const perdedor = puntosActual >= puntosRetador ? retador : actual
    registrarEvento('voto_final', puntosActual >= puntosRetador ? actual : retador)
    setEliminados(prev => [...prev, perdedor.id])
    setVotos({})
    setMostrarDatos(false)
  }

  if (ganadorFinal) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="bg-white/5 p-12 rounded-[3rem] border border-yellow-400">
          <Trophy size={80} className="text-yellow-400 mx-auto mb-6" />
          <h1 className="text-white text-4xl font-black mb-4">{ganadorFinal.nombre}</h1>
          <p className="text-yellow-400 text-xl font-bold mb-8 italic">{ganadorFinal.partido}</p>
          <button onClick={() => window.location.reload()} className="bg-yellow-400 text-black px-12 py-4 rounded-2xl font-black text-xl">JUGAR DE NUEVO</button>
        </motion.div>
      </div>
    )
  }

  if (activos.length < 2) return null

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center p-4 md:p-8">
      {/* Header Social Proof */}
      <div className="w-full max-w-4xl flex justify-between items-center mb-10 px-2 mt-4">
        <h1 className="text-white text-3xl font-black tracking-tighter italic">ELIMINACIÓN<br/><span className="text-red-500">PRESIDENCIAL</span></h1>
        <div className="text-right">
          <div className="flex items-center gap-2 mb-2 justify-end">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
            <span className="text-green-400 text-[10px] font-black tracking-widest uppercase">{concurrencia.toLocaleString()} Jugando ahora</span>
          </div>
        </div>
      </div>

      {/* VS Section (Limpia - Sin Fotos) */}
      <div className="w-full max-w-5xl flex flex-col md:flex-row items-center justify-center gap-6 mb-12">
        <CandidateBox candidate={actual} isWinner={votos[CATEGORIAS[0].id] === actual.id} />
        <div className="bg-white text-black w-14 h-14 rounded-full flex items-center justify-center font-black italic scale-125 z-10 border-4 border-slate-950">VS</div>
        <CandidateBox candidate={retador} isWinner={votos[CATEGORIAS[0].id] === retador.id} />
      </div>

      {!mostrarDatos && (
        <button 
          onClick={() => { setMostrarDatos(true); registrarEvento('ficha_abierta', actual); registrarEvento('ficha_abierta', retador); }}
          className="bg-white text-black font-black px-12 py-5 rounded-2xl shadow-xl flex items-center gap-4 hover:scale-105 active:scale-95 transition-all"
        >
          <Flame className="text-orange-500" />
          <span className="text-xl">COMPARAR CANDIDATOS</span>
          <ChevronRight />
        </button>
      )}

      {/* Drawer */}
      <AnimatePresence>
        {mostrarDatos && (
          <motion.div initial={{ y: 500 }} animate={{ y: 0 }} exit={{ y: 500 }} className="w-full max-w-4xl bg-slate-900 rounded-t-[3rem] border-t border-white/10 p-8 mt-10">
            <div className="space-y-4">
              {CATEGORIAS.map(cat => (
                <div key={cat.id} className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
                  <StatVote cand={actual} cat={cat} isSelected={votos[cat.id] === actual.id} onVote={() => votar(cat.id, actual.id)} />
                  <div className="p-2 bg-white/5 rounded-full text-white/40"><cat.icono size={18} /></div>
                  <StatVote cand={retador} cat={cat} isSelected={votos[cat.id] === retador.id} onVote={() => votar(cat.id, retador.id)} isRight />
                </div>
              ))}
            </div>
            <button
              disabled={Object.keys(votos).length < 2}
              onClick={finalizarRonda}
              className={`w-full mt-10 py-5 rounded-2xl font-black text-xl transition-all ${Object.keys(votos).length >= 2 ? 'bg-white text-black' : 'bg-white/5 text-white/20'}`}
            >
              {Object.keys(votos).length >= 2 ? 'DECLARAR GANADOR DE RONDA' : 'VOTA EN 2 CATEGORÍAS'}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function CandidateBox({ candidate, isWinner }: { candidate: Candidato, isWinner: boolean }) {
  return (
    <div className={`flex-1 w-full p-10 rounded-[2.5rem] text-center border-4 transition-all ${isWinner ? 'border-blue-500 bg-blue-500/10' : 'border-white/5 bg-white/5'}`}>
      <div className="w-24 h-24 mx-auto mb-6 rounded-full flex items-center justify-center text-4xl font-black text-white shadow-xl" style={{ backgroundColor: candidate.color }}>
        {candidate.nombre.charAt(0)}
      </div>
      <h3 className="text-white text-2xl font-black tracking-tight mb-2">{candidate.nombre}</h3>
      <p className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">{candidate.partido}</p>
    </div>
  )
}

function StatVote({ cand, cat, isSelected, onVote, isRight }: any) {
  const stat = cand.estadisticas[cat.id as keyof typeof cand.estadisticas]
  return (
    <div 
      onClick={onVote}
      className={`p-4 rounded-xl cursor-pointer border transition-all ${isSelected ? 'border-blue-500 bg-blue-500/10' : 'border-transparent bg-white/5'} ${isRight ? 'text-right' : 'text-left'}`}
    >
      <div className="text-white text-xs font-bold mb-1">{stat.puntaje} - {cat.nombre}</div>
      <div className="text-slate-400 text-[10px] line-clamp-1">{stat.detalle}</div>
    </div>
  )
}
