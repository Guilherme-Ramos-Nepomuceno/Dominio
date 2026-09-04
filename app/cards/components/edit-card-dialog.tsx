"use client"

import type React from "react"
import { useState } from "react"
import { XIcon } from "@phosphor-icons/react"
import type { BankName, CardKind, Card } from "@/lib/types"
import { bankLogos, bankColors } from "@/lib/bank-icons"
import { cn } from "@/lib/utils"
import { formatCurrencyInput, parseCurrencyInput } from "@/lib/date-utils"

interface EditCardDialogProps {
  card: Card | null
  onSave: (id: string, updates: Partial<Card>) => void
  onClose: () => void
}

const KIND_OPTIONS: { value: CardKind; label: string }[] = [
  { value: "card", label: "Cartão" },
  { value: "checking", label: "Conta Corrente" },
  { value: "savings", label: "Conta Poupança" },
]

const BANKS: BankName[] = ["nubank", "inter", "itau", "bradesco", "santander", "caixa", "bb", "alelo", "other"]

export function EditCardDialog({ card, onSave, onClose }: EditCardDialogProps) {
  const [name, setName] = useState(card?.name ?? "")
  const [lastDigits, setLastDigits] = useState(card?.lastDigits ?? "")
  const [bankName, setBankName] = useState<BankName>(card?.bankName ?? "nubank")
  const [kind, setKind] = useState<CardKind>(card?.kind ?? "card")
  const [hasCredit, setHasCredit] = useState(card?.hasCredit ?? true)
  const [hasDebit, setHasDebit] = useState(card?.hasDebit ?? false)
  const [limit, setLimit] = useState(card?.limit ? formatCurrencyInput((card.limit * 100).toString()) : "")
  const [dueDate, setDueDate] = useState(card?.dueDate ? String(card.dueDate) : "10")

  if (!card) return null

  const digitsLabel = kind !== "card" ? "Número da Conta" : "Últimos 4 Dígitos"

  const handleKindChange = (value: CardKind) => {
    setKind(value)
    if (value !== "card") {
      setHasCredit(false)
      setHasDebit(true)
    }
  }

  const toggleCredit = () => {
    if (hasCredit && !hasDebit) return
    setHasCredit((v) => !v)
  }

  const toggleDebit = () => {
    if (hasDebit && !hasCredit) return
    setHasDebit((v) => !v)
  }

  const handleLimitChange = (value: string) => {
    const onlyNumbers = value.replace(/\D/g, "")
    setLimit(formatCurrencyInput(onlyNumbers))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    onSave(card.id, {
      name,
      lastDigits,
      bankName,
      hasCredit,
      hasDebit,
      kind,
      color: bankColors[bankName],
      limit: hasCredit ? (limit ? parseCurrencyInput(limit) : undefined) : undefined,
      dueDate: hasCredit ? Number.parseInt(dueDate) : undefined,
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-100 flex items-end md:items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-card w-full max-w-md rounded-t-3xl md:rounded-3xl p-6 space-y-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-foreground">Editar Cartão</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-muted transition-colors">
            <XIcon size={20} weight="bold" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
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
            <label className="text-sm font-medium text-foreground">{digitsLabel} (últimos 4)</label>
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
              {BANKS.map((bank) => (
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
                      ? { borderColor: bankColors[bank], backgroundColor: bankColors[bank] + "20", color: bankColors[bank] }
                      : {}
                  }
                >
                  {bankLogos[bank]}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">O que é este registro?</label>
            <div className="grid grid-cols-3 gap-2">
              {KIND_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleKindChange(option.value)}
                  className={cn(
                    "p-3 rounded-[1vw] border-2 transition-all text-xs font-medium",
                    kind === option.value
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-card text-muted-foreground",
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {kind === "card" && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Este cartão é crédito, débito, ou os dois?
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={toggleCredit}
                  className={cn(
                    "p-3 rounded-[1vw] border-2 transition-all font-medium",
                    hasCredit ? "border-primary bg-primary/10 text-primary" : "border-border bg-card text-muted-foreground",
                  )}
                >
                  Crédito
                </button>
                <button
                  type="button"
                  onClick={toggleDebit}
                  className={cn(
                    "p-3 rounded-[1vw] border-2 transition-all font-medium",
                    hasDebit ? "border-primary bg-primary/10 text-primary" : "border-border bg-card text-muted-foreground",
                  )}
                >
                  Débito
                </button>
              </div>
              {hasCredit && hasDebit && (
                <p className="text-xs text-muted-foreground">
                  Este cartão poderá ser usado tanto no crédito quanto no débito — ao lançar uma transação, você escolhe qual dos dois.
                </p>
              )}
            </div>
          )}

          {hasCredit && (
            <>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Limite (opcional)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold">R$</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={limit}
                    onChange={(e) => handleLimitChange(e.target.value)}
                    placeholder="0,00"
                    className="w-full pl-12 pr-4 py-3 rounded-[1vw] bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary text-lg font-semibold"
                  />
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

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 px-4 rounded-[1vw] border border-border text-foreground font-semibold hover:bg-muted transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 py-3 px-4 rounded-[1vw] bg-primary text-background font-semibold hover:bg-primary/90 transition-colors"
            >
              Salvar Alterações
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
