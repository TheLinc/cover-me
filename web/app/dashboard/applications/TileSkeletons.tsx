import { Skeleton } from '@/components/ui/skeleton'

// Placeholder tiles in the tile grid, while applications load.
export function TileSkeletons({ count, label }: { count: number; label: string }) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2" aria-label={label}>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="flex flex-col gap-4 rounded-[20px] border border-line/80 bg-surface p-5">
          <div className="flex gap-3">
            <Skeleton className="size-10 rounded-[12px] bg-panel" />
            <div className="flex flex-1 flex-col gap-2 pt-1">
              <Skeleton className="h-3.5 w-2/3 bg-panel" />
              <Skeleton className="h-3 w-1/2 bg-panel" />
            </div>
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-8 w-28 rounded-full bg-panel" />
            <Skeleton className="h-8 w-24 rounded-full bg-panel" />
          </div>
        </div>
      ))}
    </div>
  )
}
