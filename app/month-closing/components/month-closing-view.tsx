"use client"

import { CalendarCheck, Receipt, Stack, ArrowsClockwise } from "@phosphor-icons/react"
import { AppLayout } from "@/components/layout/app-layout"
import { PageHeader } from "@/components/ui/page-header"
import { CasalFamiliaToggle } from "@/app/components/casal-familia-toggle"
import { formatCurrency } from "@/lib/date-utils"
import { getBankIcon, bankColors } from "@/lib/bank-icons"
import type { BankName } from "@/lib/types"
import { useMonthClosingViewModel, type CardlessPendingItem } from "../hooks/use-month-closing-view-model"

// Caixinha agregada (ícone + rótulo + total), no mesmo estilo de uma linha
// de cartão — usada tanto pra "Parcelas" quanto pra "Recorrentes".
function GroupSummaryRow({
    icon: Icon,
    label,
    items,
}: {
    icon: typeof Stack
    label: string
    items: CardlessPendingItem[]
}) {
    const total = items.reduce((sum, item) => sum + item.amount, 0)
    return (
        <div className="flex items-center gap-3 p-4 rounded-[1vw] bg-card border border-border/50">
            <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                <Icon size={18} weight="bold" className="text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{label}</p>
                <p className="text-xs text-muted-foreground">
                    {items.length} pendência{items.length === 1 ? "" : "s"}
                </p>
            </div>
            <p className="font-bold text-sm text-expense tabular-nums shrink-0">{formatCurrency(total)}</p>
        </div>
    )
}

export function MonthClosingView() {
    const { monthLabel, isCoupleAccount, viewMode, setViewMode, data, isLoading, grandTotal } = useMonthClosingViewModel()

    if (isLoading || !data) {
        return (
            <AppLayout>
                <div className="min-h-screen bg-background flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
            </AppLayout>
        )
    }

    const hasNothing =
        data.cardsBreakdown.length === 0 &&
        data.installmentItems.length === 0 &&
        data.recurringItems.length === 0 &&
        data.otherItems.length === 0

    return (
        <AppLayout>
            <div className="min-h-screen bg-background">
                <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 md:pb-8">
                    <PageHeader title="Fechamento do Mês" subtitle={`Tudo que vence em ${monthLabel}`} />

                    {isCoupleAccount && <CasalFamiliaToggle viewMode={viewMode} onChange={setViewMode} />}

                    <div className="rounded-[20px] bg-card p-6 border border-border/50 flex items-center justify-between mb-6 mt-2">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                                <CalendarCheck size={22} weight="bold" className="text-primary" />
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">Total a pagar em {monthLabel}</p>
                                <p className="text-2xl font-bold text-foreground tabular-nums">{formatCurrency(grandTotal)}</p>
                            </div>
                        </div>
                    </div>

                    {hasNothing ? (
                        <div className="text-center py-12">
                            <CalendarCheck size={48} className="mx-auto text-muted-foreground mb-4" weight="light" />
                            <p className="text-muted-foreground">Nada pendente pra {monthLabel} ainda.</p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {data.cardsBreakdown.length > 0 && (
                                <div className="space-y-2">
                                    <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground px-1">
                                        Faturas dos cartões
                                    </h3>
                                    <div className="space-y-2">
                                        {data.cardsBreakdown.map((card) => {
                                            const BankIcon = getBankIcon(card.bankName as BankName)
                                            const color = bankColors[card.bankName as BankName] ?? "#71717a"
                                            return (
                                                <div
                                                    key={`${card.cardId}-${card.memberName ?? ""}`}
                                                    className="flex items-center gap-3 p-4 rounded-[1vw] bg-card border border-border/50"
                                                >
                                                    <div
                                                        className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                                                        style={{ backgroundColor: color + "20" }}
                                                    >
                                                        <BankIcon size={18} weight="bold" style={{ color }} />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-medium text-foreground truncate">{card.name}</p>
                                                        {card.memberName && (
                                                            <p className="text-xs text-muted-foreground truncate">{card.memberName}</p>
                                                        )}
                                                    </div>
                                                    <p className="font-bold text-sm text-foreground tabular-nums shrink-0">
                                                        {formatCurrency(card.total)}
                                                    </p>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                            )}

                            {(data.installmentItems.length > 0 || data.recurringItems.length > 0) && (
                                <div className="space-y-2">
                                    <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground px-1">
                                        Pendências fora da fatura
                                    </h3>
                                    <p className="text-xs text-muted-foreground px-1 -mt-1 mb-2">
                                        Parcela ou recorrência lançada no débito (não sai sozinha como a fatura de crédito).
                                    </p>
                                    <div className="space-y-2">
                                        {data.installmentItems.length > 0 && (
                                            <GroupSummaryRow icon={Stack} label="Parcelas" items={data.installmentItems} />
                                        )}
                                        {data.recurringItems.length > 0 && (
                                            <GroupSummaryRow icon={ArrowsClockwise} label="Recorrentes" items={data.recurringItems} />
                                        )}
                                    </div>
                                </div>
                            )}

                            {data.otherItems.length > 0 && (
                                <div className="space-y-2">
                                    <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground px-1">
                                        Outras pendências (sem cartão)
                                    </h3>
                                    <p className="text-xs text-muted-foreground px-1 -mt-1 mb-2">
                                        Provavelmente boleto, aluguel ou PIX que você ainda precisa pagar na mão.
                                    </p>
                                    <div className="space-y-2">
                                        {data.otherItems
                                            .slice()
                                            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                                            .map((item) => (
                                                <div
                                                    key={item.id}
                                                    className="flex items-center gap-3 p-4 rounded-[1vw] bg-card border border-border/50"
                                                >
                                                    <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                                                        <Receipt size={18} weight="bold" className="text-muted-foreground" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-medium text-foreground truncate">{item.description}</p>
                                                        <p className="text-xs text-muted-foreground truncate">
                                                            {[
                                                                new Date(item.date).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
                                                                item.categoryName,
                                                                item.memberName,
                                                            ]
                                                                .filter(Boolean)
                                                                .join(" · ")}
                                                        </p>
                                                    </div>
                                                    <p className="font-bold text-sm text-expense tabular-nums shrink-0">
                                                        {formatCurrency(item.amount)}
                                                    </p>
                                                </div>
                                            ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </AppLayout>
    )
}
