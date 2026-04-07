"use client"

import { useState } from "react"
import { Plus, Minus, Trash, PiggyBank, Target, Wallet, Pencil } from "@phosphor-icons/react"
import { formatCurrency, formatCurrencyInput, parseCurrencyInput } from "@/lib/date-utils"
import { cn } from "@/lib/utils"
import { getCards } from "@/lib/storage"
import { getBankIcon } from "@/lib/bank-icons"

interface SavingsGoalCardProps {
  goal: any
  onAddFunds: (id: string, amount: number, cardId?: string) => void
  onRemoveFunds: (id: string, amount: number, cardId?: string) => void
  onDelete: (id: string) => void
  onEdit: (goal: any) => void
}

const GOAL_ICONS = {
  PiggyBank,
  Target,
  Wallet,
}

const QUICK_AMOUNTS = [50, 100, 200, 500, 1000]

export function SavingsGoalCard({ goal, onAddFunds, onRemoveFunds, onDelete, onEdit }: SavingsGoalCardProps) {
  const [showDialog, setShowDialog] = useState(false)
  const [amount, setAmount] = useState("")
  const [mode, setMode] = useState<"add" | "remove">("add")
  const [selectedCardId, setSelectedCardId] = useState<string>("")
  const cards = getCards()

  const progress = (goal.currentAmount / goal.targetAmount) * 100
  const Icon = GOAL_ICONS[goal.icon as keyof typeof GOAL_ICONS] || PiggyBank

  const handleQuickAmount = (value: number) => {
    const currentAmount = parseCurrencyInput(amount)
    const newAmount = currentAmount + value
    const cents = Math.round(newAmount * 100).toString()
    setAmount(formatCurrencyInput(cents))
  }

  const handleAmountChange = (value: string) => {
    const onlyNumbers = value.replace(/\D/g, "")
    setAmount(formatCurrencyInput(onlyNumbers))
  }

  const handleSubmit = () => {
    const numAmount = parseCurrencyInput(amount)
    if (isNaN(numAmount) || numAmount <= 0) return

    if (mode === "add") {
      onAddFunds(goal.id, numAmount, selectedCardId)
    } else {
      if (numAmount > goal.currentAmount) {
        alert("Valor maior que o disponível na reserva")
        return
      }
      onRemoveFunds(goal.id, numAmount, selectedCardId)
    }

    setAmount("")
    setSelectedCardId("")
    setShowDialog(false)
  }

  return (
    <>
      <div className="rounded-2xl bg-card p-6 border border-border/50 shadow-sm">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-[1vw] flex items-center justify-center"
              style={{ backgroundColor: goal.color + "20" }}
            >
              <Icon size={24} weight="fill" style={{ color: goal.color }} />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground">{goal.name}</h3>
              <p className="text-sm text-muted-foreground">Meta: {formatCurrency(goal.targetAmount)}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => onEdit(goal)}
              className="p-2 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
            >
              <Pencil size={18} weight="bold" />
            </button>
            <button
              onClick={() => onDelete(goal.id)}
              className="p-2 rounded-lg text-muted-foreground hover:text-expense hover:bg-expense/10 transition-colors"
            >
              <Trash size={18} weight="bold" />
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-2xl font-bold text-foreground">{formatCurrency(goal.currentAmount)}</span>
            <span className="text-sm font-medium text-muted-foreground">{progress.toFixed(0)}%</span>
          </div>
          <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${Math.min(progress, 100)}%`,
                backgroundColor: goal.color,
              }}
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <button
            onClick={() => {
              setMode("add")
              setShowDialog(true)
            }}
            className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-[1vw] bg-income/10 text-income font-semibold hover:bg-income/20 transition-colors"
          >
            <Plus size={18} weight="bold" />
            Adicionar
          </button>
          <button
            onClick={() => {
              setMode("remove")
              setShowDialog(true)
            }}
            className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-[1vw] bg-expense/10 text-expense font-semibold hover:bg-expense/20 transition-colors"
          >
            <Minus size={18} weight="bold" />
            Retirar
          </button>
        </div>
      </div>

      {/* Dialog */}
      {showDialog && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowDialog(false)}
        >
          <div className="bg-card rounded-2xl p-6 w-full max-w-md shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-foreground mb-4">
              {mode === "add" ? "Adicionar Fundos" : "Retirar Fundos"}
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              {mode === "add"
                ? "O valor será subtraído da sua conta corrente"
                : "O valor será devolvido para sua conta corrente"}
            </p>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">Valor</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold">
                    R$
                  </span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={amount}
                    onChange={(e) => handleAmountChange(e.target.value)}
                    placeholder="0,00"
                    className="w-full pl-12 pr-4 py-3 rounded-[1vw] bg-background border border-border text-foreground text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-primary"
                    autoFocus
                  />
                </div>

                <div className="flex flex-wrap gap-2 mt-2">
                  {QUICK_AMOUNTS.map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => handleQuickAmount(value)}
                      className="px-3 py-3 rounded-[1vw] bg-primary text-secondary text-sm font-medium hover:bg-primary/90 transition-colors"
                    >
                     {formatCurrency(value)}
                    </button>
                  ))}
                </div>
              </div>

              {cards.length > 0 && (
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">Cartão (opcional)</label>
                  <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto">
                    {cards.filter((card) => card.type === "debit").map((card) => {
                      const BankIcon = getBankIcon(card.bankName)
                      return (
                        <button
                          key={card.id}
                          type="button"
                          onClick={() => setSelectedCardId(selectedCardId === card.id ? "" : card.id)}
                          className={cn(
                            "flex items-center gap-3 p-3 rounded-[1vw] border-2 transition-all",
                            selectedCardId === card.id
                              ? "border-primary bg-primary/5"
                              : "border-border bg-background hover:bg-muted",
                          )}
                        >
                          <div
                            className="w-10 h-10 rounded-lg flex items-center justify-center"
                            style={{ backgroundColor: card.color + "20" }}
                          >
                            <BankIcon size={24} color={card.color} weight="fill" />
                          </div>
                          <div className="flex-1 text-left">
                            <p className="text-sm font-medium text-foreground">{card.name}</p>
                            <p className="text-xs text-muted-foreground">•••• {card.lastDigits}</p>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowDialog(false)}
                  className="flex-1 py-3 px-4 rounded-[1vw] border border-border text-foreground font-semibold hover:bg-muted transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSubmit}
                  className={cn(
                    "flex-1 py-3 px-4 rounded-[1vw] font-semibold transition-colors text-white",
                    mode === "add" ? "bg-income hover:bg-income/90" : "bg-expense hover:bg-expense/90",
                  )}
                >
                  Confirmar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
