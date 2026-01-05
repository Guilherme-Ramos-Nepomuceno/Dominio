"use client"

import type React from "react"

import { useState } from "react"
import { X, TrendUp, TrendDown } from "@phosphor-icons/react"
import { addCategory } from "@/lib/storage"
import type { TransactionType } from "@/lib/types"
import { cn } from "@/lib/utils"

interface AddCategoryDialogProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

const PRESET_COLORS = [
  "#ef4444", // red
  "#f97316", // orange
  "#f59e0b", // amber
  "#eab308", // yellow
  "#84cc16", // lime
  "#22c55e", // green
  "#10b981", // emerald
  "#14b8a6", // teal
  "#06b6d4", // cyan
  "#0ea5e9", // sky
  "#3b82f6", // blue
  "#6366f1", // indigo
  "#8b5cf6", // violet
  "#a855f7", // purple
  "#d946ef", // fuchsia
  "#ec4899", // pink
]

export function AddCategoryDialog({ isOpen, onClose, onSuccess }: AddCategoryDialogProps) {
  const [name, setName] = useState("")
  const [type, setType] = useState<TransactionType>("expense")
  const [color, setColor] = useState(PRESET_COLORS[0])

  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!name.trim()) {
      alert("Digite um nome para a categoria")
      return
    }

    addCategory({
      name: name.trim(),
      type,
      color,
    })

    setName("")
    setType("expense")
    setColor(PRESET_COLORS[0])
    onSuccess()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-card w-full max-w-md rounded-t-3xl md:rounded-3xl p-6 space-y-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-foreground">Nova Categoria</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-muted transition-colors">
            <X size={20} weight="bold" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Type Toggle */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Tipo</label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setType("expense")}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-[1vw] font-semibold transition-all",
                  type === "expense"
                    ? "bg-expense text-white shadow-lg"
                    : "bg-muted text-muted-foreground border border-border",
                )}
              >
                <TrendDown weight="bold" size={18} />
                Despesa
              </button>

              <button
                type="button"
                onClick={() => setType("income")}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-[1vw] font-semibold transition-all",
                  type === "income"
                    ? "bg-income text-white shadow-lg"
                    : "bg-muted text-muted-foreground border border-border",
                )}
              >
                <TrendUp weight="bold" size={18} />
                Receita
              </button>
            </div>
          </div>

          {/* Name */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Nome</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Mercado, Transporte, Investimentos..."
              className="w-full px-4 py-3 rounded-[1vw] bg-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              required
              autoFocus
            />
          </div>

          {/* Color Picker */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Cor</label>
            <div className="grid grid-cols-8 gap-2">
              {PRESET_COLORS.map((presetColor) => (
                <button
                  key={presetColor}
                  type="button"
                  onClick={() => setColor(presetColor)}
                  className={cn(
                    "w-10 h-10 rounded-lg transition-all",
                    color === presetColor ? "ring-2 ring-primary ring-offset-2 ring-offset-card scale-110" : "",
                  )}
                  style={{ backgroundColor: presetColor }}
                />
              ))}
            </div>
          </div>

          {/* Submit */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 rounded-[1vw] border border-border text-foreground font-medium hover:bg-muted transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-3 rounded-[1vw] bg-primary text-primary-foreground font-semibold hover:opacity-90 transition-opacity"
            >
              Criar Categoria
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
