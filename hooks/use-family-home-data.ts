"use client"

import { useState, useEffect, useMemo } from "react"
import { useAccount } from "@/components/account/account-context"
import { computeTotalBalanceFrom } from "./use-transactions"
import {
    getTransactions,
    getCategories,
    getCards,
    getSavingsGoals,
    getMemberTransactionsMapped,
    getMemberSavingsMapped,
    getMemberCardsMapped,
} from "@/lib/storage"
import type { Transaction, Category, SavingsGoal, Card } from "@/lib/types"

function dedupeById<T extends { id: string }>(items: T[]): T[] {
    const map = new Map<string, T>()
    items.forEach((item) => map.set(item.id, item))
    return Array.from(map.values())
}

// Consolida os dados da conta do casal com o histórico COMPLETO dos dois parceiros
// pessoais (não só o que foi marcado isCasal), para alimentar os MESMOS componentes
// da Home (CircularBalance, IncomeExpenseCards, RecentTransactions, RecentTransfers)
// com o total combinado, em vez de um bloco/visão separada.
//
// getTransactions()/getSavingsGoals() da própria conta do casal já trazem os
// próprios lançamentos + o que os parceiros marcaram isCasal — aqui somamos o
// restante de cada parceiro e deduplicamos por id (uma transação isCasal aparece
// nos dois lados, mas é a mesma linha).
export function useFamilyHomeData(selectedMonth: string, enabled: boolean) {
    const { selection, family } = useAccount()
    const isCoupleAccount = selection.type === "couple"
    const personalMembers = useMemo(
        () => family?.members?.filter((m) => m.accountType === "PERSONAL") ?? [],
        [family],
    )

    const [loading, setLoading] = useState(false)
    const [allTransactions, setAllTransactions] = useState<Transaction[]>([])
    const [categories, setCategories] = useState<Category[]>([])
    const [savingsGoals, setSavingsGoals] = useState<SavingsGoal[]>([])
    const [cards, setCards] = useState<Card[]>([])

    useEffect(() => {
        if (!enabled || !isCoupleAccount || personalMembers.length === 0) return

        let cancelled = false
        setLoading(true)

        Promise.all([
            getTransactions(),
            getCategories(),
            getSavingsGoals(),
            getCards(),
            ...personalMembers.map((m) => getMemberTransactionsMapped(m.id)),
            ...personalMembers.map((m) => getMemberSavingsMapped(m.id)),
            ...personalMembers.map((m) => getMemberCardsMapped(m.id)),
        ])
            .then((results) => {
                if (cancelled) return
                const [ownTransactions, ownCategories, ownSavings, ownCards, ...rest] = results as [
                    Transaction[],
                    Category[],
                    SavingsGoal[],
                    Card[],
                    ...Transaction[][],
                ]
                const memberTransactions = rest.slice(0, personalMembers.length) as unknown as Transaction[][]
                const memberSavings = rest.slice(personalMembers.length, personalMembers.length * 2) as unknown as SavingsGoal[][]
                const memberCards = rest.slice(personalMembers.length * 2) as unknown as Card[][]

                setAllTransactions(dedupeById([ownTransactions, ...memberTransactions].flat()))
                setCategories(ownCategories)
                setSavingsGoals(dedupeById([ownSavings, ...memberSavings].flat()))
                setCards(dedupeById([ownCards, ...memberCards].flat()))
            })
            .finally(() => { if (!cancelled) setLoading(false) })

        return () => { cancelled = true }
    }, [enabled, isCoupleAccount, personalMembers, selectedMonth])

    const totals = useMemo(
        () => computeTotalBalanceFrom(allTransactions, categories, savingsGoals, selectedMonth, ["Transferência Familiar"]),
        [allTransactions, categories, savingsGoals, selectedMonth],
    )

    return { isCoupleAccount, loading, cards, ...totals }
}
