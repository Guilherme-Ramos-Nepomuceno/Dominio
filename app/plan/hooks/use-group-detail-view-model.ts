"use client"

import { useCallback, useMemo, useState } from "react"
import { useParams } from "next/navigation"
import { useSelectedMonth } from "@/lib/selected-month-context"
import { useAccount } from "@/components/account/account-context"
import { moveCategoryToGroup, updateCategoryGroup } from "@/lib/planning-api"
import { isPlanEditable, type CategoryGroup } from "@/lib/plan"
import { groupColor, planHeadline, planPeriodLabel, spentProgress } from "@/lib/plan-layout"
import { useCategoryGroupsQuery } from "@/hooks/queries"
import { toast } from "@/hooks/use-toast"
import { usePlan } from "./use-plan"

const NO_GROUPS: CategoryGroup[] = []

export function useGroupDetailViewModel() {
  const params = useParams<{ groupId: string }>()
  const groupId = String(params?.groupId ?? "")
  const { selectedMonth, periodRangeLabel } = useSelectedMonth()
  const { isReadOnly } = useAccount()
  const planState = usePlan(selectedMonth)
  const { plan, reload } = planState

  // Grupos (destinos de "mover categoria") e plano vêm do cache; renomear e
  // mover invalidam os dois (domínio "plan"), sem recarregar à mão.
  const groups = useCategoryGroupsQuery().data ?? NO_GROUPS
  const [isRenaming, setIsRenaming] = useState(false)
  const [movingCategoryId, setMovingCategoryId] = useState<string | null>(null)

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
      } catch (error: any) {
        toast({ title: "Não foi possível renomear o grupo", description: error?.message, variant: "destructive" })
      }
    },
    [group],
  )

  const toggleWeeklyLimit = useCallback(
    async (value: boolean) => {
      if (!group) return
      try {
        await updateCategoryGroup(group.id, { countsInWeeklyLimit: value })
      } catch (error: any) {
        toast({ title: "Não foi possível alterar o grupo", description: error?.message, variant: "destructive" })
      }
    },
    [group],
  )

  const moveCategory = useCallback(
    async (categoryId: string, targetGroupId: string) => {
      if (targetGroupId === groupId) return
      setMovingCategoryId(categoryId)
      try {
        await moveCategoryToGroup(categoryId, targetGroupId)
        const target = groups.find((g) => g.id === targetGroupId)
        toast({ title: "Categoria movida", description: target ? `Agora está em ${target.name}.` : undefined })
        // Segura o "movendo" até o plano novo chegar (pega carona na
        // revalidação que a gravação já disparou), para a categoria não
        // piscar no grupo antigo.
        await reload()
      } catch (error: any) {
        toast({ title: "Não foi possível mover a categoria", description: error?.message, variant: "destructive" })
      } finally {
        setMovingCategoryId(null)
      }
    },
    [groupId, groups, reload],
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
