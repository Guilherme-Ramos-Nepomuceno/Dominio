"use client"

import { useState, useEffect, useMemo } from "react"
import { getPendingTransactions } from "@/lib/storage"

export function useRecurringViewModel() {
    const [transactions, setTransactions] = useState<any[]>([])

    useEffect(() => {
        const loadData = async () => {
            const pending = await getPendingTransactions()
            setTransactions(pending)
        }
        loadData()
    }, [])

    const recurringList = useMemo(() => {
        const recurringMap = new Map()
        transactions
            .filter((t) => t.recurrence && t.recurrence !== "none" && (!t.installments || t.installments <= 1))
            .forEach((t) => {
                const groupKey = t.recurrenceId || t.description
                const existing = recurringMap.get(groupKey)
                if (!existing || new Date(t.date) < new Date(existing.date)) {
                    recurringMap.set(groupKey, t)
                }
            })

        return Array.from(recurringMap.values()).sort((a, b) => {
            const freqOrder: Record<string, number> = { daily: 1, weekly: 2, monthly: 3, yearly: 4 }
            return (freqOrder[a.recurrence] || 99) - (freqOrder[b.recurrence] || 99)
        })
    }, [transactions])

    const installmentList = useMemo(() => {
        const installmentMap = new Map()
        transactions
            .filter((t) => t.installments && t.installments > 1)
            .forEach((t) => {
                const groupKey = t.recurrenceId || t.description
                const existing = installmentMap.get(groupKey)
                if (!existing || new Date(t.date) < new Date(existing.date)) {
                    installmentMap.set(groupKey, t)
                }
            })

        return Array.from(installmentMap.values()).sort((a, b) =>
            new Date(a.date).getTime() - new Date(b.date).getTime()
        )
    }, [transactions])

    const formatFrequency = (freq: string) => {
        const map: Record<string, string> = {
            daily: "Diário",
            weekly: "Semanal",
            monthly: "Mensal",
            yearly: "Anual",
        }
        return map[freq] || freq
    }

    return {
        recurringList,
        installmentList,
        formatFrequency
    }
}
