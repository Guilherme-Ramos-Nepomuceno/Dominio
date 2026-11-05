"use client"

import type { Card } from "@/lib/types"
import { CardFormSheet } from "./card-form-sheet"

interface EditCardDialogProps {
  card: Card | null
  onSave: (id: string, updates: Partial<Card>) => void | Promise<void>
  onClose: () => void
}

export function EditCardDialog({ card, onSave, onClose }: EditCardDialogProps) {
  if (!card) return null
  return <CardFormSheet mode="edit" initial={card} onClose={onClose} onSubmit={async (values) => { await onSave(card.id, values) }} />
}
