"use client"

import Link from "next/link"
import { Plus, TrendUp, Notebook } from "@phosphor-icons/react"
import { SectionTitle } from "@/app/plan/components/plan-ui"
import { formatCurrency } from "@/lib/date-utils"
import { groupInvestments, investmentSubtitle } from "@/lib/pluggy-health"
import { isStaleSource } from "@/lib/savings-composition"
import type { PluggyInvestment } from "@/lib/storage"
import type { SavingsGoal } from "@/lib/types"
import type { SourceRef } from "../hooks/use-savings-view-model"
import { cn } from "@/lib/utils"

interface InvestedViewProps {
  investments: PluggyInvestment[]
  sources: SourceRef[]
  restLines: { reserve: SavingsGoal; amount: number }[]
  totalSaved: number
  onOpenInvestment: (id: string) => void
  onOpenSource: (id: string) => void
  onDetailRest: (reserveId: string, amount: number) => void
  onRegister: () => void
}

// "Onde está o dinheiro": os investimentos do banco como a Pluggy mostra, mais o
// que a pessoa registrou pelo nome, cada um com a reserva para onde vai. Só
// aparece o que tem saldo positivo. A soma bate com o total das reservas.
export function InvestedView({ investments, sources, restLines, totalSaved, onOpenInvestment, onOpenSource, onDetailRest, onRegister }: InvestedViewProps) {
  const groups = groupInvestments(investments)
  const hasAnything = investments.length > 0 || sources.length > 0 || restLines.length > 0
  const manualTotal = sources.reduce((sum, s) => sum + s.amount, 0) + restLines.reduce((sum, l) => sum + l.amount, 0)

  if (!hasAnything) {
    return (
      <div className="mx-auto max-w-2xl space-y-4 py-6">
        <h2 className="font-display text-3xl font-semibold leading-[1.1] tracking-tight text-foreground">Onde está o seu dinheiro guardado?</h2>
        <p className="max-w-md text-base leading-relaxed text-muted-foreground">
          Registre pelo nome o que você tem: poupança, um CDB, dinheiro em casa. Só precisa do nome e do valor.
        </p>
        <button
          type="button"
          onClick={onRegister}
          className="inline-flex items-center gap-2 rounded-full bg-foreground px-5 py-3 text-sm font-semibold text-background transition-colors hover:bg-foreground/90"
        >
          <Plus size={16} weight="bold" aria-hidden />
          Registrar o que tenho guardado
        </button>
        <BankInvite />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl space-y-10">
      <section aria-labelledby="invested-total-label">
        <p id="invested-total-label" className="text-sm text-muted-foreground">
          Tudo o que você tem guardado
        </p>
        <p className="mt-1 font-display text-5xl font-semibold leading-none tracking-tight tabular-nums text-foreground">{formatCurrency(totalSaved)}</p>
      </section>

      {groups.map((group) => (
        <section key={group.key} aria-labelledby={`invested-${group.key}`}>
          <div className="flex items-baseline justify-between gap-3">
            <SectionTitle id={`invested-${group.key}`}>{group.label}</SectionTitle>
            <span className="text-xs tabular-nums text-muted-foreground">{formatCurrency(group.total)}</span>
          </div>
          <ul className="mt-1 divide-y divide-border">
            {group.items.map((inv) => (
              <li key={inv.id}>
                <button type="button" onClick={() => onOpenInvestment(inv.id)} className="flex w-full items-start gap-3 py-3.5 text-left transition-colors hover:bg-muted/40">
                  <TrendUp size={20} weight="duotone" className="mt-0.5 shrink-0 text-muted-foreground" aria-hidden />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-foreground">{inv.name}</span>
                    <span className="block truncate text-xs text-muted-foreground">{investmentSubtitle(inv)}</span>
                    <Destinations allocations={inv.allocations} />
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="block text-sm font-semibold tabular-nums text-foreground">{formatCurrency(inv.balance)}</span>
                    {inv.profit !== null && inv.profit !== 0 && (
                      <span className={cn("block text-xs tabular-nums", inv.profit > 0 ? "text-positive-ink" : "text-muted-foreground")}>
                        {inv.profit > 0 ? "+" : ""}
                        {formatCurrency(inv.profit)}
                      </span>
                    )}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}

      {(sources.length > 0 || restLines.length > 0) && (
        <section aria-labelledby="invested-manual">
          <div className="flex items-baseline justify-between gap-3">
            <SectionTitle id="invested-manual">Registrados por você</SectionTitle>
            <span className="text-xs tabular-nums text-muted-foreground">{formatCurrency(manualTotal)}</span>
          </div>
          <ul className="mt-1 divide-y divide-border">
            {sources.map((source) => (
              <li key={source.id}>
                <button type="button" onClick={() => onOpenSource(source.id)} className="flex w-full items-start gap-3 py-3.5 text-left transition-colors hover:bg-muted/40">
                  <Notebook size={20} weight="duotone" className="mt-0.5 shrink-0 text-muted-foreground" aria-hidden />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-foreground">{source.name}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      Em {source.reserve.name}
                      {isStaleSource(source.updatedAt) ? " · confirme se ainda é esse valor" : ""}
                    </span>
                  </span>
                  <span className="shrink-0 text-sm font-semibold tabular-nums text-foreground">{formatCurrency(source.amount)}</span>
                </button>
              </li>
            ))}
            {restLines.map((line) => (
              <li key={line.reserve.id} className="flex items-start gap-3 py-3.5">
                <Notebook size={20} weight="duotone" className="mt-0.5 shrink-0 text-muted-foreground" aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-foreground">Sem detalhar</span>
                  <span className="block truncate text-xs text-muted-foreground">Em {line.reserve.name}</span>
                </span>
                <span className="shrink-0 text-right">
                  <span className="block text-sm font-semibold tabular-nums text-foreground">{formatCurrency(line.amount)}</span>
                  <button
                    type="button"
                    onClick={() => onDetailRest(line.reserve.id, line.amount)}
                    className="text-xs font-semibold text-foreground underline decoration-foreground/30 underline-offset-4 hover:decoration-foreground"
                  >
                    Dar nome
                  </button>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="space-y-4">
        <button
          type="button"
          onClick={onRegister}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-foreground underline decoration-foreground/30 underline-offset-4 hover:decoration-foreground"
        >
          <Plus size={14} weight="bold" aria-hidden />
          Registrar o que tenho guardado
        </button>
        {investments.length === 0 && <BankInvite />}
      </div>
    </div>
  )
}

// "Emergência R$ 8.000 · Guardado R$ 500": para onde vai cada parte do investimento.
function Destinations({ allocations }: { allocations: PluggyInvestment["allocations"] }) {
  if (allocations.length === 0) return null
  return (
    <span className="mt-1 block truncate text-xs tabular-nums text-muted-foreground">
      {allocations.map((a) => `${a.name} ${formatCurrency(a.amount)}`).join(" · ")}
    </span>
  )
}

// Convite discreto, sem insistir: quem não usa o banco conectado usa o app igual.
function BankInvite() {
  return (
    <p className="text-sm text-muted-foreground">
      Quer que isso se atualize sozinho?{" "}
      <Link href="/bank-sync" className="font-semibold text-foreground underline decoration-foreground/30 underline-offset-4 hover:decoration-foreground">
        Conectar meu banco
      </Link>
    </p>
  )
}
