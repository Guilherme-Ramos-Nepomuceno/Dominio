"use client"

import { useState, useMemo } from "react"
import { useTotalBalance, usePendingSummary } from "@/hooks/use-transactions"
import { getCurrentMonth } from "@/lib/date-utils"
import type { PeriodType } from "@/lib/types"

export function useHomeViewModel() {
    const [selectedMonth] = useState(getCurrentMonth())
    const [period, setPeriod] = useState<PeriodType>("week")

    const balanceData = useTotalBalance(selectedMonth)
    const pendingSummary = usePendingSummary()

    return {
        period,
        setPeriod,
        balanceData,
        selectedMonth,
        pendingSummary,
    }
}
