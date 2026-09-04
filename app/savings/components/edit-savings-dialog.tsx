"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { X, Heart } from "@phosphor-icons/react"
import { formatCurrencyInput, parseCurrencyInput } from "@/lib/date-utils"
import { cn } from "@/lib/utils"
import { getCards } from "@/lib/storage"
import type { Card } from "@/lib/types"
import { getBankIcon } from "@/lib/bank-icons"
import { SAVINGS_ICON_OPTIONS } from "@/lib/savings-icons"
import { useAccount } from "@/components/account/account-context"

interface EditSavingsDialogProps {
  goal: any
  onSave: (id: string, updates: any) => void
  onClose: () => void
}

export function EditSavingsDialog({ goal, onSave, onClose }: EditSavingsDialogProps) {
  const [name, setName] = useState(goal.name)
  const [targetAmount, setTargetAmount] = useState(formatCurrencyInput((goal.targetAmount * 100).toString()))
  const [selectedIcon, setSelectedIcon] = useState(goal.icon)
  const [selectedCardId, setSelectedCardId] = useState(goal.cardId || "")
  const [isCasal, setIsCasal] = useState(!!goal.isCasal)
  const [cards, setCards] = useState<Card[]>([])
  const { family } = useAccount()
  const hasCoupleAccount = !!family?.members?.some((m) => m.accountType === "COUPLE")

  // Uma reserva sempre precisa de um cartão com débito — o backend exige isso.
  const debitCards = cards.filter((card) => card.hasDebit)

  useEffect(() => {
    getCards().then(setCards)
  }, [])

  const handleTargetChange = (value: string) => {
    const onlyNumbers = value.replace(/\D/g, "")
    setTargetAmount(formatCurrencyInput(onlyNumbers))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const target = parseCurrencyInput(targetAmount)

    if (!name.trim() || isNaN(target) || target <= 0) {
      alert("Preencha todos os campos corretamente")
      return
    }

    if (!selectedCardId) {
      alert("Selecione o cartão da reserva")
      return
    }

    onSave(goal.id, {
      name: name.trim(),
      targetAmount: target,
      icon: selectedIcon,
      cardId: selectedCardId,
      isCasal,
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-100 flex items-end md:items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-card w-full max-w-md rounded-t-3xl md:rounded-3xl p-6 space-y-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-foreground">Editar Reserva</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-muted transition-colors">
            <X size={20} weight="bold" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Name */}
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">Nome da Reserva</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Viagem, Emergência..."
              className="w-full px-4 py-3 rounded-[1vw] bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              required
            />
          </div>

          {/* Target Amount */}
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">Meta de Valor</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold">R$</span>
              <input
                type="text"
                inputMode="decimal"
                value={targetAmount}
                onChange={(e) => handleTargetChange(e.target.value)}
                placeholder="0,00"
                className="w-full pl-12 pr-4 py-3 rounded-[1vw] bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                required
              />
            </div>
          </div>

          {/* Tag "do casal" — reserva entra inteira (com todo o histórico) na conta do casal;
              só mostra se existir mesmo uma conta do casal */}
          {hasCoupleAccount && (
          <button
            type="button"
            onClick={() => setIsCasal(!isCasal)}
            className={cn(
              "w-full flex items-center gap-3 p-4 rounded-[1vw] border transition-all text-left",
              isCasal
                ? "border-primary bg-primary/10"
                : "border-black/10 dark:border-white/10 bg-black/2 dark:bg-white/3 hover:bg-black/4 dark:hover:bg-white/6",
            )}
          >
            <div className={cn("w-10 h-10 flex items-center justify-center shrink-0 rounded-lg", isCasal ? "text-primary" : "text-muted-foreground")}>
              <Heart size={22} weight={isCasal ? "fill" : "duotone"} />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">Reserva do casal</p>
              <p className="text-xs text-muted-foreground">Aparece inteira, com todo o saldo, na conta do casal</p>
            </div>
            <div className={cn("w-11 h-6 rounded-full transition-colors shrink-0 relative", isCasal ? "bg-primary" : "bg-muted")}>
              <div className={cn("absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all", isCasal ? "left-5" : "left-0.5")} />
            </div>
          </button>
          )}

          {/* Icon Selection */}
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">Ícone</label>
            <div className="grid grid-cols-6 gap-2">
              {SAVINGS_ICON_OPTIONS.map(({ name: iconName, Icon }) => (
                <button
                  key={iconName}
                  type="button"
                  onClick={() => setSelectedIcon(iconName)}
                  className={cn(
                    "w-10 h-10 rounded-lg flex items-center justify-center transition-all",
                    selectedIcon === iconName
                      ? "text-primary ring-2 ring-primary/40 scale-110"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Icon size={22} weight="duotone" />
                </button>
              ))}
            </div>
          </div>

          {/* Card Selection */}
          {debitCards.length === 0 ? (
            <div className="p-4 rounded-[1vw] bg-warning/10 border border-warning/20 space-y-2">
              <p className="text-sm text-warning font-medium">
                Você precisa de um cartão com débito cadastrado para ter uma reserva.
              </p>
            </div>
          ) : (
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">Cartão</label>
              <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto">
                {debitCards.map((card) => {
                  const BankIcon = getBankIcon(card.bankName)
                  return (
                    <button
                      key={card.id}
                      type="button"
                      onClick={() => setSelectedCardId(card.id)}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-[1vw] border-2 transition-all",
                        selectedCardId === card.id
                          ? "border-primary bg-primary/5"
                          : "border-border bg-background hover:bg-muted",
                      )}
                    >
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: card.color + "20" }}
                      >
                        <BankIcon size={24} color={card.color} weight="fill" />
                      </div>
                      <div className="flex-1 text-left">
                        <p className="text-sm font-medium text-foreground">{card.name}</p>
                        <p className="text-xs text-muted-foreground">•••• {card.lastDigits}</p>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={debitCards.length === 0}
            className="w-full py-3 px-4 bg-primary text-primary-foreground rounded-[1vw] font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-primary"
          >
            Salvar Alterações
          </button>
        </form>
      </div>
    </div>
  )
}
