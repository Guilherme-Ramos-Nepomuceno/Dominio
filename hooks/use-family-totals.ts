"use client"

import { useMemo } from "react"
import { useQueries, type UseQueryResult } from "@tanstack/react-query"
import { useAccount } from "@/components/account/account-context"
import { getMemberMonthData, type FamilyMember, type MemberMonthData } from "@/lib/family"
import { queryKeys } from "@/lib/query-client"

export interface FamilyMemberTotal {
    member: FamilyMember
    income: number
    expense: number
    balance: number
    pendingInvoiceTotal: number
}

export interface FamilyTotals {
    income: number
    expense: number
    balance: number
    pendingInvoiceTotal: number
    perMember: FamilyMemberTotal[]
}

// Fora do componente (referência estável): o useQueries devolve a mesma lista
// enquanto nenhum resultado mudar.
function combineMonthData(results: UseQueryResult<MemberMonthData>[]) {
    return {
        data: results.map((r) => r.data),
        pending: results.some((r) => r.isPending),
    }
}

// Soma os totais próprios de cada parceiro pessoal (via /family/members/:id/stats,
// já com permissão verificada no backend) — dá o "gasto/ganho geral dos dois" sem
// duplicar as despesas isCasal (que já estão contidas no total de quem lançou).
// Vem do cache (chave queryKeys.memberMonthData): cancelar/editar um
// lançamento invalida "month-data" e o total se atualiza sozinho.
export function useFamilyTotals(selectedMonth: string, enabled: boolean) {
    const { selection, family } = useAccount()
    const isCoupleAccount = selection.type === "couple"
    const personalMembers = useMemo(
        () => family?.members?.filter((m) => m.accountType === "PERSONAL") ?? [],
        [family],
    )
    const active = enabled && isCoupleAccount && personalMembers.length > 0
    const [year, month] = selectedMonth.split("-").map(Number)

    // Quantidade de parceiros varia — por isso useQueries.
    const results = useQueries({
        queries: personalMembers.map((member) => ({
            queryKey: queryKeys.memberMonthData(member.id, year, month),
            queryFn: () => getMemberMonthData(member.id, year, month),
            enabled: active,
        })),
        combine: combineMonthData,
    })

    const familyTotals = useMemo<FamilyTotals | null>(() => {
        // Só com os dois carregados — total de um parceiro só não é o da família.
        if (!active || results.data.some((d) => !d)) return null
        const perMember = (results.data as MemberMonthData[]).map((data, i) => ({
            member: personalMembers[i],
            income: data.income,
            expense: data.expense,
            balance: data.balance,
            pendingInvoiceTotal: data.pendingInvoiceTotal,
        }))
        return {
            income: perMember.reduce((sum, m) => sum + m.income, 0),
            expense: perMember.reduce((sum, m) => sum + m.expense, 0),
            balance: perMember.reduce((sum, m) => sum + m.balance, 0),
            pendingInvoiceTotal: perMember.reduce((sum, m) => sum + m.pendingInvoiceTotal, 0),
            perMember,
        }
    }, [active, results.data, personalMembers])

    // Só no primeiro carregamento do mês — revalidar não volta ao spinner.
    const loadingFamilyTotals = active && results.pending

    return { isCoupleAccount, familyTotals, loadingFamilyTotals }
}
