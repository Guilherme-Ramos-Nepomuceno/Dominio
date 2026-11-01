"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { getCurrentUser } from "@/lib/auth"
import { getActiveAccountSelection } from "@/lib/active-account"
import { onboardingAction, onboardingDoneKey, onboardingPendingKey } from "@/lib/onboarding"
import { getPlan } from "@/lib/planning-api"
import { parseMonthKey } from "@/lib/period"
import { useTotalBalance } from "@/hooks/use-transactions"
import { useFamilyHomeData } from "@/hooks/use-family-home-data"
import { useSelectedMonth } from "@/lib/selected-month-context"
import type { PeriodType } from "@/lib/types"
import { useInboxCount } from "@/hooks/use-inbox-count"

export function useHomeViewModel() {
    const { selectedMonth, currentMonth } = useSelectedMonth()
    const [period, setPeriod] = useState<PeriodType>("week")
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

    // Onboarding: cadastro recém-feito volta para ele até concluir/pular;
    // conta que parece nova (sem plano e sem transações) ganha um convite.
    const router = useRouter()
    const [showOnboardingCard, setShowOnboardingCard] = useState(false)
    const ownLoading = ownBalanceData.isLoading
    const ownTransactionCount = ownBalanceData.allTransactions.length + ownBalanceData.transfers.length
    useEffect(() => {
        const user = getCurrentUser()
        if (!user || getActiveAccountSelection().type !== "personal") return
        let pending = false
        let done = false
        try {
            pending = !!localStorage.getItem(onboardingPendingKey(user.id))
            done = !!localStorage.getItem(onboardingDoneKey(user.id))
        } catch {
            return
        }
        const signals = { pending, done, isPersonal: true, planStatus: null, transactionCount: null }
        if (onboardingAction(signals) === "redirect") {
            router.replace("/onboarding")
            return
        }
        if (done || ownLoading || ownTransactionCount > 0) return
        let cancelled = false
        const { year, month } = parseMonthKey(currentMonth)
        getPlan(year, month)
            .then((plan) => {
                if (cancelled) return
                const action = onboardingAction({ ...signals, planStatus: plan.status, transactionCount: ownTransactionCount })
                setShowOnboardingCard(action === "card")
            })
            .catch(() => {})
        return () => {
            cancelled = true
        }
    }, [router, currentMonth, ownLoading, ownTransactionCount])

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
        loadingFamilyData: viewMode === "familia" && familyData.loading,
        isLoading: viewMode === "familia" ? familyData.loading : ownBalanceData.isLoading,
        // Só passado adiante na visão "Total da Família" — os cartões de destino de
        // uma transferência podem pertencer a qualquer um dos dois parceiros, e só
        // o dataset consolidado sabe resolver isso (o fetch próprio do componente
        // só veria os cartões da conta ativa no momento).
        cards: viewMode === "familia" ? familyData.cards : undefined,
    }
}
