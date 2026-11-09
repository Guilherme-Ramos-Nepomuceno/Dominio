"use client"

import { useMemo, useState } from "react"
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
import { TourGuide } from "@/components/guide/tour-guide"
import { Bento, BentoAside, BentoMain, BentoTile, PAGE_WIDTH } from "@/components/layout/bento"
import { Unlockable, useUnlocks } from "@/components/guide/unlockable"
import { SamplePreview } from "@/components/guide/sample-preview"
import { sampleTransactions, sampleWeekDays } from "@/lib/samples"
import { HOME_TOUR, HOME_TOUR_STEPS } from "@/lib/guide"
import { homeUnlocks } from "@/lib/unlocks"

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

    // Primeiro contato: a semana até agora e os gastos por dia liberam com o
    // primeiro gasto (só no mês atual da própria conta; outro mês mostra tudo).
    const unlocks = useUnlocks(
        "home",
        isCurrentMonth && week?.enabled && !isLoading
            ? homeUnlocks({ spentThisWeek: week.spentThisWeek, expensesThisMonth: balanceData.expense })
            : null,
    )

    const showPlanning = viewMode !== "familia"
    const monthName = MONTH_NAMES[Number(selectedMonth.split("-")[1]) - 1] ?? ""
    const isEmptyMonth = balanceData.transactions.length === 0 && balanceData.transfers.length === 0
    // Exemplos da conta nova: só no mês atual da própria conta, com a semana carregada.
    const showSamples = showPlanning && isCurrentMonth && !!week?.enabled && unlocks.locked.length > 0
    const sampleTx = useMemo(() => sampleTransactions(new Date()), [])
    const sampleSpent = sampleTx.reduce((sum, t) => sum + t.amount, 0)
    const sampleWeek = (w: NonNullable<typeof week>) => {
        const days = sampleWeekDays(w.days, w.idealPerDay)
        return { ...w, days, spentThisWeek: Math.round(days.reduce((sum, d) => sum + d.spent, 0) * 100) / 100 }
    }

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
        <AppLayout showMonthFilter wide>
            <div className={`${PAGE_WIDTH} space-y-10 pb-4`}>
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
                    <Bento className="gap-10">
                        <BentoMain>
                        {/* Conta nova: convite para montar o primeiro plano */}
                        {showOnboardingCard && (
                            <BentoTile order={1}>
                            <Link
                                href="/plan"
                                className="flex items-center gap-3 px-4 py-4 rounded-[20px] bg-primary text-background hover:bg-primary/90 transition-colors"
                            >
                                <TargetIcon size={24} weight="duotone" className="shrink-0" />
                                <span className="flex-1 min-w-0">
                                    <span className="block text-sm font-semibold">Comece pelo plano do mês</span>
                                    <span className="block text-xs opacity-80">A gente te guia: renda, grupos de gasto e um desejo.</span>
                                </span>
                                <CaretRightIcon size={14} weight="bold" className="shrink-0" />
                            </Link>
                            </BentoTile>
                        )}

                        {/* DAQUI PRA FRENTE (só no mês atual: a semana é sempre a de hoje).
                            Nível 1: quanto dá para gastar até domingo e por dia; logo abaixo,
                            o que já está agendado para sair e a vitória do momento. */}
                        {showPlanning && isCurrentMonth && (
                            <BentoTile order={2} className="space-y-5">
                                <WeekHero week={week} isLoading={weekLoading} isCouple={isCouple} recovery={wins?.week.recovery ?? null} />
                                {week?.enabled && <HomeUpcoming todayISO={todayISO} weekEnd={week.weekEnd} />}
                                {wins && <HomeWinLine wins={wins.week.wins} />}
                            </BentoTile>
                        )}

                        {/* Total da Família não tem semana nem plano: o saldo é a resposta. */}
                        {!showPlanning && (
                            <BentoTile order={2}>
                                <BalanceSummary checkingBalance={balanceData.checkingBalance} totalSavings={balanceData.totalSavings} prominent />
                            </BentoTile>
                        )}

                        {isEmptyMonth && showSamples ? (
                            // Conta nova (mês atual sem nada): como vai ficar, com dados de exemplo.
                            <BentoTile order={4}>
                                <SamplePreview hint={unlocks.hintOf("home-daily")}>
                                    <IncomeExpenseCards
                                        income={0}
                                        expense={sampleSpent}
                                        transactions={sampleTx}
                                        allTransactions={sampleTx}
                                        selectedMonth={selectedMonth}
                                        period={period}
                                        onPeriodChange={() => {}}
                                        showIncome={false}
                                        title="Gastos por dia"
                                    />
                                </SamplePreview>
                            </BentoTile>
                        ) : isEmptyMonth ? (
                            // Mês passado sem movimentação: uma frase, e não gráficos zerados.
                            <BentoTile order={4}>
                                <p className="text-sm text-muted-foreground">Nenhuma movimentação em {monthName}.</p>
                            </BentoTile>
                        ) : (
                            <>
                                {/* Nível 3: gastos por dia (tocar num dia filtra a lista abaixo) */}
                                {!unlocks.isUnlocked("home-daily") && showSamples && (
                                <BentoTile order={5}>
                                <SamplePreview hint={unlocks.hintOf("home-daily")}>
                                    <IncomeExpenseCards
                                        income={0}
                                        expense={sampleSpent}
                                        transactions={sampleTx}
                                        allTransactions={sampleTx}
                                        selectedMonth={selectedMonth}
                                        period={period}
                                        onPeriodChange={() => {}}
                                        showIncome={false}
                                        title="Gastos por dia"
                                    />
                                </SamplePreview>
                            </BentoTile>
                                )}
                                {unlocks.isUnlocked("home-daily") && (
                                <BentoTile order={5}>
                                <Unlockable isNew={unlocks.isNew("home-daily")} title="Gastos por dia">
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
                                </Unlockable>
                                </BentoTile>
                                )}

                                {/* Nível 4: o detalhe */}
                                <BentoTile order={6}>
                                    <RecentTransactions
                                        transactions={dayTransactions}
                                        filterLabel={selectedDayLabel}
                                        onClearFilter={() => setSelectedDay(null)}
                                    />
                                </BentoTile>

                                {balanceData.transfers.length > 0 && (
                                    <BentoTile order={7}>
                                        <RecentTransfers transfers={balanceData.transfers} cards={cards} />
                                    </BentoTile>
                                )}
                            </>
                        )}

                        </BentoMain>

                        <BentoAside label="Seu mês">
                        {/* ATÉ AQUI: o que já aconteceu, do mais perto (a semana) ao mais
                            amplo (o mês), e o que ficou para classificar. Em outro mês, o mês
                            vira a resposta principal da tela. */}
                        <BentoTile order={3} className="space-y-8">
                            {showSamples && week && !unlocks.isUnlocked("home-week-so-far") && (
                                <SamplePreview hint={unlocks.hintOf("home-week-so-far")}>
                                    <HomeWeekSoFar week={sampleWeek(week)} wins={null} todayISO={todayISO} />
                                </SamplePreview>
                            )}
                            {showPlanning && isCurrentMonth && week && unlocks.isUnlocked("home-week-so-far") && (
                                <Unlockable isNew={unlocks.isNew("home-week-so-far")} title="Sua semana até agora">
                                    <HomeWeekSoFar week={week} wins={wins} todayISO={todayISO} />
                                </Unlockable>
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
                        </BentoTile>

                            {/* A conta do casal não recebe renda: o saldo dela não diz nada (a divisão acima responde). */}
                            {showPlanning && !isCouple && (
                                <BentoTile order={9}>
                                    <BalanceSummary checkingBalance={balanceData.checkingBalance} totalSavings={balanceData.totalSavings} />
                                </BentoTile>
                            )}
                        </BentoAside>
                    </Bento>
                )}
            </div>
            <TourGuide
                tour={HOME_TOUR}
                steps={HOME_TOUR_STEPS}
                doneByData={{ add: balanceData.allTransactions.length > 0 }}
                enabled={!isLoading && showPlanning && isCurrentMonth && !!week?.enabled}
            />
        </AppLayout>
    )
}
