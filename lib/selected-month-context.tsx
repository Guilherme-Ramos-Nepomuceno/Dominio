"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import { getCurrentMonth } from "@/lib/date-utils"

const STORAGE_KEY = "dominio:selected-month"

interface SelectedMonthContextValue {
  selectedMonth: string
  setSelectedMonth: (month: string) => void
}

const SelectedMonthContext = createContext<SelectedMonthContextValue | null>(null)

export function SelectedMonthProvider({ children }: { children: ReactNode }) {
  const [selectedMonth, setSelectedMonthState] = useState(getCurrentMonth)

  // Carrega o mês salvo só depois do mount (localStorage não existe no SSR) —
  // evita hydration mismatch entre server (sempre mês atual) e client.
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) setSelectedMonthState(stored)
  }, [])

  const setSelectedMonth = (month: string) => {
    setSelectedMonthState(month)
    localStorage.setItem(STORAGE_KEY, month)
  }

  return (
    <SelectedMonthContext.Provider value={{ selectedMonth, setSelectedMonth }}>
      {children}
    </SelectedMonthContext.Provider>
  )
}

export function useSelectedMonth() {
  const ctx = useContext(SelectedMonthContext)
  if (!ctx) throw new Error("useSelectedMonth must be used within a SelectedMonthProvider")
  return ctx
}
