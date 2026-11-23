"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import {
  beginRuleFeedbackBatch,
  categorizeTransactions,
  endRuleFeedbackBatch,
  type InboxData,
  type InboxGroup,
} from "@/lib/storage"
import { queryKeys } from "@/lib/query-client"
import { useCategoriesQuery, useInboxQuery } from "@/hooks/queries"
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

const NO_GROUPS: InboxGroup[] = []
const NO_CATEGORIES: Category[] = []

export function useInboxViewModel() {
  const { toast } = useToast()
  const { isReadOnly } = useAccount()

  const queryClient = useQueryClient()
  // Inbox e categorias do cache compartilhado. Classificar invalida o inbox
  // (domínio "transactions") e ele se atualiza sozinho.
  const inboxQuery = useInboxQuery()
  const categoriesQuery = useCategoriesQuery()
  const inbox = inboxQuery.data
  const groups = inbox?.groups ?? NO_GROUPS
  const total = inbox?.total ?? 0
  const categories = categoriesQuery.data ?? NO_CATEGORIES
  // Skeleton só no primeiro carregamento (e ao tentar de novo depois de um
  // erro); falha com dado em mãos não troca a lista pelo erro.
  const failed = (inboxQuery.isError && !inbox) || (categoriesQuery.isError && !categoriesQuery.data)
  const retrying = failed && (inboxQuery.isFetching || categoriesQuery.isFetching)
  const isLoading = inboxQuery.isPending || categoriesQuery.isPending || retrying
  const loadError = failed && !retrying

  // O que a pessoa escolheu em cada grupo. Grupos sem escolha mostram a
  // sugestão pré-selecionada; a escolha vale enquanto o grupo está na lista.
  const [chosen, setChosen] = useState<Record<string, string | null>>({})
  const selections = useMemo(() => {
    const initial = initialSelections(groups, categories)
    const next: Record<string, string | null> = {}
    for (const key of Object.keys(initial)) next[key] = key in chosen ? chosen[key] : initial[key]
    return next
  }, [groups, categories, chosen])

  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [busyGroupKey, setBusyGroupKey] = useState<string | null>(null)
  const [isAcceptingAll, setIsAcceptingAll] = useState(false)
  const [isReviewOpen, setIsReviewOpen] = useState(false)
  const viewedTracked = useRef(false)

  useEffect(() => {
    if (!inbox || viewedTracked.current) return
    viewedTracked.current = true
    trackEvent("inbox_viewed", { count: inbox.total })
  }, [inbox])

  // Tira o grupo da lista na hora (no cache, com cópia); a revalidação que a
  // gravação dispara confirma com o servidor.
  const removeGroupLocally = (key: string, removedCount: number) => {
    queryClient.setQueryData<InboxData>(queryKeys.inbox(), (prev) =>
      prev
        ? {
            ...prev,
            groups: prev.groups.filter((g) => inboxGroupKey(g) !== key),
            total: Math.max(0, prev.total - removedCount),
          }
        : prev,
    )
  }

  const selectCategory = (group: InboxGroup, categoryId: string | null) => {
    setChosen((prev) => ({ ...prev, [inboxGroupKey(group)]: categoryId }))
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

    if (chosenId) setChosen((prev) => ({ ...prev, [key]: chosenId }))
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
    } catch (error: any) {
      toast({ title: "Não foi possível classificar", description: categorizeErrorMessage(error), variant: "destructive" })
    } finally {
      setBusyGroupKey(null)
    }
  }

  const suggestedGroups = useMemo(() => groupsWithSuggestion(groups, categories), [groups, categories])

  // Aplica as sugestões só dos grupos marcados na revisão (por chave).
  const acceptSuggestions = async (keys: string[]) => {
    const chosen = new Set(keys)
    const toApply = suggestedGroups.filter((g) => chosen.has(inboxGroupKey(g)))
    if (toApply.length === 0 || isAcceptingAll || busyGroupKey) return
    setIsReviewOpen(false)
    setIsAcceptingAll(true)
    let updatedTotal = 0
    let failures = 0
    // Um grupo por vez: cada um tem sua própria categoria, e uma falha num
    // grupo não deve impedir os outros.
    beginRuleFeedbackBatch()
    for (const group of toApply) {
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
    suggestedGroups,
    suggestedCount: suggestedGroups.length,
    isReviewOpen,
    openReview: () => setIsReviewOpen(true),
    closeReview: () => setIsReviewOpen(false),
    selectCategory,
    toggleExpanded,
    categorizeGroup,
    acceptSuggestions,
    retry: () => {
      if (inboxQuery.isError) void inboxQuery.refetch()
      if (categoriesQuery.isError) void categoriesQuery.refetch()
    },
  }
}
