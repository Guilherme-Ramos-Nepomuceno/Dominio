"use client"

import { useState } from "react"
import { CheckCircle, Circle } from "@phosphor-icons/react"
import type { Card } from "@/lib/types"
import { getBankIcon } from "@/lib/bank-icons"
import { cn } from "@/lib/utils"
import { FormSheet, SheetPrimaryButton } from "@/components/ui/form-sheet"

interface MergeCardDialogProps {
  card: Card | null
  otherCards: Card[]
  onMerge: (mergeCardId: string) => void | Promise<void>
  onClose: () => void
}

const capability = (c: Card) => (c.hasCredit && c.hasDebit ? "crédito e débito" : c.hasCredit ? "crédito" : "débito")

// Juntar dois cadastros do mesmo cartão/conta: escolher o outro numa lista solta.
export function MergeCardDialog({ card, otherCards, onMerge, onClose }: MergeCardDialogProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [isMerging, setIsMerging] = useState(false)

  if (!card) return null

  const selected = otherCards.find((c) => c.id === selectedId)

  // Apaga o outro cadastro: escolher na lista só marca, quem executa é o botão.
  const handleMerge = async () => {
    if (!selectedId || isMerging) return
    setIsMerging(true)
    try {
      await onMerge(selectedId)
    } finally {
      setIsMerging(false)
    }
  }

  return (
    <FormSheet
      title={`Juntar com ${card.name}`}
      onClose={onClose}
      footer={
        otherCards.length > 0 ? (
          <SheetPrimaryButton type="button" onClick={handleMerge} disabled={!selected || isMerging}>
            {isMerging ? "Juntando..." : selected ? `Juntar ${selected.name} em ${card.name}` : "Escolha o outro cadastro"}
          </SheetPrimaryButton>
        ) : undefined
      }
    >
      <p className="text-sm text-muted-foreground">
        Se o mesmo cartão foi cadastrado duas vezes, escolha o outro cadastro. Lançamentos e reservas dele passam para{" "}
        <span className="text-foreground font-medium">{card.name}</span>, que fica com crédito e/ou débito dos dois. O outro cadastro é apagado.
      </p>

      {otherCards.length === 0 ? (
        <p className="text-sm text-muted-foreground">Não há outro cartão ou conta para juntar.</p>
      ) : (
        <ul role="radiogroup" aria-label="Outro cadastro" className="-mt-2 divide-y divide-border">
          {otherCards.map((other) => {
            const BankIcon = getBankIcon(other.bankName)
            const final = other.lastDigits && other.lastDigits !== "0000" ? `final ${other.lastDigits} · ` : ""
            const isSelected = selectedId === other.id
            return (
              <li key={other.id}>
                <button
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  onClick={() => setSelectedId(isSelected ? null : other.id)}
                  disabled={isMerging}
                  className={cn("flex w-full items-center gap-3 py-3 text-left transition-opacity", selectedId && !isSelected && "opacity-50")}
                >
                  <BankIcon size={22} weight="fill" color={other.color} className="shrink-0" aria-hidden />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{other.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {final}
                      {capability(other)}
                    </p>
                  </div>
                  {isSelected ? (
                    <CheckCircle size={20} weight="fill" className="shrink-0 text-foreground" />
                  ) : (
                    <Circle size={20} className="shrink-0 text-muted-foreground" />
                  )}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </FormSheet>
  )
}
