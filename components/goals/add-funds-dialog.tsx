"use client"

import type React from "react"

import { useState } from "react"
import { X, Plus, Minus } from "@phosphor-icons/react"
import { formatCurrency } from "@/lib/date-utils"
import type { Goal } from "@/lib/types"

interface AddFundsDialogProps {
  isOpen: boolean
  onClose: () => void
  goal: Goal
  onAddFunds: (amount: number) => void
}

export function AddFundsDialog({ isOpen, onClose, goal, onAddFunds }: AddFundsDialogProps) {
  const [amount, setAmount] = useState("")
  const [mode, setMode] = useState<"add" | "remove">("add")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const numAmount = Number.parseFloat(amount)
    if (isNaN(numAmount) || numAmount <= 0) {
      alert("Valor inválido")
      return
    }

    const finalAmount = mode === "add" ? numAmount : -numAmount
    onAddFunds(finalAmount)

    setAmount("")
    onClose()
  }

  if (!isOpen) return null

  const remaining = goal.targetAmount - goal.currentAmount

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md bg-card rounded-[20px] shadow-2xl border border-border">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-xl font-bold text-foreground">Atualizar Progresso</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-muted transition-colors">
            <X weight="bold" size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Goal Info */}
          <div className="p-4 rounded-[1vw] bg-muted/50">
            <p className="text-sm text-muted-foreground mb-1">{goal.name}</p>
            <p className="text-2xl font-bold text-foreground mb-2">{formatCurrency(goal.currentAmount)}</p>
            <p className="text-xs text-muted-foreground">Faltam {formatCurrency(remaining)} para atingir a meta</p>
          </div>

          {/* Mode Toggle */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setMode("add")}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-[1vw] font-semibold transition-all ${
                mode === "add"
                  ? "bg-income text-white"
                  : "bg-card text-muted-foreground border border-border hover:bg-muted"
              }`}
            >
              <Plus weight="bold" size={20} />
              Adicionar
            </button>

            <button
              type="button"
              onClick={() => setMode("remove")}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-[1vw] font-semibold transition-all ${
                mode === "remove"
                  ? "bg-expense text-white"
                  : "bg-card text-muted-foreground border border-border hover:bg-muted"
              }`}
            >
              <Minus weight="bold" size={20} />
              Remover
            </button>
          </div>

          {/* Amount Input */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Valor</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold">R$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0,00"
                  className="w-full pl-12 pr-4 py-3 rounded-[1vw] bg-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary text-lg font-semibold"
                  required
                  autoFocus
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-3 rounded-[1vw] border border-border bg-background text-foreground hover:bg-muted transition-colors font-semibold"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-3 rounded-[1vw] bg-primary text-primary-foreground hover:bg-primary/90 transition-colors font-semibold"
              >
                Confirmar
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
