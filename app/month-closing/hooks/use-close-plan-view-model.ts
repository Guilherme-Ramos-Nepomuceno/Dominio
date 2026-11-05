"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useSelectedMonth } from "@/lib/selected-month-context"
import { useAccount } from "@/components/account/account-context"
import { useInboxCount } from "@/hooks/use-inbox-count"
import { closePlan, getClosingSummary, getPlan } from "@/lib/planning-api"
import { getGoals, getSavingsGoals } from "@/lib/storage"
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

const MONTH_NAMES = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
]

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
  const [status, setStatus] = useState<PlanStatus | null>(null)
  const [followingPlanStatus, setFollowingPlanStatus] = useState<PlanStatus | null>(null)
  // Fim do período e sobra prevista do plano (a mesma do Planejar).
  const [planInfo, setPlanInfo] = useState<{
    periodEnd: string
    forecastLeftover: number
    groups: Array<{ id: string; kind: string | null; name: string; color: string | null; planned: number; spent: number; categoryIds: string[] }>
  } | null>(null)
  const [data, setData] = useState<ClosingData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [decisions, setDecisions] = useState<Record<string, WishDecision>>({})
  const [destination, setDestination] = useState<LeftoverDestination | null>(null)
  const [destinationId, setDestinationId] = useState<string>("")
  const [leftoverAmount, setLeftoverAmount] = useState("")
  const [goals, setGoals] = useState<Goal[]>([])
  const [savings, setSavings] = useState<SavingsGoal[]>([])
  const [isClosing, setIsClosing] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  // Escolhe o mês alvo uma vez (mês anterior em aberto tem prioridade).
  useEffect(() => {
    if (isReadOnly) return
    let cancelled = false
    const { year, month } = parseMonthKey(previousMonth)
    getPlan(year, month)
      .then((p) => {
        if (cancelled) return
        setTargetMonth(p.status === "DRAFT" || p.status === "CONFIRMED" ? previousMonth : currentMonth)
      })
      .catch(() => !cancelled && setTargetMonth(currentMonth))
    return () => {
      cancelled = true
    }
  }, [previousMonth, currentMonth, isReadOnly])

  const load = useCallback(async () => {
    if (!targetMonth) return
    setIsLoading(true)
    setLoadError(false)
    const { year, month } = parseMonthKey(targetMonth)
    try {
      const following = addMonths(year, month, 1)
      const [plan, closing, followingPlan] = await Promise.all([
        getPlan(year, month),
        getClosingSummary(year, month).catch(() => null),
        // Só para o atalho depois de fechar: "Planejar" ou "Ver o plano".
        getPlan(following.year, following.month).catch(() => null),
      ])
      setStatus(plan.status)
      setFollowingPlanStatus(followingPlan?.status ?? null)
      setPlanInfo({
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
      })
      setData(closing)
      setDecisions(defaultDecisions(closing?.openWishes ?? []))
      setDestination(null)
      setDestinationId("")
      setLeftoverAmount(closing && closing.summary.leftover > 0 ? formatMoneyInput(closing.summary.leftover) : "")
      setFormError(null)
    } catch (error) {
      console.error("Falha ao carregar o fechamento:", error)
      setLoadError(true)
    } finally {
      setIsLoading(false)
    }
  }, [targetMonth])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    if (isReadOnly) return
    Promise.all([getGoals(), getSavingsGoals()])
      .then(([g, s]) => {
        setGoals(g)
        setSavings(s)
      })
      .catch(() => {})
  }, [isReadOnly])

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
      toast({ title: "Mês fechado!", description: `O plano de ${monthLabel} foi fechado.`, variant: "success" })
      await load()
    } catch (e: any) {
      toast({ title: "Não foi possível fechar o mês", description: e?.message, variant: "destructive" })
    } finally {
      setIsClosing(false)
    }
  }, [targetMonth, data, destination, destinationId, leftoverAmount, decisions, monthLabel, load])

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
    isLoading: isLoading || (!targetMonth && !isReadOnly),
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
