interface StatsCardsProps {
  estadisticas: {
    total?: number
    rojos?: number
    naranjas?: number
    amarillos?: number
    verdes?: number
  } | null
}

export function StatsCards({ estadisticas }: StatsCardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {['Total', 'Rojo', 'Naranja', 'Amarillo', 'Verde'].map((label, index) => {
        const value =
          label === 'Total' ? estadisticas?.total ?? 0 :
          label === 'Rojo' ? estadisticas?.rojos ?? 0 :
          label === 'Naranja' ? estadisticas?.naranjas ?? 0 :
          label === 'Amarillo' ? estadisticas?.amarillos ?? 0 :
          estadisticas?.verdes ?? 0

        return (
          <div key={label} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <p className="text-sm text-gray-500">{label}</p>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
          </div>
        )
      })}
    </div>
  )
}
