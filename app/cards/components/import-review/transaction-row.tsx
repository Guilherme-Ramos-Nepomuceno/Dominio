"use client"

import { useState } from "react"
import { RepeatIcon, WarningCircle } from "@phosphor-icons/react"
import type { ReviewRow } from "./types"
import { formatCurrency } from "@/lib/date-utils"
import { cn } from "@/lib/utils"

interface TransactionRowProps {
  row: ReviewRow
  onRename: (description: string) => void
  disabled?: boolean
  /** Checkbox à esquerda — "marcar pra categoria ativa" (fila) ou seleção em lote (grupo). */
  leftSlot?: React.ReactNode
  /** Ação à direita da linha — hoje usado pro botão de trocar categoria dentro do grupo. */
  rightSlot?: React.ReactNode
  /** Bloco de conciliação/transferência, renderizado pelo pai (tem a lógica de negócio). */
  children?: React.ReactNode
}

export function TransactionRow({ row, onRename, disabled, leftSlot, rightSlot, children }: TransactionRowProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [draft, setDraft] = useState(row.description)
  const wasRenamed = row.description.trim() !== row.originalDescription

  const rowDate = new Date(row.date)
  // Ano só aparece quando não é o ano corrente — sincronização da Pluggy traz
  // até 12 meses de histórico, então uma linha de dezembro do ano passado sem
  // ano junto ficava ambígua (parece do mês que vem, não do ano anterior).
  const isPastYear = rowDate.getFullYear() !== new Date().getFullYear()

  const commit = () => {
    setIsEditing(false)
    const trimmed = draft.trim()
    if (trimmed && trimmed !== row.description) onRename(trimmed)
    else setDraft(row.description)
  }

  return (
    <div
      className={cn(
        "rounded-[1vw] border p-3 space-y-1.5",
        row.rowError ? "border-destructive bg-destructive/5" : row.isDuplicate ? "border-border bg-muted/40" : "border-border bg-background",
      )}
    >
      {row.rowError && (
        <p className="text-xs text-destructive flex items-start gap-1.5">
          <WarningCircle size={14} weight="fill" className="shrink-0 mt-0.5" />
          {row.rowError}
        </p>
      )}

      <div className="flex items-center gap-3">
        {leftSlot}

        <div className="flex-1 min-w-0">
          {isEditing ? (
            <input
              autoFocus
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commit}
              onKeyDown={(e) => {
                if (e.key === "Enter") e.currentTarget.blur()
                if (e.key === "Escape") {
                  setDraft(row.description)
                  setIsEditing(false)
                }
              }}
              className="w-full px-2 py-1 -mx-2 rounded-md bg-card border border-primary text-sm text-foreground focus:outline-none"
            />
          ) : (
            <button
              type="button"
              disabled={disabled}
              onClick={() => {
                setDraft(row.description)
                setIsEditing(true)
              }}
              className="w-full text-left px-2 py-1 -mx-2 rounded-md text-sm font-medium text-foreground truncate hover:bg-muted transition-colors disabled:hover:bg-transparent disabled:opacity-50"
              title="Clique para editar o nome"
            >
              {row.description}
            </button>
          )}
        </div>

        <div className="text-right shrink-0">
          <p className={cn("font-bold tabular-nums text-sm", row.type === "expense" ? "text-expense" : "text-income")}>
            {row.type === "expense" ? "-" : "+"}{formatCurrency(row.amount)}
          </p>
          <p className="text-[11px] text-muted-foreground">
            {rowDate.toLocaleDateString("pt-BR", isPastYear ? { day: "2-digit", month: "2-digit", year: "numeric" } : { day: "2-digit", month: "2-digit" })}
          </p>
        </div>

        {rightSlot}
      </div>

      {(wasRenamed || (!!row.installments && row.installments > 1) || row.isDuplicate) && (
        <div className="pl-2 space-y-0.5">
          {wasRenamed && <p className="text-[11px] text-muted-foreground">Banco: {row.originalDescription}</p>}
          {!!row.installments && row.installments > 1 && (
            <p className="text-[11px] text-primary flex items-center gap-1">
              <RepeatIcon size={12} weight="bold" /> Parcela {row.currentInstallment}/{row.installments} detectada
            </p>
          )}
          {row.isDuplicate && (
            <p className="text-[11px] text-amber-500 flex items-center gap-1">
              <WarningCircle size={12} weight="fill" /> Já foi importada antes
            </p>
          )}
        </div>
      )}

      {children}
    </div>
  )
}
