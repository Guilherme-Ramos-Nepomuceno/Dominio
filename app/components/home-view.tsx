"use client"

import { useState } from "react"
import { AppLayout } from "@/components/layout/app-layout"
import { MonthHeaderSelector } from "@/components/ui/month-header-selector"
import { CircularBalance } from "./circular-balance"
import { IncomeExpenseCards } from "./income-expense-cards"
import { RecentTransactions } from "./recent-transactions"
import { RecentTransfers } from "./recent-transfers"
import { CasalFamiliaToggle } from "./casal-familia-toggle"
import { SkeletonCircularBalance } from "@/components/ui/loading-skeletons"
import { Skeleton } from "@/components/ui/skeleton"
import { useHomeViewModel } from "../hooks/use-home-view-model"

export function HomeView() {
    const {
        period,
        setPeriod,
        balanceData,
        selectedMonth,
        viewMode,
        setViewMode,
        isCoupleAccount,
        isLoading,
        cards,
    } = useHomeViewModel()

    // Dia clicado numa barra do gráfico (Receitas ou Despesas, incluindo a
    // aba "Fatura Pendente") — filtra "Transações recentes" pra esse dia;
    // clicar de novo na mesma barra, ou no link "Ver mais recentes", desfaz.
    // As transações já vêm prontas do IncomeExpenseCards (não são
    // re-filtradas aqui) porque "Fatura Pendente" mostra transações
    // PENDENTES, que não existem nas listas de pagas que o Home usa — só o
    // componente do gráfico sabe de qual fonte aquela barra específica veio.
    const [selectedDay, setSelectedDay] = useState<{ dateStr: string; transactions: any[] } | null>(null)
    const dayTransactions = selectedDay ? selectedDay.transactions : balanceData.transactions
    const selectedDayLabel = selectedDay
        ? selectedDay.dateStr.split("-").slice(1).reverse().join("/")
        : undefined

    return (
        <AppLayout showMonthFilter>
            <div className="space-y-6">
                {/* No mobile o seletor de mês mora no cabeçalho fixo (AppLayout); aqui só aparece no desktop. */}
                <div className="hidden md:flex items-center justify-end">
                    <MonthHeaderSelector />
                </div>

                {isCoupleAccount && <CasalFamiliaToggle viewMode={viewMode} onChange={setViewMode} />}

                {isLoading ? (
                    <div className="space-y-6">
                        <SkeletonCircularBalance />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Skeleton className="h-32 rounded-2xl" />
                            <Skeleton className="h-32 rounded-2xl" />
                        </div>
                        <Skeleton className="h-48 rounded-2xl" />
                    </div>
                ) : (
                    <>
                        {/* Circular Balance Display */}
                        <CircularBalance
                            balance={balanceData.totalBalance}
                            income={balanceData.income}
                            expense={balanceData.expense}
                            checkingBalance={balanceData.checkingBalance}
                            totalSavings={balanceData.totalSavings}
                        />

                        {/* Income/Expense Cards with Mini Charts */}
                        <IncomeExpenseCards
                            income={balanceData.income}
                            expense={balanceData.expense}
                            transactions={balanceData.transactions}
                            allTransactions={balanceData.allTransactions}
                            selectedMonth={selectedMonth}
                            period={period}
                            onPeriodChange={setPeriod}
                            onDayClick={(dateStr, transactionsForDay) =>
                                setSelectedDay((prev) => (prev?.dateStr === dateStr ? null : { dateStr, transactions: transactionsForDay }))
                            }
                        />

                        {/* Recent Transactions */}
                        <RecentTransactions
                            transactions={dayTransactions}
                            filterLabel={selectedDayLabel}
                            onClearFilter={() => setSelectedDay(null)}
                        />

                        {/* Recent Transfers */}
                        <RecentTransfers transfers={balanceData.transfers} cards={cards} />
                    </>
                )}
            </div>
        </AppLayout>
    )
}
