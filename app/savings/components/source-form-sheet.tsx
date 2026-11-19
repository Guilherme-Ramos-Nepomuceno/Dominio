"use client"

import { useState } from "react"
import type React from "react"
import { FormSheet, SheetPrimaryButton, UnderlineInput } from "@/components/ui/form-sheet"
import { AppSelect } from "@/components/ui/app-select"
import { formatCurrency, formatCurrencyInput, parseCurrencyInput } from "@/lib/date-utils"
import { composeSavings } from "@/lib/savings-composition"
import type { SavingsGoal } from "@/lib/types"
import { cn } from "@/lib/utils"

interface SourceFormSheetProps {
  // Reservas para escolher (sem a padrão: sem escolher, vai para Guardado).
  reserves: SavingsGoal[]
  initialReserveId?: string
  // Aberto pelo "Detalhar" de uma reserva com saldo sem detalhar.
  initialFromRest?: boolean
  initialAmount?: number
  onClose: () => void
  onSave: (input: { name: string; amount: number; savingsGoalId?: string; fromRest?: boolean }) => Promise<void>
}

const LABEL = "text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground"

// "Registrar o que tenho guardado": só um nome ("Poupança", "CDB do banco X",
// "Dinheiro em casa") e o valor. Sem cartão, sem instituição. Sem reserva
// escolhida, entra em Guardado e a pessoa direciona depois.
export function SourceFormSheet({ reserves, initialReserveId, initialFromRest, initialAmount, onClose, onSave }: SourceFormSheetProps) {
  const [name, setName] = useState("")
  const [amountText, setAmountText] = useState(() => (initialAmount && initialAmount > 0 ? formatCurrencyInput(String(Math.round(initialAmount * 100))) : ""))
  const [reserveId, setReserveId] = useState(initialReserveId ?? "")
  const [fromRest, setFromRest] = useState(!!initialFromRest)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reserve = reserves.find((r) => r.id === reserveId)
  const rest = reserve ? composeSavings(reserve).rest : 0
  // Só faz sentido detalhar o que já existe quando a reserva tem saldo sem detalhar.
  const canUseRest = rest > 0

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (submitting) return
    if (!name.trim()) return setError("Dê um nome ao que está guardado")
    const amount = parseCurrencyInput(amountText)
    if (!Number.isFinite(amount) || amount <= 0) return setError("Informe o valor")
    const detail = canUseRest && fromRest
    if (detail && amount > rest + 0.000001) return setError(`Só há ${formatCurrency(rest)} sem detalhar nesta reserva`)

    setSubmitting(true)
    try {
      await onSave({ name: name.trim(), amount, savingsGoalId: reserveId || undefined, fromRest: detail || undefined })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não deu para salvar")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <FormSheet
      title="Registrar o que tenho guardado"
      onClose={onClose}
      onSubmit={handleSubmit}
      footer={<SheetPrimaryButton disabled={submitting}>{submitting ? "Salvando..." : "Registrar"}</SheetPrimaryButton>}
    >
      <div className="space-y-6">
        <label className="block space-y-1">
          <span className={LABEL}>Onde está</span>
          <UnderlineInput value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Poupança, CDB do banco X, Dinheiro em casa" autoFocus />
        </label>

        <label className="block space-y-1">
          <span className={LABEL}>Quanto</span>
          <span className="flex items-baseline gap-2">
            <span className="text-muted-foreground">R$</span>
            <UnderlineInput
              inputMode="decimal"
              value={amountText}
              onChange={(e) => setAmountText(formatCurrencyInput(e.target.value))}
              placeholder="0,00"
              className="font-display text-2xl tabular-nums"
            />
          </span>
        </label>

        <div className="space-y-1">
          <span className={LABEL}>Para qual reserva</span>
          <AppSelect
            variant="field"
            aria-label="Reserva"
            value={reserveId}
            onChange={setReserveId}
            emptyLabel="Guardado (decido depois)"
            options={reserves.map((r) => ({ value: r.id, label: r.name }))}
          />
        </div>

        {canUseRest && (
          <button type="button" role="switch" aria-checked={fromRest} onClick={() => setFromRest((v) => !v)} className="flex w-full items-center gap-3 border-t border-border pt-4 text-left">
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-foreground">Já está no saldo desta reserva</span>
              <span className="block text-xs text-muted-foreground">
                {fromRest ? `Só dá nome ao que já estava (${formatCurrency(rest)} sem detalhar), sem somar de novo.` : "Dinheiro novo: o saldo da reserva sobe."}
              </span>
            </span>
            <span className={cn("relative h-6 w-11 shrink-0 rounded-full transition-colors", fromRest ? "bg-foreground" : "bg-muted")} aria-hidden>
              <span className={cn("absolute top-0.5 h-5 w-5 rounded-full bg-background transition-all", fromRest ? "left-5" : "left-0.5")} />
            </span>
          </button>
        )}

        {error && (
          <p role="alert" className="text-sm text-expense">
            {error}
          </p>
        )}
      </div>
    </FormSheet>
  )
}
