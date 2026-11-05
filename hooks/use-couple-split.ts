"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useAccount } from "@/components/account/account-context"
import { useSelectedMonth } from "@/lib/selected-month-context"
import { isInPlanMonth } from "@/lib/period"
import { getMemberTransactionsMapped } from "@/lib/storage"
import { createCoupleSettlement, getCoupleSettlements, getMemberCategories, type CoupleSettlement } from "@/lib/family"
import {
  applySettlements,
  computeCoupleSplit,
  coupleMonthInputs,
  type CoupleSplit,
  type CoupleSplitMode,
  type SettlementStatus,
  type SplitTransaction,
} from "@/lib/couple-split"

export interface CouplePerson {
  id: string
  name: string
}

export interface CoupleSplitData {
  mode: CoupleSplitMode
  people: [CouplePerson, CouplePerson]
  split: CoupleSplit
  status: SettlementStatus
  incomeExpected: Record<string, boolean>
  nameOf: (id: string) => string
}

const firstName = (name: string | null, email: string) => (name || email).split(" ")[0]

// Divisão do mês do casal (conta do casal ou conta pessoal de quem tem casal).
// Busca o histórico dos dois e o da conta do casal, junta por id e calcula;
// `markSettled` registra o acerto que falta.
export function useCoupleSplit(monthKey: string, enabled = true) {
  const { family } = useAccount()
  const { monthStartDay } = useSelectedMonth()
  const personal = useMemo(() => family?.members?.filter((m) => m.accountType === "PERSONAL") ?? [], [family])
  const couple = family?.members?.find((m) => m.accountType === "COUPLE") ?? null
  const mode: CoupleSplitMode = family?.family?.coupleSplitMode ?? "TOGETHER"
  const available = enabled && !!couple && personal.length === 2

  const [transactions, setTransactions] = useState<SplitTransaction[]>([])
  const [settlements, setSettlements] = useState<CoupleSettlement[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    if (!available || !couple) return
    setLoading(true)
    try {
      const owners = [...personal.map((m) => m.id), couple.id]
      const [txLists, categoryLists, records] = await Promise.all([
        Promise.all(owners.map((id) => getMemberTransactionsMapped(id))),
        Promise.all(owners.map((id) => getMemberCategories(id).catch(() => []))),
        getCoupleSettlements(monthKey).catch(() => []),
      ])
      const categoryName = new Map<string, string>()
      for (const list of categoryLists as Array<Array<{ id: string; name: string }>>) for (const c of list) categoryName.set(c.id, c.name)

      const byId = new Map<string, SplitTransaction>()
      txLists.forEach((list, i) => {
        for (const t of list) {
          if (byId.has(t.id)) continue
          const owner = t.userId ?? owners.at(i) ?? null
          byId.set(t.id, {
            id: t.id,
            type: t.type,
            amount: t.amount,
            date: t.date,
            status: t.status,
            isCasal: t.isCasal,
            recurrence: t.recurrence,
            installments: t.installments,
            categoryName: t.categoryId ? (categoryName.get(t.categoryId) ?? null) : null,
            ownerId: owner === couple.id ? null : owner,
            paidByUserId: t.paidByUserId ?? null,
          })
        }
      })
      setTransactions(Array.from(byId.values()))
      setSettlements(records)
    } finally {
      setLoading(false)
    }
  }, [available, couple, personal, monthKey])

  useEffect(() => {
    load()
    window.addEventListener("storage-update", load)
    return () => window.removeEventListener("storage-update", load)
  }, [load])

  const data: CoupleSplitData | null = useMemo(() => {
    if (!available) return null
    const people: [CouplePerson, CouplePerson] = [
      { id: personal[0].id, name: firstName(personal[0].name, personal[0].email) },
      { id: personal[1].id, name: firstName(personal[1].name, personal[1].email) },
    ]
    const ids = people.map((p) => p.id)
    const inputs = coupleMonthInputs(transactions, ids, (date) => isInPlanMonth(date, monthKey, monthStartDay))
    const split = computeCoupleSplit(
      mode,
      [
        { id: ids[0], income: inputs.income[ids[0]], paid: inputs.paid[ids[0]], scheduled: inputs.scheduled[ids[0]] },
        { id: ids[1], income: inputs.income[ids[1]], paid: inputs.paid[ids[1]], scheduled: inputs.scheduled[ids[1]] },
      ],
      inputs.sharedTotal,
    )
    const status = applySettlements(split.transfer, [ids[0], ids[1]], settlements)
    const names = new Map(people.map((p) => [p.id, p.name]))
    return { mode, people, split, status, incomeExpected: inputs.incomeExpected, nameOf: (id: string) => names.get(id) ?? "" }
  }, [available, personal, transactions, settlements, mode, monthKey, monthStartDay])

  const markSettled = useCallback(async () => {
    const remaining = data?.status.remaining
    if (!remaining || saving) return
    setSaving(true)
    try {
      await createCoupleSettlement({ month: monthKey, fromUserId: remaining.fromId, toUserId: remaining.toId, amount: remaining.amount })
      setSettlements(await getCoupleSettlements(monthKey))
      // Outras partes da tela que mostram o acerto (ex: o passo do Fechamento) recarregam.
      window.dispatchEvent(new Event("storage-update"))
    } finally {
      setSaving(false)
    }
  }, [data, saving, monthKey])

  return { data, loading, saving, markSettled, available }
}
