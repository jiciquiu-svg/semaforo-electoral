interface NivelBadgeProps {
  nivel: string
}

const colors = {
  verde: 'bg-green-500 text-white',
  amarillo: 'bg-yellow-500 text-white',
  naranja: 'bg-orange-500 text-white',
  rojo: 'bg-red-600 text-white',
}

export function NivelBadge({ nivel }: NivelBadgeProps) {
  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold ${colors[nivel as keyof typeof colors] ?? 'bg-gray-300 text-gray-700'}`}>
      {nivel?.toUpperCase()}
    </span>
  )
}
