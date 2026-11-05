"use client"

import { addCategory } from "@/lib/storage"
import { moveCategoryToGroup } from "@/lib/planning-api"
import { CategoryFormSheet } from "./category-form-sheet"
import { DEFAULT_CATEGORY_COLOR } from "./category-icons"

// Reexportados daqui por quem já importava (importação de extrato, sincronização).
export { DEFAULT_CATEGORY_COLOR, ICON_OPTIONS } from "./category-icons"

interface AddCategoryDialogProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export function AddCategoryDialog({ isOpen, onClose, onSuccess }: AddCategoryDialogProps) {
  if (!isOpen) return null
  return (
    <CategoryFormSheet
      mode="new"
      onClose={onClose}
      onSubmit={async ({ name, type, icon, groupId }) => {
        const created = await addCategory({ name, type, icon, color: DEFAULT_CATEGORY_COLOR })
        // Grupo escolhido: move para ele (sem escolha, a API já decidiu pelo nome).
        if (groupId) await moveCategoryToGroup(created.id, groupId)
        onSuccess()
      }}
    />
  )
}
