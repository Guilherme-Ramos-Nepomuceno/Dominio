"use client"
/* eslint-disable react-hooks/static-components -- o ícone vem de um mapa fixo (savingsRowIcon): é o mesmo componente a cada render, não um componente novo. */

import { useState } from "react"
import Link from "next/link"
import { ArrowsDownUp, Bank, CheckCircle } from "@phosphor-icons/react"
import { FormSheet, SheetPrimaryButton } from "@/components/ui/form-sheet"
import { formatCurrency } from "@/lib/date-utils"
import { freeOfSavings, savingsKindLabel } from "@/lib/goal-allocation"
import { formatMoneyWhole } from "@/lib/plan-layout"
import { composeSavings } from "@/lib/savings-composition"
import type { SavingsGoal } from "@/lib/types"
import { cn } from "@/lib/utils"
import { savingsRowIcon } from "./savings-row"

interface SavingsDetailSheetProps {
  reserve: SavingsGoal
  onClose: () => void
  onEdit: () => void
  onDelete: () => Promise<void>
  // Composição: abrir uma fonte, registrar dinheiro novo ou dar nome ao que está sem detalhar.
  onOpenSource: (id: string) => void
  onRegister: () => void
  onDetailRest: (amount: number) => void
}

// O que a linha da lista não mostra: saldo e meta com barra, para quais
// objetivos o dinheiro foi separado, o vínculo com o banco, guardar/retirar,
// editar e excluir (com uma confirmação no lugar, sem diálogo do navegador).
export function SavingsDetailSheet({ reserve, onClose, onEdit, onDelete, onOpenSource, onRegister, onDetailRest }: SavingsDetailSheetProps) {
  const [confirming, setConfirming] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const Icon = savingsRowIcon(reserve)
  const hasTarget = reserve.targetAmount > 0
  const pct = hasTarget ? (reserve.currentAmount / reserve.targetAmount) * 100 : 0
  const reached = hasTarget && reserve.currentAmount >= reserve.targetAmount
  const allocated = reserve.allocatedTo ?? []
  const composition = composeSavings(reserve)
  const hasLines = composition.bank.length > 0 || composition.sources.length > 0 || composition.rest > 0

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await onDelete()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não deu para excluir")
      setDeleting(false)
    }
  }

  return (
    <FormSheet
      title={reserve.name}
      onClose={onClose}
      footer={
        <div className="space-y-3">
          <SheetPrimaryButton type="button" onClick={onEdit}>
            Editar reserva
          </SheetPrimaryButton>
          {reserve.isDefault ? null : confirming ? (
            <div className="space-y-2 text-center">
              <p className="text-sm text-muted-foreground">
                {reserve.currentAmount > 0
                  ? `Esta reserva tem ${formatCurrency(reserve.currentAmount)}. Ao excluir, o valor some daqui${allocated.length > 0 ? " e dos objetivos" : ""}.`
                  : "Excluir esta reserva?"}
              </p>
              <div className="flex justify-center gap-5">
                <button type="button" onClick={() => setConfirming(false)} disabled={deleting} className="text-sm font-semibold text-muted-foreground hover:text-foreground">
                  Cancelar
                </button>
                <button type="button" onClick={handleDelete} disabled={deleting} className="text-sm font-semibold text-expense disabled:opacity-50">
                  {deleting ? "Excluindo..." : "Excluir mesmo"}
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirming(true)}
              className="w-full py-1 text-sm font-semibold text-muted-foreground underline decoration-muted-foreground/30 underline-offset-4 hover:text-expense"
            >
              Excluir reserva
            </button>
          )}
        </div>
      }
    >
      <div className="space-y-6">
        <div>
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Icon size={18} weight="duotone" aria-hidden />
            {savingsKindLabel(reserve.kind)}
            {reserve.isCasal && <span>· Casal</span>}
          </p>
          <p className="mt-2 font-display text-4xl font-semibold leading-none tracking-tight tabular-nums text-foreground">{formatCurrency(reserve.currentAmount)}</p>
          {hasTarget && (
            <>
              <p className="mt-2 flex items-baseline justify-between gap-3 text-sm tabular-nums text-muted-foreground">
                <span>de {formatMoneyWhole(reserve.targetAmount)}</span>
                {reached ? (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-positive-ink">
                    <CheckCircle size={14} weight="fill" aria-hidden />
                    Meta alcançada
                  </span>
                ) : (
                  <span>{Math.floor(pct)}%</span>
                )}
              </p>
              <div
                className="mt-2 h-1.5 overflow-hidden rounded-full"
                style={{ backgroundColor: "var(--plan-track)" }}
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.min(100, Math.round(pct))}
                aria-label={`${reserve.name}: ${Math.floor(pct)}% da meta`}
              >
                <div className={cn("h-full rounded-full transition-[width] duration-500", reached ? "bg-income" : "bg-foreground/60")} style={{ width: `${Math.min(pct, 100)}%` }} />
              </div>
            </>
          )}
        </div>

        {allocated.length > 0 && (
          <div className="space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Separado para objetivos</p>
            <ul className="divide-y divide-border">
              {allocated.map((a) => (
                <li key={a.goalId} className="flex items-baseline justify-between gap-3 py-2 text-sm">
                  <span className="truncate text-foreground">{a.goalName}</span>
                  <span className="shrink-0 tabular-nums text-muted-foreground">{formatCurrency(a.amount)}</span>
                </li>
              ))}
              <li className="flex items-baseline justify-between gap-3 py-2 text-sm">
                <span className="text-muted-foreground">Livre</span>
                <span className="shrink-0 font-semibold tabular-nums text-foreground">{formatCurrency(freeOfSavings(reserve))}</span>
              </li>
            </ul>
          </div>
        )}

        <div className="space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Em que está</p>
          {hasLines ? (
            <ul className="divide-y divide-border">
              {composition.bank.map((b) => (
                <li key={b.investmentId} className="flex items-baseline justify-between gap-3 py-2.5 text-sm">
                  <span className="flex min-w-0 items-center gap-1.5 text-foreground">
                    <Bank size={12} weight="bold" className="shrink-0 text-muted-foreground" aria-hidden />
                    <span className="truncate">{b.name}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">do banco</span>
                  </span>
                  <span className="shrink-0 tabular-nums text-foreground">{formatCurrency(b.amount)}</span>
                </li>
              ))}
              {composition.sources.map((s) => (
                <li key={s.id}>
                  <button type="button" onClick={() => onOpenSource(s.id)} className="flex w-full items-baseline justify-between gap-3 py-2.5 text-left text-sm transition-colors hover:bg-muted/40">
                    <span className="truncate text-foreground">{s.name}</span>
                    <span className="shrink-0 tabular-nums text-foreground">{formatCurrency(s.amount)}</span>
                  </button>
                </li>
              ))}
              {composition.rest > 0 && (
                <li className="flex items-baseline justify-between gap-3 py-2.5 text-sm">
                  <span className="text-muted-foreground">Sem detalhar</span>
                  <span className="flex shrink-0 items-baseline gap-3">
                    <button type="button" onClick={() => onDetailRest(composition.rest)} className="text-xs font-semibold text-foreground underline decoration-foreground/30 underline-offset-4 hover:decoration-foreground">
                      Dar nome
                    </button>
                    <span className="tabular-nums text-foreground">{formatCurrency(composition.rest)}</span>
                  </span>
                </li>
              )}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">Nada guardado aqui ainda.</p>
          )}
          <button type="button" onClick={onRegister} className="pt-2 text-sm font-semibold text-foreground underline decoration-foreground/30 underline-offset-4 hover:decoration-foreground">
            Registrar o que tenho guardado
          </button>
        </div>

        {/* Guardar/retirar passa pelo fluxo normal de Nova Transação (categoria
            Investimento), que atualiza o saldo desta reserva automaticamente. */}
        <Link
          href={`/new?goalId=${reserve.id}`}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-foreground underline decoration-foreground/30 underline-offset-4 hover:decoration-foreground"
        >
          <ArrowsDownUp size={14} weight="bold" aria-hidden />
          Guardar ou retirar
        </Link>

        {error && (
          <p role="alert" className="text-sm text-expense">
            {error}
          </p>
        )}
      </div>
    </FormSheet>
  )
}
