"use client"

import type { ReactNode } from "react"
import { spentProgress } from "@/lib/plan-layout"
import { cn } from "@/lib/utils"

// Peças visuais pequenas do planejamento, compartilhadas pela tela do mês, o
// detalhe do grupo e o onboarding.

export function SectionTitle({ children, id, className }: { children: ReactNode; id?: string; className?: string }) {
  return (
    <h2 id={id} className={cn("text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground", className)}>
      {children}
    </h2>
  )
}

// Bolinha da cor do grupo (identidade); null = "Livre" (só o contorno).
export function ColorDot({ color, className }: { color: string | null; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn("inline-block w-2.5 h-2.5 rounded-full shrink-0", !color && "ring-1 ring-inset ring-foreground/25", className)}
      style={{ backgroundColor: color ?? "var(--plan-track)" }}
    />
  )
}

// Barrinha fina gasto/planejado na cor do grupo; passou do planejado, fica vermelha.
export function SpentBar({
  spent,
  planned,
  color,
  className,
}: {
  spent: number
  planned: number
  color: string
  className?: string
}) {
  const p = spentProgress(spent, planned)
  return (
    <div className={cn("relative h-1 rounded-full overflow-hidden", className)} style={{ backgroundColor: "var(--plan-track)" }} aria-hidden>
      <div
        className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-500"
        style={{ width: `${p.pct}%`, backgroundColor: p.over ? "var(--expense)" : color }}
      />
    </div>
  )
}
