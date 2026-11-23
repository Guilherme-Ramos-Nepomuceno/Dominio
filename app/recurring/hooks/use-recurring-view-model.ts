"use client"

import { useState, useMemo } from "react"
import { cancelRecurringTransaction } from "@/lib/storage"
import { useToast } from "@/hooks/use-toast"
import { useTransactionsQuery } from "@/hooks/queries"
import type { Transaction } from "@/lib/types"

// Referência estável para "ainda sem dado" — um [] novo a cada render
// invalidaria os useMemo abaixo.
const NO_TRANSACTIONS: Transaction[] = []

// `recurrenceId` não está no tipo, mas o agrupamento abaixo sempre o tentou
// primeiro (antes a lista era `any`) — mantido igual.
type RecurringRow = Transaction & { recurrenceId?: string }

export function useRecurringViewModel() {
    const [transactionToCancel, setTransactionToCancel] = useState<string | null>(null)
    const { toast } = useToast()

    // Pendências (mais antigas primeiro) saem do histórico em cache — o que
    // getPendingTransactions fazia, sem baixar tudo de novo. Cancelar avisa o
    // domínio e a lista se atualiza sozinha.
    const transactionsQuery = useTransactionsQuery()
    const allTransactions = transactionsQuery.data ?? NO_TRANSACTIONS
    const transactions = useMemo<RecurringRow[]>(
        () =>
            allTransactions
                .filter((t) => t.status === "pending")
                .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
        [allTransactions],
    )
    // Só no primeiro carregamento — revalidação em segundo plano não volta o skeleton.
    const loading = transactionsQuery.isPending

    const confirmCancelRecurrence = async () => {
        if (!transactionToCancel) return
        try {
            await cancelRecurringTransaction(transactionToCancel)
            toast({
                title: "Recorrência cancelada",
                description: "Esta e todas as próximas ocorrências foram canceladas.",
                variant: "success",
            })
        } catch (error: any) {
            toast({
                title: "Erro ao cancelar",
                description: error.message || "Não foi possível cancelar a recorrência.",
                variant: "destructive",
            })
        } finally {
            setTransactionToCancel(null)
        }
    }

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
        loading,
        recurringList,
        installmentList,
        formatFrequency,
        transactionToCancel,
        setTransactionToCancel,
        confirmCancelRecurrence,
    }
}
