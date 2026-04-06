import useSWR from 'swr'
import { fetcher } from '@/lib/api'

export function useCandidato(dni: string) {
  const { data, error, isLoading } = useSWR(
    dni ? `/api/candidatos/${dni}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    }
  )

  return {
    candidato: data,
    loading: isLoading,
    error: error?.message,
  }
}