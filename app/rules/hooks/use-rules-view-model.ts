"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useAccount } from "@/components/account/account-context"
import { getCategories } from "@/lib/storage"
import { createCategoryRule, deleteCategoryRule, getCategoryRules, updateCategoryRule } from "@/lib/rules-api"
import { validateRuleForm, type CategoryRule, type RuleFormInput } from "@/lib/rules"
import { trackEvent } from "@/lib/events"
import type { Category } from "@/lib/types"
import { toast } from "@/hooks/use-toast"

export function useRulesViewModel() {
  const { isReadOnly } = useAccount()
  const [rules, setRules] = useState<CategoryRule[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  // null = fechado; "new" = nova regra.
  const [editing, setEditing] = useState<CategoryRule | "new" | null>(null)
  const [deleting, setDeleting] = useState<CategoryRule | null>(null)

  const load = useCallback(async () => {
    setLoadError(false)
    try {
      const [list, cats] = await Promise.all([getCategoryRules(), getCategories()])
      setRules(list)
      setCategories(cats.filter((c) => !c.excludedFromTotals))
    } catch (error) {
      console.error("Falha ao carregar regras:", error)
      setLoadError(true)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

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
        await load()
        return null
      } catch (e: any) {
        return e?.message || "Não foi possível salvar a regra."
      }
    },
    [load],
  )

  const confirmDelete = useCallback(async () => {
    if (!deleting) return
    try {
      await deleteCategoryRule(deleting.id)
      setDeleting(null)
      await load()
    } catch (e: any) {
      toast({ title: "Não foi possível apagar a regra", description: e?.message, variant: "destructive" })
    }
  }, [deleting, load])

  return {
    isReadOnly,
    rules: sortedRules,
    categories,
    isLoading,
    loadError,
    reload: load,
    editing,
    setEditing,
    deleting,
    setDeleting,
    save,
    confirmDelete,
  }
}
