"use client"

import { useState } from "react"
import { useTotalBalance } from "@/hooks/use-transactions"
import { useFamilyHomeData } from "@/hooks/use-family-home-data"
import { getCurrentMonth } from "@/lib/date-utils"
import type { PeriodType } from "@/lib/types"

export function useHomeViewModel() {
    const [selectedMonth] = useState(getCurrentMonth())
    const [period, setPeriod] = useState<PeriodType>("week")
    const [viewMode, setViewMode] = useState<"casal" | "familia">("casal")

    const ownBalanceData = useTotalBalance(selectedMonth)
    const familyData = useFamilyHomeData(selectedMonth, viewMode === "familia")

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
        loadingFamilyData: viewMode === "familia" && familyData.loading,
        // Só passado adiante na visão "Total da Família" — os cartões de destino de
        // uma transferência podem pertencer a qualquer um dos dois parceiros, e só
        // o dataset consolidado sabe resolver isso (o fetch próprio do componente
        // só veria os cartões da conta ativa no momento).
        cards: viewMode === "familia" ? familyData.cards : undefined,
    }
}
