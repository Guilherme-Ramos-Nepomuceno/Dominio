"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import type React from "react"
import { FormSheet, SheetPrimaryButton, UnderlineInput } from "@/components/ui/form-sheet"
import { AppSelect } from "@/components/ui/app-select"
import { formatCurrency, formatCurrencyInput, parseCurrencyInput } from "@/lib/date-utils"
import { allocationFor, availableForGoal, savingsKindLabel, validateAllocationAmount } from "@/lib/goal-allocation"
import type { Goal, SavingsGoal } from "@/lib/types"

interface AllocateFundsSheetProps {
  goal: Goal
  reserves: SavingsGoal[]
  onClose: () => void
  onAllocate: (savingsGoalId: string, amount: number) => Promise<void>
  onRemove: (savingsGoalId: string) => Promise<void>
}

// Quanto de uma reserva vai para este objetivo. É o valor final desta
// separação (não soma), então dá para aumentar, diminuir ou tirar.
export function AllocateFundsSheet({ goal, reserves, onClose, onAllocate, onRemove }: AllocateFundsSheetProps) {
  // Começa numa reserva que já alimenta o objetivo; senão, na primeira com saldo livre.
  const initialReserve = useMemo(() => {
    const feeding = reserves.find((r) => allocationFor(r, goal.id) > 0)
    if (feeding) return feeding.id
    const withFree = reserves.find((r) => availableForGoal(r, goal.id) > 0)
    return (withFree ?? reserves[0])?.id ?? ""
  }, [reserves, goal.id])

  const toInput = (value: number) => (value > 0 ? formatCurrencyInput(String(Math.round(value * 100))) : "")

  const [savingsId, setSavingsId] = useState(initialReserve)
  const [amountText, setAmountText] = useState(() => {
    const first = reserves.find((r) => r.id === initialReserve)
    return first ? toInput(allocationFor(first, goal.id)) : ""
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const selected = reserves.find((r) => r.id === savingsId)
  const available = selected ? availableForGoal(selected, goal.id) : 0
  const current = selected ? allocationFor(selected, goal.id) : 0

  // Trocar de reserva mostra o que já está separado dela para este objetivo.
  const handleReserveChange = (id: string) => {
    const next = reserves.find((r) => r.id === id)
    setSavingsId(id)
    setAmountText(next ? toInput(allocationFor(next, goal.id)) : "")
    setError(null)
  }

  const reserveOptions = reserves.map((r) => ({
    value: r.id,
    label: `${r.name} · ${formatCurrency(availableForGoal(r, goal.id))} livre`,
  }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selected || submitting) return
    const amount = amountText.trim() === "" ? 0 : parseCurrencyInput(amountText)
    const problem = validateAllocationAmount(amount, available)
    if (problem) return setError(problem)

    setSubmitting(true)
    try {
      await onAllocate(selected.id, amount)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não deu para separar")
    } finally {
      setSubmitting(false)
    }
  }

  const handleRemove = async () => {
    if (!selected || submitting) return
    setSubmitting(true)
    try {
      await onRemove(selected.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não deu para tirar")
    } finally {
      setSubmitting(false)
    }
  }

  if (reserves.length === 0) {
    return (
      <FormSheet title={`Separar para ${goal.name}`} onClose={onClose}>
        <div className="space-y-3 py-4">
          <p className="text-base font-semibold text-foreground">Você ainda não tem reserva</p>
          <p className="text-sm text-muted-foreground">
            O dinheiro do objetivo sai de uma reserva. Crie uma reserva com o saldo que você guarda e depois separe para cá.
          </p>
          <Link href="/savings" className="inline-block pt-2 text-sm font-semibold text-foreground underline decoration-foreground/30 underline-offset-4">
            Ir para reservas
          </Link>
        </div>
      </FormSheet>
    )
  }

  return (
    <FormSheet
      title={`Separar para ${goal.name}`}
      onClose={onClose}
      onSubmit={handleSubmit}
      footer={
        <div className="space-y-3">
          <SheetPrimaryButton disabled={submitting || !selected}>{submitting ? "Salvando..." : "Salvar separação"}</SheetPrimaryButton>
          {current > 0 && (
            <button
              type="button"
              onClick={handleRemove}
              disabled={submitting}
              className="w-full py-1 text-sm font-semibold text-muted-foreground underline decoration-muted-foreground/30 underline-offset-4 hover:text-foreground disabled:opacity-50"
            >
              Tirar desta reserva
            </button>
          )}
        </div>
      }
    >
      <div className="space-y-6">
        <label className="block space-y-1">
          <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">De qual reserva</span>
          <AppSelect variant="field" aria-label="Reserva de origem" value={savingsId} onChange={handleReserveChange} options={reserveOptions} />
          {selected && <span className="block pt-1 text-xs text-muted-foreground">{savingsKindLabel(selected.kind)}</span>}
        </label>

        <label className="block space-y-1">
          <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Quanto para este objetivo</span>
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
          <span className="block pt-1 text-sm tabular-nums text-muted-foreground">
            Livre nessa reserva: <span className="font-semibold text-foreground">{formatCurrency(available)}</span>
          </span>
        </label>

        {error && (
          <p role="alert" className="text-sm text-expense">
            {error}
          </p>
        )}
      </div>
    </FormSheet>
  )
}
