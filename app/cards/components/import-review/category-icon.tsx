import * as PhosphorIcons from "@phosphor-icons/react"
import type { Category } from "@/lib/types"
import { cn } from "@/lib/utils"

interface CategoryIconProps {
  category: Pick<Category, "color" | "icon">
  size?: "sm" | "md"
  className?: string
}

// Mesmo padrão de lookup dinâmico do ícone usado em app/categories — cai pra
// um círculo neutro quando a categoria não tem ícone salvo (ex: categorias
// antigas, criadas antes do seletor de ícone existir).
export function CategoryIcon({ category, size = "md", className }: CategoryIconProps) {
  const Icon = (category.icon && (PhosphorIcons as any)[category.icon]) || PhosphorIcons.Circle
  const box = size === "sm" ? "w-6 h-6" : "w-8 h-8"
  const iconSize = size === "sm" ? 14 : 16

  return (
    <div
      className={cn("rounded-lg flex items-center justify-center shrink-0", box, className)}
      style={{ backgroundColor: category.color + "20", color: category.color }}
    >
      <Icon size={iconSize} weight="bold" />
    </div>
  )
}
