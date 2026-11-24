"use client"

import { useState, useEffect, useMemo } from "react"
import { useQueryClient } from "@tanstack/react-query"
import {
  addSavingsGoal,
  deleteSavingsGoal,
  updateSavingsGoal,
  setInvestmentAllocations,
  addSavingsSource,
  updateSavingsSource,
  deleteSavingsSource,
  dismissSavingsAdjustment,
  type PluggyInvestment,
  type SavingsAdjustment,
} from "@/lib/storage"
import { queryKeys } from "@/lib/query-client"
import { usePluggyInvestmentsQuery, useSavingsAdjustmentsQuery, useSavingsGoalsQuery } from "@/hooks/queries"
import { freeOfSavings, groupSavingsByKind } from "@/lib/goal-allocation"
import { composeSavings, visibleReserves } from "@/lib/savings-composition"
import type { SavingsGoal } from "@/lib/types"

// Dados que o formulário da reserva devolve. Cartão e ícone não são mais pedidos.
export interface SavingsFormData {
  name: string
  kind: string
  targetAmount: number
  // Só ao criar: o que já tem guardado vira "sem detalhar" até ser detalhado em fontes.
  currentAmount?: number
  isCasal: boolean
}

// Uma fonte registrada pelo nome, com a reserva em que está.
export interface SourceRef {
  id: string
  name: string
  amount: number
  updatedAt: string
  reserve: SavingsGoal
}

export type SavingsTab = "reserves" | "invested"

// Qual folha está aberta por cima da tela (só uma por vez).
export type SavingsSheet =
  | { type: "form"; reserve?: SavingsGoal }
  | { type: "detail"; reserveId: string }
  | { type: "source-new"; reserveId?: string; fromRest?: boolean; amount?: number }
  | { type: "source"; sourceId: string }
  | { type: "investment"; investmentId: string }

const NO_RESERVES: SavingsGoal[] = []
const NO_INVESTMENTS: PluggyInvestment[] = []
const NO_ADJUSTMENTS: SavingsAdjustment[] = []

export function useSavingsViewModel(initialTab: SavingsTab = "reserves") {
  const queryClient = useQueryClient()
  const [tab, setTab] = useState<SavingsTab>(initialTab)
  const [sheet, setSheet] = useState<SavingsSheet | null>(null)

  // Os investimentos primeiro: ler a lista faz a API acertar as reservas com o
  // banco (Guardado, resgates), e só depois elas são lidas. Erro em
  // investimentos ou avisos vira lista vazia (a tela funciona sem eles).
  const investmentsQuery = usePluggyInvestmentsQuery()
  const investmentsSettled = !investmentsQuery.isPending
  const reservesQuery = useSavingsGoalsQuery({ enabled: investmentsSettled })
  const adjustmentsQuery = useSavingsAdjustmentsQuery({ enabled: investmentsSettled })
  const investments = investmentsQuery.data ?? NO_INVESTMENTS
  const reserves = reservesQuery.data ?? NO_RESERVES

  // Reservas lidas ANTES da última leitura dos investimentos (cache de outra
  // tela, ou os investimentos acabaram de revalidar) podem estar sem o acerto
  // com o banco: marca como velhas para buscar de novo. cancelRefetch: false
  // reaproveita uma busca que já esteja em andamento (ela já vem acertada).
  const investmentsUpdatedAt = investmentsQuery.dataUpdatedAt
  const reservesUpdatedAt = reservesQuery.dataUpdatedAt
  useEffect(() => {
    if (!investmentsUpdatedAt || reservesUpdatedAt >= investmentsUpdatedAt) return
    void queryClient.invalidateQueries({ queryKey: queryKeys.savingsGoals() }, { cancelRefetch: false })
  }, [queryClient, investmentsUpdatedAt, reservesUpdatedAt])

  // Aviso dispensado some na hora, sem esperar a revalidação.
  const [dismissedIds, setDismissedIds] = useState<ReadonlySet<string>>(() => new Set())
  const adjustmentsData = adjustmentsQuery.data ?? NO_ADJUSTMENTS
  const adjustments = useMemo(
    () => adjustmentsData.filter((a) => !dismissedIds.has(a.id)),
    [adjustmentsData, dismissedIds],
  )

  // Só no primeiro carregamento — revalidações mostram o que já está na tela.
  const loading = investmentsQuery.isPending || reservesQuery.isPending || adjustmentsQuery.isPending

  const close = () => setSheet(null)
  const open = (next: SavingsSheet) => setSheet(next)

  // Depois de gravar não precisa recarregar: a gravação invalida o cache das
  // reservas (lib/data-events.ts) e a tela se atualiza sozinha.
  const handleSave = async (data: SavingsFormData, editing?: SavingsGoal) => {
    if (editing) {
      await updateSavingsGoal(editing.id, data)
    } else {
      await addSavingsGoal({ ...data, color: "#71717a", icon: "PiggyBank", currentAmount: data.currentAmount ?? 0 })
    }
    close()
  }

  const handleDelete = async (id: string) => {
    await deleteSavingsGoal(id)
    close()
  }

  const handleAddSource = async (input: { name: string; amount: number; savingsGoalId?: string; fromRest?: boolean }) => {
    await addSavingsSource(input)
    close()
  }

  const handleUpdateSource = async (id: string, updates: { name?: string; amount?: number; savingsGoalId?: string }) => {
    await updateSavingsSource(id, updates)
    close()
  }

  const handleRemoveSource = async (id: string) => {
    await deleteSavingsSource(id)
    close()
  }

  const handleAllocations = async (investmentId: string, allocations: { savingsGoalId: string; amount: number }[]) => {
    await setInvestmentAllocations(investmentId, allocations)
    close()
  }

  const handleDismissAdjustment = async (id: string) => {
    setDismissedIds((ids) => new Set(ids).add(id))
    await dismissSavingsAdjustment(id).catch(() => undefined)
  }

  const shown = useMemo(() => visibleReserves(reserves), [reserves])
  const groups = useMemo(() => groupSavingsByKind(shown), [shown])
  const totalSaved = reserves.reduce((sum, r) => sum + r.currentAmount, 0)
  const totalFree = reserves.reduce((sum, r) => sum + freeOfSavings(r), 0)
  const totalAllocated = Math.max(0, totalSaved - totalFree)

  // Fontes registradas e o que sobra sem detalhar, de todas as reservas: a
  // visão "Tudo investido" mostra isso ao lado dos investimentos do banco.
  const sources = useMemo<SourceRef[]>(
    () => reserves.flatMap((r) => composeSavings(r).sources.map((s) => ({ ...s, reserve: r }))),
    [reserves],
  )
  const restLines = useMemo(
    () => reserves.map((r) => ({ reserve: r, amount: composeSavings(r).rest })).filter((l) => l.amount > 0),
    [reserves],
  )

  const sheetReserve = sheet && "reserveId" in sheet && sheet.reserveId ? reserves.find((r) => r.id === sheet.reserveId) : undefined

  return {
    loading,
    tab,
    setTab,
    reserves,
    shown,
    groups,
    investments,
    adjustments,
    sources,
    restLines,
    totalSaved,
    totalFree,
    totalAllocated,
    sheet,
    open,
    close,
    sheetReserve,
    handleSave,
    handleDelete,
    handleAddSource,
    handleUpdateSource,
    handleRemoveSource,
    handleAllocations,
    handleDismissAdjustment,
  }
}
