"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react"
import { getCurrentMonth } from "@/lib/date-utils"
import { getSettings } from "@/lib/storage"
import {
  getCurrentPlanMonthKey,
  getPlanPeriod,
  isInPlanMonth,
  normalizeMonthStartDay,
  parseMonthKey,
  periodLabel,
  type PlanPeriod,
} from "@/lib/period"

const STORAGE_KEY = "dominio:selected-month"
// Cache do dia de início do mês (Configurações) para a primeira pintura já
// usar o período certo, antes do GET /settings responder.
const START_DAY_KEY = "dominio:month-start-day"

interface SelectedMonthContextValue {
  selectedMonth: string
  setSelectedMonth: (month: string) => void
  // Dia em que o "mês" começa (1 = mês civil). Ver lib/period.ts.
  monthStartDay: number
  // Período (datas) do mês selecionado.
  period: PlanPeriod
  // "5 nov – 4 dez" quando monthStartDay ≠ 1; null no mês civil.
  periodRangeLabel: string | null
  // Mês do plano que contém hoje ("YYYY-MM").
  currentMonth: string
  // Uma data (string da API) cai no mês selecionado (ou em `month`, se dado)?
  isInMonth: (dateString: string, month?: string) => boolean
}

const SelectedMonthContext = createContext<SelectedMonthContextValue | null>(null)

function readCachedStartDay(): number {
  try {
    return normalizeMonthStartDay(localStorage.getItem(START_DAY_KEY) ?? 1)
  } catch {
    return 1
  }
}

export function SelectedMonthProvider({ children }: { children: ReactNode }) {
  const [selectedMonth, setSelectedMonthState] = useState(getCurrentMonth)
  const [monthStartDay, setMonthStartDay] = useState(1)

  // Carrega o mês salvo só depois do mount (localStorage não existe no SSR) —
  // evita hydration mismatch entre server (sempre mês atual) e client.
  useEffect(() => {
    const startDay = readCachedStartDay()
    setMonthStartDay(startDay)
    const stored = localStorage.getItem(STORAGE_KEY)
    setSelectedMonthState(stored || getCurrentPlanMonthKey(startDay))
  }, [])

  // Dia de início vem das Configurações da conta ativa; relê ao logar e
  // quando a tela de Configurações salva (evento settings-update).
  useEffect(() => {
    let cancelled = false
    const load = () => {
      if (!localStorage.getItem("finance-token")) return
      getSettings()
        .then((settings) => {
          if (cancelled) return
          const day = normalizeMonthStartDay(settings.monthStartDay ?? 1)
          setMonthStartDay(day)
          // Sem mês escolhido explicitamente: acompanha o mês do plano de hoje.
          if (!localStorage.getItem(STORAGE_KEY)) setSelectedMonthState(getCurrentPlanMonthKey(day))
          try {
            localStorage.setItem(START_DAY_KEY, String(day))
          } catch {
            // sem cache, só perde a primeira pintura certa
          }
        })
        .catch(() => {})
    }
    load()
    window.addEventListener("settings-update", load)
    window.addEventListener("auth-change", load)
    return () => {
      cancelled = true
      window.removeEventListener("settings-update", load)
      window.removeEventListener("auth-change", load)
    }
  }, [])

  const setSelectedMonth = useCallback((month: string) => {
    setSelectedMonthState(month)
    localStorage.setItem(STORAGE_KEY, month)
  }, [])

  const value = useMemo<SelectedMonthContextValue>(() => {
    const { year, month } = parseMonthKey(selectedMonth)
    return {
      selectedMonth,
      setSelectedMonth,
      monthStartDay,
      period: getPlanPeriod(year, month, monthStartDay),
      periodRangeLabel: periodLabel(selectedMonth, monthStartDay),
      currentMonth: getCurrentPlanMonthKey(monthStartDay),
      isInMonth: (dateString: string, m?: string) => isInPlanMonth(dateString, m ?? selectedMonth, monthStartDay),
    }
  }, [selectedMonth, setSelectedMonth, monthStartDay])

  return <SelectedMonthContext.Provider value={value}>{children}</SelectedMonthContext.Provider>
}

export function useSelectedMonth() {
  const ctx = useContext(SelectedMonthContext)
  if (!ctx) throw new Error("useSelectedMonth must be used within a SelectedMonthProvider")
  return ctx
}
