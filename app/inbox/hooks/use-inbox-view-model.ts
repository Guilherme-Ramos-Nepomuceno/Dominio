"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  beginRuleFeedbackBatch,
  categorizeTransactions,
  endRuleFeedbackBatch,
  getCategories,
  getInbox,
  type InboxGroup,
} from "@/lib/storage"
import type { Category } from "@/lib/types"
import { trackEvent } from "@/lib/events"
import { groupsWithSuggestion, inboxGroupKey, initialSelections } from "@/lib/inbox"
import { useToast } from "@/hooks/use-toast"
import { useAccount } from "@/components/account/account-context"
import { ApiError } from "@/lib/api"

// 400 do POST /transactions/categorize = categoria de tipo diferente
// (receita x despesa) do das transações do grupo.
function categorizeErrorMessage(error: unknown): string {
  if (error instanceof ApiError && error.status === 400) {
    return "Essa categoria não é do mesmo tipo (receita/despesa) dessas transações. Escolha outra."
  }
  return (error as any)?.message || "Tente novamente."
}

export function useInboxViewModel() {
  const { toast } = useToast()
  const { isReadOnly } = useAccount()

  const [groups, setGroups] = useState<InboxGroup[]>([])
  const [total, setTotal] = useState(0)
  const [categories, setCategories] = useState<Category[]>([])
  const [selections, setSelections] = useState<Record<string, string | null>>({})
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [busyGroupKey, setBusyGroupKey] = useState<string | null>(null)
  const [isAcceptingAll, setIsAcceptingAll] = useState(false)
  const viewedTracked = useRef(false)

  const load = useCallback(async () => {
    try {
      const [inbox, cats] = await Promise.all([getInbox(), getCategories()])
      setGroups(inbox.groups)
      setTotal(inbox.total)
      setCategories(cats)
      // Mantém o que a pessoa já escolheu num grupo que continua na lista;
      // grupos novos nascem com a sugestão pré-selecionada.
      const initial = initialSelections(inbox.groups, cats)
      setSelections((prev) => {
        const next: Record<string, string | null> = {}
        for (const key of Object.keys(initial)) next[key] = key in prev ? prev[key] : initial[key]
        return next
      })
      setLoadError(false)
      if (!viewedTracked.current) {
        viewedTracked.current = true
        trackEvent("inbox_viewed", { count: inbox.total })
      }
    } catch {
      setLoadError(true)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const removeGroupLocally = (key: string, removedCount: number) => {
    setGroups((prev) => prev.filter((g) => inboxGroupKey(g) !== key))
    setTotal((prev) => Math.max(0, prev - removedCount))
  }

  const selectCategory = (group: InboxGroup, categoryId: string | null) => {
    setSelections((prev) => ({ ...prev, [inboxGroupKey(group)]: categoryId }))
  }

  const toggleExpanded = (group: InboxGroup) => {
    const key = inboxGroupKey(group)
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  // Sem categoryId usa a escolhida/sugerida do grupo; com ele (escolha na
  // lista), classifica direto — um toque só.
  const categorizeGroup = async (group: InboxGroup, chosenId?: string) => {
    const key = inboxGroupKey(group)
    const categoryId = chosenId ?? selections[key]
    if (!categoryId || busyGroupKey || isAcceptingAll) return
    const ids = group.transactions.map((t) => t.id)
    if (ids.length === 0) return

    if (chosenId) setSelections((prev) => ({ ...prev, [key]: chosenId }))
    setBusyGroupKey(key)
    try {
      const updated = await categorizeTransactions(ids, categoryId)
      trackEvent("inbox_categorized", { count: updated, acceptedSuggestion: categoryId === group.suggestion?.categoryId })
      removeGroupLocally(key, ids.length)
      const name = categories.find((c) => c.id === categoryId)?.name
      toast({
        title: "Grupo classificado",
        description: `${updated} ${updated === 1 ? "transação" : "transações"}${name ? ` em ${name}` : ""}.`,
        variant: "success",
      })
      load()
    } catch (error: any) {
      toast({ title: "Não foi possível classificar", description: categorizeErrorMessage(error), variant: "destructive" })
    } finally {
      setBusyGroupKey(null)
    }
  }

  const suggestedGroups = useMemo(() => groupsWithSuggestion(groups, categories), [groups, categories])

  const acceptAllSuggestions = async () => {
    if (suggestedGroups.length === 0 || isAcceptingAll || busyGroupKey) return
    setIsAcceptingAll(true)
    let updatedTotal = 0
    let failures = 0
    // Um grupo por vez: cada um tem sua própria categoria, e uma falha num
    // grupo não deve impedir os outros.
    beginRuleFeedbackBatch()
    for (const group of suggestedGroups) {
      try {
        const ids = group.transactions.map((t) => t.id)
        updatedTotal += await categorizeTransactions(ids, group.suggestion!.categoryId)
        removeGroupLocally(inboxGroupKey(group), ids.length)
      } catch {
        failures++
      }
    }
    endRuleFeedbackBatch()
    if (updatedTotal > 0) trackEvent("inbox_categorized", { count: updatedTotal, acceptedSuggestion: true })
    toast({
      title: failures > 0 ? "Algumas sugestões não foram aplicadas" : "Sugestões aceitas",
      description:
        `${updatedTotal} ${updatedTotal === 1 ? "transação classificada" : "transações classificadas"}` +
        (failures > 0 ? `; ${failures} ${failures === 1 ? "grupo falhou" : "grupos falharam"} — tente de novo.` : "."),
      variant: failures > 0 ? "destructive" : "success",
    })
    setIsAcceptingAll(false)
    load()
  }

  return {
    groups,
    total,
    categories,
    selections,
    expanded,
    isLoading,
    loadError,
    isReadOnly,
    busyGroupKey,
    isAcceptingAll,
    suggestedCount: suggestedGroups.length,
    selectCategory,
    toggleExpanded,
    categorizeGroup,
    acceptAllSuggestions,
    retry: () => {
      setIsLoading(true)
      load()
    },
  }
}
