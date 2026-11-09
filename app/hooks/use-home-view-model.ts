"use client"

import { useState, useEffect } from "react"
import { PLAN_TOUR, isTourActive, showsPlanInvite } from "@/lib/guide"
import { useGuide } from "@/components/guide/guide-provider"
import { getPlan } from "@/lib/planning-api"
import { parseMonthKey, toISODate } from "@/lib/period"
import { useTotalBalance } from "@/hooks/use-transactions"
import { useFamilyHomeData } from "@/hooks/use-family-home-data"
import { useSelectedMonth } from "@/lib/selected-month-context"
import type { PeriodType } from "@/lib/types"
import { useInboxCount } from "@/hooks/use-inbox-count"
import { useWins } from "@/hooks/use-wins"
import { useWeek } from "@/hooks/use-week"
import { useAccount } from "@/components/account/account-context"
import type { MonthWhen } from "@/components/home/home-month-section"

export function useHomeViewModel() {
    const { selectedMonth, currentMonth } = useSelectedMonth()
    // Abre em "Mensal": no semanal as receitas quase sempre aparecem zeradas.
    const [period, setPeriod] = useState<PeriodType>("month")
    const [viewMode, setViewMode] = useState<"casal" | "familia">("casal")

    // "Semanal" mostra os últimos 7 dias reais a partir de hoje — só faz
    // sentido enquanto o mês selecionado é o mês atual de verdade. Navegando
    // pra outro mês (passado ou futuro), força "Mensal" (a visão semanal some
    // do toggle em income-expense-cards.tsx).
    useEffect(() => {
        if (selectedMonth !== currentMonth && period === "week") setPeriod("month")
    }, [selectedMonth, currentMonth, period])

    const ownBalanceData = useTotalBalance(selectedMonth)
    const familyData = useFamilyHomeData(selectedMonth, viewMode === "familia")
    // Atualiza sozinho após registro rápido/categorização (evento storage-update).
    const { count: inboxCount } = useInboxCount()
    // Vitórias e recuperação da semana de hoje (cartão da semana e linha de vitória).
    const { wins } = useWins(currentMonth, viewMode !== "familia")
    // A semana de hoje, carregada uma vez: o herói (daqui pra frente) e o
    // "esta semana até hoje" (o que já foi) usam os mesmos dados.
    const { selection, isReadOnly } = useAccount()
    const { week, isLoading: weekLoading } = useWeek(!isReadOnly && viewMode !== "familia")
    const monthWhen: MonthWhen = selectedMonth === currentMonth ? "current" : selectedMonth < currentMonth ? "past" : "future"

    // Conta nova: convite para montar o plano do mês (o guiado acontece na
    // própria tela Planejar). Some quando o plano começa ou o guiado é pulado.
    const guide = useGuide()
    const [planStatus, setPlanStatus] = useState<string | null>(null)
    const isPersonal = selection.type === "personal"
    const tourActive = !!guide.state && isTourActive(guide.state, PLAN_TOUR)
    useEffect(() => {
        if (!isPersonal || !tourActive) return
        let cancelled = false
        const { year, month } = parseMonthKey(currentMonth)
        getPlan(year, month)
            .then((plan) => {
                if (!cancelled) setPlanStatus(plan.status)
            })
            .catch(() => {})
        return () => {
            cancelled = true
        }
    }, [isPersonal, tourActive, currentMonth])
    const showOnboardingCard = showsPlanInvite({ isPersonal, planStatus, tourActive })

    // Mesmos componentes da Home nos dois modos — só troca a fonte dos dados:
    // a própria conta (casal) ou o consolidado dos dois parceiros (família).
    const balanceData = viewMode === "familia" ? familyData : ownBalanceData

    return {
        period,
        setPeriod,
        balanceData,
        selectedMonth,
        viewMode,
        setViewMode,
        isCoupleAccount: familyData.isCoupleAccount,
        inboxCount,
        showOnboardingCard,
        wins,
        isCurrentMonth: selectedMonth === currentMonth,
        monthWhen,
        week,
        weekLoading,
        isCouple: selection.type === "couple",
        isPersonal: selection.type === "personal",
        isReadOnly,
        todayISO: toISODate(new Date()),
        loadingFamilyData: viewMode === "familia" && familyData.loading,
        isLoading: viewMode === "familia" ? familyData.loading : ownBalanceData.isLoading,
        // Só passado adiante na visão "Total da Família" — os cartões de destino de
        // uma transferência podem pertencer a qualquer um dos dois parceiros, e só
        // o dataset consolidado sabe resolver isso (o fetch próprio do componente
        // só veria os cartões da conta ativa no momento).
        cards: viewMode === "familia" ? familyData.cards : undefined,
    }
}
