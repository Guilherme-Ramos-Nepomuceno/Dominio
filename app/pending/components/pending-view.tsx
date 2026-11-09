"use client"

import { useMemo, useState } from "react"
import { CalendarCheck, Check, Heart, PencilSimple, Prohibit, SkipForward } from "@phosphor-icons/react"
import * as PhosphorIcons from "@phosphor-icons/react"
import { findCategory, transactionCategoryLabel } from "@/lib/category-utils"
import { formatCurrency } from "@/lib/date-utils"
import { groupPending, pendingDueLabel, pendingSummary } from "@/lib/pending"
import { transactionIconColor } from "@/lib/plan-layout"
import { useCategoryGroups } from "@/hooks/use-category-groups"
import { PageHeader } from "@/components/ui/page-header"
import { SkeletonSection, SkeletonSummary } from "@/components/ui/loading-skeletons"
import { CardChips, Chip, ChipRow, DateChips, FieldLabel, localISODate } from "@/components/transaction-inputs/transaction-inputs"
import { SectionTitle } from "@/app/plan/components/plan-ui"
import { cn } from "@/lib/utils"
import { AppLayout } from "@/components/layout/app-layout"
import { EditTransactionDialog } from "@/app/components/edit-transaction-dialog"
import type { Transaction } from "@/lib/types"
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
import { usePendingViewModel } from "../hooks/use-pending-view-model"
import { useAccount } from "@/components/account/account-context"

type Filter = "all" | "expense" | "income"

const FILTERS: Array<{ id: Filter; label: string }> = [
    { id: "all", label: "Tudo" },
    { id: "expense", label: "A pagar" },
    { id: "income", label: "A receber" },
]

// Contas a pagar/receber no desenho das telas novas: resumo no topo, lista
// solta agrupada pelo prazo (atrasadas primeiro) e a baixa abrindo na própria
// linha — data e conta em pílulas, um botão só.
export function PendingView() {
    const vm = usePendingViewModel()
    const groups = useCategoryGroups()
    const { isReadOnly } = useAccount()
    const [filter, setFilter] = useState<Filter>("all")
    const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null)

    const todayISO = localISODate(new Date())
    // O tipo vale o da categoria (uma receita lançada em categoria de despesa conta como despesa).
    const typed = useMemo(
        () => vm.visibleTransactions.map((t) => ({ ...t, type: findCategory(vm.categories, t.categoryId)?.type ?? t.type })),
        [vm.visibleTransactions, vm.categories],
    )
    const summary = useMemo(() => pendingSummary(typed, todayISO), [typed, todayISO])
    const sections = useMemo(
        () => groupPending(typed.filter((t) => filter === "all" || t.type === filter), todayISO),
        [typed, filter, todayISO],
    )

    const closePanel = () => {
        vm.setSelectedTransaction(null)
        vm.setSelectedCard("")
        vm.setConfirmDate("")
    }

    return (
        <AppLayout>
            <div className="max-w-2xl mx-auto space-y-8 pb-24 md:pb-10">
                <PageHeader back="/" title="Contas a pagar" subtitle="O que ainda vai sair e entrar" />

                {!vm.isLoaded ? (
                    <>
                        <SkeletonSummary />
                        <SkeletonSection count={5} />
                    </>
                ) : vm.visibleTransactions.length === 0 ? (
                    <div className="py-12 text-center space-y-2">
                        <CalendarCheck size={36} weight="duotone" className="mx-auto text-income" />
                        <p className="text-sm font-medium text-foreground">Tudo em dia</p>
                        <p className="text-xs text-muted-foreground">Nenhuma conta esperando pagamento ou recebimento.</p>
                    </div>
                ) : (
                    <>
                        {/* Resumo */}
                        <section aria-label="Resumo" className="space-y-1">
                            <div className="flex items-baseline gap-6">
                                <div>
                                    <p className="text-xs text-muted-foreground">A pagar</p>
                                    <p className="text-2xl font-semibold tabular-nums text-foreground">{formatCurrency(summary.toPay)}</p>
                                </div>
                                {summary.toReceive > 0 && (
                                    <div>
                                        <p className="text-xs text-muted-foreground">A receber</p>
                                        <p className="text-2xl font-semibold tabular-nums text-income">{formatCurrency(summary.toReceive)}</p>
                                    </div>
                                )}
                            </div>
                            {summary.overdueCount > 0 && (
                                <p className="text-xs font-medium text-expense">
                                    {summary.overdueCount === 1 ? "1 conta atrasada" : `${summary.overdueCount} contas atrasadas`}
                                    {summary.overdueAmount > 0 && ` · ${formatCurrency(summary.overdueAmount)}`}
                                </p>
                            )}
                        </section>

                        {/* Filtro */}
                        <div role="radiogroup" aria-label="Filtrar" className="inline-flex rounded-full bg-muted/50 p-0.5 text-xs font-medium">
                            {FILTERS.map((f) => (
                                <button
                                    key={f.id}
                                    type="button"
                                    role="radio"
                                    aria-checked={filter === f.id}
                                    onClick={() => setFilter(f.id)}
                                    className={cn(
                                        "rounded-full px-3 py-1 transition-colors",
                                        filter === f.id ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground",
                                    )}
                                >
                                    {f.label}
                                </button>
                            ))}
                        </div>

                        {sections.length === 0 && (
                            <p className="text-sm text-muted-foreground">Nada {filter === "income" ? "a receber" : "a pagar"} por aqui.</p>
                        )}

                        {sections.map((section) => (
                            <section key={section.bucket} aria-labelledby={`pending-${section.bucket}`}>
                                <div className="flex items-baseline justify-between">
                                    <SectionTitle id={`pending-${section.bucket}`} className={cn(section.bucket === "overdue" && "text-expense")}>
                                        {section.label}
                                    </SectionTitle>
                                    {section.total > 0 && <span className="text-xs tabular-nums text-muted-foreground">{formatCurrency(section.total)}</span>}
                                </div>
                                <ul className="mt-2 divide-y divide-border">
                                    {section.items.map((transaction) => {
                                        const category = findCategory(vm.categories, transaction.categoryId)
                                        const isExpense = transaction.type === "expense"
                                        const CategoryIcon =
                                            (category?.icon && (PhosphorIcons as any)[category.icon]) || (transaction.categoryId ? PhosphorIcons.Circle : PhosphorIcons.Tag)
                                        const linkedCard = transaction.cardId ? vm.cards.find((c) => c.id === transaction.cardId) : null
                                        const totalInst = transaction.installments || 1
                                        const currentInst = transaction.currentInstallment || (transaction.paidInstallments || 0) + 1
                                        const isInstallment = totalInst > 1 && transaction.recurrence === "none"
                                        const isRecurring = !!transaction.recurrence && transaction.recurrence !== "none"
                                        const open = vm.selectedTransaction === transaction.id
                                        const overdue = section.bucket === "overdue"
                                        const meta = [
                                            transactionCategoryLabel(vm.categories, transaction),
                                            isInstallment ? `${currentInst}/${totalInst}` : isRecurring ? "mensal" : null,
                                            linkedCard?.name,
                                        ].filter(Boolean)

                                        return (
                                            <li key={transaction.id}>
                                                <button
                                                    type="button"
                                                    aria-expanded={isReadOnly ? undefined : open}
                                                    disabled={isReadOnly}
                                                    onClick={() => (open ? closePanel() : vm.handleMarkAsPaid(transaction.id))}
                                                    className="flex w-full items-center gap-3 py-3 text-left"
                                                >
                                                    <CategoryIcon
                                                        size={22}
                                                        weight="duotone"
                                                        className="shrink-0"
                                                        style={{ color: transactionIconColor(groups, transaction.categoryId, transaction.type) }}
                                                        aria-hidden
                                                    />
                                                    <div className="flex-1 min-w-0">
                                                        <p className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                                                            <span className="truncate">{transaction.description}</span>
                                                            {!vm.isCoupleView && transaction.isCasal && <Heart size={11} weight="fill" className="shrink-0 text-primary" aria-label="do casal" />}
                                                        </p>
                                                        <p className="text-xs text-muted-foreground truncate">{meta.join(" · ")}</p>
                                                    </div>
                                                    <div className="shrink-0 text-right">
                                                        <p className={cn("text-sm font-semibold tabular-nums", isExpense ? "text-foreground" : "text-income")}>
                                                            {isExpense ? "" : "+"}
                                                            {formatCurrency(transaction.amount)}
                                                        </p>
                                                        <p className={cn("text-[11px]", overdue ? "text-expense" : "text-muted-foreground")}>
                                                            {pendingDueLabel(transaction.date, todayISO)}
                                                        </p>
                                                    </div>
                                                </button>

                                                {open && !isReadOnly && (
                                                    <div className="space-y-5 pb-5 pl-[34px] animate-in fade-in slide-in-from-top-1 motion-reduce:animate-none">
                                                        <div className="space-y-2">
                                                            <FieldLabel>{isExpense ? "Pago quando?" : "Recebido quando?"}</FieldLabel>
                                                            <DateChips value={vm.confirmDate || todayISO} onChange={vm.setConfirmDate} />
                                                        </div>
                                                        {vm.isCoupleView ? (
                                                            <div className="space-y-2">
                                                                <FieldLabel hint="Entra no acerto do mês">Quem pagou?</FieldLabel>
                                                                <ChipRow wrap>
                                                                    {vm.payers.map((p) => (
                                                                        <Chip key={p.id} selected={vm.paidBy === p.id} onClick={() => vm.setPaidBy(p.id)}>
                                                                            {p.name}
                                                                        </Chip>
                                                                    ))}
                                                                </ChipRow>
                                                            </div>
                                                        ) : vm.cards.length > 0 && (
                                                            <div className="space-y-2">
                                                                <FieldLabel>{isExpense ? "Saiu de qual conta?" : "Entrou em qual conta?"}</FieldLabel>
                                                                <CardChips cards={vm.cards} value={vm.selectedCard || null} onChange={(id) => vm.setSelectedCard(id ?? "")} wrap />
                                                            </div>
                                                        )}
                                                        {isInstallment && (
                                                            <p className="text-xs text-muted-foreground">
                                                                Baixa da parcela {currentInst} de {totalInst}; a próxima fica para o mês seguinte.
                                                            </p>
                                                        )}
                                                        <button
                                                            type="button"
                                                            onClick={vm.confirmPayment}
                                                            disabled={vm.isConfirmingPayment}
                                                            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-foreground py-3 text-sm font-semibold text-background hover:bg-foreground/90 transition-colors disabled:opacity-50"
                                                        >
                                                            <Check size={16} weight="bold" />
                                                            {vm.isConfirmingPayment
                                                                ? "Confirmando..."
                                                                : `${isExpense ? "Paguei" : "Recebi"} ${formatCurrency(transaction.amount)}`}
                                                        </button>
                                                        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-medium">
                                                            <button type="button" onClick={() => setEditingTransaction(transaction)} className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground">
                                                                <PencilSimple size={14} weight="bold" />
                                                                Editar
                                                            </button>
                                                            <button type="button" onClick={() => vm.setTransactionToCancel(transaction.id)} className="flex items-center gap-1.5 text-muted-foreground hover:text-expense">
                                                                <SkipForward size={14} weight="bold" />
                                                                {isRecurring || isInstallment ? "Pular este mês" : "Cancelar conta"}
                                                            </button>
                                                            {isRecurring && (
                                                                <button type="button" onClick={() => vm.setTransactionToCancelRecurrence(transaction.id)} className="flex items-center gap-1.5 text-muted-foreground hover:text-expense">
                                                                    <Prohibit size={14} weight="bold" />
                                                                    Encerrar recorrência
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            </li>
                                        )
                                    })}
                                </ul>
                            </section>
                        ))}
                    </>
                )}
            </div>

            <AlertDialog open={!!vm.transactionToCancel} onOpenChange={() => vm.setTransactionToCancel(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Tirar esta conta das pendências?</AlertDialogTitle>
                        <AlertDialogDescription>Ela fica cancelada neste mês e não entra nos seus gastos. Se for recorrente, os próximos meses continuam.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Voltar</AlertDialogCancel>
                        <AlertDialogAction onClick={vm.confirmCancel} className="bg-destructive text-white hover:bg-destructive/90">Tirar</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={!!vm.transactionToCancelRecurrence} onOpenChange={() => vm.setTransactionToCancelRecurrence(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Encerrar a recorrência?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Cancela esta e todas as próximas ocorrências. Meses já pagos não mudam.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Voltar</AlertDialogCancel>
                        <AlertDialogAction onClick={vm.confirmCancelRecurrence} className="bg-destructive text-white hover:bg-destructive/90">Encerrar</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <EditTransactionDialog
                transaction={editingTransaction}
                onClose={() => setEditingTransaction(null)}
                onSaved={() => { setEditingTransaction(null); vm.refresh() }}
            />
        </AppLayout>
    )
}
