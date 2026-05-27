'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Shield, ExternalLink, X } from 'lucide-react'

export function LegalFooter() {
  const [mostrarPoliticas, setMostrarPoliticas] = useState(false)

  return (
    <>
      <footer className="bg-gray-900 text-white/60 py-6 mt-12 border-t border-white/10">
        <div className="container mx-auto px-4 text-center">
          <div className="flex flex-wrap justify-center gap-4 mb-3 text-xs">
            <button 
              onClick={() => setMostrarPoliticas(true)}
              className="hover:text-white transition-colors"
            >
              📋 Aviso Legal
            </button>
            <span className="text-white/20">|</span>
            <button 
              onClick={() => setMostrarPoliticas(true)}
              className="hover:text-white transition-colors"
            >
              🔒 Políticas de Privacidad
            </button>
            <span className="text-white/20">|</span>
            <button className="hover:text-white transition-colors">
              📧 Contacto
            </button>
          </div>
          
          <p className="text-[10px] leading-relaxed max-w-2xl mx-auto">
            La información mostrada en <strong className="text-white">CANDIDATO AL DESNUDO</strong> es recopilada exclusivamente de 
            bases de datos públicos oficiales del Estado Peruano (JNE, ONPE, CGR, Poder Judicial, SUNEDU, SUNAT). 
            Esta plataforma NO altera, modifica ni interpreta los datos fuente. 
            Al usar este sitio, aceptas nuestros <button onClick={() => setMostrarPoliticas(true)} className="text-blue-400 hover:underline">Términos de Uso</button> y 
            <button onClick={() => setMostrarPoliticas(true)} className="text-blue-400 hover:underline"> Políticas de Privacidad</button>.
          </p>
          
          <p className="text-[9px] mt-3 text-white/30">
            © 2026 Candidato al Desnudo - Proyecto de Transparencia Electoral Ciudadana
          </p>
        </div>
      </footer>

      {/* Modal de Políticas y Aviso Legal */}
      <AnimatePresence>
        {mostrarPoliticas && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-4"
            onClick={() => setMostrarPoliticas(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 50 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 50 }}
              className="bg-gray-900 rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto border border-white/10"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="sticky top-0 bg-gray-900 p-4 border-b border-white/10 flex justify-between items-center z-10">
                <h2 className="text-xl font-bold text-white">📋 Aviso Legal y Políticas</h2>
                <button onClick={() => setMostrarPoliticas(false)} className="text-white/60 hover:text-white">
                  <X size={24} />
                </button>
              </div>
              
              <div className="p-6 space-y-6 text-white/80 text-sm">
                {/* Aviso Legal */}
                <div>
                  <h3 className="text-white font-bold text-lg mb-3 flex items-center gap-2">
                    <Shield size={20} className="text-blue-400" /> Aviso Legal
                  </h3>
                  <p className="mb-3">
                    <strong>CANDIDATO AL DESNUDO</strong> es una herramienta ciudadana de transparencia electoral 
                    que NO tiene afiliación política ni partidaria.
                  </p>
                  <p className="mb-3">
                    La información presentada en esta plataforma es extraída de fuentes oficiales y públicas del 
                    Estado Peruano, incluyendo:
                  </p>
                  <ul className="list-disc list-inside space-y-1 ml-4 mb-4 text-white/60">
                    <li>Jurado Nacional de Elecciones (JNE) - Plataforma Electoral y Declara+</li>
                    <li>Oficina Nacional de Procesos Electorales (ONPE) - CLARIDAD</li>
                    <li>Contraloría General de la República (CGR) - Declaraciones Juradas</li>
                    <li>Poder Judicial del Perú - Consulta de Expedientes (CAPE)</li>
                    <li>SUNEDU - Registro Nacional de Grados y Títulos</li>
                    <li>SUNAT - Consulta RUC y Deuda Coactiva</li>
                    <li>Portal de Transparencia del Estado Peruano</li>
                  </ul>
                  <p className="text-yellow-400/80 text-xs p-3 bg-yellow-500/10 rounded-lg">
                    ⚠️ <strong>Nota importante:</strong> Esta plataforma NO modifica, altera ni interpreta los datos fuente. 
                    La información se presenta TAL CUAL es proporcionada por las entidades oficiales. 
                    Para verificar la exactitud de los datos, consulte directamente las fuentes oficiales.
                  </p>
                </div>

                {/* Políticas de Privacidad */}
                <div className="border-t border-white/10 pt-4">
                  <h3 className="text-white font-bold text-lg mb-3">🔒 Políticas de Privacidad</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-white font-semibold mb-1">1. Datos Recopilados</h4>
                      <p className="text-white/60 text-sm">Esta plataforma recopila únicamente información pública de candidatos. 
                      NO solicitamos ni almacenamos datos personales de los visitantes como nombres, correos electrónicos 
                      o números de teléfono.</p>
                    </div>

                    <div>
                      <h4 className="text-white font-semibold mb-1">2. Cookies y Analytics</h4>
                      <p className="text-white/60 text-sm">Utilizamos cookies anónimas para medir estadísticas de uso 
                      (cantidad de visitas, candidatos más consultados). No compartimos estos datos con terceros.</p>
                    </div>

                    <div>
                      <h4 className="text-white font-semibold mb-1">3. Enlaces a Terceros</h4>
                      <p className="text-white/60 text-sm">Los perfiles de candidatos contienen enlaces a fuentes oficiales 
                      (JNE, ONPE, etc.). No somos responsables por el contenido o políticas de privacidad de estos sitios.</p>
                    </div>

                    <div>
                      <h4 className="text-white font-semibold mb-1">4. Derecho de Rectificación</h4>
                      <p className="text-white/60 text-sm">Si un candidato considera que algún dato es incorrecto, puede contactarnos 
                      para verificar la fuente oficial. Toda corrección debe ser validada contra la entidad emisora original.</p>
                    </div>

                    <div>
                      <h4 className="text-white font-semibold mb-1">5. Contacto</h4>
                      <p className="text-white/60 text-sm">Para consultas sobre estas políticas: <strong>contacto@candidatoaldesnudo.pe</strong></p>
                    </div>
                  </div>
                </div>

                {/* Términos de Uso */}
                <div className="border-t border-white/10 pt-4">
                  <h3 className="text-white font-bold text-lg mb-3">📜 Términos de Uso</h3>
                  <p className="text-white/60 text-sm mb-2">
                    Al utilizar esta plataforma, usted acepta:
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-white/60 text-sm ml-4">
                    <li>Usar la información únicamente con fines informativos y electorales</li>
                    <li>No reproducir, distribuir o modificar el contenido sin autorización</li>
                    <li>No utilizar los datos para acoso, difamación o campañas de desinformación</li>
                    <li>Verificar los datos directamente con las fuentes oficiales antes de tomar decisiones</li>
                    <li>No sobrecargar los servidores con scraping automatizado no autorizado</li>
                  </ul>
                </div>

                {/* Fuentes */}
                <div className="border-t border-white/10 pt-4">
                  <h3 className="text-white font-bold text-lg mb-3">📌 Fuentes Oficiales</h3>
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <a href="https://plataformaelectoral.jne.gob.pe" target="_blank" className="text-blue-400 hover:underline flex items-center gap-1">
                      JNE Plataforma Electoral <ExternalLink size={10} />
                    </a>
                    <a href="https://declara.jne.gob.pe" target="_blank" className="text-blue-400 hover:underline flex items-center gap-1">
                      JNE Declara+ <ExternalLink size={10} />
                    </a>
                    <a href="https://claridad.onpe.gob.pe" target="_blank" className="text-blue-400 hover:underline flex items-center gap-1">
                      ONPE CLARIDAD <ExternalLink size={10} />
                    </a>
                    <a href="https://enlinea.sunedu.gob.pe" target="_blank" className="text-blue-400 hover:underline flex items-center gap-1">
                      SUNEDU <ExternalLink size={10} />
                    </a>
                  </div>
                </div>

                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 text-center text-xs text-white/60">
                  <strong className="text-white">CANDIDATO AL DESNUDO</strong> es un proyecto ciudadano independiente de transparencia electoral. 
                  No está afiliado a ningún partido político, entidad gubernamental u organización comercial.
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
