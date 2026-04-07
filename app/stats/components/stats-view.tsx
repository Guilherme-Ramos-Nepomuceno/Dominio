"use client"

import { useState } from "react"
import { AppLayout } from "@/components/layout/app-layout"
import { PageHeader } from "@/components/ui/page-header"
import { StackedBarChart } from "./stacked-bar-chart"
import { PeriodSelector } from "@/components/ui/period-selector"
import { formatMonth, formatCurrency } from "@/lib/date-utils"
import { cn } from "@/lib/utils"
import * as PhosphorIcons from "@phosphor-icons/react"
import { CreditCard, Wallet, Circle } from "@phosphor-icons/react"
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

export function StatsView() {
    const {
        selectedMonth,
        setSelectedMonth,
        filterType,
        setFilterType,
        transactionToCancel,
        setTransactionToCancel,
        categories,
        cards,
        groupedTransactions,
        sortedDates,
        confirmCancelTransaction,
        categoryAlerts,
        handleThresholdChange
    } = useStatsViewModel()

    const getLocalDateKey = (date: Date) => date.toLocaleDateString('sv-SE')
    const todayKey = getLocalDateKey(new Date())
    const yesterdayDate = new Date()
    yesterdayDate.setDate(yesterdayDate.getDate() - 1)
    const yesterdayKey = getLocalDateKey(yesterdayDate)

    const TransactionItem = ({ transaction }: { transaction: any }) => {
        const displayDateObj = new Date(transaction.originalDate || transaction.date)
        const category = categories.find(c => c.id === transaction.categoryId)
        const IconComponent = category?.icon && (PhosphorIcons as any)[category.icon]
            ? (PhosphorIcons as any)[category.icon]
            : PhosphorIcons.Question
        const card = cards.find(c => c.id === transaction.cardId)

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
            <div className="relative overflow-hidden rounded-[1vw] group">
                <div className="absolute inset-y-0 right-0 w-[80px] bg-red-500 flex items-center justify-center rounded-r-[1vw]">
                    <button onClick={() => setTransactionToCancel(transaction.id)} className="text-white w-full h-full flex items-center justify-center">
                        <PhosphorIcons.Trash size={24} weight="bold" />
                    </button>
                </div>
                <div
                    className="relative bg-card border border-border/50 hover:border-border transition-colors p-4 flex items-center justify-between z-10"
                    style={{ transform: `translateX(${swipeOffset}px)`, transition: startX === null ? 'transform 0.2s ease-out' : 'none' }}
                    onTouchStart={onTouchStart}
                    onTouchMove={onTouchMove}
                    onTouchEnd={onTouchEnd}
                >
                    <div className="flex items-center gap-4 flex-1">
                        <div className="w-10 h-10 rounded-[0.8rem] flex items-center justify-center bg-background border border-border group-hover:bg-muted transition-colors relative" style={{ color: category?.color || "#888" }}>
                            <IconComponent size={20} weight="duotone" />
                        </div>
                        <div>
                            <p className="font-semibold text-foreground">{transaction.description}</p>
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded-md">{category?.name || "Geral"}</span>
                                {transaction.originalDate && (
                                    <span className="text-[10px] text-muted-foreground">Comprou em: {displayDateObj.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</span>
                                )}
                                {transaction.installments && transaction.installments > 1 && (
                                    <span className="text-[10px] text-foreground font-bold bg-primary/10 border border-primary/20 px-1.5 py-0.5 rounded-sm flex items-center gap-1">
                                        <CreditCard size={10} weight="fill" />
                                        {transaction.currentInstallment}/{transaction.installments}
                                    </span>
                                )}
                                {card && filterType === 'credit' && <span className="text-[10px] text-muted-foreground flex items-center gap-1">• {card.name}</span>}
                            </div>
                        </div>
                    </div>
                    <div className="text-right flex items-center gap-4">
                        <div>
                            <p className="text-lg font-bold text-foreground tabular-nums">{transaction.type === "expense" ? "-" : "+"}{formatCurrency(transaction.amount)}</p>
                            {filterType === 'credit' && (
                                <div className="flex justify-end mt-1">
                                    <span className="text-[10px] text-amber-500 flex items-center gap-1 bg-amber-500/10 px-1.5 py-0.5 rounded-full"><Circle size={8} weight="fill" />Fatura Aberta</span>
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
        <AppLayout>
            <PeriodSelector selectedMonth={selectedMonth} onMonthChange={setSelectedMonth} className="mb-4" />
            <PageHeader title={formatMonth(selectedMonth)} subtitle="Análise detalhada dos seus gastos" />

            {categoryAlerts.length > 0 && filterType === 'all' && (
                <div className="mb-6 space-y-2">
                    {categoryAlerts.map((alert, idx) => (
                        <div key={idx} className="rounded-[1vw] bg-expense/10 border border-expense/30 p-4">
                            <p className="text-sm font-semibold text-expense">⚠️ Meta de {alert?.categoryName} excedida!</p>
                        </div>
                    ))}
                </div>
            )}

            <div className="mb-6">
                <StackedBarChart currentMonth={selectedMonth} onThresholdChange={handleThresholdChange} onMonthChange={setSelectedMonth} />
            </div>

            <div className="flex justify-center mb-6">
                <div className="bg-card p-1 rounded-xl border border-border inline-flex shadow-sm">
                    <button onClick={() => setFilterType("all")} className={cn("flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all", filterType === "all" ? "bg-foreground text-background shadow-sm" : "text-muted-foreground hover:bg-muted hover:text-foreground")}>
                        <Wallet size={16} weight={filterType === "all" ? "fill" : "regular"} /> Geral
                    </button>
                    <button onClick={() => setFilterType("credit")} className={cn("flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all", filterType === "credit" ? "bg-foreground text-background shadow-sm" : "text-muted-foreground hover:bg-muted hover:text-foreground")}>
                        <CreditCard size={16} weight={filterType === "credit" ? "fill" : "regular"} /> Fatura Pendente
                    </button>
                </div>
            </div>

            <div className="space-y-8 pb-10">
                {sortedDates.length > 0 ? (
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
                                <h3 className="text-sm font-semibold text-muted-foreground mb-3 capitalize px-1 flex items-center justify-between">
                                    {groupTitle}
                                    <span className="text-xs font-normal opacity-70">{formatCurrency(transactionsForDate.reduce((acc: any, t: { amount: any }) => acc + t.amount, 0))}</span>
                                </h3>
                                <div className="space-y-3">
                                    {transactionsForDate.map((t: any) => <TransactionItem key={t.id} transaction={t} />)}
                                </div>
                            </div>
                        )
                    })
                ) : (
                    <div className="rounded-2xl bg-card p-12 text-center border border-border/50 flex flex-col items-center justify-center gap-4">
                        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                            {filterType === 'credit' ? <CreditCard size={32} className="text-muted-foreground" /> : <Wallet size={32} className="text-muted-foreground" />}
                        </div>
                        <p className="text-muted-foreground font-medium">{filterType === 'credit' ? "Nenhuma despesa pendente na fatura deste mês." : "Nenhuma transação neste período."}</p>
                    </div>
                )}
            </div>

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
