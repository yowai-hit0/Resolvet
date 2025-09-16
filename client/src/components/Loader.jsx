export function TableSkeleton({ rows = 5, cols = 6 }) {
  return (
    <div className="card-body">
      <div className="space-y-2">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="animate-pulse grid gap-3" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0,1fr))` }}>
            {Array.from({ length: cols }).map((_, j) => (
              <div key={j} className="h-4 bg-black/10 rounded" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function CardSkeleton({ lines = 3 }) {
  return (
    <div className="card-body space-y-2 animate-pulse">
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="h-4 bg-black/10 rounded" />
      ))}
    </div>
  );
}


