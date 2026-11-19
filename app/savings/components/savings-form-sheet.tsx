"use client"

import { useState } from "react"
import type React from "react"
import { Heart } from "@phosphor-icons/react"
import { FormSheet, SheetPrimaryButton, UnderlineInput } from "@/components/ui/form-sheet"
import { useAccount } from "@/components/account/account-context"
import { formatCurrencyInput, parseCurrencyInput } from "@/lib/date-utils"
import { CHOOSABLE_SAVINGS_KINDS, normalizeSavingsKind, suggestSavingsKind, type SavingsKind } from "@/lib/goal-allocation"
import type { SavingsGoal } from "@/lib/types"
import { cn } from "@/lib/utils"
import type { SavingsFormData } from "../hooks/use-savings-view-model"

interface SavingsFormSheetProps {
  initial?: SavingsGoal
  onClose: () => void
  onSave: (data: SavingsFormData) => Promise<void>
}

const LABEL = "text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground"

const toInput = (value: number) => (value > 0 ? formatCurrencyInput(String(Math.round(value * 100))) : "")

// Criar e editar uma reserva. Só o nome é obrigatório: o grupo é sugerido pelo
// nome (e fica em Guardado se a pessoa não escolher), a meta é opcional e não
// pede cartão nem ícone. O saldo guardado hoje é opcional.
export function SavingsFormSheet({ initial, onClose, onSave }: SavingsFormSheetProps) {
  const { family } = useAccount()
  const hasCoupleAccount = !!family?.members?.some((m) => m.accountType === "COUPLE")

  const [name, setName] = useState(() => initial?.name ?? "")
  // `chosen`: undefined = a pessoa ainda não mexeu (vale a sugestão ou o grupo salvo).
  const [chosen, setChosen] = useState<SavingsKind | undefined>(undefined)
  const [balanceText, setBalanceText] = useState(() => toInput(initial?.currentAmount ?? 0))
  const [targetText, setTargetText] = useState(() => toInput(initial?.targetAmount ?? 0))
  const [showTarget, setShowTarget] = useState(() => (initial?.targetAmount ?? 0) > 0)
  const [isCasal, setIsCasal] = useState(() => initial?.isCasal ?? false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const savedKind = normalizeSavingsKind(initial?.kind)
  const suggested = chosen === undefined && savedKind === "GUARDADO" ? suggestSavingsKind(name) : null
  const kind: SavingsKind = chosen ?? suggested ?? savedKind

  // Tocar no grupo já marcado desmarca: a reserva fica em Guardado.
  const pickKind = (value: SavingsKind) => setChosen(kind === value ? "GUARDADO" : value)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (submitting) return
    if (!name.trim()) return setError("Dê um nome à reserva")

    const target = targetText.trim() === "" ? 0 : parseCurrencyInput(targetText)
    if (!Number.isFinite(target) || target < 0) return setError("Meta inválida")
    const balance = balanceText.trim() === "" ? 0 : parseCurrencyInput(balanceText)
    if (!Number.isFinite(balance) || balance < 0) return setError("Saldo inválido")

    setSubmitting(true)
    try {
      await onSave({
        name: name.trim(),
        kind,
        targetAmount: showTarget ? target : 0,
        // Depois de criada, o saldo é a soma do que está nela (banco e fontes).
        ...(initial ? {} : { currentAmount: balance }),
        isCasal,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não deu para salvar")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <FormSheet
      title={initial ? "Editar reserva" : "Nova reserva"}
      onClose={onClose}
      onSubmit={handleSubmit}
      footer={<SheetPrimaryButton disabled={submitting}>{submitting ? "Salvando..." : initial ? "Salvar reserva" : "Criar reserva"}</SheetPrimaryButton>}
    >
      <div className="space-y-6">
        <label className="block space-y-1">
          <span className={LABEL}>Nome</span>
          <UnderlineInput value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Emergência, Viagem, Carro novo" autoFocus />
        </label>

        <div className="space-y-2">
          <span className={LABEL}>Para que serve</span>
          <div className="grid grid-cols-1 gap-1.5" role="group" aria-label="Grupo da reserva">
            {CHOOSABLE_SAVINGS_KINDS.map((option) => {
              const selected = kind === option.value
              return (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => pickKind(option.value)}
                  className={cn(
                    "flex items-baseline justify-between gap-3 rounded-xl border px-3.5 py-2.5 text-left transition-colors",
                    selected ? "border-foreground bg-foreground/5" : "border-border hover:border-foreground/40",
                  )}
                >
                  <span className="text-sm font-semibold text-foreground">{option.label}</span>
                  <span className="text-xs text-muted-foreground">{option.hint}</span>
                </button>
              )
            })}
          </div>
          <p className="text-xs text-muted-foreground">
            {kind === "GUARDADO"
              ? "Sem escolher, fica em Guardado e você decide depois."
              : suggested
                ? "Sugerido pelo nome. Toque em outro para trocar."
                : "Toque de novo para tirar."}
          </p>
        </div>

        {!initial && (
          <label className="block space-y-1">
            <span className={LABEL}>Quanto já tem (opcional)</span>
            <span className="flex items-baseline gap-2">
              <span className="text-muted-foreground">R$</span>
              <UnderlineInput
                inputMode="decimal"
                value={balanceText}
                onChange={(e) => setBalanceText(formatCurrencyInput(e.target.value))}
                placeholder="0,00"
                className="font-display text-2xl tabular-nums"
              />
            </span>
            <span className="block pt-1 text-xs text-muted-foreground">Depois você dá nome ao que está guardado em Tudo investido.</span>
          </label>
        )}

        {showTarget ? (
          <label className="block space-y-1">
            <span className={LABEL}>Meta</span>
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
        ) : (
          <button
            type="button"
            onClick={() => setShowTarget(true)}
            className="text-sm font-semibold text-foreground underline decoration-foreground/30 underline-offset-4 hover:decoration-foreground"
          >
            Definir uma meta
          </button>
        )}

        {hasCoupleAccount && (
          <button
            type="button"
            role="switch"
            aria-checked={isCasal}
            onClick={() => setIsCasal((v) => !v)}
            className="flex w-full items-center gap-3 border-t border-border pt-4 text-left"
          >
            <Heart size={20} weight={isCasal ? "fill" : "duotone"} className={isCasal ? "text-foreground" : "text-muted-foreground"} aria-hidden />
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-foreground">Reserva do casal</span>
              <span className="block text-xs text-muted-foreground">Aparece inteira, com todo o saldo, na conta do casal</span>
            </span>
            <span className={cn("relative h-6 w-11 shrink-0 rounded-full transition-colors", isCasal ? "bg-foreground" : "bg-muted")} aria-hidden>
              <span className={cn("absolute top-0.5 h-5 w-5 rounded-full bg-background transition-all", isCasal ? "left-5" : "left-0.5")} />
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
