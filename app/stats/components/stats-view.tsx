"use client"

import { useState } from "react"
import { AppLayout } from "@/components/layout/app-layout"
import { PageHeader } from "@/components/ui/page-header"
import { CompassDeviation } from "./compass-deviation"
import { MonthHeaderSelector } from "@/components/ui/month-header-selector"
import { AnalyticsFilterBar } from "./analytics-filter-bar"
import { formatMonth, formatCurrency } from "@/lib/date-utils"
import { cn } from "@/lib/utils"
import * as PhosphorIcons from "@phosphor-icons/react"
import { CreditCard, Wallet, Circle, Heart, RepeatIcon, CheckCircle } from "@phosphor-icons/react"
import { EditTransactionDialog } from "@/app/components/edit-transaction-dialog"
import { CasalFamiliaToggle } from "@/app/components/casal-familia-toggle"
import { FamilyTotalsView } from "@/app/components/family-totals-view"
import { updateTransaction } from "@/lib/storage"
import { useAccount } from "@/components/account/account-context"
import { SkeletonSection } from "@/components/ui/loading-skeletons"
import { SectionTitle } from "@/app/plan/components/plan-ui"
import { useCategoryGroups } from "@/hooks/use-category-groups"
import { transactionIconColor } from "@/lib/plan-layout"
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
import { useStatsViewModel } from "../hooks/use-stats-view-model"
import { useSelectedMonth } from "@/lib/selected-month-context"
import { findCategory, UNCATEGORIZED_LABEL } from "@/lib/category-utils"
import { AutoCategoryBadge } from "@/components/rules/auto-category-badge"

export function StatsView() {
    const { periodRangeLabel } = useSelectedMonth()
    const {
        selectedMonth,
        setSelectedMonth,
        filters,
        setFilters,
        viewMode,
        setViewMode,
        isCoupleAccount,
        familyTotals,
        loadingFamilyTotals,
        loading,
        transactionToCancel,
        setTransactionToCancel,
        categories,
        cards,
        allTransactions,
        groupedTransactions,
        sortedDates,
        confirmCancelTransaction,
        categoryAlerts,
        refresh
    } = useStatsViewModel()

    const [editingTransaction, setEditingTransaction] = useState<any>(null)
    const groups = useCategoryGroups()
    const { family, selection } = useAccount()
    // Marcar "do casal" só na própria conta: no casal todas já são, na do parceiro é só leitura.
    const hasCoupleAccount = selection.type === "personal" && !!family?.members?.some((m) => m.accountType === "COUPLE")

    const toggleCasal = async (transaction: any) => {
        await updateTransaction(transaction.id, { isCasal: !transaction.isCasal })
        refresh()
    }

    const getLocalDateKey = (date: Date) => date.toLocaleDateString('sv-SE')
    const todayKey = getLocalDateKey(new Date())
    const yesterdayDate = new Date()
    yesterdayDate.setDate(yesterdayDate.getDate() - 1)
    const yesterdayKey = getLocalDateKey(yesterdayDate)

    const TransactionItem = ({ transaction }: { transaction: any }) => {
        const category = findCategory(categories, transaction.categoryId)
        const IconComponent = category?.icon && (PhosphorIcons as any)[category.icon]
            ? (PhosphorIcons as any)[category.icon]
            : transaction.categoryId ? PhosphorIcons.Question : PhosphorIcons.Tag
        const card = cards.find(c => c.id === transaction.cardId)

        // No crédito, todas as parcelas de uma compra referenciam quando ela foi
        // feita de verdade (a data da 1ª parcela) — no débito cada mês é uma baixa
        // independente, então não faz sentido mostrar essa referência ali.
        const isCreditInstallment =
            transaction.installments > 1 &&
            !!card?.hasCredit &&
            (card.hasDebit ? transaction.paymentMethod === "credit" : true)
        const purchaseTransaction = transaction.parentId
            ? allTransactions.find((t: any) => t.id === transaction.parentId)
            : null
        const purchaseDateObj = purchaseTransaction ? new Date(purchaseTransaction.date) : null
        const isRecurring = !!transaction.recurrence && transaction.recurrence !== "none"

        const [startX, setStartX] = useState<number | null>(null)
        const [swipeOffset, setSwipeOffset] = useState(0)
        const SWIPE_THRESHOLD = -80

        const onTouchStart = (e: React.TouchEvent) => setStartX(e.targetTouches[0].clientX)
        const onTouchMove = (e: React.TouchEvent) => {
            if (startX === null) return
            const currentX = e.targetTouches[0].clientX
            const diff = currentX - startX
            if (diff < 0) setSwipeOffset(Math.max(diff, -100))
        }
        const onTouchEnd = () => {
            if (swipeOffset < SWIPE_THRESHOLD) setSwipeOffset(-80)
            else setSwipeOffset(0)
            setStartX(null)
        }

        return (
            <div className="relative overflow-hidden group">
                <div className="absolute inset-y-0 right-0 w-[80px] bg-red-500 flex items-center justify-center">
                    <button onClick={() => setTransactionToCancel(transaction.id)} className="text-white w-full h-full flex items-center justify-center">
                        <PhosphorIcons.Trash size={24} weight="bold" />
                    </button>
                </div>
                <div
                    className="relative bg-background py-3 flex items-center justify-between gap-3 z-10 cursor-pointer"
                    style={{ transform: `translateX(${swipeOffset}px)`, transition: startX === null ? 'transform 0.2s ease-out' : 'none' }}
                    onClick={() => setEditingTransaction(transaction)}
                    onTouchStart={onTouchStart}
                    onTouchMove={onTouchMove}
                    onTouchEnd={onTouchEnd}
                >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                        <IconComponent size={20} weight="duotone" className="shrink-0" style={{ color: transactionIconColor(groups, transaction.categoryId, category?.type ?? transaction.type) }} />
                        <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{transaction.description}</p>
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs text-muted-foreground">{transaction.categoryId ? category?.name || "Geral" : UNCATEGORIZED_LABEL}</span>
                                <AutoCategoryBadge transaction={transaction} />
                                {isCreditInstallment && purchaseDateObj && (
                                    <span className="text-[10px] text-muted-foreground">Comprou em: {purchaseDateObj.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</span>
                                )}
                                {transaction.installments && transaction.installments > 1 && (
                                    <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                                        <CreditCard size={10} weight="fill" />
                                        {transaction.currentInstallment}/{transaction.installments}
                                    </span>
                                )}
                                {isRecurring && (
                                    <span className="text-[11px] text-muted-foreground flex items-center gap-1" title="Transação recorrente">
                                        <RepeatIcon size={10} weight="bold" />
                                        Recorrente
                                    </span>
                                )}
                                {card && filters.paymentMethod === 'credit' && <span className="text-[10px] text-muted-foreground flex items-center gap-1">• {card.name}</span>}
                            </div>
                        </div>
                        {hasCoupleAccount && transaction.type === "expense" && (
                            <button
                                onClick={(e) => { e.stopPropagation(); toggleCasal(transaction); }}
                                className={cn(
                                    "flex items-center justify-center w-7 h-7 shrink-0 transition-all",
                                    transaction.isCasal ? "text-foreground" : "text-foreground/40 hover:text-foreground/70",
                                )}
                                title={transaction.isCasal ? "Despesa do casal — clique para desmarcar" : "Marcar como despesa do casal"}
                            >
                                <Heart size={18} weight="fill" />
                            </button>
                        )}
                    </div>
                    <div className="text-right flex items-center gap-4">
                        <div>
                            <p className={cn("text-sm font-semibold tabular-nums", transaction.type === "expense" ? "text-foreground" : "text-income")}>{transaction.type === "expense" ? "-" : "+"}{formatCurrency(transaction.amount)}</p>
                            {filters.paymentMethod === 'credit' && (
                                <div className="flex justify-end mt-1">
                                    {transaction.status === 'paid' ? (
                                        <span className="text-[10px] text-income flex items-center gap-1 bg-income/10 px-1.5 py-0.5 rounded-full"><CheckCircle size={10} weight="fill" />Paga</span>
                                    ) : (
                                        <span className="text-[10px] text-amber-500 flex items-center gap-1 bg-amber-500/10 px-1.5 py-0.5 rounded-full"><Circle size={8} weight="fill" />Fatura Aberta</span>
                                    )}
                                </div>
                            )}
                        </div>
                        <button onClick={(e) => { e.stopPropagation(); setTransactionToCancel(transaction.id); }} className="hidden md:flex opacity-0 group-hover:opacity-100 items-center justify-center w-8 h-8 rounded-full bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all" title="Desfazer/Cancelar">
                            <PhosphorIcons.Trash size={16} weight="bold" />
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <AppLayout showMonthFilter>
            <div className="max-w-2xl mx-auto space-y-10 pb-24 md:pb-10">
            <PageHeader back="/all-menus"
                title="Bússola"
                subtitle={`Para onde foi o dinheiro em ${formatMonth(selectedMonth).split(" ")[0].toLowerCase()}${periodRangeLabel ? ` · ${periodRangeLabel}` : ""}`}
                action={
                    <div className="hidden md:block">
                        <MonthHeaderSelector />
                    </div>
                }
            />

            {isCoupleAccount && <CasalFamiliaToggle viewMode={viewMode} onChange={setViewMode} />}

            {viewMode === "familia" ? (
                <FamilyTotalsView loading={loadingFamilyTotals} totals={familyTotals} />
            ) : (
                <>
            {categoryAlerts.length > 0 && filters.paymentMethod === 'all' && (
                <ul className="space-y-1">
                    {categoryAlerts.map((alert, idx) => (
                        <li key={idx} className="flex items-center gap-2 text-sm text-expense">
                            <PhosphorIcons.WarningCircle size={16} weight="bold" aria-hidden />
                            Meta de {alert?.categoryName} excedida
                        </li>
                    ))}
                </ul>
            )}

            <CompassDeviation
                onSelectCategory={(key) => {
                    setFilters({ ...filters, categoryId: key })
                    document.getElementById("stats-statement-title")?.closest("section")?.scrollIntoView({ behavior: "smooth", block: "start" })
                }}
            />

            <section aria-labelledby="stats-statement-title" className="space-y-6 scroll-mt-24">
            <SectionTitle id="stats-statement-title">Extrato</SectionTitle>
            <AnalyticsFilterBar
                filters={filters}
                onChange={setFilters}
                categories={categories}
                cards={cards}
            />

            <div className="space-y-6">
                {loading ? (
                    <>
                        <SkeletonSection count={3} />
                        <SkeletonSection count={2} />
                    </>
                ) : sortedDates.length > 0 ? (
                    sortedDates.map((date) => {
                        const isToday = date === todayKey
                        const isYesterday = date === yesterdayKey
                        const transactionsForDate = groupedTransactions[date]
                        const dateObjForTitle = new Date(date + "T12:00:00")
                        let groupTitle = isToday ? "Hoje" : isYesterday ? "Ontem" : (() => {
                            const dayAndMonth = dateObjForTitle.toLocaleDateString("pt-BR", { day: "numeric", month: "long" })
                            const weekDay = dateObjForTitle.toLocaleDateString("pt-BR", { weekday: "long" })
                            return dayAndMonth.charAt(0).toUpperCase() + dayAndMonth.slice(1) + ` • ${weekDay}`
                        })()

                        return (
                            <div key={date}>
                                <h3 className="text-xs font-medium text-muted-foreground flex items-center justify-between">
                                    {groupTitle}
                                    <span className="tabular-nums">{formatCurrency(transactionsForDate.filter((t: any) => t.type === "expense").reduce((acc: number, t: { amount: number }) => acc + t.amount, 0))} gastos</span>
                                </h3>
                                <div className="divide-y divide-border">
                                    {transactionsForDate.map((t: any) => <TransactionItem key={t.id} transaction={t} />)}
                                </div>
                            </div>
                        )
                    })
                ) : (
                    <div className="py-10 text-center flex flex-col items-center justify-center gap-3">
                        {filters.paymentMethod === 'credit' ? <CreditCard size={28} weight="duotone" className="text-muted-foreground" /> : <Wallet size={28} weight="duotone" className="text-muted-foreground" />}
                        <p className="text-muted-foreground font-medium">{filters.paymentMethod === 'credit' ? "Nenhuma transação encontrada na fatura deste mês." : "Nenhuma transação encontrada para esse filtro."}</p>
                    </div>
                )}
            </div>
            </section>
                </>
            )}
            </div>

            <EditTransactionDialog
                transaction={editingTransaction}
                onClose={() => setEditingTransaction(null)}
                onSaved={() => { setEditingTransaction(null); refresh(); }}
            />

            <AlertDialog open={!!transactionToCancel} onOpenChange={() => setTransactionToCancel(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Desfazer Lançamento?</AlertDialogTitle>
                        <AlertDialogDescription>Tem certeza que deseja desfazer este lançamento? Ele voltará para pendente (se for parcela) ou será excluído.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmCancelTransaction} className="bg-destructive text-white hover:bg-destructive/90">Desfazer</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </AppLayout>
    )
}
