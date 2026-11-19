"use client"

import { useState } from "react"
import type React from "react"
import Link from "next/link"
import { FormSheet, SheetPrimaryButton, UnderlineInput } from "@/components/ui/form-sheet"
import { formatCurrency, formatCurrencyInput, parseCurrencyInput } from "@/lib/date-utils"
import { freeOfSavings, savingsKindLabel, validateAllocationAmount } from "@/lib/goal-allocation"
import type { Goal, SavingsGoal } from "@/lib/types"
import { cn } from "@/lib/utils"
import { GOAL_ICON_OPTIONS } from "../goal-icons"

export interface GoalFormData {
  name: string
  targetAmount: number
  deadline?: string
  icon?: string
  // Quanto de cada reserva já vai para este objetivo (só ao criar).
  allocations: { savingsGoalId: string; amount: number }[]
}

interface GoalFormSheetProps {
  onClose: () => void
  onSave: (goal: GoalFormData) => Promise<void>
  initialGoal?: Goal
  // Reservas para escolher "De onde vem" ao criar. Ao editar, a separação é feita em "Separar".
  reserves?: SavingsGoal[]
}

// Nome, valor da meta, prazo opcional, ícone e, ao criar, de onde vem o dinheiro.
// O quanto já foi guardado não se digita: vem das reservas separadas para o objetivo.
export function GoalFormSheet({ onClose, onSave, initialGoal, reserves = [] }: GoalFormSheetProps) {
  // A folha só existe enquanto está aberta: o estado começa do objetivo editado.
  const [name, setName] = useState(() => initialGoal?.name ?? "")
  const [targetText, setTargetText] = useState(() => (initialGoal ? formatCurrencyInput(String(Math.round(initialGoal.targetAmount * 100))) : ""))
  const [deadline, setDeadline] = useState(() => (initialGoal?.deadline ? initialGoal.deadline.split("T")[0] : ""))
  const [icon, setIcon] = useState<string>(() => initialGoal?.icon ?? GOAL_ICON_OPTIONS[0].name)
  // Valor digitado por reserva (só reservas com livre aparecem).
  const [amounts, setAmounts] = useState<Record<string, string>>({})
  const withFree = initialGoal ? [] : reserves.filter((r) => freeOfSavings(r) > 0)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (submitting) return
    const targetAmount = parseCurrencyInput(targetText)
    if (!name.trim()) return setError("Dê um nome ao objetivo")
    if (!Number.isFinite(targetAmount) || targetAmount <= 0) return setError("Informe quanto custa")

    const allocations: GoalFormData["allocations"] = []
    for (const reserve of withFree) {
      const text = amounts[reserve.id]?.trim()
      if (!text) continue
      const amount = parseCurrencyInput(text)
      const problem = validateAllocationAmount(amount, freeOfSavings(reserve))
      if (problem) return setError(`${reserve.name}: ${problem}`)
      if (amount > 0) allocations.push({ savingsGoalId: reserve.id, amount })
    }

    setSubmitting(true)
    try {
      await onSave({ name: name.trim(), targetAmount, deadline: deadline || undefined, icon, allocations })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não deu para salvar")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <FormSheet
      title={initialGoal ? "Editar objetivo" : "Novo objetivo"}
      onClose={onClose}
      onSubmit={handleSubmit}
      footer={<SheetPrimaryButton disabled={submitting}>{submitting ? "Salvando..." : "Salvar objetivo"}</SheetPrimaryButton>}
    >
      <div className="space-y-6">
        <label className="block space-y-1">
          <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Nome</span>
          <UnderlineInput value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Viagem, Carro novo" autoFocus />
        </label>

        <label className="block space-y-1">
          <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Quanto custa</span>
          <span className="flex items-baseline gap-2">
            <span className="text-muted-foreground">R$</span>
            <UnderlineInput
              inputMode="decimal"
              value={targetText}
              onChange={(e) => setTargetText(formatCurrencyInput(e.target.value))}
              placeholder="0,00"
              className="font-display text-2xl tabular-nums"
            />
          </span>
        </label>

        <label className="block space-y-1">
          <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Até quando (opcional)</span>
          <UnderlineInput type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
        </label>

        {!initialGoal && (
          <div className="space-y-2">
            <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">De onde vem o dinheiro (opcional)</span>
            {withFree.length > 0 ? (
              <ul className="divide-y divide-border">
                {withFree.map((reserve) => (
                  <li key={reserve.id} className="flex items-center gap-3 py-2.5">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-foreground">{reserve.name}</span>
                      <span className="block text-xs tabular-nums text-muted-foreground">
                        {savingsKindLabel(reserve.kind)} · {formatCurrency(freeOfSavings(reserve))} livre
                      </span>
                    </span>
                    <span className="flex shrink-0 items-baseline gap-1.5">
                      <span className="text-sm text-muted-foreground">R$</span>
                      <UnderlineInput
                        inputMode="decimal"
                        aria-label={`Quanto de ${reserve.name} vai para este objetivo`}
                        value={amounts[reserve.id] ?? ""}
                        onChange={(e) => setAmounts((prev) => ({ ...prev, [reserve.id]: formatCurrencyInput(e.target.value) }))}
                        placeholder="0,00"
                        className="w-24 text-right tabular-nums"
                      />
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">
                Nenhuma reserva com dinheiro livre agora.{" "}
                <Link href="/savings" className="font-semibold text-foreground underline decoration-foreground/30 underline-offset-4">
                  Ver reservas
                </Link>
              </p>
            )}
          </div>
        )}

        <div className="space-y-2">
          <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Ícone</span>
          <div className="grid grid-cols-6 gap-2">
            {GOAL_ICON_OPTIONS.map(({ name: iconName, Icon }) => (
              <button
                key={iconName}
                type="button"
                aria-label={iconName}
                aria-pressed={icon === iconName}
                onClick={() => setIcon(iconName)}
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-xl transition-colors",
                  icon === iconName ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon size={20} weight="duotone" />
              </button>
            ))}
          </div>
        </div>

        {error && (
          <p role="alert" className="text-sm text-expense">
            {error}
          </p>
        )}
      </div>
    </FormSheet>
  )
}
