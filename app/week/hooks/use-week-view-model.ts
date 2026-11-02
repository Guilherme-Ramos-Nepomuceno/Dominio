"use client"

import { useEffect, useMemo } from "react"
import { useWeek } from "@/hooks/use-week"
import { useAccount } from "@/components/account/account-context"
import { trackEvent } from "@/lib/events"
import { dayBars, weekProgress } from "@/lib/week"

export function useWeekViewModel() {
  const { isReadOnly } = useAccount()
  const { week, isLoading, loadError, reload } = useWeek(!isReadOnly)

  useEffect(() => {
    trackEvent("week_viewed")
  }, [])

  const progress = useMemo(() => (week ? weekProgress(week.spentThisWeek, week.limit) : null), [week])
  const bars = useMemo(() => dayBars(week?.days ?? []), [week])

  return { isReadOnly, week, isLoading, loadError, reload, progress, bars }
}
