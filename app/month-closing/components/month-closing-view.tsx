"use client"

import { useState } from "react"
import { CaretDown, Receipt, Stack, ArrowsClockwise } from "@phosphor-icons/react"
import { AppLayout } from "@/components/layout/app-layout"
import { PageHeader } from "@/components/ui/page-header"
import { Skeleton } from "@/components/ui/skeleton"
import { CasalFamiliaToggle } from "@/app/components/casal-familia-toggle"
import { SectionTitle } from "@/app/plan/components/plan-ui"
import { formatCurrency } from "@/lib/date-utils"
import { getBankIcon, bankColors } from "@/lib/bank-icons"
import type { BankName } from "@/lib/types"
import { useMonthClosingViewModel, type CardlessPendingItem } from "../hooks/use-month-closing-view-model"
import { UNCATEGORIZED_LABEL } from "@/lib/category-utils"
import { cn } from "@/lib/utils"
import { ClosePlanSection } from "./close-plan-section"

// Linha agregada (ícone + rótulo + total) — usada para "Parcelas" e "Recorrentes".
function GroupSummaryRow({ icon: Icon, label, items }: { icon: typeof Stack; label: string; items: CardlessPendingItem[] }) {
  const total = items.reduce((sum, item) => sum + item.amount, 0)
  return (
    <li className="flex items-center gap-3 py-3">
      <Icon size={18} weight="bold" className="text-muted-foreground shrink-0" />
      <span className="flex-1 min-w-0">
        <span className="block text-sm font-medium text-foreground truncate">{label}</span>
        <span className="block text-xs text-muted-foreground">
          {items.length} pendência{items.length === 1 ? "" : "s"} no débito
        </span>
      </span>
      <span className="text-sm font-semibold tabular-nums text-foreground">{formatCurrency(total)}</span>
    </li>
  )
}

// O que vem no próximo mês: o total a pagar numa linha (faturas, parcelas e
// contas fora do cartão) e, ao tocar, o detalhe. Antes era uma aba separada.
function DuesSection() {
  const { monthLabel, isCoupleAccount, viewMode, setViewMode, data, isLoading, grandTotal } = useMonthClosingViewModel()
  const [open, setOpen] = useState(false)

  if (isLoading || !data) return <Skeleton className="h-16 w-full rounded-xl" />

  const hasNothing =
    data.cardsBreakdown.length === 0 && data.installmentItems.length === 0 && data.recurringItems.length === 0 && data.otherItems.length === 0
  const otherItems = data.otherItems.slice().sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  return (
    <section aria-labelledby="dues-title" className="space-y-3">
      <SectionTitle id="dues-title">O que vem em {monthLabel.split(" ")[0].toLowerCase()}</SectionTitle>
      {isCoupleAccount && <CasalFamiliaToggle viewMode={viewMode} onChange={setViewMode} />}

      {hasNothing ? (
        <p className="text-sm text-muted-foreground">Nada pendente para {monthLabel} ainda.</p>
      ) : (
        <>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            className="flex w-full items-center gap-3 border-y border-border py-3 text-left hover:opacity-80 transition-opacity"
          >
            <span className="flex-1 min-w-0">
              <span className="block text-xs text-muted-foreground">Total a pagar em {monthLabel}</span>
              <span className="block text-2xl font-semibold tabular-nums text-foreground">{formatCurrency(grandTotal)}</span>
            </span>
            <span className="text-xs font-medium text-muted-foreground">{open ? "Esconder" : "Ver detalhes"}</span>
            <CaretDown size={14} weight="bold" className={cn("shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} />
          </button>

          {open && (
            <div className="space-y-6 animate-in fade-in slide-in-from-top-1 duration-200 motion-reduce:animate-none">
              {data.cardsBreakdown.length > 0 && (
                <div>
                  <h3 className="text-xs font-medium text-muted-foreground">Faturas dos cartões</h3>
                  <ul className="divide-y divide-border">
                    {data.cardsBreakdown.map((card) => {
                      const BankIcon = getBankIcon(card.bankName as BankName)
                      const color = bankColors[card.bankName as BankName] ?? "#71717a"
                      return (
                        <li key={`${card.cardId}-${card.memberName ?? ""}`} className="flex items-center gap-3 py-3">
                          <BankIcon size={18} weight="bold" style={{ color }} className="shrink-0" />
                          <span className="flex-1 min-w-0">
                            <span className="block text-sm font-medium text-foreground truncate">{card.name}</span>
                            {card.memberName && <span className="block text-xs text-muted-foreground truncate">{card.memberName}</span>}
                          </span>
                          <span className="text-sm font-semibold tabular-nums text-foreground">{formatCurrency(card.total)}</span>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              )}

              {(data.installmentItems.length > 0 || data.recurringItems.length > 0) && (
                <div>
                  <h3 className="text-xs font-medium text-muted-foreground">Fora da fatura (não saem sozinhas como o crédito)</h3>
                  <ul className="divide-y divide-border">
                    {data.installmentItems.length > 0 && <GroupSummaryRow icon={Stack} label="Parcelas" items={data.installmentItems} />}
                    {data.recurringItems.length > 0 && <GroupSummaryRow icon={ArrowsClockwise} label="Recorrentes" items={data.recurringItems} />}
                  </ul>
                </div>
              )}

              {otherItems.length > 0 && (
                <div>
                  <h3 className="text-xs font-medium text-muted-foreground">Outras contas (boleto, aluguel, PIX)</h3>
                  <ul className="divide-y divide-border">
                    {otherItems.map((item) => (
                      <li key={item.id} className="flex items-center gap-3 py-3">
                        <Receipt size={18} weight="bold" className="text-muted-foreground shrink-0" />
                        <span className="flex-1 min-w-0">
                          <span className="block text-sm font-medium text-foreground truncate">{item.description}</span>
                          <span className="block text-xs text-muted-foreground truncate">
                            {[
                              new Date(item.date).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
                              item.categoryName || UNCATEGORIZED_LABEL,
                              item.memberName,
                            ]
                              .filter(Boolean)
                              .join(" · ")}
                          </span>
                        </span>
                        <span className="text-sm font-semibold tabular-nums text-foreground">{formatCurrency(item.amount)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </section>
  )
}

// Fechamento: uma página só, na ordem do ritual — como foi o mês, o que falta
// para fechar, e o que vem no mês seguinte.
export function MonthClosingView() {
  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto space-y-12 pb-24 md:pb-8">
        <PageHeader back="/plan" title="Fechamento do mês" subtitle="Veja como foi, feche em 3 passos e prepare o próximo" />
        <ClosePlanSection />
        <DuesSection />
      </div>
    </AppLayout>
  )
}
