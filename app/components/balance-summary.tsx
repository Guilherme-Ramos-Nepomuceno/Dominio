"use client"

import Link from "next/link"
import { CaretRight } from "@phosphor-icons/react"
import { formatCurrency } from "@/lib/date-utils"
import { cn } from "@/lib/utils"

interface BalanceSummaryProps {
  checkingBalance: number
  totalSavings: number
  // Na visão "Total da Família" (sem semana nem plano) o saldo é a resposta principal.
  prominent?: boolean
}

// Saldo como apoio: uma linha com o total e, ao lado, quanto está em conta e
// nas reservas (mesma soma do antigo medidor circular). Abre Cartões.
export function BalanceSummary({ checkingBalance, totalSavings, prominent = false }: BalanceSummaryProps) {
  const total = checkingBalance + totalSavings
  return (
    <Link href="/cards" className="group flex items-center gap-3 border-y border-border py-3 hover:opacity-80 transition-opacity">
      <span className="flex-1 min-w-0">
        <span className="block text-xs text-muted-foreground">Saldo total</span>
        <span
          className={cn(
            "block font-semibold tabular-nums",
            prominent ? "text-4xl tracking-tight" : "text-base",
            total < 0 ? "text-expense" : "text-foreground",
          )}
        >
          {formatCurrency(total)}
        </span>
      </span>
      <span className="text-right text-xs text-muted-foreground tabular-nums">
        <span className="block">{formatCurrency(checkingBalance)} em conta</span>
        <span className="block">{formatCurrency(totalSavings)} em reservas</span>
      </span>
      <CaretRight size={14} weight="bold" className="text-muted-foreground/60 shrink-0" />
    </Link>
  )
}
