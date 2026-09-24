"use client"

import { useState, useEffect, useMemo } from "react"
import { useAccount } from "@/components/account/account-context"
import { getMemberMonthData, type FamilyMember } from "@/lib/family"

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

// Soma os totais próprios de cada parceiro pessoal (via /family/members/:id/stats,
// já com permissão verificada no backend) — dá o "gasto/ganho geral dos dois" sem
// duplicar as despesas isCasal (que já estão contidas no total de quem lançou).
export function useFamilyTotals(selectedMonth: string, enabled: boolean) {
    const { selection, family } = useAccount()
    const isCoupleAccount = selection.type === "couple"
    const personalMembers = useMemo(
        () => family?.members?.filter((m) => m.accountType === "PERSONAL") ?? [],
        [family],
    )

    const [familyTotals, setFamilyTotals] = useState<FamilyTotals | null>(null)
    const [loadingFamilyTotals, setLoadingFamilyTotals] = useState(false)

    useEffect(() => {
        if (!enabled || !isCoupleAccount || personalMembers.length === 0) {
            setFamilyTotals(null)
            return
        }

        const [year, month] = selectedMonth.split("-").map(Number)
        let cancelled = false

        const load = () => {
            setLoadingFamilyTotals(true)
            return Promise.all(personalMembers.map((member) => getMemberMonthData(member.id, year, month)))
                .then((results) => {
                    if (cancelled) return
                    const perMember = results.map((data, i) => ({
                        member: personalMembers[i],
                        income: data.income,
                        expense: data.expense,
                        balance: data.balance,
                        pendingInvoiceTotal: data.pendingInvoiceTotal,
                    }))
                    setFamilyTotals({
                        income: perMember.reduce((sum, m) => sum + m.income, 0),
                        expense: perMember.reduce((sum, m) => sum + m.expense, 0),
                        balance: perMember.reduce((sum, m) => sum + m.balance, 0),
                        pendingInvoiceTotal: perMember.reduce((sum, m) => sum + m.pendingInvoiceTotal, 0),
                        perMember,
                    })
                })
                .finally(() => { if (!cancelled) setLoadingFamilyTotals(false) })
        }

        load()

        // Mesmo motivo do use-family-home-data: cancelar/editar um lançamento
        // dispara esse evento em vez de recarregar a página, e sem o listener
        // o total combinado do casal aqui também ficava parado no valor antigo.
        window.addEventListener("storage-update", load)
        return () => {
            cancelled = true
            window.removeEventListener("storage-update", load)
        }
    }, [enabled, isCoupleAccount, personalMembers, selectedMonth])

    return { isCoupleAccount, familyTotals, loadingFamilyTotals }
}
