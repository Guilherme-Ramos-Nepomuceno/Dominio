import { Skeleton } from "./skeleton"
import { cn } from "@/lib/utils"

// Uma linha de lista (transação, pendência, parcelamento...): ícone + duas
// linhas de texto + valor à direita.
export function SkeletonRow({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-4 p-4 rounded-2xl bg-card border border-border/50", className)}>
      <Skeleton className="w-10 h-10 rounded-full shrink-0" />
      <div className="flex-1 space-y-2 min-w-0">
        <Skeleton className="h-4 w-2/5" />
        <Skeleton className="h-3 w-1/4" />
      </div>
      <Skeleton className="h-5 w-16 shrink-0" />
    </div>
  )
}

export function SkeletonRowList({ count = 4, className }: { count?: number; className?: string }) {
  return (
    <div className={cn("space-y-3", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonRow key={i} />
      ))}
    </div>
  )
}

// Um card retangular genérico (cartão, reserva, objetivo...).
export function SkeletonCard({ className }: { className?: string }) {
  return <Skeleton className={cn("rounded-2xl min-h-45", className)} />
}

export function SkeletonCardGrid({ count = 3, className }: { count?: number; className?: string }) {
  return (
    <div className={cn("grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  )
}

// Saldo circular (Home).
export function SkeletonCircularBalance() {
  return (
    <div className="flex flex-col items-center py-8">
      <Skeleton className="w-40 h-40 rounded-full" />
      <Skeleton className="h-4 w-24 mt-4" />
    </div>
  )
}
