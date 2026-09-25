"use client"

import { useEffect, useState } from "react"
import { useAccount } from "@/components/account/account-context"
import { getMonthData } from "@/lib/storage"
import { getMemberMonthData } from "@/lib/family"

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
    categoryName: string
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

export function useMonthClosingViewModel() {
    const { selection, family } = useAccount()
    const isCoupleAccount = selection.type === "couple"
    const [viewMode, setViewMode] = useState<"casal" | "familia">("casal")
    const [data, setData] = useState<MonthClosingData | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const { year, month, label } = nextMonth()

    useEffect(() => {
        let cancelled = false

        const load = async () => {
            setIsLoading(true)
            try {
                if (viewMode === "familia" && family) {
                    const personalMembers = family.members.filter((m) => m.accountType === "PERSONAL")
                    const results = await Promise.all(personalMembers.map((m) => getMemberMonthData(m.id, year, month)))
                    if (cancelled) return

                    const cardsBreakdown: CardInvoiceTotal[] = []
                    const cardlessItems: CardlessPendingItem[] = []
                    let pendingInvoiceTotal = 0
                    let cardlessPendingTotal = 0

                    results.forEach((r, i) => {
                        const memberName = personalMembers[i].name || personalMembers[i].email
                        pendingInvoiceTotal += r.pendingInvoiceTotal ?? 0
                        cardlessPendingTotal += r.cardlessPendingTotal ?? 0
                        ;(r.pendingInvoiceByCard ?? []).forEach((c) => cardsBreakdown.push({ ...c, memberName }))
                        ;(r.cardlessPending ?? []).forEach((item) => cardlessItems.push({ ...item, memberName }))
                    })

                    setData({
                        month: `${year}-${String(month).padStart(2, "0")}`,
                        pendingInvoiceTotal,
                        cardlessPendingTotal,
                        cardsBreakdown,
                        ...groupCardlessItems(cardlessItems),
                    })
                } else {
                    const result = await getMonthData(year, month)
                    if (cancelled) return
                    // `?? []`/`?? 0`: defende contra um backend ainda não
                    // atualizado com esses campos (resposta antiga sem eles)
                    // — melhor mostrar "nada pendente" do que quebrar a tela.
                    setData({
                        month: result.month,
                        pendingInvoiceTotal: result.pendingInvoiceTotal ?? 0,
                        cardlessPendingTotal: result.cardlessPendingTotal ?? 0,
                        cardsBreakdown: result.pendingInvoiceByCard ?? [],
                        ...groupCardlessItems(result.cardlessPending ?? []),
                    })
                }
            } finally {
                if (!cancelled) setIsLoading(false)
            }
        }

        load()

        // Mesmo motivo de use-family-totals/use-family-home-data: cancelar,
        // editar ou pagar uma fatura dispara esse evento em vez de recarregar
        // a página — sem o listener essa tela ficaria com o total antigo.
        window.addEventListener("storage-update", load)
        return () => {
            cancelled = true
            window.removeEventListener("storage-update", load)
        }
    }, [viewMode, family, year, month])

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
