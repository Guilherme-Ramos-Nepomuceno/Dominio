import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

// Desktop largo (≥ 1280px): a página corrida vira "principal + painel".
// A principal fica à esquerda, limpa como no celular; o painel de apoio fica
// à direita, colado à borda, num tom levemente diferente (desenhado pelo
// AppLayout `wide`, de cima a baixo) e fixo ao rolar. Sem caixas em volta das
// seções (ADR-013).
//
// No celular os dois grupos "se desfazem" (display: contents) e cada seção
// volta para a posição de sempre pelo `order` — a ordem do celular não muda.

// Largura da página: estreita no celular/tablet; no desktop, a tela toda.
export const PAGE_WIDTH = "max-w-2xl xl:max-w-none mx-auto"

export function Bento({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("flex flex-col gap-12 xl:flex-row xl:items-start xl:gap-0", className)}>{children}</div>
}

export function BentoMain({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("contents xl:block xl:min-w-0 xl:flex-1 xl:space-y-14 xl:pr-12", className)}>{children}</div>
}

// Painel de apoio: largura fixa (--panel-w), encostado na borda direita
// (anula o respiro do AppLayout) e fixo ao rolar.
export function BentoAside({ children, className, label }: { children: ReactNode; className?: string; label?: string }) {
  return (
    <aside
      aria-label={label}
      className={cn(
        "contents xl:block xl:w-(--panel-w) xl:shrink-0 xl:-mr-10 xl:pl-8 xl:pr-10",
        "xl:sticky xl:top-8 xl:max-h-[calc(100vh-4rem)] xl:overflow-y-auto xl:space-y-12",
        className,
      )}
    >
      {children}
    </aside>
  )
}

// Posição da seção no celular (1 = primeira). Lista fixa para o Tailwind
// gerar as classes.
const ORDER: Record<number, string> = {
  1: "order-1",
  2: "order-2",
  3: "order-3",
  4: "order-4",
  5: "order-5",
  6: "order-6",
  7: "order-7",
  8: "order-8",
  9: "order-9",
  10: "order-10",
  11: "order-11",
  12: "order-12",
}

export function BentoTile({ order, children, className }: { order: number; children: ReactNode; className?: string }) {
  return <div className={cn("min-w-0", ORDER[order], className)}>{children}</div>
}
