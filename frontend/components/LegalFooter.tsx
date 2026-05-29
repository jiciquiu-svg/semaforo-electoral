// frontend/components/LegalFooter.tsx
'use client'

import { useState } from 'react'
import { X, ExternalLink } from 'lucide-react'

export function LegalFooter() {
  const [mostrarAviso, setMostrarAviso] = useState(false)
  const [mostrarPoliticas, setMostrarPoliticas] = useState(false)
  const [mostrarTerminos, setMostrarTerminos] = useState(false)

  return (
    <>
      <footer className="w-full mt-8 pt-4 border-t border-white/10 text-center">
        <div className="text-white/30 text-[10px] space-x-3">
          <button onClick={() => setMostrarAviso(true)} className="hover:text-white/60">
            📋 Aviso Legal
          </button>
          <span>|</span>
          <button onClick={() => setMostrarPoliticas(true)} className="hover:text-white/60">
            🔒 Políticas de Privacidad
          </button>
          <span>|</span>
          <button onClick={() => setMostrarTerminos(true)} className="hover:text-white/60">
            📜 Términos de Uso
          </button>
        </div>
        <p className="text-white/20 text-[9px] mt-2">
          © 2026 Candidato al Desnudo - Simulador Electoral Ciudadano
        </p>
      </footer>

      {/* Modal Aviso Legal */}
      {mostrarAviso && (
        <ModalContent title="📋 Aviso Legal" onClose={() => setMostrarAviso(false)}>
          <p className="mb-3">CANDIDATO AL DESNUDO es una herramienta ciudadana de transparencia electoral que NO tiene afiliación política ni partidaria.</p>
          <p className="mb-2 font-semibold">Fuentes oficiales:</p>
          <ul className="list-disc list-inside mb-3 text-white/70">
            <li>JNE - Plataforma Electoral y Declara+</li>
            <li>ONPE - CLARIDAD</li>
            <li>CGR - Declaraciones Juradas</li>
            <li>Poder Judicial - CAPE</li>
            <li>SUNEDU</li>
            <li>SUNAT</li>
            <li>Portal de Transparencia</li>
          </ul>
          <p className="text-yellow-400/80 text-xs">⚠️ Esta plataforma NO modifica ni interpreta los datos fuente. Verifique directamente en las fuentes oficiales.</p>
        </ModalContent>
      )}

      {/* Modal Políticas de Privacidad */}
      {mostrarPoliticas && (
        <ModalContent title="🔒 Políticas de Privacidad" onClose={() => setMostrarPoliticas(false)}>
          <p><strong>1. Datos recopilados:</strong> Solo información pública de candidatos. No almacenamos datos personales de visitantes.</p>
          <p className="mt-2"><strong>2. Cookies:</strong> Uso anónimo para estadísticas.</p>
          <p className="mt-2"><strong>3. Enlaces a terceros:</strong> No responsables del contenido externo.</p>
          <p className="mt-2"><strong>4. Rectificación:</strong> Contacto para correcciones.</p>
          <p className="mt-2"><strong>5. Contacto:</strong> <a href="mailto:contacto@candidatoaldesnudo.pe" className="text-blue-400">contacto@candidatoaldesnudo.pe</a></p>
        </ModalContent>
      )}

      {/* Modal Términos de Uso */}
      {mostrarTerminos && (
        <ModalContent title="📜 Términos de Uso" onClose={() => setMostrarTerminos(false)}>
          <p>Al usar esta plataforma, aceptas:</p>
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li>Usar la información solo con fines informativos/electorales</li>
            <li>No reproducir ni modificar el contenido sin autorización</li>
            <li>No usar los datos para acoso o desinformación</li>
            <li>Verificar datos con fuentes oficiales</li>
            <li>No sobrecargar los servidores con scraping</li>
          </ul>
          <p className="mt-3 text-xs text-white/50">CANDIDATO AL DESNUDO es un proyecto ciudadano independiente.</p>
        </ModalContent>
      )}
    </>
  )
}

// Componente auxiliar para modales
function ModalContent({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto border border-white/10">
        <div className="sticky top-0 bg-gray-900 p-4 border-b border-white/10 flex justify-between items-center">
          <h2 className="text-white font-bold text-xl">{title}</h2>
          <button onClick={onClose} className="text-white/60 hover:text-white"><X size={24} /></button>
        </div>
        <div className="p-6 text-white/80 text-sm">{children}</div>
      </div>
    </div>
  )
}
