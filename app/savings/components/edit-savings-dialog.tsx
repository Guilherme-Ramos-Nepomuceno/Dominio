"use client"

import type React from "react"

import { useState } from "react"
import { X, PiggyBank, Target, Wallet } from "@phosphor-icons/react"
import { formatCurrencyInput, parseCurrencyInput } from "@/lib/date-utils"
import { cn } from "@/lib/utils"
import { getCards } from "@/lib/storage"
import { getBankIcon } from "@/lib/bank-icons"

interface EditSavingsDialogProps {
  goal: any
  onSave: (id: string, updates: any) => void
  onClose: () => void
}

const GOAL_ICONS = ["PiggyBank", "Target", "Wallet"]
const GOAL_COLORS = ["#3b82f6", "#8b5cf6", "#10b981", "#f59e0b", "#ef4444", "#ec4899"]

const QUICK_AMOUNTS = [50, 100, 200, 500, 1000]

export function EditSavingsDialog({ goal, onSave, onClose }: EditSavingsDialogProps) {
  const [name, setName] = useState(goal.name)
  const [targetAmount, setTargetAmount] = useState(formatCurrencyInput((goal.targetAmount * 100).toString()))
  const [selectedIcon, setSelectedIcon] = useState(goal.icon)
  const [selectedColor, setSelectedColor] = useState(goal.color)
  const [selectedCardId, setSelectedCardId] = useState(goal.cardId || "")
  const cards = getCards()

  const icons = { PiggyBank, Target, Wallet }

  const handleQuickAmount = (value: number) => {
    const currentAmount = parseCurrencyInput(targetAmount)
    const newAmount = currentAmount + value
    const cents = Math.round(newAmount * 100).toString()
    setTargetAmount(formatCurrencyInput(cents))
  }

  const handleTargetChange = (value: string) => {
    const onlyNumbers = value.replace(/\D/g, "")
    setTargetAmount(formatCurrencyInput(onlyNumbers))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const target = parseCurrencyInput(targetAmount)

    if (!name.trim() || isNaN(target) || target <= 0) {
      alert("Preencha todos os campos corretamente")
      return
    }

    onSave(goal.id, {
      name: name.trim(),
      targetAmount: target,
      icon: selectedIcon,
      color: selectedColor,
      cardId: selectedCardId,
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-card rounded-2xl p-6 w-full max-w-md shadow-xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-foreground">Editar Reserva</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-muted transition-colors">
            <X size={24} weight="bold" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Name */}
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">Nome da Reserva</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Viagem, Emergência..."
              className="w-full px-4 py-3 rounded-[1vw] bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              required
            />
          </div>

          {/* Target Amount */}
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">Meta de Valor</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold">R$</span>
              <input
                type="text"
                inputMode="numeric"
                value={targetAmount}
                onChange={(e) => handleTargetChange(e.target.value)}
                placeholder="0,00"
                className="w-full pl-12 pr-4 py-3 rounded-[1vw] bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                required
              />
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {QUICK_AMOUNTS.map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => handleQuickAmount(value)}
                  className="px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-sm font-medium hover:bg-primary/20 transition-colors"
                >
                  +R$ {value}
                </button>
              ))}
            </div>
          </div>

          {/* Icon Selection */}
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">Ícone</label>
            <div className="flex gap-3">
              {GOAL_ICONS.map((iconName) => {
                const IconComponent = icons[iconName as keyof typeof icons]
                return (
                  <button
                    key={iconName}
                    type="button"
                    onClick={() => setSelectedIcon(iconName)}
                    className={cn(
                      "w-14 h-14 rounded-[1vw] flex items-center justify-center border-2 transition-all",
                      selectedIcon === iconName
                        ? "border-primary bg-primary/10"
                        : "border-border bg-background hover:bg-muted",
                    )}
                  >
                    <IconComponent size={28} weight="fill" />
                  </button>
                )
              })}
            </div>
          </div>

          {/* Color Selection */}
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">Cor</label>
            <div className="flex flex-wrap gap-3">
              {GOAL_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setSelectedColor(color)}
                  className={cn(
                    "w-10 h-10 rounded-full border-2 transition-all",
                    selectedColor === color ? "border-foreground scale-110" : "border-transparent",
                  )}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          {/* Card Selection */}
          {cards.length > 0 && (
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">Cartão (opcional)</label>
              <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto">
                <button
                  type="button"
                  onClick={() => setSelectedCardId("")}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-[1vw] border-2 transition-all text-left",
                    selectedCardId === ""
                      ? "border-primary bg-primary/5"
                      : "border-border bg-background hover:bg-muted",
                  )}
                >
                  <span className="text-sm font-medium text-foreground">Nenhum cartão</span>
                </button>
                {cards.map((card) => {
                  const BankIcon = getBankIcon(card.bankName)
                  return (
                    <button
                      key={card.id}
                      type="button"
                      onClick={() => setSelectedCardId(card.id)}
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

          {/* Submit Button */}
          <button
            type="submit"
            className="w-full py-3 px-4 bg-primary text-primary-foreground rounded-[1vw] font-semibold hover:bg-primary/90 transition-colors"
          >
            Salvar Alterações
          </button>
        </form>
      </div>
    </div>
  )
}
