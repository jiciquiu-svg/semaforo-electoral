export function PartidosRanking() {
  const partidos = [
    { name: 'Partido A', score: 95 },
    { name: 'Partido B', score: 88 },
    { name: 'Partido C', score: 76 },
  ]

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {partidos.map((partido) => (
        <div key={partido.name} className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
          <p className="text-sm text-gray-500">{partido.name}</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">{partido.score}%</p>
        </div>
      ))}
    </div>
  )
}
