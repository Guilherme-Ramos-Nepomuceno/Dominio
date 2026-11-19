"use client"

import { Info, X } from "@phosphor-icons/react"
import type { SavingsAdjustment } from "@/lib/storage"

interface AdjustmentNoticesProps {
  notices: SavingsAdjustment[]
  onFix: (notice: SavingsAdjustment) => void
  onDismiss: (id: string) => void
}

// O app ajustou sozinho as reservas (resgate no banco, retirada que reduziu o
// separado para objetivos). Fica à vista até a pessoa dispensar, com "Corrigir"
// quando o aviso vem de um investimento, que abre a divisão dele.
export function AdjustmentNotices({ notices, onFix, onDismiss }: AdjustmentNoticesProps) {
  if (notices.length === 0) return null
  return (
    <ul className="mx-auto mb-8 max-w-2xl divide-y divide-border border-y border-border" aria-label="Ajustes automáticos">
      {notices.map((notice) => (
        <li key={notice.id} className="flex items-start gap-3 py-3">
          <Info size={18} weight="duotone" className="mt-0.5 shrink-0 text-muted-foreground" aria-hidden />
          <p className="min-w-0 flex-1 text-sm text-foreground">{notice.message}</p>
          <div className="flex shrink-0 items-center gap-1">
            {notice.investmentId && (
              <button type="button" onClick={() => onFix(notice)} className="rounded-lg px-2 py-1 text-sm font-semibold text-foreground underline decoration-foreground/30 underline-offset-4 hover:decoration-foreground">
                Corrigir
              </button>
            )}
            <button type="button" onClick={() => onDismiss(notice.id)} aria-label="Dispensar aviso" className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
              <X size={14} weight="bold" />
            </button>
          </div>
        </li>
      ))}
    </ul>
  )
}
