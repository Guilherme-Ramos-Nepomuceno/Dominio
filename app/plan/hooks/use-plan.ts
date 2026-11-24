"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
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
import { queryKeys } from "@/lib/query-client"
import { usePlanQuery } from "@/hooks/queries"
import { toast } from "@/hooks/use-toast"

const HIGHLIGHT_MS = 4000

// Estado do plano de um mês, compartilhado pela torre (/plan) e pelo detalhe
// de grupo (/plan/[groupId]): lê do cache (hooks/queries.ts), aplica edições
// de forma otimista (lib/plan.ts recalcula a margem e os desejos na hora),
// manda ao backend e grava a resposta dele no cache. Desejos que passam a
// caber ficam destacados por alguns segundos.
export function usePlan(monthKeyStr: string) {
  const { year, month } = parseMonthKey(monthKeyStr)
  const queryClient = useQueryClient()
  const query = usePlanQuery(year, month)

  // Versão otimista enquanto uma gravação está no ar. Fica por cima do cache
  // para que uma revalidação em segundo plano (foco, outra gravação) não
  // desfaça na tela o que a pessoa acabou de editar.
  const [optimistic, setOptimistic] = useState<Plan | null>(null)
  const optimisticRef = useRef<Plan | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [highlightedWishIds, setHighlightedWishIds] = useState<string[]>([])
  // Ignora respostas de gravações antigas (edições seguidas).
  const requestSeq = useRef(0)

  const setLocal = useCallback((next: Plan | null) => {
    optimisticRef.current = next
    setOptimistic(next)
  }, [])

  // A versão otimista é de um mês só — trocar de mês volta a mostrar o cache.
  const local = optimistic && optimistic.year === year && optimistic.month === month ? optimistic : null
  const plan = local ?? query.data ?? null

  // Destaque dos desejos que passaram a caber: compara com o plano mostrado
  // antes (ajuste de estado durante o render, sem efeito). Troca de mês não
  // destaca nada.
  const [shownPlan, setShownPlan] = useState<Plan | null>(plan)
  if (plan !== shownPlan) {
    setShownPlan(plan)
    if (shownPlan && plan && shownPlan.year === plan.year && shownPlan.month === plan.month) {
      const fresh = newlyFittingWishIds(shownPlan.wishes, plan.wishes)
      if (fresh.length > 0) setHighlightedWishIds((current) => Array.from(new Set([...current, ...fresh])))
    }
  }

  // Cada novo destaque reinicia o relógio, como antes.
  useEffect(() => {
    if (highlightedWishIds.length === 0) return
    const timer = setTimeout(() => setHighlightedWishIds([]), HIGHLIGHT_MS)
    return () => clearTimeout(timer)
  }, [highlightedWishIds])

  // Aplica `apply` na hora e manda `request`; em erro, volta ao estado anterior.
  const mutate = useCallback(
    async (apply: ((p: Plan) => Plan) | null, request: () => Promise<Plan | void>, errorTitle: string) => {
      const key = queryKeys.plan(year, month)
      const current = optimisticRef.current
      const before =
        current && current.year === year && current.month === month ? current : (queryClient.getQueryData<Plan>(key) ?? null)
      if (before && apply) setLocal(apply(before))
      const seq = ++requestSeq.current
      setIsSaving(true)
      try {
        const result = await request()
        if (seq !== requestSeq.current) return true
        // A resposta vira o dado do cache (as outras telas do plano já veem);
        // a revalidação disparada pela gravação só confirma.
        if (result) queryClient.setQueryData(key, result)
        else await queryClient.refetchQueries({ queryKey: key })
        setLocal(null)
        return true
      } catch (error: any) {
        if (seq === requestSeq.current) setLocal(null)
        toast({ title: errorTitle, description: error?.message || "Tente novamente em instantes.", variant: "destructive" })
        return false
      } finally {
        setIsSaving(false)
      }
    },
    [queryClient, setLocal, year, month],
  )

  const save = useCallback(
    (updates: PlanUpdate, apply: ((p: Plan) => Plan) | null) =>
      mutate(apply, () => updatePlan(year, month, updates), "Não foi possível salvar o plano"),
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

  // cancelRefetch: false = se uma revalidação já está no ar (ex.: a que a
  // gravação disparou), espera por ela em vez de buscar de novo.
  const { refetch } = query
  const reload = useCallback(async () => {
    await refetch({ cancelRefetch: false })
  }, [refetch])

  const failed = query.isError && !plan
  const retrying = failed && query.isFetching

  return {
    year,
    month,
    plan,
    // Skeleton só no primeiro carregamento (e ao tentar de novo depois de um
    // erro); revalidação mostra o que já tem.
    isLoading: query.isPending || retrying,
    // Falha numa revalidação com plano em mãos não troca a tela pelo erro.
    loadError: failed && !retrying,
    isSaving,
    highlightedWishIds,
    reload,
    setBudget,
    setPlannedVariable,
    setWeeklyLimitEnabled,
    confirm,
    reorder,
  }
}
