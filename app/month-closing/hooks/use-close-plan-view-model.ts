"use client"

import { useCallback, useMemo, useState } from "react"
import { useSelectedMonth } from "@/lib/selected-month-context"
import { useAccount } from "@/components/account/account-context"
import { useInboxCount } from "@/hooks/use-inbox-count"
import { closePlan } from "@/lib/planning-api"
import { useClosingSummaryQuery, useGoalsQuery, usePlanQuery, useSavingsGoalsQuery } from "@/hooks/queries"
import {
  buildCloseBody,
  closingTiming,
  withBoughtWishes,
  defaultDecisions,
  validateLeftover,
  type ClosingData,
  type LeftoverDestination,
  type WishDecision,
} from "@/lib/closing"
import type { PlanStatus } from "@/lib/plan"
import { monthBar, planHeadline } from "@/lib/plan-layout"
import { addMonths, monthKey, parseMonthKey, toISODate } from "@/lib/period"
import { parseMoneyInput, formatMoneyInput } from "@/lib/plan"
import { trackEvent } from "@/lib/events"
import type { Goal, SavingsGoal } from "@/lib/types"
import { toast } from "@/hooks/use-toast"
import { monthClosedToast } from "@/lib/brand"
import { formatCurrency } from "@/lib/date-utils"

const MONTH_NAMES = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
]

const NO_GOALS: Goal[] = []
const NO_SAVINGS: SavingsGoal[] = []

// Fechar o plano: por padrão o mês anterior, se ele tem plano e ainda não foi
// fechado (fechamento costuma acontecer depois que o mês acaba); senão, o atual.
export function useClosePlanViewModel() {
  const { currentMonth } = useSelectedMonth()
  const { isReadOnly } = useAccount()
  const { count: inboxCount } = useInboxCount()
  const previousMonth = useMemo(() => {
    const { year, month } = parseMonthKey(currentMonth)
    const prev = addMonths(year, month, -1)
    return monthKey(prev.year, prev.month)
  }, [currentMonth])

  const [targetMonth, setTargetMonth] = useState<string | null>(null)
  const [decisions, setDecisions] = useState<Record<string, WishDecision>>({})
  const [destination, setDestination] = useState<LeftoverDestination | null>(null)
  const [destinationId, setDestinationId] = useState<string>("")
  const [leftoverAmount, setLeftoverAmount] = useState("")
  const [isClosing, setIsClosing] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  // Escolhe o mês alvo uma vez (mês anterior em aberto tem prioridade) — de
  // novo só se o "mês atual" mudar (ex.: dia de início do mês carregou).
  const prev = parseMonthKey(previousMonth)
  const previousPlanQuery = usePlanQuery(prev.year, prev.month, { enabled: !isReadOnly })
  const autoKey = `${previousMonth}|${currentMonth}`
  const [targetChosenFor, setTargetChosenFor] = useState<string | null>(null)
  if (!isReadOnly && targetChosenFor !== autoKey && (previousPlanQuery.data || previousPlanQuery.isError)) {
    const p = previousPlanQuery.data
    setTargetChosenFor(autoKey)
    setTargetMonth(p && (p.status === "DRAFT" || p.status === "CONFIRMED") ? previousMonth : currentMonth)
  }

  // Plano, resumo do fechamento e plano do mês seguinte, do cache. Sem mês
  // alvo ainda, as consultas ficam paradas.
  const target = parseMonthKey(targetMonth ?? currentMonth)
  const following = addMonths(target.year, target.month, 1)
  const planQuery = usePlanQuery(target.year, target.month, { enabled: !!targetMonth })
  // Resumo indisponível não derruba a tela (fica sem dados, como antes).
  const closingQuery = useClosingSummaryQuery(target.year, target.month, { enabled: !!targetMonth })
  // Só para o atalho depois de fechar: "Planejar" ou "Ver o plano".
  const followingPlanQuery = usePlanQuery(following.year, following.month, { enabled: !!targetMonth })

  const plan = planQuery.data ?? null
  const data: ClosingData | null = closingQuery.data ?? null
  const status: PlanStatus | null = plan?.status ?? null
  const followingPlanStatus: PlanStatus | null = followingPlanQuery.data?.status ?? null
  // Erro com nova tentativa no ar volta ao skeleton, como antes.
  const failed = planQuery.isError && !plan
  const retrying = failed && planQuery.isFetching
  const isLoading =
    !targetMonth || planQuery.isPending || closingQuery.isPending || followingPlanQuery.isPending || retrying
  const loadError = failed && !retrying

  // Fim do período e sobra prevista do plano (a mesma do Planejar).
  const planInfo = useMemo(() => {
    if (!plan) return null
    return {
      periodEnd: plan.periodEnd,
      forecastLeftover: planHeadline(plan).value,
      // Mesmos grupos, cores e valores da barra do Planejar, com a compra de
      // cada desejo contada em Desejos (e não no grupo da categoria dela).
      groups: withBoughtWishes(
        monthBar(plan)
          .segments.filter((seg) => seg.type === "group")
          .map((seg) => ({
            id: seg.groupId ?? seg.key,
            kind: seg.kind,
            name: seg.label,
            color: seg.color,
            planned: seg.amount,
            spent: seg.spent,
            categoryIds: plan.groups.find((g) => g.id === seg.groupId)?.categories.map((c) => c.categoryId) ?? [],
          })),
        plan.wishes,
      ),
    }
  }, [plan])

  // O formulário (decisões dos desejos, destino da sobra) parte do resumo do
  // mês — preenchido ao carregar o mês alvo, ao recarregar e depois de
  // fechar. Uma revalidação em segundo plano não apaga o que a pessoa
  // escolheu.
  const [formSeededFor, setFormSeededFor] = useState<string | null>(null)
  if (targetMonth && !isLoading && !loadError && formSeededFor !== targetMonth) {
    setFormSeededFor(targetMonth)
    setDecisions(defaultDecisions(data?.openWishes ?? []))
    setDestination(null)
    setDestinationId("")
    setLeftoverAmount(data && data.summary.leftover > 0 ? formatMoneyInput(data.summary.leftover) : "")
    setFormError(null)
  }

  // Busca de novo e repreenche o formulário. cancelRefetch: false = pega
  // carona na revalidação que uma gravação já disparou.
  const refetchPlan = planQuery.refetch
  const refetchClosing = closingQuery.refetch
  const refetchFollowing = followingPlanQuery.refetch
  const load = useCallback(async () => {
    if (!targetMonth) return
    await Promise.all([
      refetchPlan({ cancelRefetch: false }),
      refetchClosing({ cancelRefetch: false }),
      refetchFollowing({ cancelRefetch: false }),
    ])
    setFormSeededFor(null)
  }, [targetMonth, refetchPlan, refetchClosing, refetchFollowing])

  // Destinos da sobra; falha ao carregar = listas vazias, como antes.
  const goals = useGoalsQuery({ enabled: !isReadOnly }).data ?? NO_GOALS
  const savings = useSavingsGoalsQuery({ enabled: !isReadOnly }).data ?? NO_SAVINGS

  const labelOf = (key: string | null) => {
    if (!key) return ""
    const { year, month } = parseMonthKey(key)
    return `${MONTH_NAMES[month - 1]} de ${year}`
  }
  const monthLabel = useMemo(() => labelOf(targetMonth), [targetMonth])
  // O outro mês que dá para fechar (passado ↔ atual), num link discreto.
  const otherMonth = targetMonth === previousMonth ? currentMonth : previousMonth
  const otherMonthName = MONTH_NAMES[parseMonthKey(otherMonth).month - 1]
  const monthName = targetMonth ? MONTH_NAMES[parseMonthKey(targetMonth).month - 1] : ""
  // O mês seguinte ao que está sendo fechado (para "Planejar …" depois de fechar).
  const followingMonthName = targetMonth
    ? MONTH_NAMES[addMonths(parseMonthKey(targetMonth).year, parseMonthKey(targetMonth).month, 1).month - 1]
    : ""
  const timing = planInfo ? closingTiming(planInfo.periodEnd, toISODate(new Date())) : { inProgress: false, endLabel: "" }

  const close = useCallback(async () => {
    if (!targetMonth || !data) return
    const choice = { destination, id: destinationId || null, amount: destination ? parseMoneyInput(leftoverAmount) : null }
    const error = validateLeftover(choice, data.summary.leftover)
    if (error) {
      setFormError(error)
      return
    }
    setFormError(null)
    setIsClosing(true)
    const { year, month } = parseMonthKey(targetMonth)
    try {
      await closePlan(year, month, buildCloseBody(decisions, choice))
      trackEvent("month_closed", {
        wishes: Object.keys(decisions).length,
        leftoverDestination: choice.destination ?? "NONE",
      })
      toast({ ...monthClosedToast(monthName, data.summary.leftover, formatCurrency), variant: "success" })
      await load()
    } catch (e: any) {
      toast({ title: "Não foi possível fechar o mês", description: e?.message, variant: "destructive" })
    } finally {
      setIsClosing(false)
    }
  }, [targetMonth, data, destination, destinationId, leftoverAmount, decisions, monthName, load])

  return {
    isReadOnly,
    targetMonth,
    setTargetMonth,
    monthLabel,
    otherMonth,
    otherMonthName,
    timing,
    forecastLeftover: planInfo?.forecastLeftover ?? null,
    groups: planInfo?.groups ?? [],
    monthName,
    followingMonthName,
    followingPlanStatus,
    status,
    data,
    isLoading,
    loadError,
    reload: load,
    inboxCount,
    decisions,
    setDecision: (wishId: string, decision: WishDecision) => setDecisions((d) => ({ ...d, [wishId]: decision })),
    destination,
    setDestination: (d: LeftoverDestination | null) => {
      setDestination(d)
      setDestinationId("")
    },
    destinationId,
    setDestinationId,
    leftoverAmount,
    setLeftoverAmount,
    goals,
    savings,
    close,
    isClosing,
    formError,
  }
}

export type ClosePlanViewModel = ReturnType<typeof useClosePlanViewModel>
