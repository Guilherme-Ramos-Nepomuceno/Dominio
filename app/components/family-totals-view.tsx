"use client"

import { User } from "@phosphor-icons/react"
import { formatCurrency } from "@/lib/date-utils"
import type { FamilyTotals } from "@/hooks/use-family-totals"

export function FamilyTotalsView({ loading, totals }: { loading: boolean; totals: FamilyTotals | null }) {
    if (loading) {
        return (
            <div className="rounded-2xl bg-card p-12 text-center border border-border/50">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            </div>
        )
    }

    if (!totals) {
        return (
            <div className="rounded-2xl bg-card p-12 text-center border border-border/50">
                <p className="text-muted-foreground font-medium">Não há dados suficientes da família neste período.</p>
            </div>
        )
    }

    return (
        <div className="space-y-4">
            <div className="rounded-[20px] bg-card p-6 border border-border/50">
                <p className="text-sm font-medium text-muted-foreground mb-4">Total combinado dos dois</p>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <p className="text-xs text-muted-foreground mb-1">Receita</p>
                        <p className="text-xl font-bold text-income tabular-nums">{formatCurrency(totals.income)}</p>
                    </div>
                    <div>
                        <p className="text-xs text-muted-foreground mb-1">Despesa</p>
                        <p className="text-xl font-bold text-expense tabular-nums">{formatCurrency(totals.expense)}</p>
                    </div>
                </div>
                <div className="mt-4 pt-4 border-t border-border/50 flex items-center justify-between">
                    <span className="text-sm font-semibold text-foreground">Saldo</span>
                    <span className="text-lg font-bold text-foreground tabular-nums">{formatCurrency(totals.balance)}</span>
                </div>
            </div>

            <div className="space-y-3">
                {totals.perMember.map(({ member, income, expense, balance }) => (
                    <div key={member.id} className="rounded-[20px] bg-card p-5 border border-border/50">
                        <div className="flex items-center gap-2 mb-3">
                            <User size={18} className="text-muted-foreground" />
                            <p className="font-semibold text-foreground truncate">{member.name || member.email}</p>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-center">
                            <div>
                                <p className="text-[11px] text-muted-foreground mb-0.5">Receita</p>
                                <p className="text-sm font-bold text-income tabular-nums">{formatCurrency(income)}</p>
                            </div>
                            <div>
                                <p className="text-[11px] text-muted-foreground mb-0.5">Despesa</p>
                                <p className="text-sm font-bold text-expense tabular-nums">{formatCurrency(expense)}</p>
                            </div>
                            <div>
                                <p className="text-[11px] text-muted-foreground mb-0.5">Saldo</p>
                                <p className="text-sm font-bold text-foreground tabular-nums">{formatCurrency(balance)}</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
