"use client"

import { useState } from "react"
import { AppLayout } from "@/components/layout/app-layout"
import { PageHeader } from "@/components/ui/page-header"
import { Skeleton } from "@/components/ui/skeleton"
import { SectionTitle } from "@/app/plan/components/plan-ui"
import { formatCurrency, formatDate } from "@/lib/date-utils"
import { formatMoneyWhole } from "@/lib/plan-layout"
import { installmentProgress, recurringSummary } from "@/lib/recurring"
import { Repeat } from "@phosphor-icons/react"
import { cn } from "@/lib/utils"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useRecurringViewModel } from "../hooks/use-recurring-view-model"

// Valor com sinal só na receita (despesa é o padrão da tela).
function Amount({ value, type, className }: { value: number; type: string; className?: string }) {
    return (
        <span className={cn("font-semibold tabular-nums", type === "income" ? "text-income" : "text-foreground", className)}>
            {type === "income" ? "+ " : ""}
            {formatCurrency(value)}
        </span>
    )
}

// Página corrida, no desenho do Planejar: herói solto (quanto já sai todo mês)
// e duas listas com divisórias, sem um cartão em volta de cada item.
export function RecurringView() {
    const {
        loading,
        recurringList,
        installmentList,
        formatFrequency,
        transactionToCancel,
        setTransactionToCancel,
        confirmCancelRecurrence,
    } = useRecurringViewModel()
    const [isCancelling, setIsCancelling] = useState(false)
    const summary = recurringSummary(recurringList, installmentList)
    const isEmpty = recurringList.length === 0 && installmentList.length === 0
    const toCancel = recurringList.find((t) => t.id === transactionToCancel)

    const handleConfirmCancel = async () => {
        if (isCancelling) return
        setIsCancelling(true)
        try {
            await confirmCancelRecurrence()
        } finally {
            setIsCancelling(false)
        }
    }

    return (
        <AppLayout>
            <PageHeader back="/all-menus" title="Recorrentes" subtitle="Assinaturas, contas fixas e parcelas" />

            {loading ? (
                <div className="max-w-2xl mx-auto space-y-10" aria-busy>
                    <div className="space-y-3">
                        <Skeleton className="h-4 w-36 rounded-full" />
                        <Skeleton className="h-12 w-52 rounded-xl" />
                        <Skeleton className="h-4 w-64 rounded-full" />
                    </div>
                    <Skeleton className="h-40 rounded-xl" />
                </div>
            ) : isEmpty ? (
                <div className="max-w-2xl mx-auto py-10 text-center space-y-2">
                    <Repeat size={40} weight="duotone" className="mx-auto text-muted-foreground" />
                    <h2 className="text-lg font-semibold">Nada se repetindo</h2>
                    <p className="text-sm text-muted-foreground">
                        Ao registrar uma conta, marque que ela se repete ou parcele a compra — ela aparece aqui.
                    </p>
                </div>
            ) : (
                <div className="max-w-2xl mx-auto space-y-10">
                    {/* 1. Herói: o compromisso de todo mês */}
                    <section aria-labelledby="recurring-total-label">
                        <p id="recurring-total-label" className="text-sm text-muted-foreground">
                            Já sai todo mês
                        </p>
                        <p className="mt-1 text-5xl font-semibold tracking-tight leading-none tabular-nums text-foreground">
                            {formatMoneyWhole(summary.monthlyOut)}
                        </p>
                        <p className="mt-3 text-sm text-muted-foreground tabular-nums">
                            <span className="font-semibold text-foreground">{formatMoneyWhole(summary.fixedOut)}</span> em fixas
                            {summary.installmentsOut > 0 && (
                                <>
                                    {" · "}
                                    <span className="font-semibold text-foreground">{formatMoneyWhole(summary.installmentsOut)}</span> em parcelas
                                </>
                            )}
                        </p>
                        {summary.fixedIn > 0 && (
                            <p className="mt-1 text-sm text-muted-foreground tabular-nums">
                                Entram <span className="font-semibold text-foreground">{formatMoneyWhole(summary.fixedIn)}</span> por mês em receitas
                                fixas
                            </p>
                        )}
                    </section>

                    {/* 2. Assinaturas e fixas */}
                    <section aria-labelledby="recurring-fixed-title">
                        <SectionTitle id="recurring-fixed-title">Assinaturas e fixas</SectionTitle>
                        {recurringList.length === 0 ? (
                            <p className="mt-3 text-sm text-muted-foreground">Nenhuma assinatura ativa.</p>
                        ) : (
                            <ul className="mt-1 divide-y divide-border">
                                {recurringList.map((t) => (
                                    <li key={t.id} className="flex items-start gap-3 py-4">
                                        <div className="flex-1 min-w-0">
                                            <p className="truncate font-semibold text-foreground">{t.description}</p>
                                            <p className="text-xs text-muted-foreground">
                                                {formatFrequency(t.recurrence || "monthly")} · próxima {formatDate(t.date)}
                                            </p>
                                        </div>
                                        <div className="flex shrink-0 flex-col items-end">
                                            <Amount value={t.amount} type={t.type} />
                                            <button
                                                type="button"
                                                onClick={() => setTransactionToCancel(t.id)}
                                                className="mt-1 text-xs text-muted-foreground underline decoration-muted-foreground/30 underline-offset-4 hover:text-expense hover:decoration-expense transition-colors"
                                            >
                                                Cancelar
                                            </button>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </section>

                    {/* 3. Parcelas: quanto falta e o andamento */}
                    <section aria-labelledby="recurring-installments-title">
                        <div className="flex items-baseline justify-between gap-3">
                            <SectionTitle id="recurring-installments-title">Compras parceladas</SectionTitle>
                            {summary.installmentsRemaining > 0 && (
                                <span className="text-sm tabular-nums text-muted-foreground">
                                    faltam <span className="font-semibold text-foreground">{formatMoneyWhole(summary.installmentsRemaining)}</span>
                                </span>
                            )}
                        </div>
                        {installmentList.length === 0 ? (
                            <p className="mt-3 text-sm text-muted-foreground">Nenhum parcelamento ativo.</p>
                        ) : (
                            <ul className="mt-1 divide-y divide-border">
                                {installmentList.map((t) => {
                                    const p = installmentProgress(t)
                                    return (
                                        <li key={t.id} className="py-4">
                                            <div className="flex items-start gap-3">
                                                <div className="flex-1 min-w-0">
                                                    <p className="truncate font-semibold text-foreground">{t.description}</p>
                                                    <p className="text-xs text-muted-foreground tabular-nums">
                                                        Parcela {p.current} de {p.total} · próxima {formatDate(t.date)}
                                                    </p>
                                                </div>
                                                <div className="shrink-0 text-right">
                                                    <Amount value={t.amount} type={t.type} />
                                                    <p className="text-xs text-muted-foreground tabular-nums">
                                                        {p.left === 1 ? "última" : `faltam ${formatMoneyWhole(p.remaining)}`}
                                                    </p>
                                                </div>
                                            </div>
                                            <div
                                                className="mt-2.5 h-1.5 overflow-hidden rounded-full"
                                                style={{ backgroundColor: "var(--plan-track)" }}
                                                role="progressbar"
                                                aria-valuemin={0}
                                                aria-valuemax={p.total}
                                                aria-valuenow={p.current - 1}
                                                aria-label={`${p.current - 1} de ${p.total} parcelas pagas`}
                                            >
                                                <div className="h-full rounded-full bg-foreground/60" style={{ width: `${p.pct}%` }} />
                                            </div>
                                        </li>
                                    )
                                })}
                            </ul>
                        )}
                    </section>
                </div>
            )}

            <AlertDialog open={!!transactionToCancel} onOpenChange={() => setTransactionToCancel(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Cancelar {toCancel ? `"${toCancel.description}"` : "recorrência"}?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Isso cancela esta e todas as próximas ocorrências desta recorrência (meses futuros). Ocorrências já pagas em meses anteriores não são afetadas.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isCancelling}>Voltar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleConfirmCancel} disabled={isCancelling} className="bg-destructive text-white hover:bg-destructive/90">
                            {isCancelling ? "Cancelando..." : "Cancelar recorrência"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </AppLayout>
    )
}
