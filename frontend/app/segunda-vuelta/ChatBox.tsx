// app/segunda-vuelta/ChatBox.tsx
'use client'

import { useState, useEffect, useRef } from 'react'
import { Send, Heart, User, Eye } from 'lucide-react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001'

// Generar session ID único
const getSessionId = () => {
  if (typeof window === 'undefined') return ''
  let id = localStorage.getItem('chat_session_id')
  if (!id) {
    id = `${Date.now()}-${Math.random().toString(36).substring(2)}`
    localStorage.setItem('chat_session_id', id)
  }
  return id
}

export function ChatBox() {
  const [comentarios, setComentarios] = useState<any[]>([])
  const [nuevoComentario, setNuevoComentario] = useState('')
  const [usuarioNombre, setUsuarioNombre] = useState('')
  const [cargando, setCargando] = useState(false)
  const [activos, setActivos] = useState(0)
  const [mostrarModalNombre, setMostrarModalNombre] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  
  // Utilizar ref para obtener sessionId de forma segura
  const [sessionId, setSessionId] = useState('')

  useEffect(() => {
    setSessionId(getSessionId())
  }, [])

  // Cargar nombre guardado
  useEffect(() => {
    const nombreGuardado = localStorage.getItem('chat_nombre')
    if (nombreGuardado) {
      setUsuarioNombre(nombreGuardado)
    } else {
      setMostrarModalNombre(true)
    }
  }, [])

  // Cargar comentarios cada 5 segundos (polling)
  useEffect(() => {
    if (!sessionId) return

    const cargarComentarios = async () => {
      try {
        const res = await fetch(`${API_URL}/api/comentarios/listar?limit=50`)
        const data = await res.json()
        if (data.comentarios) {
          setComentarios(data.comentarios)
        }
      } catch (error) {
        console.error('Error cargando comentarios:', error)
      }
    }
    
    const cargarActivos = async () => {
      try {
        const res = await fetch(`${API_URL}/api/comentarios/activos`)
        const data = await res.json()
        setActivos(data.activos || 0)
      } catch (error) {
        console.error('Error cargando activos:', error)
      }
    }
    
    const enviarPing = async () => {
      try {
        await fetch(`${API_URL}/api/comentarios/ping`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            session_id: sessionId, 
            usuario_nombre: usuarioNombre || 'Anónimo' 
          })
        })
      } catch (error) {
        console.error('Error en ping:', error)
      }
    }
    
    cargarComentarios()
    cargarActivos()
    enviarPing()
    
    const intervalComentarios = setInterval(cargarComentarios, 5000)
    const intervalActivos = setInterval(cargarActivos, 10000)
    const intervalPing = setInterval(enviarPing, 30000)
    
    return () => {
      clearInterval(intervalComentarios)
      clearInterval(intervalActivos)
      clearInterval(intervalPing)
    }
  }, [sessionId, usuarioNombre])

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [comentarios])

  const enviarComentario = async () => {
    if (!nuevoComentario.trim()) return
    if (!usuarioNombre) {
      setMostrarModalNombre(true)
      return
    }

    setCargando(true)
    try {
      await fetch(`${API_URL}/api/comentarios/enviar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          usuario_nombre: usuarioNombre,
          comentario: nuevoComentario,
          votacion_id: 'segunda-vuelta'
        })
      })
      setNuevoComentario('')
      
      // Recargar comentarios inmediatamente
      const res = await fetch(`${API_URL}/api/comentarios/listar?limit=50`)
      const data = await res.json()
      if (data.comentarios) {
        setComentarios(data.comentarios)
      }
    } catch (error) {
      console.error('Error:', error)
    }
    setCargando(false)
  }

  const guardarNombre = (nombre: string) => {
    const finalNombre = nombre.trim() || 'Anónimo'
    setUsuarioNombre(finalNombre)
    localStorage.setItem('chat_nombre', finalNombre)
    setMostrarModalNombre(false)
  }

  return (
    <>
      {/* Modal para pedir nombre */}
      {mostrarModalNombre && (
        <div className="fixed inset-0 bg-black/85 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-[#111c2e] border border-[#1b2a47] rounded-3xl p-6 max-w-md w-full shadow-2xl relative">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#00f2fe] to-transparent"></div>
            <h3 className="text-white font-black text-xl mb-3 tracking-tight">💬 PARTICIPA EN EL CHAT</h3>
            <p className="text-[#788da5] text-xs font-semibold mb-5 leading-relaxed">
              ¿Cómo quieres aparecer en los comentarios de la comunidad?
            </p>
            <input
              type="text"
              placeholder="Tu nombre o apodo (Ej: Juan, Ana...)"
              maxLength={20}
              className="w-full bg-[#070b13] border border-[#1b2a47] rounded-2xl px-4 py-3.5 text-white placeholder-[#788da5]/50 mb-4 focus:outline-none focus:border-[#00f2fe] focus:ring-1 focus:ring-[#00f2fe] transition-all text-sm font-medium"
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  guardarNombre(e.currentTarget.value)
                }
              }}
            />
            <div className="flex flex-col gap-2">
              <button
                onClick={(e) => {
                  const input = e.currentTarget.parentElement?.previousElementSibling as HTMLInputElement
                  guardarNombre(input.value)
                }}
                className="w-full bg-gradient-to-r from-[#00f2fe] to-[#05ffa1] text-[#070b13] py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest hover:brightness-105 active:scale-[0.99] transition-all shadow-[0_0_15px_rgba(5,255,161,0.2)]"
              >
                Aceptar y Entrar
              </button>
              <button
                onClick={() => guardarNombre('Anónimo')}
                className="w-full bg-transparent border border-[#1b2a47] text-[#788da5] py-3 rounded-2xl font-bold text-xs uppercase tracking-widest hover:text-white transition-all"
              >
                Entrar como Anónimo
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="w-full max-w-4xl mx-auto mt-6 bg-[#111c2e]/80 border border-[#1b2a47] rounded-3xl overflow-hidden shadow-2xl relative">
        {/* Cabecera */}
        <div className="p-4 border-b border-[#1b2a47] bg-[#111c2e]/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#05ffa1] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#05ffa1]"></span>
            </span>
            <h3 className="text-white font-black tracking-tight text-sm uppercase italic">💬 Chat de Debate Ciudadano</h3>
            <span className="text-[10px] bg-[#05ffa1]/10 border border-[#05ffa1]/20 text-[#05ffa1] px-2.5 py-0.5 rounded-full font-bold font-mono">
              {activos} activos
            </span>
          </div>
          <div className="flex items-center gap-2">
            {usuarioNombre && (
              <span className="text-[10px] text-[#788da5] font-mono uppercase bg-[#070b13] px-2.5 py-1 rounded-md border border-[#1b2a47]">
                Usuario: <strong className="text-white">{usuarioNombre}</strong>
              </span>
            )}
          </div>
        </div>

        {/* Lista de comentarios */}
        <div className="h-72 overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-[#070b13]/40 to-[#070b13]">
          {comentarios.length === 0 && (
            <div className="text-center text-[#788da5] py-16 flex flex-col items-center justify-center">
              <span className="text-3xl mb-2">💬</span>
              <p className="font-bold text-sm">El debate está comenzando</p>
              <p className="text-xs text-[#788da5]/70 mt-1 max-w-xs leading-relaxed">Sé el primero en compartir tu opinión y debatir constructivamente.</p>
            </div>
          )}
          
          {comentarios.map((c, idx) => (
            <div key={idx} className="flex gap-3 group hover:bg-[#111c2e]/30 p-2.5 rounded-2xl transition-all border border-transparent hover:border-[#1b2a47]/30">
              <div className="w-9 h-9 rounded-full bg-[#070b13] border border-[#1b2a47] flex items-center justify-center text-base shadow-inner">
                {c.usuario_avatar || '👤'}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-white font-black text-xs tracking-tight">{c.usuario_nombre}</span>
                  <span className="text-[#788da5]/50 text-[9px] font-mono">{c.hora}</span>
                </div>
                <p className="text-[#f4f6fa]/90 text-xs mt-1 break-words leading-relaxed font-medium">{c.comentario}</p>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t border-[#1b2a47] bg-[#111c2e]/40">
          <div className="flex gap-2">
            <input
              type="text"
              value={nuevoComentario}
              onChange={(e) => setNuevoComentario(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  enviarComentario()
                }
              }}
              placeholder="Escribe tu comentario sobre los candidatos..."
              maxLength={250}
              className="flex-1 bg-[#070b13] border border-[#1b2a47] rounded-2xl px-4 py-3.5 text-xs text-white placeholder-[#788da5]/40 focus:outline-none focus:border-[#00f2fe]/60 focus:ring-1 focus:ring-[#00f2fe]/60 transition-all font-medium"
            />
            <button
              onClick={enviarComentario}
              disabled={cargando || !nuevoComentario.trim()}
              className="bg-[#00f2fe] hover:bg-[#00f2fe]/90 text-[#070b13] px-6 rounded-2xl transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center shadow-lg hover:shadow-[#00f2fe]/20 active:scale-95"
            >
              <Send size={15} className="font-bold" />
            </button>
          </div>
          <p className="text-[#788da5]/30 text-[8px] mt-2.5 text-center font-mono uppercase tracking-widest">
            Debate con respeto. Los comentarios son públicos y se actualizan automáticamente.
          </p>
        </div>
      </div>
    </>
  )
}
