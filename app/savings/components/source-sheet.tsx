"use client"

import { useState } from "react"
import type React from "react"
import { FormSheet, SheetPrimaryButton, UnderlineInput } from "@/components/ui/form-sheet"
import { AppSelect } from "@/components/ui/app-select"
import { SegmentedTabs } from "@/components/ui/segmented-tabs"
import { formatCurrency, formatCurrencyInput, parseCurrencyInput } from "@/lib/date-utils"
import { isStaleSource } from "@/lib/savings-composition"
import type { SavingsGoal } from "@/lib/types"
import type { SourceRef } from "../hooks/use-savings-view-model"

type Mode = "add" | "remove" | "set"

interface SourceSheetProps {
  source: SourceRef
  // Reservas para onde dá para mover a fonte (a atual fica de fora).
  reserves: SavingsGoal[]
  onClose: () => void
  onUpdate: (updates: { amount?: number; savingsGoalId?: string }) => Promise<void>
  onRemove: () => Promise<void>
}

const LABEL = "text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground"

// Uma fonte registrada pelo nome: guardei mais, retirei, atualizar o valor de
// hoje, mover para outra reserva ou remover. Fonte parada há 30 dias pergunta
// "ainda é esse valor?" aqui dentro, sem notificação.
export function SourceSheet({ source, reserves, onClose, onUpdate, onRemove }: SourceSheetProps) {
  const [mode, setMode] = useState<Mode>("set")
  const [amountText, setAmountText] = useState(() => formatCurrencyInput(String(Math.round(source.amount * 100))))
  const [reserveId, setReserveId] = useState(source.reserve.id)
  const [confirming, setConfirming] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const stale = isStaleSource(source.updatedAt)
  const moved = reserveId !== source.reserve.id

  const changeMode = (next: Mode) => {
    setMode(next)
    setError(null)
    // Atualizar mostra o valor de hoje; guardei mais e retirei começam vazios.
    setAmountText(next === "set" ? formatCurrencyInput(String(Math.round(source.amount * 100))) : "")
  }

  const run = async (action: () => Promise<void>, fallback: string) => {
    setSubmitting(true)
    try {
      await action()
    } catch (err) {
      setError(err instanceof Error ? err.message : fallback)
    } finally {
      setSubmitting(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (submitting) return
    const typed = amountText.trim() === "" ? NaN : parseCurrencyInput(amountText)
    if (mode !== "set" && !(typed > 0)) return setError("Informe o valor")
    if (mode === "set" && !(typed >= 0) && !moved) return setError("Informe o valor")
    let next = source.amount
    if (mode === "add") next = source.amount + typed
    if (mode === "remove") {
      if (typed > source.amount + 0.000001) return setError(`Você tem ${formatCurrency(source.amount)} aqui`)
      next = source.amount - typed
    }
    if (mode === "set" && Number.isFinite(typed)) next = typed
    await run(() => onUpdate({ amount: next, ...(moved ? { savingsGoalId: reserveId } : {}) }), "Não deu para salvar")
  }

  const submitLabel = mode === "add" ? "Guardar mais" : mode === "remove" ? "Registrar retirada" : "Salvar valor"

  return (
    <FormSheet
      title={source.name}
      onClose={onClose}
      onSubmit={handleSubmit}
      footer={
        <div className="space-y-3">
          <SheetPrimaryButton disabled={submitting}>{submitting ? "Salvando..." : submitLabel}</SheetPrimaryButton>
          {confirming ? (
            <div className="space-y-2 text-center">
              <p className="text-sm text-muted-foreground">Remover tira {formatCurrency(source.amount)} do saldo da reserva {source.reserve.name}.</p>
              <div className="flex justify-center gap-5">
                <button type="button" onClick={() => setConfirming(false)} disabled={submitting} className="text-sm font-semibold text-muted-foreground hover:text-foreground">
                  Cancelar
                </button>
                <button type="button" onClick={() => run(onRemove, "Não deu para remover")} disabled={submitting} className="text-sm font-semibold text-expense disabled:opacity-50">
                  Remover mesmo
                </button>
              </div>
            </div>
          ) : (
            <button type="button" onClick={() => setConfirming(true)} className="w-full py-1 text-sm font-semibold text-muted-foreground underline decoration-muted-foreground/30 underline-offset-4 hover:text-expense">
              Remover
            </button>
          )}
        </div>
      }
    >
      <div className="space-y-6">
        <div>
          <p className="text-sm text-muted-foreground">Em {source.reserve.name}</p>
          <p className="mt-1 font-display text-4xl font-semibold leading-none tracking-tight tabular-nums text-foreground">{formatCurrency(source.amount)}</p>
        </div>

        {stale && (
          <div className="flex items-center justify-between gap-3 border-y border-border py-3">
            <p className="text-sm text-foreground">Ainda é esse valor?</p>
            <button
              type="button"
              disabled={submitting}
              onClick={() => run(() => onUpdate({ amount: source.amount }), "Não deu para confirmar")}
              className="text-sm font-semibold text-foreground underline decoration-foreground/30 underline-offset-4 hover:decoration-foreground disabled:opacity-50"
            >
              Sim, confirmar
            </button>
          </div>
        )}

        <SegmentedTabs
          label="O que mudou"
          value={mode}
          onChange={changeMode}
          tabs={[
            { id: "set", label: "Atualizar valor" },
            { id: "add", label: "Guardei mais" },
            { id: "remove", label: "Retirei" },
          ]}
        />

        <label className="block space-y-1">
          <span className={LABEL}>{mode === "set" ? "Valor de hoje" : mode === "add" ? "Quanto guardou" : "Quanto retirou"}</span>
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

        {reserves.length > 0 && (
          <div className="space-y-1">
            <span className={LABEL}>Reserva</span>
            <AppSelect
              variant="field"
              aria-label="Reserva desta fonte"
              value={reserveId}
              onChange={setReserveId}
              options={[source.reserve, ...reserves.filter((r) => r.id !== source.reserve.id)].map((r) => ({ value: r.id, label: r.name }))}
            />
          </div>
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
