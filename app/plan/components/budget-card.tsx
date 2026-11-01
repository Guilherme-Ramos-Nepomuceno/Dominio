"use client"

import { useEffect, useState } from "react"
import { PencilSimple, Check, X, ArrowCounterClockwise, Wallet } from "@phosphor-icons/react"
import { formatCurrency } from "@/lib/date-utils"
import { formatMoneyInput, parseMoneyInput, type BudgetSource, type Plan } from "@/lib/plan"
import { cn } from "@/lib/utils"

interface BudgetCardProps {
  plan: Plan
  budget: number
  editable: boolean
  onSave: (amount: number | null, source: BudgetSource) => Promise<boolean>
}

// Topo da torre: quanto há para gastar no mês. Vem da renda prevista (sugestão
// do backend) até a pessoa definir um valor próprio.
export function BudgetCard({ plan, budget, editable, onSave }: BudgetCardProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [draft, setDraft] = useState("")
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isEditing) setDraft(formatMoneyInput(budget))
  }, [budget, isEditing])

  const fromIncome = plan.budgetSource === "INCOME"
  const canUseIncome = !fromIncome && plan.suggestedBudget > 0

  const submit = async () => {
    const value = parseMoneyInput(draft)
    if (value === null) {
      setError("Digite um valor válido.")
      return
    }
    setError(null)
    setIsEditing(false)
    await onSave(value, "MANUAL")
  }

  return (
    <section className="rounded-[20px] bg-card p-5 border border-border/50" aria-label="Orçamento do mês">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <Wallet size={22} weight="bold" className="text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground">Orçamento do mês</p>
          {isEditing ? (
            <form
              className="mt-1 flex items-center gap-2"
              onSubmit={(e) => {
                e.preventDefault()
                submit()
              }}
            >
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-semibold">R$</span>
                <input
                  autoFocus
                  inputMode="decimal"
                  aria-label="Valor do orçamento do mês"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 rounded-xl bg-background border border-border text-lg font-bold tabular-nums focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <button type="submit" aria-label="Salvar orçamento" className="p-2.5 rounded-xl bg-primary text-background">
                <Check size={18} weight="bold" />
              </button>
              <button
                type="button"
                aria-label="Cancelar"
                onClick={() => {
                  setIsEditing(false)
                  setError(null)
                }}
                className="p-2.5 rounded-xl border border-border text-muted-foreground"
              >
                <X size={18} weight="bold" />
              </button>
            </form>
          ) : (
            <div className="flex items-center gap-2">
              <p className="text-3xl font-bold text-foreground tabular-nums">{formatCurrency(budget)}</p>
              {editable && (
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  aria-label="Editar orçamento do mês"
                  className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted transition-colors"
                >
                  <PencilSimple size={16} weight="bold" />
                </button>
              )}
            </div>
          )}
          {error && <p className="text-xs text-expense mt-1">{error}</p>}
          <p className={cn("text-xs mt-1", fromIncome ? "text-muted-foreground" : "text-foreground/70")}>
            {fromIncome
              ? plan.suggestedBudget > 0
                ? "Calculado pela sua renda prevista."
                : "Sem renda prevista — defina um valor para o mês."
              : "Valor definido por você."}
          </p>
          {editable && canUseIncome && (
            <button
              type="button"
              onClick={() => onSave(null, "INCOME")}
              className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
            >
              <ArrowCounterClockwise size={12} weight="bold" />
              Usar renda prevista ({formatCurrency(plan.suggestedBudget)})
            </button>
          )}
        </div>
      </div>
    </section>
  )
}
