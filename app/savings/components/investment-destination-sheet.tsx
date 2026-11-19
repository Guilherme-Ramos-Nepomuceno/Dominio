"use client"

import { useState } from "react"
import type React from "react"
import { FormSheet, SheetPrimaryButton, UnderlineInput } from "@/components/ui/form-sheet"
import { formatCurrency, formatCurrencyInput, parseCurrencyInput } from "@/lib/date-utils"
import { savingsKindLabel } from "@/lib/goal-allocation"
import { remainderAfter } from "@/lib/savings-composition"
import type { PluggyInvestment } from "@/lib/storage"
import type { SavingsGoal } from "@/lib/types"
import { cn } from "@/lib/utils"

interface InvestmentDestinationSheetProps {
  investment: PluggyInvestment
  // Reservas que a pessoa criou (sem a padrão Guardado, que recebe o resto).
  reserves: SavingsGoal[]
  onClose: () => void
  onSave: (allocations: { savingsGoalId: string; amount: number }[]) => Promise<void>
  onCreateReserve: () => void
}

const toInput = (value: number) => (value > 0 ? formatCurrencyInput(String(Math.round(value * 100))) : "")

// Para onde vai o valor de um investimento do banco. A pessoa divide entre as
// reservas; o que ela não direciona fica em Guardado, que não pede nada.
export function InvestmentDestinationSheet({ investment, reserves, onClose, onSave, onCreateReserve }: InvestmentDestinationSheetProps) {
  const [amounts, setAmounts] = useState<Record<string, string>>(() =>
    Object.fromEntries(investment.allocations.map((a) => [a.savingsGoalId, toInput(a.amount)])),
  )
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const parsed = reserves.map((r) => ({ reserve: r, amount: amounts[r.id]?.trim() ? parseCurrencyInput(amounts[r.id]) : 0 }))
  const remainder = remainderAfter(investment.balance, parsed.map((p) => (Number.isFinite(p.amount) ? p.amount : 0)))
  const over = remainder < -0.000001

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (submitting) return
    if (parsed.some((p) => !Number.isFinite(p.amount) || p.amount < 0)) return setError("Informe valores válidos")
    if (over) return setError(`Passa ${formatCurrency(-remainder)} do valor do investimento`)

    setSubmitting(true)
    try {
      await onSave(parsed.filter((p) => p.amount > 0).map((p) => ({ savingsGoalId: p.reserve.id, amount: p.amount })))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não deu para salvar")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <FormSheet
      title="Para onde vai esse valor"
      onClose={onClose}
      onSubmit={handleSubmit}
      footer={<SheetPrimaryButton disabled={submitting || over}>{submitting ? "Salvando..." : "Salvar"}</SheetPrimaryButton>}
    >
      <div className="space-y-6">
        <div>
          <p className="truncate text-sm text-muted-foreground">{investment.name}</p>
          <p className="mt-1 font-display text-4xl font-semibold leading-none tracking-tight tabular-nums text-foreground">{formatCurrency(investment.balance)}</p>
        </div>

        {reserves.length > 0 ? (
          <ul className="divide-y divide-border">
            {parsed.map(({ reserve }) => (
              <li key={reserve.id} className="flex items-center gap-3 py-2.5">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-foreground">{reserve.name}</span>
                  <span className="block text-xs text-muted-foreground">{savingsKindLabel(reserve.kind)}</span>
                </span>
                <span className="flex shrink-0 items-baseline gap-1.5">
                  <span className="text-sm text-muted-foreground">R$</span>
                  <UnderlineInput
                    inputMode="decimal"
                    aria-label={`Quanto vai para ${reserve.name}`}
                    value={amounts[reserve.id] ?? ""}
                    onChange={(e) => setAmounts((prev) => ({ ...prev, [reserve.id]: formatCurrencyInput(e.target.value) }))}
                    placeholder="0,00"
                    className="w-28 text-right tabular-nums"
                  />
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">
            Você ainda não tem reservas para dividir este valor. Ele fica em Guardado.{" "}
            <button type="button" onClick={onCreateReserve} className="font-semibold text-foreground underline decoration-foreground/30 underline-offset-4">
              Criar uma reserva
            </button>
          </p>
        )}

        <p className={cn("flex items-baseline justify-between gap-3 border-t border-border pt-4 text-sm tabular-nums", over ? "text-expense" : "text-muted-foreground")}>
          <span>{over ? "Passou do valor" : "Fica em Guardado"}</span>
          <span className="font-semibold">{formatCurrency(Math.abs(remainder))}</span>
        </p>

        {error && (
          <p role="alert" className="text-sm text-expense">
            {error}
          </p>
        )}
      </div>
    </FormSheet>
  )
}
