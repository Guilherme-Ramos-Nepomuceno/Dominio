"use client"

import { useCallback, useMemo, useState } from "react"
import { useAccount } from "@/components/account/account-context"
import { createCategoryRule, deleteCategoryRule, dismissRuleSuggestion, updateCategoryRule, type RuleSuggestion } from "@/lib/rules-api"
import { validateRuleForm, type CategoryRule, type RuleFormInput } from "@/lib/rules"
import { trackEvent } from "@/lib/events"
import type { Category } from "@/lib/types"
import { toast } from "@/hooks/use-toast"
import { useCategoriesQuery, useCategoryRulesQuery, useRuleSuggestionsQuery } from "@/hooks/queries"

const NO_RULES: CategoryRule[] = []
const NO_CATEGORIES: Category[] = []
const NO_SUGGESTIONS: RuleSuggestion[] = []

export function useRulesViewModel() {
  const { isReadOnly } = useAccount()
  // Regras, categorias e sugestões vêm do cache; gravar invalida o domínio
  // "rules" (lib/rules-api.ts) e a lista se atualiza sozinha.
  const rulesQuery = useCategoryRulesQuery()
  const categoriesQuery = useCategoriesQuery()
  // Sem sugestões a tela ainda funciona (erro aqui vira lista vazia).
  const suggestionsQuery = useRuleSuggestionsQuery()
  const rules = rulesQuery.data ?? NO_RULES
  const allCategories = categoriesQuery.data ?? NO_CATEGORIES
  const categories = useMemo(() => allCategories.filter((c) => !c.excludedFromTotals), [allCategories])
  const isLoading = rulesQuery.isPending || categoriesQuery.isPending || suggestionsQuery.isPending
  // Só é erro de tela quando não há nada para mostrar — falha numa
  // revalidação em segundo plano mantém o que já estava carregado.
  const loadError = (rulesQuery.isError && !rulesQuery.data) || (categoriesQuery.isError && !categoriesQuery.data)
  // null = fechado; "new" = nova regra.
  const [editing, setEditing] = useState<CategoryRule | "new" | null>(null)
  const [deleting, setDeleting] = useState<CategoryRule | null>(null)
  // Sugestões já respondidas somem na hora, sem esperar a revalidação.
  const [answeredKeys, setAnsweredKeys] = useState<ReadonlySet<string>>(() => new Set())
  const suggestionsData = suggestionsQuery.data ?? NO_SUGGESTIONS
  const suggestions = useMemo(
    () => suggestionsData.filter((s) => !answeredKeys.has(s.merchantKey)),
    [suggestionsData, answeredKeys],
  )
  const [busyKey, setBusyKey] = useState<string | null>(null)

  const refetchRules = rulesQuery.refetch
  const refetchCategories = categoriesQuery.refetch
  const refetchSuggestions = suggestionsQuery.refetch
  const reload = useCallback(async () => {
    await Promise.all([refetchRules(), refetchCategories(), refetchSuggestions()])
  }, [refetchRules, refetchCategories, refetchSuggestions])

  const markAnswered = useCallback((merchantKey: string) => {
    setAnsweredKeys((keys) => new Set(keys).add(merchantKey))
  }, [])

  // Mais usadas primeiro, depois por nome.
  const sortedRules = useMemo(
    () => rules.slice().sort((a, b) => b.hits - a.hits || a.merchantKey.localeCompare(b.merchantKey, "pt-BR")),
    [rules],
  )

  const save = useCallback(
    async (input: RuleFormInput, existing: CategoryRule | null): Promise<string | null> => {
      const error = validateRuleForm(input, !existing)
      if (error) return error
      try {
        const range = { minAmount: input.minAmount, maxAmount: input.maxAmount }
        if (existing) {
          await updateCategoryRule(existing.id, { categoryId: input.categoryId, ...range })
        } else {
          await createCategoryRule({ description: input.description.trim(), categoryId: input.categoryId, ...range, source: "MANUAL" })
          trackEvent("rule_created", { origin: "manual", hasRange: input.minAmount !== null || input.maxAmount !== null })
        }
        return null
      } catch (e: any) {
        return e?.message || "Não foi possível salvar a regra."
      }
    },
    [],
  )

  const confirmDelete = useCallback(async () => {
    if (!deleting) return
    try {
      await deleteCategoryRule(deleting.id)
      setDeleting(null)
    } catch (e: any) {
      toast({ title: "Não foi possível apagar a regra", description: e?.message, variant: "destructive" })
    }
  }, [deleting])

  // Confirmar: vira regra (aprendida) e sai da lista na hora.
  const acceptSuggestion = useCallback(
    async (suggestion: RuleSuggestion) => {
      setBusyKey(suggestion.merchantKey)
      try {
        await createCategoryRule({ merchantKey: suggestion.merchantKey, categoryId: suggestion.categoryId, source: "LEARNED" })
        trackEvent("rule_created", { origin: "suggestion", hasRange: false })
        markAnswered(suggestion.merchantKey)
      } catch (e: any) {
        toast({ title: "Não foi possível criar a regra", description: e?.message, variant: "destructive" })
      } finally {
        setBusyKey(null)
      }
    },
    [markAnswered],
  )

  // "Agora não": não sugere mais esse estabelecimento.
  const dismissSuggestion = useCallback(async (suggestion: RuleSuggestion) => {
    setBusyKey(suggestion.merchantKey)
    try {
      await dismissRuleSuggestion(suggestion.merchantKey)
      markAnswered(suggestion.merchantKey)
    } catch (e: any) {
      toast({ title: "Não foi possível dispensar", description: e?.message, variant: "destructive" })
    } finally {
      setBusyKey(null)
    }
  }, [markAnswered])

  return {
    isReadOnly,
    suggestions,
    busyKey,
    acceptSuggestion,
    dismissSuggestion,
    rules: sortedRules,
    categories,
    isLoading,
    loadError,
    reload,
    editing,
    setEditing,
    deleting,
    setDeleting,
    save,
    confirmDelete,
  }
}
