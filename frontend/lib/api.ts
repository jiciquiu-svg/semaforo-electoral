import axios from 'axios'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

export async function fetcher(url: string) {
  const response = await api.get(url)
  return response.data
}

export async function buscarCandidatos(termino: string) {
  const response = await api.get(`/api/buscar?q=${encodeURIComponent(termino)}`)
  return response.data
}

export async function obtenerCandidato(dni: string) {
  const response = await api.get(`/api/candidatos/${dni}`)
  return response.data
}

export async function obtenerEstadisticas() {
  const response = await api.get('/api/estadisticas')
  return response.data
}

export async function compararCandidatos(dni1: string, dni2: string) {
  const response = await api.get(`/api/comparar?dni1=${dni1}&dni2=${dni2}`)
  return response.data
}