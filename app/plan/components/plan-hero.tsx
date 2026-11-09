"use client"

import { useEffect, useState } from "react"
import { ArrowCounterClockwise, Check, PencilSimple, WarningCircle, X } from "@phosphor-icons/react"
import { formatMoneyInput, parseMoneyInput, type BudgetSource, type Plan } from "@/lib/plan"
import Link from "next/link"
import { budgetCaption, formatMoneyWhole, type IncomeWarning, type PlanHeadline } from "@/lib/plan-layout"
import { cn } from "@/lib/utils"

interface PlanHeroProps {
  plan: Plan
  headline: PlanHeadline
  incomeWarning?: IncomeWarning | null
  budget: number
  editable: boolean
  onSaveBudget: (amount: number | null, source: BudgetSource) => Promise<boolean>
}

// A resposta principal da tela: quanto sobra para os desejos (ou, confirmado,
// a sobra prevista). Abaixo, de onde vem o orçamento — com o lápis para
// editá-lo ali mesmo (valor próprio ou voltar à renda prevista).
export function PlanHero({ plan, headline, incomeWarning, budget, editable, onSaveBudget }: PlanHeroProps) {
  const [isEditing, setIsEditing] = useState(false)

  return (
    <section aria-labelledby="plan-hero-label">
      <div data-guide="plan-headline" className="inline-block">
      <p id="plan-hero-label" className="text-sm text-muted-foreground">
        {headline.label}
      </p>
      <p
        className={cn(
          "mt-1 text-5xl font-semibold tracking-tight leading-none",
          headline.negative ? "text-expense" : "text-foreground",
        )}
      >
        {formatMoneyWhole(headline.value)}
      </p>
      </div>
      {headline.shortfallText && (
        <p className="mt-2 flex items-center gap-1.5 text-sm font-medium text-expense">
          <WarningCircle size={16} weight="fill" className="shrink-0" />
          {headline.shortfallText}
        </p>
      )}

      {isEditing ? (
        <BudgetForm plan={plan} budget={budget} onClose={() => setIsEditing(false)} onSave={onSaveBudget} />
      ) : (
        <div data-guide="plan-budget" className="mt-2 flex w-fit items-center gap-1 text-sm text-muted-foreground">
          <span className="tabular-nums">{budgetCaption(plan)}</span>
          {editable && (
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              aria-label="Editar orçamento do mês"
              className="p-1.5 -my-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-foreground/5 transition-colors"
            >
              <PencilSimple size={14} weight="bold" />
            </button>
          )}
        </div>
      )}

      {incomeWarning && (
        <div role="status" className="mt-3 rounded-xl border border-border px-4 py-3 text-sm">
          <p className="flex items-start gap-1.5 text-foreground">
            <WarningCircle size={16} weight="fill" className="mt-0.5 shrink-0 text-muted-foreground" aria-hidden />
            <span>{incomeWarning.text}</span>
          </p>
          <p className="mt-1.5 pl-[22px] text-muted-foreground">
            {incomeWarning.late > 0 ? (
              <>
                Já recebeu?{" "}
                <Link href="/pending" className="font-medium text-foreground underline underline-offset-2">
                  Marque nas pendentes
                </Link>
                {editable ? ". Se não vem, ajuste o orçamento no lápis acima." : "."}
              </>
            ) : editable ? (
              "Ajuste o orçamento no lápis acima ou registre a receita que falta."
            ) : (
              "Registre a receita que falta para o plano bater."
            )}
          </p>
        </div>
      )}
    </section>
  )
}

function BudgetForm({
  plan,
  budget,
  onClose,
  onSave,
}: {
  plan: Plan
  budget: number
  onClose: () => void
  onSave: (amount: number | null, source: BudgetSource) => Promise<boolean>
}) {
  const [draft, setDraft] = useState(() => formatMoneyInput(budget))
  const [error, setError] = useState<string | null>(null)
  const canUseIncome = plan.budgetSource !== "INCOME" && plan.suggestedBudget > 0

  useEffect(() => {
    setDraft(formatMoneyInput(budget))
  }, [budget])

  const submit = async () => {
    const value = parseMoneyInput(draft)
    if (value === null) {
      setError("Digite um valor válido.")
      return
    }
    setError(null)
    onClose()
    await onSave(value, "MANUAL")
  }

  return (
    <div className="mt-3 max-w-sm">
      <form
        className="flex items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          submit()
        }}
      >
        <label htmlFor="plan-budget" className="sr-only">
          Orçamento do mês
        </label>
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted-foreground">R$</span>
          <input
            id="plan-budget"
            autoFocus
            inputMode="decimal"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") onClose()
            }}
            className="w-full pl-10 pr-3 py-2 rounded-xl bg-background border border-border text-base font-semibold tabular-nums focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <button type="submit" aria-label="Salvar orçamento" className="p-2.5 rounded-xl bg-primary text-background">
          <Check size={16} weight="bold" />
        </button>
        <button
          type="button"
          aria-label="Cancelar"
          onClick={onClose}
          className="p-2.5 rounded-xl border border-border text-muted-foreground hover:text-foreground"
        >
          <X size={16} weight="bold" />
        </button>
      </form>
      {error && <p className="mt-1 text-xs text-expense">{error}</p>}
      <p className="mt-2 text-xs text-muted-foreground">
        {plan.budgetSource === "INCOME"
          ? plan.suggestedBudget > 0
            ? "Hoje é calculado pela sua renda prevista."
            : "Sem renda prevista — defina um valor para o mês."
          : "Valor definido por você para este mês."}
      </p>
      {canUseIncome && (
        <button
          type="button"
          onClick={() => {
            onClose()
            onSave(null, "INCOME")
          }}
          className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-foreground hover:underline"
        >
          <ArrowCounterClockwise size={12} weight="bold" />
          Usar renda prevista ({formatMoneyWhole(plan.suggestedBudget)})
        </button>
      )}
    </div>
  )
}
