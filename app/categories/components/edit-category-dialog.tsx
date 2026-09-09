"use client"

import type React from "react"

import { useState } from "react"
import { X } from "@phosphor-icons/react"
import type { Category } from "@/lib/types"
import { cn } from "@/lib/utils"
import { ICON_OPTIONS } from "./add-category-dialog"

interface EditCategoryDialogProps {
  category: Category | null
  onSave: (id: string, updates: Partial<Category>) => void | Promise<void>
  onClose: () => void
}

export function EditCategoryDialog({ category, onSave, onClose }: EditCategoryDialogProps) {
  const [name, setName] = useState(category?.name ?? "")
  const [icon, setIcon] = useState(category?.icon ?? ICON_OPTIONS[0].name)
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!category) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isSubmitting) return

    if (!name.trim()) {
      alert("Digite um nome para a categoria")
      return
    }

    setIsSubmitting(true)
    try {
      await onSave(category.id, { name: name.trim(), icon })
      onClose()
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-100 flex items-end md:items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-card w-full max-w-md rounded-t-3xl md:rounded-3xl p-6 space-y-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-foreground">Editar Categoria</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-muted transition-colors">
            <X size={20} weight="bold" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
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

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Ícone</label>
            <div className="grid grid-cols-6 gap-2">
              {ICON_OPTIONS.map(({ name: iconName, Icon }) => (
                <button
                  key={iconName}
                  type="button"
                  onClick={() => setIcon(iconName)}
                  className={cn(
                    "w-10 h-10 rounded-lg flex items-center justify-center transition-all",
                    icon === iconName
                      ? "text-primary ring-2 ring-primary/40 scale-110"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Icon size={22} weight="duotone" />
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 px-4 py-3 rounded-[1vw] border border-border text-foreground font-medium hover:bg-muted transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-4 py-3 rounded-[1vw] bg-primary text-primary-foreground font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {isSubmitting ? "Salvando..." : "Salvar Alterações"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
