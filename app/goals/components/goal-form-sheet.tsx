"use client"

import { useState } from "react"
import type React from "react"
import { FormSheet, SheetPrimaryButton, UnderlineInput } from "@/components/ui/form-sheet"
import { formatCurrencyInput, parseCurrencyInput } from "@/lib/date-utils"
import type { Goal } from "@/lib/types"
import { cn } from "@/lib/utils"
import { GOAL_ICON_OPTIONS } from "../goal-icons"

interface GoalFormSheetProps {
  onClose: () => void
  onSave: (goal: { name: string; targetAmount: number; deadline?: string; icon?: string }) => Promise<void>
  initialGoal?: Goal
}

// Nome, valor da meta, prazo opcional e ícone. O quanto já foi guardado não se
// digita: vem das reservas separadas para o objetivo.
export function GoalFormSheet({ onClose, onSave, initialGoal }: GoalFormSheetProps) {
  // A folha só existe enquanto está aberta: o estado começa do objetivo editado.
  const [name, setName] = useState(() => initialGoal?.name ?? "")
  const [targetText, setTargetText] = useState(() => (initialGoal ? formatCurrencyInput(String(Math.round(initialGoal.targetAmount * 100))) : ""))
  const [deadline, setDeadline] = useState(() => (initialGoal?.deadline ? initialGoal.deadline.split("T")[0] : ""))
  const [icon, setIcon] = useState<string>(() => initialGoal?.icon ?? GOAL_ICON_OPTIONS[0].name)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (submitting) return
    const targetAmount = parseCurrencyInput(targetText)
    if (!name.trim()) return setError("Dê um nome ao objetivo")
    if (!Number.isFinite(targetAmount) || targetAmount <= 0) return setError("Informe quanto custa")

    setSubmitting(true)
    try {
      await onSave({ name: name.trim(), targetAmount, deadline: deadline || undefined, icon })
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
