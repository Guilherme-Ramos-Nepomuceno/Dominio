"use client"

import { useMemo } from "react"
import { useQueries } from "@tanstack/react-query"
import { useSelectedMonth } from "@/lib/selected-month-context"
import { useAccount } from "@/components/account/account-context"
import { computeTotalBalanceFrom } from "./use-transactions"
import { useCardsQuery, useCategoriesQuery, useSavingsGoalsQuery, useTransactionsQuery } from "@/hooks/queries"
import { queryKeys } from "@/lib/query-client"
import { getMemberCardsMapped, getMemberSavingsMapped, getMemberTransactionsMapped } from "@/lib/storage"
import type { Transaction, Category, SavingsGoal, Card } from "@/lib/types"
import type { UseQueryResult } from "@tanstack/react-query"

function dedupeById<T extends { id: string }>(items: T[]): T[] {
    const map = new Map<string, T>()
    items.forEach((item) => map.set(item.id, item))
    return Array.from(map.values())
}

// Referências estáveis para "ainda sem dado".
const NO_TRANSACTIONS: Transaction[] = []
const NO_CATEGORIES: Category[] = []
const NO_SAVINGS: SavingsGoal[] = []
const NO_CARDS: Card[] = []

// Junta as consultas de cada parceiro num resultado só. Função fora do
// componente (referência estável): o useQueries só recalcula quando algum
// resultado muda, e devolve as mesmas listas se nada mudou.
function combineMembers<T>(results: UseQueryResult<T[]>[]) {
    return {
        lists: results.map((r) => r.data),
        pending: results.some((r) => r.isPending),
    }
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
//
// Tudo vem do cache (as mesmas chaves de hooks/queries.ts): cancelar/editar um
// lançamento invalida os domínios e o total combinado se atualiza sozinho.
export function useFamilyHomeData(selectedMonth: string, enabled: boolean) {
    const { selection, family } = useAccount()
    const { monthStartDay } = useSelectedMonth()
    const isCoupleAccount = selection.type === "couple"
    const personalMembers = useMemo(
        () => family?.members?.filter((m) => m.accountType === "PERSONAL") ?? [],
        [family],
    )
    const active = enabled && isCoupleAccount && personalMembers.length > 0

    const ownTransactions = useTransactionsQuery({ enabled: active })
    const ownCategories = useCategoriesQuery({ enabled: active })
    const ownSavings = useSavingsGoalsQuery({ enabled: active })
    const ownCards = useCardsQuery({ enabled: active })

    // Quantidade de parceiros varia — por isso useQueries, com as mesmas
    // chaves/buscas dos hooks useMember*Query.
    const memberTransactions = useQueries({
        queries: personalMembers.map((m) => ({
            queryKey: queryKeys.member("transactions", m.id),
            queryFn: () => getMemberTransactionsMapped(m.id),
            enabled: active,
        })),
        combine: combineMembers<Transaction>,
    })
    const memberSavings = useQueries({
        queries: personalMembers.map((m) => ({
            queryKey: queryKeys.member("savings", m.id),
            queryFn: () => getMemberSavingsMapped(m.id),
            enabled: active,
        })),
        combine: combineMembers<SavingsGoal>,
    })
    const memberCards = useQueries({
        queries: personalMembers.map((m) => ({
            queryKey: queryKeys.member("cards", m.id),
            queryFn: () => getMemberCardsMapped(m.id),
            enabled: active,
        })),
        combine: combineMembers<Card>,
    })

    // Só no primeiro carregamento — revalidar não volta ao skeleton.
    const loading =
        active &&
        (ownTransactions.isPending ||
            ownCategories.isPending ||
            ownSavings.isPending ||
            ownCards.isPending ||
            memberTransactions.pending ||
            memberSavings.pending ||
            memberCards.pending)

    // Tudo ou nada (como antes): se alguma parte faltar (carregando ou erro),
    // não mostra um total parcial como se fosse o da família.
    const consolidated = useMemo(() => {
        const ownT = ownTransactions.data
        const ownC = ownCategories.data
        const ownS = ownSavings.data
        const ownK = ownCards.data
        const mT = memberTransactions.lists
        const mS = memberSavings.lists
        const mK = memberCards.lists
        if (
            !active ||
            !ownT || !ownC || !ownS || !ownK ||
            mT.some((l) => !l) || mS.some((l) => !l) || mK.some((l) => !l)
        ) {
            return { allTransactions: NO_TRANSACTIONS, categories: NO_CATEGORIES, savingsGoals: NO_SAVINGS, cards: NO_CARDS }
        }
        return {
            allTransactions: dedupeById([ownT, ...(mT as Transaction[][])].flat()),
            categories: ownC,
            savingsGoals: dedupeById([ownS, ...(mS as SavingsGoal[][])].flat()),
            cards: dedupeById([ownK, ...(mK as Card[][])].flat()),
        }
    }, [
        active,
        ownTransactions.data,
        ownCategories.data,
        ownSavings.data,
        ownCards.data,
        memberTransactions.lists,
        memberSavings.lists,
        memberCards.lists,
    ])

    const { allTransactions, categories, savingsGoals, cards } = consolidated
    const totals = useMemo(
        () =>
            computeTotalBalanceFrom(allTransactions, categories, savingsGoals, selectedMonth, ["Transferência Familiar"], monthStartDay),
        [allTransactions, categories, savingsGoals, selectedMonth, monthStartDay],
    )

    return { isCoupleAccount, loading, cards, ...totals }
}
