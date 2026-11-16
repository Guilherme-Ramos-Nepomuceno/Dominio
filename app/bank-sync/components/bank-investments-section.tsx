"use client"

import { useState } from "react"
import { TrendUp } from "@phosphor-icons/react"
import { SectionTitle } from "@/app/plan/components/plan-ui"
import { AppSelect } from "@/components/ui/app-select"
import { formatCurrency } from "@/lib/date-utils"
import { investmentSubtitle, isActiveInvestment } from "@/lib/pluggy-health"
import type { PluggyInvestment } from "@/lib/storage"
import type { SavingsGoal } from "@/lib/types"
import { cn } from "@/lib/utils"

interface BankInvestmentsSectionProps {
  investments: PluggyInvestment[]
  savingsGoals: SavingsGoal[]
  linkingInvestmentId: string | null
  onLink: (investmentId: string, savingsGoalId: string | null) => void
}

// Investimentos que o banco mostra (CDB, LCI, Tesouro...), com o valor de
// hoje. Ligar um a uma reserva faz o saldo dela vir do banco, com rendimento.
export function BankInvestmentsSection({ investments, savingsGoals, linkingInvestmentId, onLink }: BankInvestmentsSectionProps) {
  const [showWithdrawn, setShowWithdrawn] = useState(false)
  const active = investments.filter(isActiveInvestment)
  const withdrawn = investments.filter((i) => !isActiveInvestment(i))
  if (investments.length === 0) return null

  const total = active.reduce((sum, i) => sum + i.balance, 0)
  const goalOptions = savingsGoals.map((g) => ({ value: g.id, label: g.name }))
  const visible = showWithdrawn ? [...active, ...withdrawn] : active

  return (
    <section aria-labelledby="sync-investments-title" className="space-y-1">
      <SectionTitle id="sync-investments-title">Investimentos no banco</SectionTitle>
      <p className="text-xs text-muted-foreground">
        {active.length > 0
          ? `${formatCurrency(total)} em ${active.length} investimento${active.length === 1 ? "" : "s"}. Ligue a uma reserva para o saldo dela vir do banco.`
          : "Nenhum investimento ativo agora."}
      </p>

      <ul className="divide-y divide-border">
        {visible.map((inv) => {
          const isActive = isActiveInvestment(inv)
          return (
            <li key={inv.id} className={cn("space-y-2 py-3.5", !isActive && "opacity-60")}>
              <div className="flex items-start gap-3">
                <TrendUp size={20} weight="duotone" className="mt-0.5 shrink-0 text-muted-foreground" aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-foreground">{inv.name}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {isActive ? investmentSubtitle(inv) : "Resgatado"}
                  </span>
                </span>
                <span className="shrink-0 text-right">
                  <span className="block text-sm font-semibold tabular-nums text-foreground">{formatCurrency(inv.balance)}</span>
                  {isActive && inv.profit !== null && inv.profit !== 0 && (
                    <span className={cn("block text-xs tabular-nums", inv.profit > 0 ? "text-positive-ink" : "text-muted-foreground")}>
                      {inv.profit > 0 ? "+" : ""}
                      {formatCurrency(inv.profit)}
                    </span>
                  )}
                </span>
              </div>
              {isActive && (
                <div className="flex items-center gap-2 pl-8">
                  <span className="text-xs text-muted-foreground">Reserva</span>
                  {goalOptions.length > 0 ? (
                    <AppSelect
                      variant="pill"
                      aria-label={`Reserva ligada a ${inv.name}`}
                      value={inv.savingsGoalId ?? ""}
                      emptyLabel="Nenhuma"
                      options={goalOptions}
                      disabled={linkingInvestmentId === inv.id}
                      onChange={(value) => onLink(inv.id, value || null)}
                    />
                  ) : (
                    <span className="text-xs text-muted-foreground">Crie uma reserva para ligar este investimento.</span>
                  )}
                </div>
              )}
            </li>
          )
        })}
      </ul>

      {withdrawn.length > 0 && (
        <button
          type="button"
          onClick={() => setShowWithdrawn((v) => !v)}
          className="text-xs font-medium text-muted-foreground underline decoration-muted-foreground/30 underline-offset-4 hover:text-foreground"
        >
          {showWithdrawn ? "Esconder resgatados" : `Ver ${withdrawn.length} resgatado${withdrawn.length === 1 ? "" : "s"}`}
        </button>
      )}
    </section>
  )
}
