"use client"

import { useEffect, useMemo, useState } from "react"
import { useWeek } from "@/hooks/use-week"
import { useAccount } from "@/components/account/account-context"
import { getCategories } from "@/lib/storage"
import { trackEvent } from "@/lib/events"
import { sortWeekTransactions, weekProgress } from "@/lib/week"
import type { Category } from "@/lib/types"

export function useWeekViewModel() {
  const { isReadOnly } = useAccount()
  const { week, isLoading, loadError, reload } = useWeek(!isReadOnly)
  const [categories, setCategories] = useState<Category[]>([])

  useEffect(() => {
    trackEvent("week_viewed")
    getCategories().then(setCategories).catch(() => {})
  }, [])

  const transactions = useMemo(() => sortWeekTransactions(week?.transactions ?? []), [week])
  const progress = useMemo(() => (week ? weekProgress(week.spentThisWeek, week.limit) : null), [week])

  return { isReadOnly, week, isLoading, loadError, reload, categories, transactions, progress }
}
