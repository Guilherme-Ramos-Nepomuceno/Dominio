"use client"

import { useState, useEffect, useMemo } from "react"
import { useAccount } from "@/components/account/account-context"
import { getMemberMonthData, type FamilyMember } from "@/lib/family"

export interface FamilyMemberTotal {
    member: FamilyMember
    income: number
    expense: number
    balance: number
}

export interface FamilyTotals {
    income: number
    expense: number
    balance: number
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
        setLoadingFamilyTotals(true)

        Promise.all(personalMembers.map((member) => getMemberMonthData(member.id, year, month)))
            .then((results) => {
                if (cancelled) return
                const perMember = results.map((data, i) => ({
                    member: personalMembers[i],
                    income: data.income,
                    expense: data.expense,
                    balance: data.balance,
                }))
                setFamilyTotals({
                    income: perMember.reduce((sum, m) => sum + m.income, 0),
                    expense: perMember.reduce((sum, m) => sum + m.expense, 0),
                    balance: perMember.reduce((sum, m) => sum + m.balance, 0),
                    perMember,
                })
            })
            .finally(() => { if (!cancelled) setLoadingFamilyTotals(false) })

        return () => { cancelled = true }
    }, [enabled, isCoupleAccount, personalMembers, selectedMonth])

    return { isCoupleAccount, familyTotals, loadingFamilyTotals }
}
