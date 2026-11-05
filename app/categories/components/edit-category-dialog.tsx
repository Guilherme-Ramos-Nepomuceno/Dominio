"use client"

import type { Category } from "@/lib/types"
import { moveCategoryToGroup } from "@/lib/planning-api"
import { groupOfCategory } from "@/lib/plan-layout"
import { useCategoryGroups } from "@/hooks/use-category-groups"
import { CategoryFormSheet } from "./category-form-sheet"

interface EditCategoryDialogProps {
  category: Category | null
  onSave: (id: string, updates: Partial<Category>) => void | Promise<void>
  onClose: () => void
}

// Mesmo formulário da criação; o tipo não muda, o grupo do plano sim.
export function EditCategoryDialog({ category, onSave, onClose }: EditCategoryDialogProps) {
  const groups = useCategoryGroups()
  if (!category) return null
  return (
    <CategoryFormSheet
      mode="edit"
      categoryId={category.id}
      initial={{ name: category.name, type: category.type, icon: category.icon ?? "Tag" }}
      onClose={onClose}
      onSubmit={async ({ name, icon, groupId }) => {
        const currentGroupId = groupOfCategory(groups, category.id)?.id ?? null
        if (groupId && groupId !== currentGroupId) await moveCategoryToGroup(category.id, groupId)
        await onSave(category.id, { name, icon })
      }}
    />
  )
}
