// frontend/app/segunda-vuelta/ChatBox.tsx
'use client'

import { useState, useEffect, useRef } from 'react'
import { Send, Heart, MessageCircle, X, Minimize2 } from 'lucide-react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001'

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
  const [minimizado, setMinimizado] = useState(false)
  const [mostrarModalNombre, setMostrarModalNombre] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  
  const [sessionId, setSessionId] = useState('')

  useEffect(() => {
    setSessionId(getSessionId())
  }, [])

  useEffect(() => {
    const nombreGuardado = localStorage.getItem('chat_nombre')
    if (nombreGuardado) {
      setUsuarioNombre(nombreGuardado)
    } else {
      setMostrarModalNombre(true)
    }
  }, [])

  useEffect(() => {
    if (!sessionId) return

    const cargarComentarios = async () => {
      try {
        const res = await fetch(`${API_URL}/api/comentarios/listar?limit=50`)
        const data = await res.json()
        if (data.comentarios) setComentarios(data.comentarios)
      } catch (error) { console.error(error) }
    }
    const cargarActivos = async () => {
      try {
        const res = await fetch(`${API_URL}/api/comentarios/activos`)
        const data = await res.json()
        setActivos(data.activos || 0)
      } catch (error) { console.error(error) }
    }
    const enviarPing = async () => {
      try {
        await fetch(`${API_URL}/api/comentarios/ping`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ session_id: sessionId, usuario_nombre: usuarioNombre || 'Anónimo' })
        })
      } catch (error) { console.error(error) }
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

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [comentarios])

  const enviarComentario = async () => {
    if (!nuevoComentario.trim()) return
    if (!usuarioNombre) { setMostrarModalNombre(true); return }
    setCargando(true)
    try {
      await fetch(`${API_URL}/api/comentarios/enviar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuario_nombre: usuarioNombre, comentario: nuevoComentario, votacion_id: 'segunda-vuelta' })
      })
      setNuevoComentario('')
      const res = await fetch(`${API_URL}/api/comentarios/listar?limit=50`)
      const data = await res.json()
      if (data.comentarios) setComentarios(data.comentarios)
    } catch (error) { console.error(error) }
    setCargando(false)
  }

  const guardarNombre = (nombre: string) => {
    const final = nombre.trim() || 'Anónimo'
    setUsuarioNombre(final)
    localStorage.setItem('chat_nombre', final)
    setMostrarModalNombre(false)
  }

  return (
    <>
      {/* Modal para nombre (igual) */}
      {mostrarModalNombre && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60] p-4">
          <div className="bg-gray-800 rounded-2xl p-6 max-w-md w-full">
            <h3 className="text-white font-bold text-xl mb-4">💬 Participa en el chat</h3>
            <p className="text-gray-400 text-sm mb-4">¿Cómo quieres aparecer?</p>
            <input
              type="text"
              placeholder="Ej: Juanito, Ana, o déjalo vacío para Anónimo"
              className="w-full bg-gray-700 border border-gray-600 rounded-xl px-4 py-3 text-white mb-4"
              onKeyPress={(e) => e.key === 'Enter' && guardarNombre(e.currentTarget.value)}
            />
            <button onClick={() => guardarNombre('')} className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold">
              Continuar como Anónimo
            </button>
          </div>
        </div>
      )}

      {/* Botón flotante para abrir el chat (cuando está minimizado) */}
      {minimizado && (
        <button
          onClick={() => setMinimizado(false)}
          className="fixed bottom-6 right-6 z-50 bg-blue-600 hover:bg-blue-500 text-white p-3 rounded-full shadow-xl transition-all flex items-center gap-2"
        >
          <MessageCircle size={24} />
          <span className="bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5 absolute -top-1 -right-1">
            {comentarios.length}
          </span>
        </button>
      )}

      {/* Panel de chat (visible si no minimizado) */}
      {!minimizado && (
        <div className="fixed bottom-6 right-6 z-50 w-80 h-96 bg-gray-900 rounded-2xl shadow-2xl border border-white/20 flex flex-col overflow-hidden transition-all">
          {/* Cabecera */}
          <div className="flex justify-between items-center p-3 bg-gray-800 border-b border-white/10">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-white font-bold text-sm">CHAT EN VIVO</span>
              <span className="text-xs bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded-full">{activos}</span>
            </div>
            <button onClick={() => setMinimizado(true)} className="text-white/50 hover:text-white">
              <Minimize2 size={16} />
            </button>
          </div>

          {/* Mensajes */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2 text-sm">
            {comentarios.length === 0 && (
              <div className="text-white/30 text-center py-6 text-xs">💬 No hay comentarios aún. ¡Sé el primero!</div>
            )}
            {comentarios.map((c, idx) => (
              <div key={idx} className="flex gap-2">
                <div className="w-6 h-6 rounded-full bg-gray-700 flex items-center justify-center text-[10px] font-bold">
                  {c.usuario_avatar || '👤'}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-1 flex-wrap">
                    <span className="text-white font-bold text-xs">{c.usuario_nombre}</span>
                    <span className="text-white/30 text-[9px]">{c.hora}</span>
                  </div>
                  <p className="text-gray-300 text-xs break-words">{c.comentario}</p>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-2 border-t border-white/10 bg-gray-800/50">
            <div className="flex gap-1">
              <input
                type="text"
                value={nuevoComentario}
                onChange={(e) => setNuevoComentario(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && enviarComentario()}
                placeholder="Escribe algo..."
                className="flex-1 bg-gray-700/50 border border-white/10 rounded-lg px-3 py-1.5 text-white text-xs placeholder-white/30 focus:outline-none focus:border-blue-500"
              />
              <button
                onClick={enviarComentario}
                disabled={cargando || !nuevoComentario.trim()}
                className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-lg disabled:opacity-50"
              >
                <Send size={14} />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
