"use client"

import { useEffect, useMemo } from "react"
import { useWeek } from "@/hooks/use-week"
import { useWins } from "@/hooks/use-wins"
import { useAccount } from "@/components/account/account-context"
import { useSelectedMonth } from "@/lib/selected-month-context"
import { trackEvent } from "@/lib/events"
import { toISODate } from "@/lib/period"
import { dayBars, heroBarTone, weekProgress } from "@/lib/week"

export function useWeekViewModel() {
  const { isReadOnly } = useAccount()
  const { currentMonth } = useSelectedMonth()
  const { week, isLoading, loadError, reload } = useWeek(!isReadOnly)
  // Mesmo mês da semana (o mês do plano de hoje). Falha aqui não derruba a tela.
  const { wins } = useWins(currentMonth, !isReadOnly)

  useEffect(() => {
    trackEvent("week_viewed")
  }, [])

  const progress = useMemo(() => (week ? weekProgress(week.spentThisWeek, week.limit) : null), [week])
  const barTone = week ? heroBarTone(week.paceStatus, week.spentThisWeek, week.limit) : "neutral"
  const bars = useMemo(() => dayBars(week?.days ?? []), [week])
  const todayISO = toISODate(new Date())

  return { isReadOnly, week, wins, isLoading, loadError, reload, progress, barTone, bars, todayISO, monthKey: currentMonth }
}
