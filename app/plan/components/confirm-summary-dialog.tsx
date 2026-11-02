"use client"

import { useEffect } from "react"
import Link from "next/link"
import { CheckCircle } from "@phosphor-icons/react"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { trackEvent } from "@/lib/events"
import type { Plan } from "@/lib/plan"
import { confirmSummary, confirmSummaryLines } from "@/lib/wins"

interface ConfirmSummaryDialogProps {
  open: boolean
  plan: Plan | null
  onClose: () => void
}

// Momento de confirmação: um resumo amigável do mês que acabou de ser
// organizado. Animação discreta (o círculo "assenta" com escala curta, o
// resto entra em fade) e respeita prefers-reduced-motion.
export function ConfirmSummaryDialog({ open, plan, onClose }: ConfirmSummaryDialogProps) {
  useEffect(() => {
    if (open) trackEvent("plan_confirmed_summary_viewed")
  }, [open])

  const lines = plan ? confirmSummaryLines(confirmSummary(plan)) : []
  const showWeek = !!plan?.weeklyLimitEnabled

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-w-sm rounded-3xl text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-income/20 animate-in zoom-in-50 duration-500 motion-reduce:animate-none">
          <CheckCircle size={30} weight="fill" className="text-positive-ink" aria-hidden />
        </span>
        <DialogTitle className="mt-1 text-xl font-bold">Mês organizado</DialogTitle>
        <DialogDescription className="sr-only">Resumo do plano confirmado</DialogDescription>
        {lines.length > 0 ? (
          <ul className="space-y-1.5 animate-in fade-in duration-700 motion-reduce:animate-none">
            {lines.map((line) => (
              <li key={line} className="text-sm text-foreground tabular-nums">
                {line}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">Cada real do mês já tem destino.</p>
        )}
        <div className="mt-2 flex flex-col gap-2">
          {showWeek && (
            <Link
              href="/week"
              onClick={onClose}
              className="inline-flex h-11 items-center justify-center rounded-full bg-primary text-sm font-semibold text-background"
            >
              Ver minha semana
            </Link>
          )}
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-11 items-center justify-center rounded-full border border-border text-sm font-semibold text-foreground hover:bg-foreground/5"
          >
            Fechar
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
