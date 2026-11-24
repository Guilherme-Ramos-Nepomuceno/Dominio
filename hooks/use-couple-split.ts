"use client"

import { useCallback, useMemo, useState } from "react"
import { useQueries, type UseQueryResult } from "@tanstack/react-query"
import { useAccount } from "@/components/account/account-context"
import { useSelectedMonth } from "@/lib/selected-month-context"
import { isInPlanMonth } from "@/lib/period"
import { getMemberTransactionsMapped } from "@/lib/storage"
import { notifyDataChanged } from "@/lib/data-events"
import { queryKeys } from "@/lib/query-client"
import { useCoupleSettlementsQuery } from "@/hooks/queries"
import { createCoupleSettlement, getMemberCategories, type CoupleSettlement } from "@/lib/family"
import type { Transaction } from "@/lib/types"
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

// Referências estáveis para "ainda sem dado".
const NO_SETTLEMENTS: CoupleSettlement[] = []
const NO_SPLIT_TRANSACTIONS: SplitTransaction[] = []

// Fora do componente (referência estável): o useQueries devolve as mesmas
// listas enquanto nenhum resultado mudar.
function combineLists<T>(results: UseQueryResult<T[]>[]) {
  return {
    lists: results.map((r) => r.data),
    pending: results.some((r) => r.isPending),
  }
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

  const [saving, setSaving] = useState(false)

  // Os três históricos (os dois parceiros + a conta do casal) vêm do cache,
  // com as mesmas chaves de useMemberTransactionsQuery/useMemberCategoriesQuery.
  // Gravações invalidam os domínios e a divisão se recalcula sozinha.
  const owners = useMemo(
    () => (couple ? [...personal.map((m) => m.id), couple.id] : []),
    [personal, couple],
  )
  const txQueries = useQueries({
    queries: owners.map((id) => ({
      queryKey: queryKeys.member("transactions", id),
      queryFn: () => getMemberTransactionsMapped(id),
      enabled: available,
    })),
    combine: combineLists<Transaction>,
  })
  const categoryQueries = useQueries({
    queries: owners.map((id) => ({
      queryKey: queryKeys.member("categories", id),
      queryFn: () => getMemberCategories(id) as Promise<Array<{ id: string; name: string }>>,
      enabled: available,
    })),
    combine: combineLists<{ id: string; name: string }>,
  })
  const settlementsQuery = useCoupleSettlementsQuery(monthKey, { enabled: available })
  // Erro nos acertos = nenhum acerto (como antes).
  const settlements = settlementsQuery.data ?? NO_SETTLEMENTS

  // Só no primeiro carregamento — revalidar não volta ao skeleton. Categorias
  // e acertos que falham contam como vazios, não seguram a tela.
  const loading = available && (txQueries.pending || categoryQueries.pending || settlementsQuery.isPending)

  const transactions = useMemo(() => {
    // Sem os três históricos, nada (como antes: uma falha não montava uma divisão parcial).
    if (txQueries.lists.some((l) => !l)) return NO_SPLIT_TRANSACTIONS
    const categoryName = new Map<string, string>()
    for (const list of categoryQueries.lists) for (const c of list ?? []) categoryName.set(c.id, c.name)

    const byId = new Map<string, SplitTransaction>()
    ;(txQueries.lists as Transaction[][]).forEach((list, i) => {
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
          ownerId: owner === couple?.id ? null : owner,
          paidByUserId: t.paidByUserId ?? null,
        })
      }
    })
    return Array.from(byId.values())
  }, [txQueries.lists, categoryQueries.lists, owners, couple])

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

  const refetchSettlements = settlementsQuery.refetch
  const markSettled = useCallback(async () => {
    const remaining = data?.status.remaining
    if (!remaining || saving) return
    setSaving(true)
    try {
      await createCoupleSettlement({ month: monthKey, fromUserId: remaining.fromId, toUserId: remaining.toId, amount: remaining.amount })
      // Espera o acerto novo chegar antes de soltar o botão; o aviso faz as
      // outras partes que mostram o acerto (ex: o passo do Fechamento) atualizarem.
      await refetchSettlements()
      notifyDataChanged("family")
    } finally {
      setSaving(false)
    }
  }, [data, saving, monthKey, refetchSettlements])

  return { data, loading, saving, markSettled, available }
}
