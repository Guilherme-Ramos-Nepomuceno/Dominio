"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useSelectedMonth } from "@/lib/selected-month-context"
import { useAccount } from "@/components/account/account-context"
import { getCards, getCategories } from "@/lib/storage"
import { createWish, deleteWish, updateWish, type WishInput } from "@/lib/planning-api"
import { trackEvent } from "@/lib/events"
import { effectiveBudget, isPlanEditable, planTotals, type PlanWish } from "@/lib/plan"
import type { Card, Category } from "@/lib/types"
import { toast } from "@/hooks/use-toast"
import { usePlan } from "./use-plan"

export function usePlanViewModel() {
  const { selectedMonth, periodRangeLabel } = useSelectedMonth()
  const { selection, family, isReadOnly } = useAccount()
  const planState = usePlan(selectedMonth)
  const { plan, year, month, reload } = planState

  const [categories, setCategories] = useState<Category[]>([])
  const [cards, setCards] = useState<Card[]>([])

  // Desejo em edição (null = fechado; "new" = novo) e desejo sendo comprado.
  const [editingWish, setEditingWish] = useState<PlanWish | "new" | null>(null)
  const [buyingWish, setBuyingWish] = useState<PlanWish | null>(null)
  const [deletingWish, setDeletingWish] = useState<PlanWish | null>(null)
  const [isConfirming, setIsConfirming] = useState(false)

  useEffect(() => {
    trackEvent("plan_viewed")
  }, [])

  useEffect(() => {
    Promise.all([getCategories(), getCards()])
      .then(([cats, cardList]) => {
        setCategories(cats.filter((c) => c.type === "expense" && !c.excludedFromTotals))
        setCards(cardList)
      })
      .catch(() => {})
  }, [])

  // "Do casal" só aparece na conta pessoal de quem já tem conta do casal.
  const canMarkCasal = selection.type === "personal" && !!family?.members?.some((m) => m.accountType === "COUPLE")

  const editable = !!plan && isPlanEditable(plan.status) && !isReadOnly
  const openWishes = useMemo(() => (plan?.wishes ?? []).filter((w) => w.status === "OPEN"), [plan])
  const boughtWishes = useMemo(() => (plan?.wishes ?? []).filter((w) => w.status === "BOUGHT"), [plan])
  const totals = useMemo(() => (plan ? planTotals(plan) : null), [plan])

  const saveWish = useCallback(
    async (input: WishInput, existing: PlanWish | null) => {
      try {
        if (existing) {
          const { isCasal: _ignored, ...updates } = input
          await updateWish(existing.id, updates)
        } else {
          await createWish({ ...input, year, month })
          trackEvent("wish_created", { hasCategory: !!input.categoryId, isCasal: !!input.isCasal })
          if (input.isCasal) {
            toast({ title: "Desejo salvo na conta do casal", description: "Ele aparece no plano da conta do casal." })
          }
        }
        await reload()
        return true
      } catch (error: any) {
        toast({ title: "Não foi possível salvar o desejo", description: error?.message, variant: "destructive" })
        return false
      }
    },
    [reload, year, month],
  )

  const confirmDeleteWish = useCallback(async () => {
    if (!deletingWish) return
    try {
      await deleteWish(deletingWish.id)
      setDeletingWish(null)
      await reload()
    } catch (error: any) {
      toast({ title: "Não foi possível remover o desejo", description: error?.message, variant: "destructive" })
    }
  }, [deletingWish, reload])

  const confirmPlan = useCallback(async () => {
    setIsConfirming(true)
    const ok = await planState.confirm()
    setIsConfirming(false)
    if (ok) {
      trackEvent("plan_confirmed", { wishes: openWishes.length })
      toast({ title: "Plano confirmado!", description: "Agora é acompanhar a semana.", variant: "success" })
    }
  }, [planState, openWishes.length])

  return {
    ...planState,
    periodRangeLabel,
    isReadOnly,
    editable,
    budget: plan ? effectiveBudget(plan) : 0,
    totals,
    categories,
    cards,
    canMarkCasal,
    openWishes,
    boughtWishes,
    editingWish,
    setEditingWish,
    buyingWish,
    setBuyingWish,
    deletingWish,
    setDeletingWish,
    saveWish,
    confirmDeleteWish,
    confirmPlan,
    isConfirming,
  }
}

export type PlanViewModel = ReturnType<typeof usePlanViewModel>
