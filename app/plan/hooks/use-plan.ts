"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { getPlan, updatePlan, confirmPlan, reorderWishes, type PlanUpdate } from "@/lib/planning-api"
import {
  newlyFittingWishIds,
  withBudget,
  withPlannedVariable,
  withWishOrder,
  type BudgetSource,
  type Plan,
} from "@/lib/plan"
import { parseMonthKey } from "@/lib/period"
import { toast } from "@/hooks/use-toast"

const HIGHLIGHT_MS = 4000

// Estado do plano de um mês, compartilhado pela torre (/plan) e pelo detalhe
// de grupo (/plan/[groupId]): carrega, aplica edições de forma otimista
// (lib/plan.ts recalcula a margem e os desejos na hora), manda ao backend e
// fica com a resposta dele. Desejos que passam a caber ficam destacados por
// alguns segundos.
export function usePlan(monthKeyStr: string) {
  const { year, month } = parseMonthKey(monthKeyStr)
  const [plan, setPlan] = useState<Plan | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [highlightedWishIds, setHighlightedWishIds] = useState<string[]>([])
  const planRef = useRef<Plan | null>(null)
  const highlightTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Ignora respostas de requisições antigas (troca de mês, edições seguidas).
  const requestSeq = useRef(0)

  const applyPlan = useCallback((next: Plan) => {
    const prev = planRef.current
    if (prev) {
      const fresh = newlyFittingWishIds(prev.wishes, next.wishes)
      if (fresh.length > 0) {
        setHighlightedWishIds((current) => Array.from(new Set([...current, ...fresh])))
        if (highlightTimer.current) clearTimeout(highlightTimer.current)
        highlightTimer.current = setTimeout(() => setHighlightedWishIds([]), HIGHLIGHT_MS)
      }
    }
    planRef.current = next
    setPlan(next)
  }, [])

  const load = useCallback(async () => {
    const seq = ++requestSeq.current
    setLoadError(false)
    try {
      const result = await getPlan(year, month)
      if (seq !== requestSeq.current) return
      // Troca de mês não deve "destacar" desejos do mês novo.
      if (planRef.current && (planRef.current.year !== result.year || planRef.current.month !== result.month)) {
        planRef.current = null
      }
      applyPlan(result)
    } catch (error) {
      if (seq !== requestSeq.current) return
      console.error("Falha ao carregar o plano:", error)
      setLoadError(true)
    } finally {
      if (seq === requestSeq.current) setIsLoading(false)
    }
  }, [year, month, applyPlan])

  useEffect(() => {
    setIsLoading(true)
    planRef.current = null
    setPlan(null)
    load()
    // Transação nova/categorizada muda o gasto do mês.
    window.addEventListener("storage-update", load)
    return () => window.removeEventListener("storage-update", load)
  }, [load])

  useEffect(() => () => {
    if (highlightTimer.current) clearTimeout(highlightTimer.current)
  }, [])

  // Aplica `optimistic` na hora e manda `request`; em erro, volta ao estado anterior.
  const mutate = useCallback(
    async (optimistic: ((p: Plan) => Plan) | null, request: () => Promise<Plan | void>, errorTitle: string) => {
      const before = planRef.current
      if (before && optimistic) applyPlan(optimistic(before))
      const seq = ++requestSeq.current
      setIsSaving(true)
      try {
        const result = await request()
        if (seq !== requestSeq.current) return true
        if (result) applyPlan(result)
        else await load()
        return true
      } catch (error: any) {
        if (before && seq === requestSeq.current) {
          planRef.current = before
          setPlan(before)
        }
        toast({ title: errorTitle, description: error?.message || "Tente novamente em instantes.", variant: "destructive" })
        return false
      } finally {
        setIsSaving(false)
      }
    },
    [applyPlan, load],
  )

  const save = useCallback(
    (updates: PlanUpdate, optimistic: ((p: Plan) => Plan) | null) =>
      mutate(optimistic, () => updatePlan(year, month, updates), "Não foi possível salvar o plano"),
    [mutate, year, month],
  )

  const setBudget = useCallback(
    (amount: number | null, source: BudgetSource) =>
      // budgetSource INCOME faz o backend limpar o valor manual (volta à renda prevista).
      save(source === "INCOME" ? { budgetSource: "INCOME" } : { budgetAmount: amount, budgetSource: "MANUAL" }, (p) =>
        withBudget(p, source === "INCOME" ? null : amount, source),
      ),
    [save],
  )

  const setPlannedVariable = useCallback(
    (categoryId: string, value: number) =>
      save({ categories: [{ categoryId, plannedVariable: value }] }, (p) => withPlannedVariable(p, categoryId, value)),
    [save],
  )

  const setWeeklyLimitEnabled = useCallback(
    (enabled: boolean) => save({ weeklyLimitEnabled: enabled }, (p) => ({ ...p, weeklyLimitEnabled: enabled })),
    [save],
  )

  const confirm = useCallback(
    () => mutate((p) => ({ ...p, status: "CONFIRMED" }), () => confirmPlan(year, month), "Não foi possível confirmar o plano"),
    [mutate, year, month],
  )

  const reorder = useCallback(
    (orderedIds: string[]) =>
      mutate(
        (p) => withWishOrder(p, orderedIds),
        async () => {
          await reorderWishes(orderedIds)
          return getPlan(year, month)
        },
        "Não foi possível reordenar os desejos",
      ),
    [mutate, year, month],
  )

  return {
    year,
    month,
    plan,
    isLoading,
    loadError,
    isSaving,
    highlightedWishIds,
    reload: load,
    setBudget,
    setPlannedVariable,
    setWeeklyLimitEnabled,
    confirm,
    reorder,
  }
}
