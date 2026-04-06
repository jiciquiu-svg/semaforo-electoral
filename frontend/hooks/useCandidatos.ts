import useSWR from 'swr'
import { fetcher } from '@/lib/api'

interface Filters {
  partido: string
  region: string
  cargo: string
  nivel: string
  busqueda: string
}

export function useCandidatos(filters: Filters) {
  const params = new URLSearchParams()
  if (filters.partido) params.append('partido', filters.partido)
  if (filters.region) params.append('region', filters.region)
  if (filters.cargo) params.append('cargo', filters.cargo)
  if (filters.nivel) params.append('nivel', filters.nivel)
  if (filters.busqueda) params.append('q', filters.busqueda)

  const url = `/api/candidatos?${params.toString()}`
  
  const { data, error, isLoading, mutate } = useSWR(url, fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    dedupingInterval: 60000, // 1 minuto
  })

  return {
    candidatos: data?.candidatos || [],
    loading: isLoading,
    error: error?.message,
    total: data?.total || 0,
    estadisticas: data?.estadisticas || null,
    mutate
  }
}