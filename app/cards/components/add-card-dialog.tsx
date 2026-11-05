"use client"

import { addCard } from "@/lib/storage"
import type { Card } from "@/lib/types"
import { CardFormSheet } from "./card-form-sheet"

interface AddCardDialogProps {
  isOpen: boolean
  onClose: () => void
  // Recebe o cartão recém-criado — útil pra quem abriu o diálogo já sabendo o
  // que vai fazer com ele (ex: selecioná-lo automaticamente em algum picker).
  onSuccess: (card: Card) => void
}

export function AddCardDialog({ isOpen, onClose, onSuccess }: AddCardDialogProps) {
  if (!isOpen) return null
  return (
    <CardFormSheet
      mode="new"
      onClose={onClose}
      onSubmit={async (values) => {
        const created = await addCard(values)
        onSuccess(created)
      }}
    />
  )
}
