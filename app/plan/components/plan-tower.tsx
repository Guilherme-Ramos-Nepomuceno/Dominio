"use client"

import Link from "next/link"
import { CaretRight, Tray, WarningCircle, Scales } from "@phosphor-icons/react"
import { formatCurrency } from "@/lib/date-utils"
import { barSegments, type Plan, type PlanGroup } from "@/lib/plan"
import { UNCATEGORIZED_LABEL } from "@/lib/category-utils"
import { cn } from "@/lib/utils"

// Barra planejado × gasto: fundo = planejado (comprometido em tom mais forte,
// variável mais claro); a faixa por cima = gasto. Passou do planejado, a faixa
// fica vermelha.
export function PlanBar({
  committed,
  plannedVariable,
  spent,
  className,
}: {
  committed: number
  plannedVariable: number
  spent: number
  className?: string
}) {
  const seg = barSegments({ committed, plannedVariable, spent })
  return (
    <div className={cn("relative h-3 rounded-full bg-muted overflow-hidden", className)} aria-hidden>
      <div className="absolute inset-y-0 left-0 flex w-full">
        <div className="h-full bg-foreground/25" style={{ width: `${seg.committedPct}%` }} />
        <div className="h-full bg-foreground/10" style={{ width: `${seg.variablePct}%` }} />
      </div>
      <div
        className={cn(
          "absolute left-0 top-1/2 -translate-y-1/2 h-1.5 rounded-full transition-[width] duration-500",
          seg.overspent ? "bg-expense" : "bg-income",
        )}
        style={{ width: `${seg.spentPct}%` }}
      />
    </div>
  )
}

function GroupRow({ group, href }: { group: PlanGroup; href: string }) {
  const seg = barSegments(group)
  return (
    <Link
      href={href}
      className="block rounded-[20px] bg-card border border-border/50 p-4 hover:border-primary/40 transition-colors"
    >
      <div className="flex items-center gap-2">
        <p className="flex-1 min-w-0 font-semibold text-foreground truncate">{group.name}</p>
        <p className="text-sm tabular-nums shrink-0">
          <span className={cn("font-bold", seg.overspent ? "text-expense" : "text-foreground")}>{formatCurrency(group.spent)}</span>
          <span className="text-muted-foreground"> de {formatCurrency(group.planned)}</span>
        </p>
        <CaretRight size={14} weight="bold" className="text-muted-foreground shrink-0" />
      </div>
      <PlanBar className="mt-3" committed={group.committed} plannedVariable={group.plannedVariable} spent={group.spent} />
      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
        {group.committed > 0 && (
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-foreground/25" />
            {formatCurrency(group.committed)} comprometido
          </span>
        )}
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-foreground/10 border border-foreground/20" />
          {formatCurrency(group.plannedVariable)} variável
        </span>
        {seg.overspent && <span className="text-expense font-medium">{formatCurrency(seg.overAmount)} acima</span>}
      </div>
    </Link>
  )
}

interface PlanTowerProps {
  plan: Plan
  groupHref: (groupId: string) => string
}

// A torre: grupos empilhados, "Sem categoria" consumindo a margem e, na base,
// a margem livre (o que sobra para desejos).
export function PlanTower({ plan, groupHref }: PlanTowerProps) {
  const negative = plan.freeMargin < 0
  return (
    <section className="space-y-2" aria-label="Plano por grupo">
      {plan.groups.map((group) => (
        // Desejos não têm categorias planejáveis: o planejado é a lista de desejos abaixo.
        <GroupRow key={group.id} group={group} href={group.kind === "WISHES" ? "#desejos" : groupHref(group.id)} />
      ))}

      {plan.uncategorized.spent > 0 && (
        <Link
          href="/inbox"
          className="flex items-center gap-3 rounded-[20px] bg-card border border-dashed border-border p-4 hover:border-primary/40 transition-colors"
        >
          <Tray size={20} weight="duotone" className="text-muted-foreground shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground">{UNCATEGORIZED_LABEL}</p>
            <p className="text-xs text-muted-foreground">Gasto do mês fora dos grupos — classifique para entrar no plano</p>
          </div>
          <p className="text-sm font-bold tabular-nums text-foreground shrink-0">{formatCurrency(plan.uncategorized.spent)}</p>
          <CaretRight size={14} weight="bold" className="text-muted-foreground shrink-0" />
        </Link>
      )}

      <div
        className={cn(
          "rounded-[20px] p-5 border",
          negative ? "bg-expense/10 border-expense/30" : "bg-income/10 border-income/30",
        )}
      >
        <div className="flex items-center gap-3">
          <Scales size={22} weight="bold" className={negative ? "text-expense" : "text-income"} />
          <p className="flex-1 text-sm font-semibold text-foreground">Margem livre</p>
          <p className={cn("text-2xl font-bold tabular-nums", negative ? "text-expense" : "text-foreground")}>
            {formatCurrency(plan.freeMargin)}
          </p>
        </div>
        {negative ? (
          <p className="mt-2 text-xs text-expense flex items-start gap-1.5">
            <WarningCircle size={14} weight="fill" className="shrink-0 mt-0.5" />
            O plano passa do orçamento em {formatCurrency(Math.abs(plan.freeMargin))}. Reduza alguma categoria ou aumente o orçamento.
          </p>
        ) : (
          <p className="mt-2 text-xs text-muted-foreground">
            O que sobra do orçamento depois dos grupos — é daqui que saem os desejos do mês.
          </p>
        )}
      </div>
    </section>
  )
}
