"use client"

import { useMemo, useState } from "react"
import { useQueries, type UseQueryResult } from "@tanstack/react-query"
import { useAccount } from "@/components/account/account-context"
import { getMemberMonthData, type MemberMonthData } from "@/lib/family"
import { queryKeys } from "@/lib/query-client"
import { useMonthDataQuery } from "@/hooks/queries"

export interface CardInvoiceTotal {
    cardId: string
    name: string
    bankName: string
    total: number
    memberName?: string
}

export interface CardlessPendingItem {
    id: string
    description: string
    amount: number
    date: string
    categoryName: string | null // null = sem categoria
    installments: number | null
    currentInstallment: number | null
    recurrence: "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY" | "NONE"
    memberName?: string
}

export interface MonthClosingData {
    month: string
    pendingInvoiceTotal: number
    cardlessPendingTotal: number
    cardsBreakdown: CardInvoiceTotal[]
    // "Fora de fatura de cartão" quebrado em três grupos — parcela e
    // recorrência são mecanismos diferentes de gerar a mesma linha (débito)
    // todo mês, então cada um ganha sua própria caixinha (igual um cartão);
    // o resto (lançamento avulso, tipo um boleto pontual) fica solto.
    installmentItems: CardlessPendingItem[]
    recurringItems: CardlessPendingItem[]
    otherItems: CardlessPendingItem[]
}

const isInstallment = (item: CardlessPendingItem) => !!item.installments && item.installments > 1
const isRecurring = (item: CardlessPendingItem) => item.recurrence !== "NONE"

function groupCardlessItems(items: CardlessPendingItem[]) {
    const installmentItems: CardlessPendingItem[] = []
    const recurringItems: CardlessPendingItem[] = []
    const otherItems: CardlessPendingItem[] = []
    for (const item of items) {
        if (isInstallment(item)) installmentItems.push(item)
        else if (isRecurring(item)) recurringItems.push(item)
        else otherItems.push(item)
    }
    return { installmentItems, recurringItems, otherItems }
}

function nextMonth(): { year: number; month: number; label: string } {
    const now = new Date()
    let year = now.getFullYear()
    let month = now.getMonth() + 2 // +1 (0-based -> 1-based) +1 (próximo mês)
    if (month > 12) {
        month = 1
        year += 1
    }
    const label = new Date(year, month - 1, 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" })
    return { year, month, label: label.charAt(0).toUpperCase() + label.slice(1) }
}

// Fora do componente (referência estável): o useQueries devolve a mesma lista
// enquanto nenhum resultado mudar.
function combineMemberMonthData(results: UseQueryResult<MemberMonthData>[]) {
    return {
        data: results.map((r) => r.data),
        pending: results.some((r) => r.isPending),
    }
}

export function useMonthClosingViewModel() {
    const { selection, family } = useAccount()
    const isCoupleAccount = selection.type === "couple"
    const [viewMode, setViewMode] = useState<"casal" | "familia">("casal")
    const { year, month, label } = nextMonth()

    // Do cache (mesmas chaves de hooks/queries.ts): cancelar, editar ou pagar
    // uma fatura invalida "month-data" e o total se atualiza sozinho, sem
    // voltar ao skeleton.
    const familyMode = viewMode === "familia" && !!family
    const personalMembers = useMemo(
        () => (familyMode ? family!.members.filter((m) => m.accountType === "PERSONAL") : []),
        [familyMode, family],
    )
    const ownQuery = useMonthDataQuery(year, month, { enabled: !familyMode })
    const members = useQueries({
        queries: personalMembers.map((m) => ({
            queryKey: queryKeys.memberMonthData(m.id, year, month),
            queryFn: () => getMemberMonthData(m.id, year, month),
        })),
        combine: combineMemberMonthData,
    })

    const ownData = ownQuery.data
    const memberData = members.data
    const data = useMemo<MonthClosingData | null>(() => {
        if (familyMode) {
            // Só com todos carregados — total de um parceiro só não é o da família.
            if (memberData.some((r) => !r)) return null
            const cardsBreakdown: CardInvoiceTotal[] = []
            const cardlessItems: CardlessPendingItem[] = []
            let pendingInvoiceTotal = 0
            let cardlessPendingTotal = 0

            memberData.forEach((r, i) => {
                if (!r) return
                const memberName = personalMembers[i].name || personalMembers[i].email
                pendingInvoiceTotal += r.pendingInvoiceTotal ?? 0
                cardlessPendingTotal += r.cardlessPendingTotal ?? 0
                ;(r.pendingInvoiceByCard ?? []).forEach((c) => cardsBreakdown.push({ ...c, memberName }))
                ;(r.cardlessPending ?? []).forEach((item) => cardlessItems.push({ ...item, memberName }))
            })

            return {
                month: `${year}-${String(month).padStart(2, "0")}`,
                pendingInvoiceTotal,
                cardlessPendingTotal,
                cardsBreakdown,
                ...groupCardlessItems(cardlessItems),
            }
        }
        if (!ownData) return null
        // `?? []`/`?? 0`: defende contra um backend ainda não
        // atualizado com esses campos (resposta antiga sem eles)
        // — melhor mostrar "nada pendente" do que quebrar a tela.
        return {
            month: ownData.month,
            pendingInvoiceTotal: ownData.pendingInvoiceTotal ?? 0,
            cardlessPendingTotal: ownData.cardlessPendingTotal ?? 0,
            cardsBreakdown: ownData.pendingInvoiceByCard ?? [],
            ...groupCardlessItems(ownData.cardlessPending ?? []),
        }
    }, [familyMode, memberData, personalMembers, ownData, year, month])

    // Skeleton só no primeiro carregamento de cada visão.
    const isLoading = familyMode ? members.pending : ownQuery.isPending

    return {
        monthLabel: label,
        isCoupleAccount,
        viewMode,
        setViewMode,
        data,
        isLoading,
        grandTotal: (data?.pendingInvoiceTotal ?? 0) + (data?.cardlessPendingTotal ?? 0),
    }
}
