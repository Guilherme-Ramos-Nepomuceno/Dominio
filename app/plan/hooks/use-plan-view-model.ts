"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useSelectedMonth } from "@/lib/selected-month-context"
import { useAccount } from "@/components/account/account-context"
import { getCards, getCategories } from "@/lib/storage"
import { createWish, deleteWish, updateWish, type WishInput } from "@/lib/planning-api"
import { trackEvent } from "@/lib/events"
import { effectiveBudget, isPlanEditable, planTotals, type PlanWish } from "@/lib/plan"
import {
  canConfirmPlan,
  monthBar,
  monthBarSummary,
  planGuide,
  planHeadline,
  planMonthTitle,
  planPeriodLabel,
  showsSpending,
  wishQueue,
} from "@/lib/plan-layout"
import { toISODate } from "@/lib/period"
import type { Card, Category } from "@/lib/types"
import { toast } from "@/hooks/use-toast"
import { useWins } from "@/hooks/use-wins"
import { usePlan } from "./use-plan"

export function usePlanViewModel() {
  const { selectedMonth, periodRangeLabel, period, monthStartDay } = useSelectedMonth()
  const { selection, family, isReadOnly } = useAccount()
  const planState = usePlan(selectedMonth)
  const { plan, year, month, reload } = planState
  // Vitórias do mês selecionado. Falha aqui não derruba a tela.
  const { wins } = useWins(selectedMonth, !isReadOnly)
  const [showConfirmSummary, setShowConfirmSummary] = useState(false)

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

  // Layout: barra do mês, herói, fila dos desejos e rótulos do cabeçalho.
  const bar = useMemo(() => (plan ? monthBar(plan) : null), [plan])
  const barSummary = useMemo(() => (bar ? monthBarSummary(bar) : ""), [bar])
  const headline = useMemo(() => (plan ? planHeadline(plan) : null), [plan])
  const queue = useMemo(() => (plan ? wishQueue(plan) : null), [plan])
  const showSpending = !!plan && showsSpending(plan.status, plan.periodStart, toISODate(new Date()))
  const title = planMonthTitle(year, month, new Date().getFullYear())
  const periodText = plan
    ? planPeriodLabel(plan.periodStart, plan.periodEnd)
    : planPeriodLabel(period.startISO, period.endISO)
  const guide = plan ? planGuide(plan.status) : null
  const canConfirm = !!plan && canConfirmPlan(plan.status, editable)
  const showWeekLink = !!plan && plan.status === "CONFIRMED" && plan.weeklyLimitEnabled

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
      // No lugar do toast: o resumo do "mês organizado".
      setShowConfirmSummary(true)
    }
  }, [planState, openWishes.length])

  return {
    ...planState,
    periodRangeLabel,
    isReadOnly,
    editable,
    budget: plan ? effectiveBudget(plan) : 0,
    totals,
    bar,
    barSummary,
    headline,
    queue,
    showSpending,
    title,
    periodText,
    guide,
    canConfirm,
    showWeekLink,
    monthStartDay,
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
    wins,
    showConfirmSummary,
    closeConfirmSummary: () => setShowConfirmSummary(false),
  }
}

export type PlanViewModel = ReturnType<typeof usePlanViewModel>
