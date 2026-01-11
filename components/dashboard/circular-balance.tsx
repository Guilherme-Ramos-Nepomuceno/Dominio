"use client"

import { useState, useEffect } from "react"
import { formatCurrency } from "@/lib/date-utils"

interface CircularBalanceProps {
  balance: number
  income: number
  expense: number
  checkingBalance: number
  totalSavings: number
}

export function CircularBalance({ balance, income, expense, checkingBalance, totalSavings }: CircularBalanceProps) {
  // 1. Estado para verificar se o componente já montou no cliente
  const [isMounted, setIsMounted] = useState(false)

  // 2. useEffect roda apenas no cliente após o primeiro render
  useEffect(() => {
    setIsMounted(true)
  }, [])

  const totalBalance = checkingBalance + totalSavings
  const isNegative = totalBalance < 0

  // 3. Se não estiver montado, retorna um esqueleto ou null para evitar o erro de Hydration
  // Isso evita que o servidor renderize o texto que causa o conflito
  if (!isMounted) {
    return (
      <div className="relative flex flex-col items-center justify-center py-8">
        <div className="w-64 h-32 rounded-t-full border-12 border-muted/20 animate-pulse" />
      </div>
    )
  }

  if (isNegative) {
    const radius = 90
    const circumference = Math.PI * radius

    return (
      <div className="relative flex flex-col items-center justify-center py-8">
        {/* SVG Arc - Full red when negative */}
        <svg className="w-64 h-32" viewBox="0 0 200 100">
          <path
            d="M 10,100 A 90,90 0 0,1 190,100"
            fill="none"
            stroke="#ef4444"
            strokeWidth="12"
            strokeLinecap="round"
            className="transition-all duration-500"
          />
        </svg>

        {/* Balance Display */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/4 text-center">
          <p className="text-xs text-muted-foreground mb-1">Conta Corrente</p>
          <p className="text-3xl font-bold text-expense">{formatCurrency(checkingBalance)}</p>
          <p className="text-xs text-expense mt-1">Saldo negativo</p>
        </div>

      </div>
    )
  }

  const diff = income - expense
  const diffPercent = income > 0 ? (totalBalance / income) * 100 : 0

  let arcColor = "var(--expense)" // red
  if (diffPercent < 0) {
    arcColor = "var(--expense)" // red
  } else if (diffPercent <= 15) {
    arcColor = "#f97316" // orange
  } else if (diffPercent <= 40) {
    arcColor = "#eab308" // yellow
  } else if (diffPercent <= 70) {
    arcColor = "#3b82f6" // blue
  } else {
    arcColor = "var(--income)" // green
  }

  const progressPercent = income > 0 ? Math.min(Math.abs(diffPercent), 100) : 0
  const radius = 90
  const circumference = Math.PI * radius // half circle
  const strokeDashoffset = circumference - (progressPercent / 100) * circumference

  return (
    <div className="relative flex flex-col items-center justify-center py-8">
      {/* SVG Arc */}
      <svg className="w-64 h-32" viewBox="0 0 200 100">
        {/* Background arc */}
        <path
          d="M 10,100 A 90,90 0 0,1 190,100"
          fill="none"
          stroke="currentColor"
          strokeWidth="12"
          className="text-muted/20"
          strokeLinecap="round"
        />
        <path
          d="M 10,100 A 90,90 0 0,1 190,100"
          fill="none"
          stroke={arcColor}
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className="transition-all duration-500"
        />
      </svg>

      {/* Balance Display - Show Total Balance (checking + savings) */}
      <div className="absolute top-2/3 left-1/2 -translate-x-1/2 -translate-y-1/4 text-center">
        <p className="text-xs text-muted-foreground mb-1">Saldo Total</p>
        <p className="text-3xl font-bold text-foreground">{formatCurrency(checkingBalance)}</p>
        <p className="text-xs text-muted-foreground mt-1">
          {progressPercent.toFixed(0)}% {diffPercent >= 0 ? "disponível" : "negativo"}
        </p>
      </div>

    </div>
  )
}