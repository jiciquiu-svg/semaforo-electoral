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
  AlertTriangle,
  Flame
} from 'lucide-react'

// ============================================================
// DATOS DE LOS 6 CANDIDATOS (REALISTA)
// ============================================================

interface Candidato {
  id: string
  nombre: string
  partido: string
  color: string
  nivel: string
  foto: string
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
    foto: 'http://localhost:8001/api/proxy-image?url=https://votoinformado.jne.gob.pe/voto/Recursos/Foto/HojaVida/134133.jpg',
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
    foto: 'http://localhost:8001/api/proxy-image?url=https://votoinformado.jne.gob.pe/voto/Recursos/Foto/HojaVida/136767.jpg',
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
    foto: 'http://localhost:8001/api/proxy-image?url=https://votoinformado.jne.gob.pe/voto/Recursos/Foto/HojaVida/134015.jpg',
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
    foto: 'http://localhost:8001/api/proxy-image?url=https://votoinformado.jne.gob.pe/voto/Recursos/Foto/HojaVida/136746.jpg',
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
    foto: 'http://localhost:8001/api/proxy-image?url=https://votoinformado.jne.gob.pe/voto/Recursos/Foto/HojaVida/134105.jpg',
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
    color: '#22c55e',
    nivel: 'verde',
    foto: 'http://localhost:8001/api/proxy-image?url=https://votoinformado.jne.gob.pe/voto/Recursos/Foto/HojaVida/136800.jpg',
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

export default function JuegoEliminacion() {
  const [candidatos] = useState<Candidato[]>(candidatosData)
  const [eliminados, setEliminados] = useState<string[]>([])
  const [indiceActual, setIndiceActual] = useState(0)
  const [indiceRetador, setIndiceRetador] = useState(1)
  const [votos, setVotos] = useState<Record<string, string>>({})
  const [ganadorFinal, setGanadorFinal] = useState<Candidato | null>(null)
  const [mostrarDatos, setMostrarDatos] = useState(false)
  const [concurrencia, setConcurrencia] = useState(12450)
  const [sessionId, setSessionId] = useState('')

  // Inicializar SessionID
  useEffect(() => {
    let sid = localStorage.getItem('elections_session_id')
    if (!sid) {
      sid = Math.random().toString(36).substring(2, 15)
      localStorage.setItem('elections_session_id', sid)
    }
    setSessionId(sid)
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
    } catch (e) {
      console.error("Analytics error:", e)
    }
  }

  // Simular concurrencia en tiempo real
  useEffect(() => {
    const interval = setInterval(() => {
      setConcurrencia(prev => prev + (Math.floor(Math.random() * 100) - 45))
    }, 3000)
    return () => clearInterval(interval)
  }, [])

  const activos = candidatos.filter(c => !eliminados.includes(c.id))
  const actual = activos[0]
  const retador = activos[1]

  // Si solo queda uno, es el ganador
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
      else {
        const pA = actual.estadisticas[cat.id as keyof typeof actual.estadisticas].puntaje
        const pR = retador.estadisticas[cat.id as keyof typeof retador.estadisticas].puntaje
        if (pA > pR) puntosActual += cat.peso
        else puntosRetador += cat.peso
      }
    })
    
    const perdedor = puntosActual > puntosRetador ? retador : actual
    const ganadorRonda = puntosActual > puntosRetador ? actual : retador
    
    // Registrar el ganador de la ronda
    registrarEvento('voto_final', ganadorRonda)

    setEliminados(prev => [...prev, perdedor.id])
    setVotos({})
    setMostrarDatos(false)
  }

  const reiniciar = () => {
    setEliminados([])
    setVotos({})
    setGanadorFinal(null)
    setMostrarDatos(false)
  }

  if (ganadorFinal) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#1e3a8a] via-[#3b82f6] to-[#1e3a8a] flex items-center justify-center p-6 overflow-hidden relative">
        <motion.div 
          initial={{ opacity: 0, scale: 0.5, y: 100 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="relative z-10 w-full max-w-lg bg-white/10 backdrop-blur-2xl rounded-[2.5rem] border border-white/20 p-8 shadow-2xl text-center"
        >
          <div className="absolute -top-16 left-1/2 -translate-x-1/2">
            <motion.div 
              animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.1, 1] }}
              transition={{ repeat: Infinity, duration: 4 }}
              className="w-32 h-32 bg-yellow-400 rounded-full flex items-center justify-center shadow-lg border-4 border-white"
            >
              <Trophy size={64} className="text-blue-900" />
            </motion.div>
          </div>

          <div className="mt-16 mb-8">
            <h1 className="text-white text-3xl font-black tracking-tighter mb-2 italic">GANADOR ABSOLUTO 2026</h1>
            <div className="h-1 w-24 bg-yellow-400 mx-auto rounded-full mb-6" />
            
            <motion.div 
              className="relative w-48 h-48 mx-auto mb-6 rounded-full border-8 border-yellow-400 overflow-hidden shadow-2xl"
              whileHover={{ scale: 1.05 }}
            >
              <img 
                src={ganadorFinal.foto} 
                alt={ganadorFinal.nombre}
                className="w-full h-full object-cover"
                onError={(e) => (e.currentTarget.src = `https://ui-avatars.com/api/?name=${ganadorFinal.nombre}&background=${ganadorFinal.color.replace('#','')}&color=fff&size=200`)}
              />
            </motion.div>

            <h2 className="text-4xl font-black text-white mb-2">{ganadorFinal.nombre}</h2>
            <p className="text-yellow-400 font-bold text-lg mb-8">{ganadorFinal.partido}</p>
          </div>

          <button
            onClick={reiniciar}
            className="w-full bg-yellow-400 hover:bg-yellow-300 text-blue-900 font-black py-4 rounded-2xl transition-all active:scale-95 shadow-xl flex items-center justify-center gap-3 text-xl"
          >
            🔄 JUGAR DE NUEVO
          </button>
        </motion.div>
        
        {/* Adornos animados fondo */}
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute bg-white/5 rounded-full blur-xl"
            animate={{
              x: [Math.random() * 1000, Math.random() * 1000],
              y: [Math.random() * 1000, Math.random() * 1000],
              scale: [1, 1.5, 1],
            }}
            transition={{ duration: 10 + Math.random() * 10, repeat: Infinity }}
            style={{ width: Math.random() * 200, height: Math.random() * 200 }}
          />
        ))}
      </div>
    )
  }

  if (activos.length < 2) return null

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center p-4 md:p-8 overflow-x-hidden">
      {/* Header */}
      <div className="w-full max-w-4xl flex justify-between items-center mb-10 px-2 mt-4">
        <div>
          <h1 className="text-white text-3xl font-black tracking-tighter italic leading-none">
            ELIMINACIÓN<br/><span className="text-red-500">PRESIDENCIAL</span>
          </h1>
        </div>
        <div className="text-right">
          <div className="flex items-center gap-2 mb-2 justify-end">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
            <span className="text-green-400 text-[10px] font-black tracking-widest uppercase">
              {concurrencia.toLocaleString()} Personas jugando ahora
            </span>
          </div>
          <div className="flex gap-2 justify-end">
            {[...Array(6)].map((_, i) => (
              <div 
                key={i} 
                className={`h-2 w-8 rounded-full ${i < activos.length ? 'bg-green-500' : 'bg-white/10'}`}
              />
            ))}
          </div>
          <p className="text-white/40 text-[10px] font-bold mt-1 tracking-widest uppercase">Puesto {6 - activos.length + 1} de 6</p>
        </div>
      </div>

      {/* VS Section */}
      <div className="w-full max-w-5xl relative flex flex-col md:flex-row items-center justify-center gap-4 md:gap-0 mb-8">
        {/* Background Glow */}
        <div className="absolute inset-0 flex items-center justify-center opacity-30 blur-[100px]">
          <div className="w-1/3 h-64 bg-blue-600 rounded-full" />
          <div className="w-1/3 h-64 bg-red-600 rounded-full" />
        </div>

        {/* Candidato 1 */}
        <motion.div 
          layoutId={actual.id}
          className="relative z-10 w-full md:w-[45%] aspect-[4/5] md:aspect-auto md:h-[450px] group"
        >
          <div 
            className="absolute inset-x-0 bottom-0 top-1/4 bg-gradient-to-t from-black/80 to-transparent z-10 rounded-3xl"
          />
          <div className={`absolute inset-0 rounded-[2rem] border-4 border-transparent group-hover:border-blue-500 transition-all duration-500`} style={{ borderColor: votos[CATEGORIAS[0].id] === actual.id ? '#3b82f6' : 'transparent' }} />
          <img 
            src={actual.foto} 
            className="w-full h-full object-cover rounded-[2rem] shadow-2xl transition-transform duration-700 group-hover:scale-105"
            alt={actual.nombre}
            onError={(e) => (e.currentTarget.src = `https://ui-avatars.com/api/?name=${actual.nombre}&background=${actual.color.replace('#','')}&color=fff&size=400`)}
          />
          <div className="absolute bottom-6 left-6 right-6 z-20">
            <span className="bg-blue-600 text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest mb-2 inline-block">CAMPEÓN ACTUAL</span>
            <h3 className="text-white text-3xl font-black">{actual.nombre}</h3>
            <p className="text-white/60 text-sm font-medium">{actual.partido}</p>
          </div>
        </motion.div>

        {/* VS Bubble */}
        <div className="relative md:absolute md:left-1/2 md:-translate-x-1/2 z-30 flex items-center justify-center">
          <motion.div 
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ repeat: Infinity, duration: 2 }}
            className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-[0_0_50px_rgba(255,255,255,0.3)] border-4 border-slate-950"
          >
            <span className="text-black text-3xl font-black italic">VS</span>
          </motion.div>
        </div>

        {/* Candidato 2 - Retador */}
        <motion.div 
          key={retador.id}
          initial={{ x: 300, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          className="relative z-10 w-full md:w-[45%] aspect-[4/5] md:aspect-auto md:h-[450px] group"
        >
          <div 
            className="absolute inset-x-0 bottom-0 top-1/4 bg-gradient-to-t from-black/80 to-transparent z-10 rounded-3xl"
          />
          <div className={`absolute inset-0 rounded-[2rem] border-4 border-transparent group-hover:border-red-500 transition-all duration-500`} style={{ borderColor: votos[CATEGORIAS[0].id] === retador.id ? '#ef4444' : 'transparent' }} />
          <img 
            src={retador.foto} 
            className="w-full h-full object-cover rounded-[2rem] shadow-2xl transition-transform duration-700 group-hover:scale-105"
            alt={retador.nombre}
            onError={(e) => (e.currentTarget.src = `https://ui-avatars.com/api/?name=${retador.nombre}&background=${retador.color.replace('#','')}&color=fff&size=400`)}
          />
          <div className="absolute bottom-6 left-6 right-6 z-20">
            <span className="bg-red-600 text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest mb-2 inline-block">EL RETADOR</span>
            <h3 className="text-white text-3xl font-black">{retador.nombre}</h3>
            <p className="text-white/60 text-sm font-medium">{retador.partido}</p>
          </div>
        </motion.div>
      </div>

      {/* Central Action */}
      {!mostrarDatos && (
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => {
            setMostrarDatos(true)
            registrarEvento('ficha_abierta', actual)
            registrarEvento('ficha_abierta', retador)
          }}
          className="bg-white text-black font-black px-12 py-5 rounded-2xl shadow-2xl flex items-center gap-4 group transition-all"
        >
          <Flame className="text-orange-500 group-hover:animate-bounce" />
          <span className="text-xl">COMPARAR CANDIDATOS</span>
          <ChevronRight />
        </motion.button>
      )}

      {/* Comparison Drawer */}
      <AnimatePresence>
        {mostrarDatos && (
          <motion.div 
            initial={{ y: 500 }}
            animate={{ y: 0 }}
            exit={{ y: 500 }}
            className="w-full max-w-4xl bg-white/5 backdrop-blur-3xl rounded-t-[3rem] border-x border-t border-white/10 p-6 md:p-10 mt-6"
          >
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-white text-2xl font-black tracking-tight">DATOS OFICIALES</h2>
              <button 
                onClick={() => setMostrarDatos(false)}
                className="text-white/40 hover:text-white font-bold"
              >
                OCULTAR
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {CATEGORIAS.map((cat) => {
                const statA = actual.estadisticas[cat.id as keyof typeof actual.estadisticas]
                const statR = retador.estadisticas[cat.id as keyof typeof retador.estadisticas]
                const v = votos[cat.id]
                
                return (
                  <div key={cat.id} className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] items-center gap-4 group">
                    {/* Stats Actual */}
                    <div 
                      onClick={() => votar(cat.id, actual.id)}
                      className={`cursor-pointer group p-4 rounded-2xl transition-all border ${v === actual.id ? 'bg-blue-600/20 border-blue-500 shadow-lg scale-102' : 'bg-white/5 border-white/5 hover:border-white/20'}`}
                    >
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-white/40 text-[10px] font-bold uppercase">{actual.nombre.split(' ')[0]}</span>
                        <span className="text-blue-400 font-black text-sm">{statA.puntaje}</span>
                      </div>
                      <p className="text-white text-xs font-medium line-clamp-2 leading-tight">{statA.detalle}</p>
                    </div>

                    {/* Category Label */}
                    <div className="flex flex-col items-center justify-center h-full min-w-[120px]">
                      <div className={`p-3 rounded-full mb-1 transition-all ${v ? 'bg-green-500 text-black' : 'bg-white/10 text-white/40 group-hover:bg-white group-hover:text-black'}`}>
                        <cat.icono size={20} />
                      </div>
                      <span className="text-white/80 text-[10px] font-black tracking-tighter text-center">{cat.nombre}</span>
                    </div>

                    {/* Stats Retador */}
                    <div 
                      onClick={() => votar(cat.id, retador.id)}
                      className={`cursor-pointer group p-4 rounded-2xl transition-all border text-right ${v === retador.id ? 'bg-red-600/20 border-red-500 shadow-lg scale-102' : 'bg-white/5 border-white/5 hover:border-white/20'}`}
                    >
                      <div className="flex justify-between items-center mb-1 flex-row-reverse">
                        <span className="text-white/40 text-[10px] font-bold uppercase">{retador.nombre.split(' ')[0]}</span>
                        <span className="text-red-400 font-black text-sm">{statR.puntaje}</span>
                      </div>
                      <p className="text-white text-xs font-medium line-clamp-2 leading-tight">{statR.detalle}</p>
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="mt-10 flex gap-4">
              <button
                disabled={Object.keys(votos).length < 2}
                onClick={finalizarRonda}
                className={`flex-1 py-5 rounded-2xl font-black text-xl tracking-tighter transition-all shadow-2xl active:scale-95 flex items-center justify-center gap-3 ${
                  Object.keys(votos).length >= 2
                    ? 'bg-gradient-to-r from-blue-600 to-red-600 text-white'
                    : 'bg-white/5 text-white/20 cursor-not-allowed'
                }`}
              >
                {Object.keys(votos).length >= 2 ? (
                  <>DECLARAR GANADOR DE RONDA <ChevronRight /></>
                ) : (
                  <>VOTA EN AL MENOS 2 CATEGORÍAS</>
                )}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Background Orbs */}
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none -z-10 overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-red-600/10 rounded-full blur-[120px]" />
      </div>

      {/* Eliminados Footer */}
      {eliminados.length > 0 && (
        <div className="mt-12 w-full max-w-4xl p-6 bg-white/5 rounded-3xl border border-white/10 mb-20">
          <p className="text-white/20 text-[10px] font-black uppercase tracking-widest mb-4 flex items-center gap-2">
            <Users size={12} /> HAN SIDO ELIMINADOS
          </p>
          <div className="flex gap-4 overflow-x-auto pb-2">
            {eliminados.map(id => {
              const c = candidatos.find(cand => cand.id === id)
              return (
                <div key={id} className="flex-shrink-0 relative">
                  <img 
                    src={c?.foto} 
                    className="w-12 h-12 rounded-full object-cover grayscale opacity-40 border-2 border-white/20" 
                    alt={c?.nombre}
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-10 h-0.5 bg-red-600/80 rotate-45" />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
