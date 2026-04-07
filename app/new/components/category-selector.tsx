"use client"

import { useState } from "react"
import { Plus, Check } from "@phosphor-icons/react"
import { getCategories, addCategory } from "@/lib/storage"
import type { TransactionType } from "@/lib/types"
import { cn } from "@/lib/utils"

interface CategorySelectorProps {
  type: TransactionType
  value: string
  onChange: (categoryId: string) => void
}

const predefinedColors = [
  "#ef4444",
  "#f97316",
  "#f59e0b",
  "#eab308",
  "#84cc16",
  "#22c55e",
  "#10b981",
  "#14b8a6",
  "#06b6d4",
  "#0ea5e9",
  "#3b82f6",
  "#6366f1",
  "#8b5cf6",
  "#a855f7",
  "#d946ef",
  "#ec4899",
  "#f43f5e",
]

export function CategorySelector({ type, value, onChange }: CategorySelectorProps) {
  const [categories, setCategories] = useState(getCategories().filter((cat) => cat.type === type))
  const [isAdding, setIsAdding] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState("")
  const [selectedColor, setSelectedColor] = useState(predefinedColors[0])

  const handleAddCategory = () => {
    if (!newCategoryName.trim()) return

    const newCategory = addCategory({
      name: newCategoryName,
      color: selectedColor,
      type,
    })

    setCategories([...categories, newCategory])
    onChange(newCategory.id)
    setIsAdding(false)
    setNewCategoryName("")
    setSelectedColor(predefinedColors[0])
  }

  return (
    <div className="space-y-3">
      {/* Existing Categories */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {categories.map((category) => (
          <button
            key={category.id}
            type="button"
            onClick={() => onChange(category.id)}
            className={cn(
              "flex items-center gap-3 p-4 rounded-[1vw] border-2 transition-all",
              value === category.id ? "border-primary bg-primary/5 shadow-sm" : "border-border bg-card hover:bg-muted",
            )}
          >
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: category.color + "20" }}
            >
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: category.color }} />
            </div>
            <span className="text-sm font-medium text-foreground truncate">{category.name}</span>
          </button>
        ))}

        {/* Add New Category Button */}
        <button
          type="button"
          onClick={() => setIsAdding(true)}
          className="flex items-center justify-center gap-2 p-4 rounded-[1vw] border-2 border-dashed border-border bg-card hover:bg-muted transition-all"
        >
          <Plus weight="bold" size={20} className="text-muted-foreground" />
          <span className="text-sm font-medium text-muted-foreground">Nova</span>
        </button>
      </div>

      {/* Add Category Form */}
      {isAdding && (
        <div className="p-4 rounded-[1vw] bg-muted/50 border border-border space-y-4">
          <input
            type="text"
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            placeholder="Nome da categoria"
            className="w-full px-4 py-2 rounded-lg bg-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            autoFocus
          />

          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">Escolha uma cor</p>
            <div className="flex flex-wrap gap-2">
              {predefinedColors.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setSelectedColor(color)}
                  className={cn(
                    "w-8 h-8 rounded-lg transition-all",
                    selectedColor === color ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : "",
                  )}
                  style={{ backgroundColor: color }}
                >
                  {selectedColor === color && <Check weight="bold" size={16} className="text-white mx-auto" />}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="flex-1 px-4 py-2 rounded-lg border border-border bg-background text-foreground hover:bg-muted transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleAddCategory}
              className="flex-1 px-4 py-2 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors"
            >
              Adicionar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
