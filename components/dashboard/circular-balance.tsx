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
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  const totalBalance = checkingBalance + totalSavings
  const isNegative = totalBalance < 0

  if (!isMounted) {
    return (
      <div className="relative flex flex-col items-center justify-center py-8">
        <div className="w-64 h-32 rounded-t-full border-12 border-muted/20 animate-pulse" />
      </div>
    )
  }

  // Configurações comuns do SVG
  const radius = 90
  const circumference = Math.PI * radius

  if (isNegative) {
    return (
      <div className="relative flex flex-col items-center justify-center py-8">
        {/* SVG Arc */}
        <svg className="w-64 h-32 overflow-visible" viewBox="0 0 200 100">
          <path
            d="M 10,100 A 90,90 0 0,1 190,100"
            fill="none"
            stroke="#ef4444"
            strokeWidth="12"
            strokeLinecap="round"
            className="transition-all duration-500"
          />
        </svg>

        {/* AJUSTE AQUI:
           1. Mudei de top-1/2 para bottom-0 (parte mais larga do arco)
           2. w-full e px-2 para ocupar a largura disponível
           3. tracking-tight para apertar os números
        */}
        <div className="absolute bottom-6 left-0 right-0 flex flex-col items-center justify-end text-center px-4">
            <p className="text-xs text-muted-foreground mb-0.5 font-medium uppercase tracking-wider">Conta Corrente</p>
            
            <p className="text-2xl sm:text-3xl font-bold text-expense tracking-tight truncate max-w-full">
                {formatCurrency(checkingBalance)}
            </p>
            
            <p className="text-xs text-expense font-medium mt-0.5">Saldo negativo</p>
        </div>
      </div>
    )
  }

  const diff = income - expense
  const diffPercent = income > 0 ? (totalBalance / income) * 100 : 0

  let arcColor = "var(--expense)"
  if (diffPercent < 0) {
    arcColor = "var(--expense)"
  } else if (diffPercent <= 15) {
    arcColor = "#f97316"
  } else if (diffPercent <= 40) {
    arcColor = "#eab308"
  } else if (diffPercent <= 70) {
    arcColor = "#3b82f6"
  } else {
    arcColor = "var(--income)"
  }

  const progressPercent = income > 0 ? Math.min(Math.abs(diffPercent), 100) : 0
  const strokeDashoffset = circumference - (progressPercent / 100) * circumference

  return (
    <div className="relative flex flex-col items-center justify-center py-8">
        {/* Adicionei overflow-visible no SVG para garantir que o stroke não corte nas bordas */}
      <svg className="w-64 h-32 overflow-visible" viewBox="0 0 200 100">
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
      

      {/* AJUSTE PRINCIPAL:
          O container de texto agora fica alinhado na base (bottom-6), onde o arco é mais aberto.
      */}
      <div className="absolute bottom-6 left-0 right-0 flex flex-col items-center justify-end text-center px-4">
        <p className="text-xs text-muted-foreground mb-0.5 font-medium uppercase tracking-wider">Saldo Total</p>
        
        {/* Fonte responsiva e tracking-tight ajudam números grandes */}
        <p className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight truncate max-w-full">
            {formatCurrency(checkingBalance)}
        </p>
        
        <p className="text-xs text-muted-foreground font-medium mt-0.5">
          {progressPercent.toFixed(0)}% {diffPercent >= 0 ? "disponível" : "negativo"}
        </p>
      </div>

    </div>
  )
}