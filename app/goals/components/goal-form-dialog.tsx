"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { X, Check } from "@phosphor-icons/react"
import type { Goal } from "@/lib/types"
import * as PhosphorIcons from "@phosphor-icons/react"
import { cn } from "@/lib/utils"

interface GoalFormDialogProps {
  isOpen: boolean
  onClose: () => void
  onSave: (goal: Omit<Goal, "id" | "createdAt">) => void
  initialGoal?: Goal
}

const goalIcons = [
  "House",
  "Car",
  "AirplaneTilt",
  "GraduationCap",
  "Laptop",
  "GameController",
  "Heart",
  "PiggyBank",
  "ShoppingCart",
  "Bicycle",
] as const

const goalColors = [
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
  "#f43f5e",
  "#f97316",
  "#eab308",
  "#84cc16",
  "#10b981",
  "#14b8a6",
  "#06b6d4",
]

export function GoalFormDialog({ isOpen, onClose, onSave, initialGoal }: GoalFormDialogProps) {
  const [name, setName] = useState("")
  const [targetAmount, setTargetAmount] = useState("")
  const [currentAmount, setCurrentAmount] = useState("")
  const [deadline, setDeadline] = useState("")
  const [selectedIcon, setSelectedIcon] = useState<string>("Target")
  const [selectedColor, setSelectedColor] = useState(goalColors[0])

  useEffect(() => {
    if (initialGoal) {
      setName(initialGoal.name)
      setTargetAmount(initialGoal.targetAmount.toString())
      setCurrentAmount(initialGoal.currentAmount.toString())
      setDeadline(initialGoal.deadline ? initialGoal.deadline.split("T")[0] : "")
      setSelectedIcon(initialGoal.icon || "Target")
      setSelectedColor(initialGoal.color)
    } else {
      setName("")
      setTargetAmount("")
      setCurrentAmount("0")
      setDeadline("")
      setSelectedIcon("Target")
      setSelectedColor(goalColors[0])
    }
  }, [initialGoal, isOpen])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!name || !targetAmount) {
      alert("Preencha todos os campos obrigatórios")
      return
    }

    onSave({
      name,
      targetAmount: Number.parseFloat(targetAmount),
      currentAmount: Number.parseFloat(currentAmount) || 0,
      deadline: deadline ? new Date(deadline).toISOString() : undefined,
      icon: selectedIcon,
      color: selectedColor,
    })

    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-card rounded-[20px] shadow-2xl border border-border max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border sticky top-0 bg-card rounded-t-[20px]">
          <h2 className="text-xl font-bold text-foreground">{initialGoal ? "Editar Objetivo" : "Novo Objetivo"}</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-muted transition-colors">
            <X weight="bold" size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Name */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Nome do Objetivo</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Viagem, Casa própria, Carro..."
              className="w-full px-4 py-3 rounded-[1vw] bg-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              required
            />
          </div>

          {/* Target Amount */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Valor da Meta</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold">R$</span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={targetAmount}
                onChange={(e) => setTargetAmount(e.target.value)}
                placeholder="0,00"
                className="w-full pl-12 pr-4 py-3 rounded-[1vw] bg-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary text-lg font-semibold"
                required
              />
            </div>
          </div>

          {/* Current Amount */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Valor Atual (Opcional)</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold">R$</span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={currentAmount}
                onChange={(e) => setCurrentAmount(e.target.value)}
                placeholder="0,00"
                className="w-full pl-12 pr-4 py-3 rounded-[1vw] bg-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          {/* Deadline */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Data Limite (Opcional)</label>
            <input
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="w-full px-4 py-3 rounded-[1vw] bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Icon Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Ícone</label>
            <div className="flex flex-wrap gap-2">
              {goalIcons.map((iconName) => {
                const IconComp = PhosphorIcons[iconName]
                return (
                  <button
                    key={iconName}
                    type="button"
                    onClick={() => setSelectedIcon(iconName)}
                    className={cn(
                      "w-12 h-12 rounded-[1vw] flex items-center justify-center transition-all",
                      selectedIcon === iconName
                        ? "bg-primary text-primary-foreground scale-110"
                        : "bg-muted text-muted-foreground hover:bg-muted-foreground/20",
                    )}
                  >
                    {/* @ts-ignore */}
                    <IconComp size={24} weight={selectedIcon === iconName ? "fill" : "regular"} />
                  </button>
                )
              })}
            </div>
          </div>

          {/* Color Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Cor</label>
            <div className="flex flex-wrap gap-2">
              {goalColors.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setSelectedColor(color)}
                  className={cn(
                    "w-10 h-10 rounded-[1vw] transition-all",
                    selectedColor === color ? "ring-2 ring-primary ring-offset-2 ring-offset-background scale-110" : "",
                  )}
                  style={{ backgroundColor: color }}
                >
                  {selectedColor === color && <Check weight="bold" size={20} className="text-white mx-auto" />}
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
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
              {initialGoal ? "Salvar" : "Criar Objetivo"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
