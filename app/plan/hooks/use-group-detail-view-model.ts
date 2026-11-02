"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useParams } from "next/navigation"
import { useSelectedMonth } from "@/lib/selected-month-context"
import { useAccount } from "@/components/account/account-context"
import { getCategoryGroups, moveCategoryToGroup, updateCategoryGroup } from "@/lib/planning-api"
import { isPlanEditable, type CategoryGroup } from "@/lib/plan"
import { groupColor, planHeadline, planPeriodLabel, spentProgress } from "@/lib/plan-layout"
import { toast } from "@/hooks/use-toast"
import { usePlan } from "./use-plan"

export function useGroupDetailViewModel() {
  const params = useParams<{ groupId: string }>()
  const groupId = String(params?.groupId ?? "")
  const { selectedMonth, periodRangeLabel } = useSelectedMonth()
  const { isReadOnly } = useAccount()
  const planState = usePlan(selectedMonth)
  const { plan, reload } = planState

  const [groups, setGroups] = useState<CategoryGroup[]>([])
  const [isRenaming, setIsRenaming] = useState(false)
  const [movingCategoryId, setMovingCategoryId] = useState<string | null>(null)

  const loadGroups = useCallback(() => {
    getCategoryGroups()
      .then(setGroups)
      .catch(() => {})
  }, [])

  useEffect(() => {
    loadGroups()
  }, [loadGroups])

  const group = useMemo(() => plan?.groups.find((g) => g.id === groupId) ?? null, [plan, groupId])
  const editable = !!plan && isPlanEditable(plan.status) && !isReadOnly
  // Configurações do grupo (nome, limite semanal) valem para todos os meses.
  const canEditGroup = !isReadOnly
  const color = groupColor(group?.kind)
  const progress = group ? spentProgress(group.spent, group.planned) : null
  const headline = plan ? planHeadline(plan) : null
  const periodText = plan ? planPeriodLabel(plan.periodStart, plan.periodEnd) : periodRangeLabel

  const rename = useCallback(
    async (name: string) => {
      const trimmed = name.trim()
      if (!trimmed || !group || trimmed === group.name) return setIsRenaming(false)
      try {
        await updateCategoryGroup(group.id, { name: trimmed })
        setIsRenaming(false)
        await Promise.all([reload(), loadGroups()])
      } catch (error: any) {
        toast({ title: "Não foi possível renomear o grupo", description: error?.message, variant: "destructive" })
      }
    },
    [group, reload, loadGroups],
  )

  const toggleWeeklyLimit = useCallback(
    async (value: boolean) => {
      if (!group) return
      try {
        await updateCategoryGroup(group.id, { countsInWeeklyLimit: value })
        await reload()
      } catch (error: any) {
        toast({ title: "Não foi possível alterar o grupo", description: error?.message, variant: "destructive" })
      }
    },
    [group, reload],
  )

  const moveCategory = useCallback(
    async (categoryId: string, targetGroupId: string) => {
      if (targetGroupId === groupId) return
      setMovingCategoryId(categoryId)
      try {
        await moveCategoryToGroup(categoryId, targetGroupId)
        const target = groups.find((g) => g.id === targetGroupId)
        toast({ title: "Categoria movida", description: target ? `Agora está em ${target.name}.` : undefined })
        await Promise.all([reload(), loadGroups()])
      } catch (error: any) {
        toast({ title: "Não foi possível mover a categoria", description: error?.message, variant: "destructive" })
      } finally {
        setMovingCategoryId(null)
      }
    },
    [groupId, groups, reload, loadGroups],
  )

  return {
    ...planState,
    periodRangeLabel,
    periodText,
    group,
    color,
    progress,
    headline,
    groups,
    editable,
    canEditGroup,
    isRenaming,
    setIsRenaming,
    rename,
    toggleWeeklyLimit,
    moveCategory,
    movingCategoryId,
  }
}
