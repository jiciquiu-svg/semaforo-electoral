// frontend/lib/session.ts
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001'

export function getSessionId(): string {
  if (typeof window === 'undefined') return ''
  
  let sessionId = localStorage.getItem('voter_session_id')
  
  if (!sessionId) {
    sessionId = `${Date.now()}-${Math.random().toString(36).substring(2)}-${Math.random().toString(36).substring(2, 6)}`
    localStorage.setItem('voter_session_id', sessionId)
  }
  
  return sessionId
}

export async function hasVoted(sessionId: string): Promise<boolean> {
  if (!sessionId) return false
  
  try {
    const response = await fetch(`${API_URL}/api/segunda-vuelta/verificar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: sessionId })
    })
    const data = await response.json()
    return data.yaVoto === true
  } catch (error) {
    console.error('Error verificando voto:', error)
    return false
  }
}

export async function registrarVoto(
  sessionId: string, 
  candidatoId: string, 
  candidatoNombre: string, 
  votosCategorias: Record<string, string>
): Promise<boolean> {
  if (!sessionId) return false
  
  try {
    const response = await fetch(`${API_URL}/api/segunda-vuelta/registrar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: sessionId,
        candidato_id: candidatoId,
        candidato_nombre: candidatoNombre,
        votos_categorias: votosCategorias
      })
    })
    return response.ok
  } catch (error) {
    console.error('Error registrando voto:', error)
    return false
  }
}
