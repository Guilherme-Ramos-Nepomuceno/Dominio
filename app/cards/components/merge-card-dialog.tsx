"use client"

import { ArrowsLeftRight, X } from "@phosphor-icons/react"
import type { Card } from "@/lib/types"
import { getBankIcon } from "@/lib/bank-icons"
import { cn } from "@/lib/utils"

interface MergeCardDialogProps {
  card: Card | null
  otherCards: Card[]
  onMerge: (mergeCardId: string) => void
  onClose: () => void
}

export function MergeCardDialog({ card, otherCards, onMerge, onClose }: MergeCardDialogProps) {
  if (!card) return null

  return (
    <div className="fixed inset-0 z-100 flex items-end md:items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-card w-full max-w-md rounded-t-3xl md:rounded-3xl p-6 space-y-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-foreground">Mesclar Cartão</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-muted transition-colors">
            <X size={20} weight="bold" />
          </button>
        </div>

        <p className="text-sm text-muted-foreground">
          Escolha outro cartão para juntar com <b className="text-foreground">{card.name}</b>. Todo o histórico de
          transações e reservas do cartão escolhido passa para {card.name}, que fica com as capacidades (crédito e/ou
          débito) dos dois — o outro registro é removido.
        </p>

        {otherCards.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            Você precisa de pelo menos mais um cartão cadastrado para mesclar.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-2 max-h-72 overflow-y-auto">
            {otherCards.map((other) => {
              const BankIcon = getBankIcon(other.bankName)
              const capability =
                other.hasCredit && other.hasDebit ? "Crédito + Débito" : other.hasCredit ? "Crédito" : "Débito"
              return (
                <button
                  key={other.id}
                  type="button"
                  onClick={() => onMerge(other.id)}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-[1vw] border-2 border-border bg-background hover:border-primary/50 hover:bg-muted transition-all text-left",
                  )}
                >
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                    style={{ backgroundColor: other.color + "20" }}
                  >
                    <BankIcon size={24} color={other.color} weight="fill" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{other.name}</p>
                    <p className="text-xs text-muted-foreground">•••• {other.lastDigits} • {capability}</p>
                  </div>
                  <ArrowsLeftRight size={18} className="text-muted-foreground shrink-0" weight="bold" />
                </button>
              )
            })}
          </div>
        )}

        <button
          type="button"
          onClick={onClose}
          className="w-full py-3 px-4 rounded-[1vw] border border-border text-foreground font-semibold hover:bg-muted transition-colors"
        >
          Cancelar
        </button>
      </div>
    </div>
  )
}
