"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { AppLayout } from "@/components/layout/app-layout"
import { PageHeader } from "@/components/ui/page-header"
import { getCards, addTransaction } from "@/lib/storage"
import { getBankIcon } from "@/lib/bank-icons"
import { formatCurrency, parseCurrencyInput, formatCurrencyInput } from "@/lib/date-utils"
import { Button } from "@/components/ui/button"
import { ArrowRightIcon, CreditCard, WarningCircle } from "@phosphor-icons/react"
import { cn } from "@/lib/utils"

const QUICK_AMOUNTS = [2, 5, 10, 20, 50, 100, 500, 1000, 2000, 5000]

export default function TransferPage() {
  const router = useRouter()
  const cards = getCards()
  // Filtra apenas cartões de débito
  const debitCards = cards.filter((c) => c.type === "debit")

  const [fromCardId, setFromCardId] = useState("")
  const [toCardId, setToCardId] = useState("")
  const [amount, setAmount] = useState("")
  const [description, setDescription] = useState("")

  const handleQuickAmount = (value: number) => {
    const currentAmount = parseCurrencyInput(amount)
    const newAmount = currentAmount + value
    const cents = Math.round(newAmount * 100).toString()
    setAmount(formatCurrencyInput(cents))
  }

  const handleAmountChange = (value: string) => {
    const onlyNumbers = value.replace(/\D/g, "")
    setAmount(formatCurrencyInput(onlyNumbers))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!fromCardId || !toCardId || !amount) {
      alert("Preencha todos os campos obrigatórios")
      return
    }

    if (fromCardId === toCardId) {
      alert("Selecione contas diferentes")
      return
    }

    const numAmount = parseCurrencyInput(amount)

    if (isNaN(numAmount) || numAmount <= 0) {
      alert("Valor inválido")
      return
    }

    const fromCard = cards.find((c) => c.id === fromCardId)
    const toCard = cards.find((c) => c.id === toCardId)

    // Create expense transaction (money leaving from card)
    addTransaction({
      description: description || `Transferência para ${toCard?.name}`,
      amount: numAmount,
      type: "expense",
      categoryId: "transfer_income",
      date: new Date().toISOString(),
      recurrence: "none",
      cardId: fromCardId,
    })

    // Create income transaction (money entering to card)
    addTransaction({
      description: description || `Transferência de ${fromCard?.name}`,
      amount: numAmount,
      type: "income",
      categoryId: "transfer_expense",
      date: new Date().toISOString(),
      recurrence: "none",
      cardId: toCardId,
    })

    router.push("/")
  }

  // Verifica se existem menos de 2 cartões de débito
  if (debitCards.length < 2) {
    return (
      <AppLayout>
        <PageHeader title="Transferir entre Contas" subtitle="Mova valores entre seus cartões" />
        
        <div className="flex flex-col items-center justify-center py-12 px-4 text-center space-y-6">
          <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center">
            <WarningCircle size={40} className="text-muted-foreground" weight="duotone" />
          </div>
          
          <div className="space-y-2 max-w-sm">
            <h3 className="text-xl font-semibold text-foreground">Transferência indisponível</h3>
            <p className="text-muted-foreground">
              Para realizar transferências entre contas, você precisa ter pelo menos <b>2 contas de débito</b> cadastradas.
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Nota: Cartões de crédito não realizam transferências.
            </p>
          </div>

          <Button 
            onClick={() => router.push("/cards")} 
            className="w-full max-w-xs h-12 rounded-[1vw] font-semibold gap-2 text-background" 
          >
            <CreditCard size={20} weight="bold" />
            Gerenciar Cartões
          </Button>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <PageHeader title="Transferir entre Contas" subtitle="Mova valores entre seus cartões" />

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* From Card */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">De qual conta?</label>
          <div className="grid grid-cols-1 gap-2">
            {debitCards.map((card) => {
              const BankIcon = getBankIcon(card.bankName)
              return (
                <button
                  key={card.id}
                  type="button"
                  onClick={() => setFromCardId(card.id)}
                  className={cn(
                    "flex items-center gap-3 p-4 rounded-[1vw] border-2 transition-all",
                    fromCardId === card.id
                      ? "border-primary bg-primary/5 shadow-sm"
                      : "border-border bg-card hover:bg-muted",
                  )}
                >
                  <div
                    className="w-12 h-12 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: card.color + "20" }}
                  >
                    <BankIcon size={28} color={card.color} weight="fill" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-base font-semibold text-foreground">{card.name}</p>
                    <p className="text-sm text-muted-foreground">•••• {card.lastDigits}</p>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Arrow Indicator */}
        {fromCardId && (
          <div className="flex justify-center">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <ArrowRightIcon size={24} weight="bold" className="text-primary" />
            </div>
          </div>
        )}

        {/* To Card */}
        {fromCardId && (
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Para qual conta?</label>
            <div className="grid grid-cols-1 gap-2">
              {debitCards
                .filter((c) => c.id !== fromCardId)
                .map((card) => {
                  const BankIcon = getBankIcon(card.bankName)
                  return (
                    <button
                      key={card.id}
                      type="button"
                      onClick={() => setToCardId(card.id)}
                      className={cn(
                        "flex items-center gap-3 p-4 rounded-[1vw] border-2 transition-all",
                        toCardId === card.id
                          ? "border-primary bg-primary/5 shadow-sm"
                          : "border-border bg-card hover:bg-muted",
                      )}
                    >
                      <div
                        className="w-12 h-12 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: card.color + "20" }}
                      >
                        <BankIcon size={28} color={card.color} weight="fill" />
                      </div>
                      <div className="flex-1 text-left">
                        <p className="text-base font-semibold text-foreground">{card.name}</p>
                        <p className="text-sm text-muted-foreground">•••• {card.lastDigits}</p>
                      </div>
                    </button>
                  )
                })}
            </div>
          </div>
        )}

        {/* Amount */}
        {toCardId && (
          <>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Valor</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold">R$</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={amount}
                  onChange={(e) => handleAmountChange(e.target.value)}
                  placeholder="0,00"
                  className="w-full pl-12 pr-4 py-3 rounded-[1vw] bg-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary text-lg font-semibold"
                  required
                />
              </div>

              <div className="flex flex-wrap gap-2 mt-2">
                {QUICK_AMOUNTS.map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => handleQuickAmount(value)}
                    className="px-3 py-3 rounded-[1vw] bg-primary text-secondary text-sm font-medium hover:bg-primary/90 transition-colors"
                  >
                    {formatCurrency(value)}
                  </button>
                ))}
              </div>
            </div>

            {/* Description (optional) */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Descrição (opcional)</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ex: Pagamento de aluguel"
                className="w-full px-4 py-3 rounded-[1vw] bg-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </>
        )}

        {/* Submit */}
        {toCardId && (
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              className="flex-1 h-12 rounded-[1vw] bg-transparent"
              onClick={() => router.push("/")}
            >
              Cancelar
            </Button>
            <Button type="submit" className="flex-1 h-12 rounded-[1vw] font-semibold">
              Transferir
            </Button>
          </div>
        )}
      </form>
    </AppLayout>
  )
}