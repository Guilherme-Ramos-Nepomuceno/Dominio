"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import {
  getSavingsGoals,
  addSavingsGoal,
  deleteSavingsGoal,
  updateSavingsGoal,
  getPluggyInvestments,
  setInvestmentAllocations,
  addSavingsSource,
  updateSavingsSource,
  deleteSavingsSource,
  getSavingsAdjustments,
  dismissSavingsAdjustment,
  type PluggyInvestment,
  type SavingsAdjustment,
} from "@/lib/storage"
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

export function useSavingsViewModel(initialTab: SavingsTab = "reserves") {
  const [reserves, setReserves] = useState<SavingsGoal[]>([])
  const [investments, setInvestments] = useState<PluggyInvestment[]>([])
  const [adjustments, setAdjustments] = useState<SavingsAdjustment[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<SavingsTab>(initialTab)
  const [sheet, setSheet] = useState<SavingsSheet | null>(null)

  const load = useCallback(async () => {
    try {
      // Os investimentos primeiro: ler a lista faz a API acertar as reservas
      // com o banco (Guardado, resgates), e só depois elas são lidas.
      const invs = await getPluggyInvestments().catch(() => [] as PluggyInvestment[])
      const [list, notices] = await Promise.all([getSavingsGoals(), getSavingsAdjustments().catch(() => [] as SavingsAdjustment[])])
      setInvestments(invs)
      setReserves(list)
      setAdjustments(notices)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const close = () => setSheet(null)
  const open = (next: SavingsSheet) => setSheet(next)

  const handleSave = async (data: SavingsFormData, editing?: SavingsGoal) => {
    if (editing) {
      await updateSavingsGoal(editing.id, data)
    } else {
      await addSavingsGoal({ ...data, color: "#71717a", icon: "PiggyBank", currentAmount: data.currentAmount ?? 0 })
    }
    await load()
    close()
  }

  const handleDelete = async (id: string) => {
    await deleteSavingsGoal(id)
    close()
    await load()
  }

  const handleAddSource = async (input: { name: string; amount: number; savingsGoalId?: string; fromRest?: boolean }) => {
    await addSavingsSource(input)
    await load()
    close()
  }

  const handleUpdateSource = async (id: string, updates: { name?: string; amount?: number; savingsGoalId?: string }) => {
    await updateSavingsSource(id, updates)
    await load()
    close()
  }

  const handleRemoveSource = async (id: string) => {
    await deleteSavingsSource(id)
    await load()
    close()
  }

  const handleAllocations = async (investmentId: string, allocations: { savingsGoalId: string; amount: number }[]) => {
    await setInvestmentAllocations(investmentId, allocations)
    await load()
    close()
  }

  const handleDismissAdjustment = async (id: string) => {
    setAdjustments((prev) => prev.filter((a) => a.id !== id))
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
