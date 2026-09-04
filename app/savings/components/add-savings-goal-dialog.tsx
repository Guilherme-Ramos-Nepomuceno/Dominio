"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { X, Heart } from "@phosphor-icons/react"
import { cn } from "@/lib/utils"
import { formatCurrencyInput, parseCurrencyInput } from "@/lib/date-utils"
import { getCards } from "@/lib/storage"
import type { Card } from "@/lib/types"
import { SAVINGS_ICON_OPTIONS } from "@/lib/savings-icons"
import { useAccount } from "@/components/account/account-context"

interface AddSavingsGoalDialogProps {
  isOpen: boolean
  onClose: () => void
  onAdd: (goal: { name: string; targetAmount: number; color: string; icon: string; cardId: string; isCasal?: boolean }) => void
}

// Reservas não têm mais cor própria na interface (mesmo tratamento das categorias)
// — este valor só preenche o campo obrigatório do backend.
const DEFAULT_GOAL_COLOR = "#71717a"

export function AddSavingsGoalDialog({ isOpen, onClose, onAdd }: AddSavingsGoalDialogProps) {
  const [name, setName] = useState("")
  const [targetAmount, setTargetAmount] = useState("")
  const [selectedIcon, setSelectedIcon] = useState<string>(SAVINGS_ICON_OPTIONS[0].name)
  const [selectedCardId, setSelectedCardId] = useState<string>("")
  const [isCasal, setIsCasal] = useState(false)
  const [cards, setCards] = useState<Card[]>([])
  const { family } = useAccount()
  const hasCoupleAccount = !!family?.members?.some((m) => m.accountType === "COUPLE")

  // Uma reserva sempre precisa de um cartão com débito — o backend exige isso
  // (não dá pra guardar dinheiro num cartão só-crédito). Pré-seleciona o
  // primeiro assim que a lista carrega, pra não deixar o campo vazio.
  const debitCards = cards.filter((card) => card.hasDebit)

  useEffect(() => {
    if (isOpen) {
      getCards().then((allCards) => setCards(allCards))
    }
  }, [isOpen])

  useEffect(() => {
    if (!selectedCardId && debitCards.length > 0) {
      setSelectedCardId(debitCards[0].id)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cards])

  if (!isOpen) return null

  const handleAmountChange = (value: string) => {
    const onlyNumbers = value.replace(/\D/g, "")
    setTargetAmount(formatCurrencyInput(onlyNumbers))
  }

  const handleSubmit = () => {
    if (!name || !targetAmount) {
      alert("Preencha todos os campos")
      return
    }

    if (!selectedCardId) {
      alert("Selecione o cartão da reserva")
      return
    }

    const amount = parseCurrencyInput(targetAmount)
    if (isNaN(amount) || amount <= 0) {
      alert("Valor inválido")
      return
    }

    onAdd({
      name,
      targetAmount: amount,
      color: DEFAULT_GOAL_COLOR,
      icon: selectedIcon,
      cardId: selectedCardId,
      isCasal,
    })

    setName("")
    setTargetAmount("")
    setSelectedIcon(SAVINGS_ICON_OPTIONS[0].name)
    setSelectedCardId("")
    setIsCasal(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-100 flex items-end md:items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-card w-full max-w-md rounded-t-3xl md:rounded-3xl p-6 space-y-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-foreground">Nova Reserva</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-muted transition-colors">
            <X size={20} weight="bold" />
          </button>
        </div>

        {/* Name */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Nome da Reserva</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex: Viagem, Emergência, Carro novo..."
            className="w-full px-4 py-3 rounded-[1vw] bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        {/* Target Amount */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Valor da Meta</label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold">R$</span>
            <input
              type="text"
              inputMode="decimal"
              value={targetAmount}
              onChange={(e) => handleAmountChange(e.target.value)}
              placeholder="0,00"
              className="w-full pl-12 pr-4 py-3 rounded-[1vw] bg-background border border-border text-foreground text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Cartão</label>
          {debitCards.length === 0 ? (
            <div className="p-4 rounded-[1vw] bg-warning/10 border border-warning/20 space-y-2">
              <p className="text-sm text-warning font-medium">
                Você precisa de um cartão com débito cadastrado para criar uma reserva.
              </p>
              <Link href="/cards" className="text-sm text-primary font-semibold hover:underline">
                Cadastrar cartão →
              </Link>
            </div>
          ) : (
            <>
              <select
                value={selectedCardId}
                onChange={(e) => setSelectedCardId(e.target.value)}
                className="w-full px-4 py-3 rounded-[1vw] bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                required
              >
                {debitCards.map((card) => (
                  <option key={card.id} value={card.id}>
                    {card.name} (••• {card.lastDigits})
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">
                De onde o dinheiro da reserva vai sair/entrar — só cartões com débito podem guardar reservas
              </p>
            </>
          )}
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

        {/* Icon Picker */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Ícone</label>
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

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 px-4 rounded-[1vw] border border-border text-foreground font-semibold hover:bg-muted transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={debitCards.length === 0}
            className="flex-1 py-3 px-4 rounded-[1vw] bg-primary text-background font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-primary"
          >
            Criar Reserva
          </button>
        </div>
      </div>
    </div>
  )
}
