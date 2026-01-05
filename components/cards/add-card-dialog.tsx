"use client"

import type React from "react"
import { useState } from "react"
import { XIcon } from "@phosphor-icons/react"
import { addCard } from "@/lib/storage"
import type { BankName, CardType } from "@/lib/types"
import { bankLogos, bankColors } from "@/lib/bank-icons"
import { cn } from "@/lib/utils"
import { formatCurrency, formatCurrencyInput, parseCurrencyInput } from "@/lib/date-utils"

interface AddCardDialogProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

const QUICK_AMOUNTS = [1000, 2000, 5000, ]

export function AddCardDialog({ isOpen, onClose, onSuccess }: AddCardDialogProps) {
  const [name, setName] = useState("")
  const [lastDigits, setLastDigits] = useState("")
  const [bankName, setBankName] = useState<BankName>("nubank")
  const [cardType, setCardType] = useState<CardType>("credit")
  const [limit, setLimit] = useState("")
  const [dueDate, setDueDate] = useState("10")

  if (!isOpen) return null

  const handleQuickAmount = (value: number) => {
    const currentAmount = parseCurrencyInput(limit)
    const newAmount = currentAmount + value
    const cents = Math.round(newAmount * 100).toString()
    setLimit(formatCurrencyInput(cents))
  }

  const handleLimitChange = (value: string) => {
    const onlyNumbers = value.replace(/\D/g, "")
    setLimit(formatCurrencyInput(onlyNumbers))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    addCard({
      name, // Changed from 'name' to 'nickname'
      lastDigits,
      bankName, // Changed from 'bankName' to 'bank'
      type: cardType,
      color: bankColors[bankName],
      limit: limit ? parseCurrencyInput(limit) : undefined,
      dueDate: cardType === "credit" ? Number.parseInt(dueDate) : undefined,
    })

    setName("")
    setLastDigits("")
    setLimit("")
    setDueDate("10")
    onSuccess()
    onClose()
  }

  const banks: BankName[] = ["nubank", "inter", "itau", "bradesco", "santander", "caixa", "bb", "alelo", "other"]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-card rounded-3xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-card border-b border-border px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-foreground">Novo Cartão</h2>
          <button onClick={onClose} className="p-2 rounded-[1vw] hover:bg-muted transition-colors">
            <XIcon size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Nome do Cartão</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Cartão Principal"
              required
              className="w-full px-4 py-3 rounded-[1vw] bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Últimos 4 Dígitos</label>
            <input
              type="text"
              value={lastDigits}
              onChange={(e) => setLastDigits(e.target.value.replace(/\D/g, "").slice(0, 4))}
              placeholder="1234"
              required
              maxLength={4}
              className="w-full px-4 py-3 rounded-[1vw] bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Banco</label>
            <div className="grid grid-cols-4 gap-2">
              {banks.map((bank) => (
                <button
                  key={bank}
                  type="button"
                  onClick={() => setBankName(bank)}
                  className={cn(
                    "p-3 rounded-[1vw] border-2 transition-all text-xs font-semibold",
                    bankName === bank
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-card text-muted-foreground hover:border-primary/50",
                  )}
                  style={
                    bankName === bank
                      ? {
                          borderColor: bankColors[bank],
                          backgroundColor: bankColors[bank] + "20",
                          color: bankColors[bank],
                        }
                      : {}
                  }
                >
                  {bankLogos[bank]}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Tipo</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setCardType("credit")}
                className={cn(
                  "p-3 rounded-[1vw] border-2 transition-all font-medium",
                  cardType === "credit"
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-card text-muted-foreground",
                )}
              >
                Crédito
              </button>
              <button
                type="button"
                onClick={() => setCardType("debit")}
                className={cn(
                  "p-3 rounded-[1vw] border-2 transition-all font-medium",
                  cardType === "debit"
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-card text-muted-foreground",
                )}
              >
                Débito
              </button>
            </div>
          </div>

          {cardType === "credit" && (
            <>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Limite (opcional)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold">
                    R$
                  </span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={limit}
                    onChange={(e) => handleLimitChange(e.target.value)}
                    placeholder="0,00"
                    className="w-full pl-12 pr-4 py-3 rounded-[1vw] bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary text-lg font-semibold"
                  />
                </div>

                <div className="flex flex-wrap mt-2 justify-evenly mx-5">
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

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Dia de Vencimento</label>
                <input
                  type="number"
                  min="1"
                  max="31"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  placeholder="10"
                  className="w-full px-4 py-3 rounded-[1vw] bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <p className="text-xs text-muted-foreground">A fatura vence no dia {dueDate} de cada mês</p>
              </div>
            </>
          )}

          <button
            type="submit"
            className="w-full py-3 rounded-[1vw] bg-primary text-primary-foreground font-semibold hover:opacity-90 transition-opacity"
          >
            Adicionar Cartão
          </button>
        </form>
      </div>
    </div>
  )
}
