"use client"

import { useState } from "react"
import { useTotalBalance } from "@/hooks/use-transactions"
import { getCurrentMonth } from "@/lib/date-utils"
import type { PeriodType } from "@/lib/types"

export function useHomeViewModel() {
    const [selectedMonth] = useState(getCurrentMonth())
    const [period, setPeriod] = useState<PeriodType>("week")

    const balanceData = useTotalBalance(selectedMonth)

    return {
        period,
        setPeriod,
        balanceData,
        selectedMonth,
    }
}
