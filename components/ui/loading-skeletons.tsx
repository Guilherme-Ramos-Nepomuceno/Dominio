import { Skeleton } from "./skeleton"
import { cn } from "@/lib/utils"

// Peças de carregamento no desenho das telas: listas soltas com divisórias,
// sem caixa em volta, e números grandes no topo em vez de cartões.

// Uma linha de lista (transação, pendência, categoria, regra...): ícone pequeno,
// duas linhas de texto e o valor à direita — como as linhas reais (py-3/py-4,
// separadas por divide-y).
export function SkeletonRow({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-3 py-3.5", className)}>
      <Skeleton className="h-5.5 w-5.5 shrink-0 rounded-full" />
      <div className="flex-1 min-w-0 space-y-1.5">
        <Skeleton className="h-3.5 w-2/5 rounded-full" />
        <Skeleton className="h-3 w-1/4 rounded-full" />
      </div>
      <Skeleton className="h-3.5 w-16 shrink-0 rounded-full" />
    </div>
  )
}

export function SkeletonRowList({ count = 4, className }: { count?: number; className?: string }) {
  return (
    <div className={cn("divide-y divide-border", className)} aria-hidden>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonRow key={i} />
      ))}
    </div>
  )
}

// Título de seção (o rótulo pequeno em caixa alta) seguido da lista.
export function SkeletonSection({ count = 3, className }: { count?: number; className?: string }) {
  return (
    <div className={className} aria-hidden>
      <Skeleton className="h-3 w-24 rounded-full" />
      <SkeletonRowList count={count} className="mt-1" />
    </div>
  )
}

// Herói: rótulo, número grande e uma linha de apoio (Home, Planejar, Reservas...).
export function SkeletonHero({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-3", className)} aria-hidden>
      <Skeleton className="h-4 w-40 rounded-full" />
      <Skeleton className="h-12 w-56 rounded-xl" />
      <Skeleton className="h-4 w-64 rounded-full" />
    </div>
  )
}

// Resumo lado a lado ("Nas contas · Em faturas", "A pagar · A receber").
export function SkeletonSummary({ count = 2, className }: { count?: number; className?: string }) {
  return (
    <div className={cn("flex items-baseline gap-6", className)} aria-hidden>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-3 w-16 rounded-full" />
          <Skeleton className="h-7 w-28 rounded-lg" />
        </div>
      ))}
    </div>
  )
}

// Um card retangular genérico (Objetivos ainda usa cards).
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
