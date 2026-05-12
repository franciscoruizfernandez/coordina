// src/components/SkeletonCard.jsx

function SkeletonCard() {
  return (
    <div className="p-3 rounded shadow border-l-4 border-gray-200 animate-pulse">
      {/* Fila superior: tipologia + prioritat */}
      <div className="flex justify-between items-center mb-2">
        <div className="h-4 bg-gray-200 rounded w-24" />
        <div className="h-3 bg-gray-200 rounded w-12" />
      </div>
      {/* Fila inferior: temps */}
      <div className="h-3 bg-gray-100 rounded w-16" />
    </div>
  );
}

// Múltiples skeletons per a la llista
export function SkeletonLlista({ count = 6 }) {
  return (
    <div className="p-4 space-y-4">
      {/* Títol skeleton */}
      <div className="h-6 bg-gray-200 rounded w-40 animate-pulse" />

      {/* Cerca skeleton */}
      <div className="h-10 bg-gray-100 rounded animate-pulse" />

      {/* Filtres skeleton */}
      <div className="flex gap-2">
        <div className="h-7 bg-gray-100 rounded w-20 animate-pulse" />
        <div className="h-7 bg-gray-100 rounded w-20 animate-pulse" />
      </div>

      {/* Cards skeleton */}
      <div className="space-y-3">
        {Array.from({ length: count }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    </div>
  );
}

export default SkeletonCard;