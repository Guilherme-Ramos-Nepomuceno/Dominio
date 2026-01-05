"use client"

import { useState } from "react"
import { Eye, EyeSlashIcon, TrashIcon, PiggyBank } from "@phosphor-icons/react"
import type { Card, SavingsGoal } from "@/lib/types"
import { getBankIcon } from "@/lib/bank-icons"
import { formatCurrency } from "@/lib/date-utils"

interface CardItemProps {
  card: Card
  spent?: number
  balance?: number
  savingsGoals?: SavingsGoal[]
  onDelete: (id: string) => void
}

export function CardItem({ card, spent = 0, balance, savingsGoals = [], onDelete }: CardItemProps) {
  const [showNumber, setShowNumber] = useState(false)
  const BankIcon = getBankIcon(card.bankName)
  console.log(card)
  const availableBalance = card.type === "credit" && card.limit ? card.limit - spent : balance

  const pendingDebt = card.type === "credit" ? spent : 0

  const totalSavings = savingsGoals.reduce((sum, goal) => sum + goal.currentAmount, 0)

  return (
    <div
      className="relative rounded-2xl p-5 shadow-md overflow-hidden min-h-45 flex flex-col justify-between"
      style={{ backgroundColor: card.color }}
    >
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-white -translate-y-16 translate-x-16" />
        <div className="absolute bottom-0 left-0 w-24 h-24 rounded-full bg-white translate-y-12 -translate-x-12" />
      </div>

      {/* Card Content */}
      <div className="relative z-10 space-y-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <BankIcon weight="fill" size={28} className="text-white" />
            <span className="text-white font-semibold text-sm">{card.type === "credit" ? "Crédito" : "Débito"}</span>
          </div>
          <button
            onClick={() => onDelete(card.id)}
            className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30 transition-colors"
          >
            <TrashIcon size={16} className="text-white" weight="bold" />
          </button>
        </div>

        <div>
          <p className="text-white/80 text-xs font-medium mb-1">{card.name}</p>
          <div className="flex items-center justify-between">
            <p className="text-white text-lg font-mono tracking-wider">
              {showNumber ? `•••• ${card.lastDigits}` : "•••• ••••"}
            </p>
            <button
              onClick={() => setShowNumber(!showNumber)}
              className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30 transition-colors"
            >
              {showNumber ? (
                <EyeSlashIcon size={18} className="text-white" weight="bold" />
              ) : (
                <Eye size={18} className="text-white" weight="bold" />
              )}
            </button>
          </div>
        </div>

        <div className="pt-3 border-t border-white/20 space-y-2">
          {card.type === "credit" && card.limit && (
            <>
              <div>
                <p className="text-white/70 text-xs">Limite Disponível</p>
                <p className="text-white text-lg font-bold">{formatCurrency(availableBalance || 0)}</p>
                <p className="text-white/60 text-xs mt-0.5">de {formatCurrency(card.limit)}</p>
              </div>

              {pendingDebt > 0 && (
                <div className="pt-2 border-t border-white/20">
                  <p className="text-white/70 text-xs">Fatura a Pagar</p>
                  <p className="text-white text-base font-bold">{formatCurrency(pendingDebt)}</p>
                  {card.dueDate && <p className="text-white/60 text-xs mt-0.5">Vencimento dia {card.dueDate}</p>}
                </div>
              )}
            </>
          )}

          {card.type === "debit" && balance !== undefined && (
            <div>
              <p className="text-white/70 text-xs">Saldo</p>
              <p className="text-white text-lg font-bold">{formatCurrency(balance)}</p>
            </div>
          )}

          {card.type === "debit" && spent > 0 && (
            <div>
              <p className="text-white/70 text-xs">Gasto neste período</p>
              <p className="text-white text-base font-bold">{formatCurrency(spent)}</p>
            </div>
          )}

          {savingsGoals.length > 0 && (
            <div className="pt-2 border-t border-white/20">
              <div className="flex items-center gap-1.5 mb-2">
                <PiggyBank size={14} className="text-white/70" weight="fill" />
                <p className="text-white/70 text-xs">Reservas neste cartão</p>
              </div>
              <div className="space-y-1.5">
                {savingsGoals.map((goal) => (
                  <div key={goal.id} className="flex items-center justify-between text-xs">
                    <span className="text-white/90">{goal.name}</span>
                    <span className="text-white font-semibold">{formatCurrency(goal.currentAmount)}</span>
                  </div>
                ))}
                <div className="flex items-center justify-between text-sm font-bold pt-1 border-t border-white/20">
                  <span className="text-white">Total em Reservas</span>
                  <span className="text-white">{formatCurrency(totalSavings)}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
