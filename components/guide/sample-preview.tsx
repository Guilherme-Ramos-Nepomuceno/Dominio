"use client"

import { useState, type ReactNode } from "react"
import { Info, Plus } from "@phosphor-icons/react"
import { SAMPLE_EXPLANATION } from "@/lib/samples"
import { cn } from "@/lib/utils"

export const QUICK_ADD_OPEN_EVENT = "quick-add:open"

// Abre o registro rápido de qualquer lugar da tela (o AppLayout escuta).
export function openQuickAdd() {
  window.dispatchEvent(new Event(QUICK_ADD_OPEN_EVENT))
}

// Uma parte da tela ainda sem dado: mostra como vai ficar com dados de
// exemplo — um pouco apagados e fora do alcance do toque e do leitor de tela.
// Embaixo, o selo "Exemplo" e o botão da ação que preenche de verdade. A
// explicação de que é fictício aparece ao passar o mouse (desktop) ou ao
// tocar no selo (celular). Nada fica por cima do exemplo.
export function SamplePreview({
  children,
  hint,
  ctaLabel = "Registrar um gasto",
  onCta = openQuickAdd,
}: {
  children: ReactNode
  // O que falta para liberar (ex.: "Registre gastos em 3 dias diferentes. 1 de 3.").
  hint?: string
  ctaLabel?: string
  onCta?: () => void
}) {
  const [open, setOpen] = useState(false)

  return (
    <div className="group">
      <div aria-hidden inert className="pointer-events-none select-none opacity-55 grayscale-30">
        {children}
      </div>

      <div className="mt-3 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground hover:text-foreground"
        >
          <Info size={12} weight="bold" aria-hidden />
          Exemplo
        </button>
        <button
          type="button"
          onClick={onCta}
          className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3.5 py-1.5 text-xs font-semibold text-background hover:bg-primary/90"
        >
          <Plus size={12} weight="bold" aria-hidden />
          {ctaLabel}
        </button>
      </div>

      <p className={cn("mt-2 text-xs text-muted-foreground text-pretty", open ? "block" : "hidden md:group-hover:block")}>
        {SAMPLE_EXPLANATION}
        {hint ? <span className="mt-0.5 block font-medium text-foreground">{hint}</span> : null}
      </p>
    </div>
  )
}
