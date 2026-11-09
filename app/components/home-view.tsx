"use client"

import { useState } from "react"
import Link from "next/link"
import { TrayIcon, CaretRightIcon, TargetIcon } from "@phosphor-icons/react"
import { InboxCountBadge } from "@/components/inbox/inbox-count-badge"
import { AppLayout } from "@/components/layout/app-layout"
import { MonthHeaderSelector } from "@/components/ui/month-header-selector"
import { BalanceSummary } from "./balance-summary"
import { IncomeExpenseCards } from "./income-expense-cards"
import { RecentTransactions } from "./recent-transactions"
import { RecentTransfers } from "./recent-transfers"
import { CasalFamiliaToggle } from "./casal-familia-toggle"
import { Skeleton } from "@/components/ui/skeleton"
import { SkeletonHero } from "@/components/ui/loading-skeletons"
import { useHomeViewModel } from "../hooks/use-home-view-model"
import { WeekHero } from "@/components/home/week-hero"
import { HomeMonthSection } from "@/components/home/home-month-section"
import { HomeWinLine } from "@/components/home/home-win-line"
import { HomeUpcoming } from "@/components/home/home-upcoming"
import { HomeWeekSoFar } from "@/components/home/home-week-so-far"
import { CoupleSplitLine, CoupleSplitSection } from "@/components/couple/couple-split-section"

const MONTH_NAMES = [
    "janeiro", "fevereiro", "março", "abril", "maio", "junho",
    "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
]

// A Home em níveis: em cima, daqui pra frente (quanto dá para gastar até
// domingo e o que vai sair); embaixo, até aqui (a semana, o mês, os gastos
// por dia e as transações). Fora do mês atual, o mês é a resposta principal.
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
        inboxCount,
        showOnboardingCard,
        wins,
        isCurrentMonth,
        monthWhen,
        week,
        weekLoading,
        isCouple,
        isPersonal,
        todayISO,
    } = useHomeViewModel()
    const showPlanning = viewMode !== "familia"
    const monthName = MONTH_NAMES[Number(selectedMonth.split("-")[1]) - 1] ?? ""
    const isEmptyMonth = balanceData.transactions.length === 0 && balanceData.transfers.length === 0

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
            <div className="max-w-2xl mx-auto space-y-10 pb-4">
                {/* No mobile o seletor de mês mora no cabeçalho fixo (AppLayout); aqui só aparece no desktop. */}
                <div className="hidden md:flex items-center justify-end">
                    <MonthHeaderSelector />
                </div>

                {isCoupleAccount && <CasalFamiliaToggle viewMode={viewMode} onChange={setViewMode} />}

                {isLoading ? (
                    // Mesma ordem da tela: herói "Para gastar hoje", a semana até
                    // aqui (título + valor, barra fina e faixa de dias) e o mês.
                    <div className="space-y-10" aria-busy>
                        <SkeletonHero />
                        <div className="space-y-8">
                            <div>
                                <div className="flex items-baseline justify-between gap-3">
                                    <Skeleton className="h-3 w-32 rounded-full" />
                                    <Skeleton className="h-4 w-28 rounded-full" />
                                </div>
                                <Skeleton className="mt-3 h-1.5 w-full rounded-full" />
                                <div className="mt-4 grid grid-cols-7 gap-2">
                                    {Array.from({ length: 7 }).map((_, i) => (
                                        <Skeleton key={i} className="h-10 rounded-lg" />
                                    ))}
                                </div>
                            </div>
                            <div>
                                <div className="flex items-baseline justify-between gap-3">
                                    <Skeleton className="h-3 w-24 rounded-full" />
                                    <Skeleton className="h-4 w-28 rounded-full" />
                                </div>
                                <Skeleton className="mt-3 h-6 w-full rounded-[6px]" />
                            </div>
                        </div>
                    </div>
                ) : (
                    <>
                        {/* Conta nova: convite para montar o primeiro plano */}
                        {showOnboardingCard && (
                            <Link
                                href="/onboarding"
                                className="flex items-center gap-3 px-4 py-4 rounded-[20px] bg-primary text-background hover:bg-primary/90 transition-colors"
                            >
                                <TargetIcon size={24} weight="duotone" className="shrink-0" />
                                <span className="flex-1 min-w-0">
                                    <span className="block text-sm font-semibold">Comece pelo plano do mês</span>
                                    <span className="block text-xs opacity-80">Renda, grupos de gasto e um desejo — leva 1 minuto.</span>
                                </span>
                                <CaretRightIcon size={14} weight="bold" className="shrink-0" />
                            </Link>
                        )}

                        {/* DAQUI PRA FRENTE (só no mês atual: a semana é sempre a de hoje).
                            Nível 1: quanto dá para gastar até domingo e por dia; logo abaixo,
                            o que já está agendado para sair e a vitória do momento. */}
                        {showPlanning && isCurrentMonth && (
                            <div className="space-y-5">
                                <WeekHero week={week} isLoading={weekLoading} isCouple={isCouple} recovery={wins?.week.recovery ?? null} />
                                {week?.enabled && <HomeUpcoming todayISO={todayISO} weekEnd={week.weekEnd} />}
                                {wins && <HomeWinLine wins={wins.week.wins} />}
                            </div>
                        )}

                        {/* Total da Família não tem semana nem plano: o saldo é a resposta. */}
                        {!showPlanning && (
                            <BalanceSummary checkingBalance={balanceData.checkingBalance} totalSavings={balanceData.totalSavings} prominent />
                        )}

                        {/* ATÉ AQUI: o que já aconteceu, do mais perto (a semana) ao mais
                            amplo (o mês), e o que ficou para classificar. Em outro mês, o mês
                            vira a resposta principal da tela. */}
                        <div className="space-y-8">
                            {showPlanning && isCurrentMonth && week && (
                                <HomeWeekSoFar week={week} wins={wins} todayISO={todayISO} />
                            )}

                            {showPlanning && (
                                <HomeMonthSection monthKey={selectedMonth} when={monthWhen} spentWithoutPlan={balanceData.expense} />
                            )}

                            {/* Casal: a divisão das contas fixas. Na conta do casal, completa;
                                na conta de cada um, uma linha com a sua parte e o acerto. */}
                            {showPlanning && isCouple && <CoupleSplitSection monthKey={selectedMonth} />}
                            {showPlanning && isPersonal && <CoupleSplitLine monthKey={selectedMonth} />}

                            {inboxCount > 0 && (
                                <Link
                                    href="/inbox"
                                    className="flex items-center gap-3 py-3 border-y border-border hover:opacity-80 transition-opacity"
                                >
                                    <TrayIcon size={22} weight="duotone" className="text-muted-foreground shrink-0" />
                                    <span className="flex-1 min-w-0">
                                        <span className="block text-sm font-medium text-foreground">A classificar</span>
                                        <span className="block text-xs text-muted-foreground truncate">
                                            {inboxCount === 1 ? "1 transação sem categoria" : `${inboxCount} transações sem categoria`}
                                        </span>
                                    </span>
                                    <InboxCountBadge count={inboxCount} />
                                    <CaretRightIcon size={14} weight="bold" className="text-muted-foreground shrink-0" />
                                </Link>
                            )}
                        </div>

                        {isEmptyMonth ? (
                            // Mês sem nenhuma movimentação: uma frase, e não gráficos zerados.
                            <p className="text-sm text-muted-foreground">Nenhuma movimentação em {monthName}.</p>
                        ) : (
                            <>
                                {/* Nível 3: gastos por dia (tocar num dia filtra a lista abaixo) */}
                                <IncomeExpenseCards
                                    income={balanceData.income}
                                    expense={balanceData.expense}
                                    transactions={balanceData.transactions}
                                    allTransactions={balanceData.allTransactions}
                                    selectedMonth={selectedMonth}
                                    period={period}
                                    onPeriodChange={setPeriod}
                                    showIncome={false}
                                    title="Gastos por dia"
                                    onDayClick={(dateStr, transactionsForDay) =>
                                        setSelectedDay((prev) => (prev?.dateStr === dateStr ? null : { dateStr, transactions: transactionsForDay }))
                                    }
                                />

                                {/* Nível 4: o detalhe */}
                                <RecentTransactions
                                    transactions={dayTransactions}
                                    filterLabel={selectedDayLabel}
                                    onClearFilter={() => setSelectedDay(null)}
                                />

                                <RecentTransfers transfers={balanceData.transfers} cards={cards} />
                            </>
                        )}

                        {/* A conta do casal não recebe renda: o saldo dela não diz nada (a divisão acima responde). */}
                        {showPlanning && !isCouple && (
                            <BalanceSummary checkingBalance={balanceData.checkingBalance} totalSavings={balanceData.totalSavings} />
                        )}
                    </>
                )}
            </div>
        </AppLayout>
    )
}
