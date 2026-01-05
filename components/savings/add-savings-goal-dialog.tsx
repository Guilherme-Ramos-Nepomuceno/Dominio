"use client"

import { useState, useEffect } from "react"
import { X, PiggyBank, Target, Wallet } from "@phosphor-icons/react"
import { cn } from "@/lib/utils"
import { formatCurrency, formatCurrencyInput, parseCurrencyInput } from "@/lib/date-utils"
import { getCards } from "@/lib/storage"
import type { Card } from "@/lib/types"
import { getBankIcon } from "@/lib/bank-icons"

interface AddSavingsGoalDialogProps {
  isOpen: boolean
  onClose: () => void
  onAdd: (goal: { name: string; targetAmount: number; color: string; icon: string; cardId?: string }) => void
}

const GOAL_ICONS = [
  { name: "PiggyBank", icon: PiggyBank, label: "Cofrinho" },
  { name: "Target", icon: Target, label: "Meta" },
  { name: "Wallet", icon: Wallet, label: "Carteira" },
]

const COLORS = [
  "#3b82f6", // blue
  "#10b981", // green
  "#f59e0b", // amber
  "#ef4444", // red
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#06b6d4", // cyan
  "#f97316", // orange
]

const QUICK_AMOUNTS = [100, 500, 1000, 5000, 10000]

export function AddSavingsGoalDialog({ isOpen, onClose, onAdd }: AddSavingsGoalDialogProps) {
  const [name, setName] = useState("")
  const [targetAmount, setTargetAmount] = useState("")
  const [selectedColor, setSelectedColor] = useState(COLORS[0])
  const [selectedIcon, setSelectedIcon] = useState("PiggyBank")
  const [selectedCardId, setSelectedCardId] = useState<string>("")
  const [cards, setCards] = useState<Card[]>([])

  useEffect(() => {
    if (isOpen) {
      const allCards = getCards()
      setCards(allCards)
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleQuickAmount = (value: number) => {
    const currentAmount = parseCurrencyInput(targetAmount)
    const newAmount = currentAmount + value
    const cents = Math.round(newAmount * 100).toString()
    setTargetAmount(formatCurrencyInput(cents))
  }

  const handleAmountChange = (value: string) => {
    const onlyNumbers = value.replace(/\D/g, "")
    setTargetAmount(formatCurrencyInput(onlyNumbers))
  }

  const handleSubmit = () => {
    if (!name || !targetAmount) {
      alert("Preencha todos os campos")
      return
    }

    const amount = parseCurrencyInput(targetAmount)
    if (isNaN(amount) || amount <= 0) {
      alert("Valor inválido")
      return
    }

    onAdd({
      name,
      targetAmount: amount,
      color: selectedColor,
      icon: selectedIcon,
      cardId: selectedCardId || undefined,
    })

    setName("")
    setTargetAmount("")
    setSelectedColor(COLORS[0])
    setSelectedIcon("PiggyBank")
    setSelectedCardId("")
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-card rounded-2xl p-6 w-full max-w-md shadow-xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-foreground">Nova Reserva</h3>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-muted transition-colors">
            <X size={20} weight="bold" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Name */}
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">Nome da Reserva</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Viagem, Emergência, Carro novo..."
              className="w-full px-4 py-3 rounded-[1vw] bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Target Amount */}
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">Valor da Meta</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold">R$</span>
              <input
                type="text"
                inputMode="numeric"
                value={targetAmount}
                onChange={(e) => handleAmountChange(e.target.value)}
                placeholder="0,00"
                className="w-full pl-12 pr-4 py-3 rounded-[1vw] bg-background border border-border text-foreground text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-primary"
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

          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">Cartão (opcional)</label>
            <select
              value={selectedCardId}
              onChange={(e) => setSelectedCardId(e.target.value)}
              className="w-full px-4 py-3 rounded-[1vw] bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">Sem cartão associado</option>
              {cards.map((card) => {
                const BankIcon = getBankIcon(card.bankName)
                return (
                  <option key={card.id} value={card.id}>
                    {card.name} (••• {card.lastDigits})
                  </option>
                )
              })}
            </select>
            <p className="text-xs text-muted-foreground mt-1">Associe a reserva a um cartão específico (opcional)</p>
          </div>

          {/* Icon Selection */}
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">Ícone</label>
            <div className="flex gap-3">
              {GOAL_ICONS.map(({ name, icon: Icon, label }) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => setSelectedIcon(name)}
                  className={cn(
                    "flex-1 flex flex-col items-center gap-2 p-4 rounded-[1vw] border-2 transition-all",
                    selectedIcon === name
                      ? "border-primary bg-primary/5 shadow-sm"
                      : "border-border bg-card hover:bg-muted",
                  )}
                >
                  <Icon size={28} weight="fill" style={{ color: selectedColor }} />
                  <span className="text-xs font-medium text-foreground">{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Color Selection */}
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">Cor</label>
            <div className="grid grid-cols-8 gap-2">
              {COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setSelectedColor(color)}
                  className={cn(
                    "w-10 h-10 rounded-lg transition-all",
                    selectedColor === color ? "ring-2 ring-primary ring-offset-2 ring-offset-background scale-110" : "",
                  )}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 px-4 rounded-[1vw] border border-border text-foreground font-semibold hover:bg-muted transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSubmit}
              className="flex-1 py-3 px-4 rounded-[1vw] bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors"
            >
              Criar Reserva
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
