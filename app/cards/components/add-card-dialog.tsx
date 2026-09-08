"use client"

import type React from "react"
import { useState } from "react"
import { XIcon } from "@phosphor-icons/react"
import { addCard } from "@/lib/storage"
import type { BankName, CardKind } from "@/lib/types"
import { bankLogos, bankColors } from "@/lib/bank-icons"
import { cn } from "@/lib/utils"
import { formatCurrencyInput, parseCurrencyInput } from "@/lib/date-utils"
import { useToast } from "@/hooks/use-toast"

interface AddCardDialogProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

const KIND_OPTIONS: { value: CardKind; label: string }[] = [
  { value: "card", label: "Cartão" },
  { value: "checking", label: "Conta Corrente" },
  { value: "savings", label: "Conta Poupança" },
]

export function AddCardDialog({ isOpen, onClose, onSuccess }: AddCardDialogProps) {
  const [name, setName] = useState("")
  const [lastDigits, setLastDigits] = useState("")
  const [bankName, setBankName] = useState<BankName>("nubank")
  const [kind, setKind] = useState<CardKind>("card")
  // Contas (corrente/poupança) são sempre só débito — sem linha de crédito própria.
  const [hasCredit, setHasCredit] = useState(true)
  const [hasDebit, setHasDebit] = useState(false)
  const [limit, setLimit] = useState("")
  const [dueDate, setDueDate] = useState("10")
  const [closingDate, setClosingDate] = useState("3")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()

  if (!isOpen) return null

  const isAccount = kind !== "card"
  const digitsLabel = isAccount ? "Número da Conta" : "Últimos 4 Dígitos"

  const handleKindChange = (value: CardKind) => {
    setKind(value)
    if (value !== "card") {
      setHasCredit(false)
      setHasDebit(true)
    }
  }

  const toggleCredit = () => {
    if (hasCredit && !hasDebit) return // precisa ter pelo menos um marcado
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isSubmitting) return

    setIsSubmitting(true)
    try {
      await addCard({
        name,
        lastDigits,
        bankName,
        hasCredit,
        hasDebit,
        kind,
        color: bankColors[bankName],
        limit: hasCredit ? (limit ? parseCurrencyInput(limit) : undefined) : undefined,
        dueDate: hasCredit ? Number.parseInt(dueDate) : undefined,
        closingDate: hasCredit ? Number.parseInt(closingDate) : undefined,
      })

      setName("")
      setLastDigits("")
      setKind("card")
      setHasCredit(true)
      setHasDebit(false)
      setLimit("")
      setDueDate("10")
      setClosingDate("3")
      onSuccess()
      onClose()
    } catch (error: any) {
      toast({
        title: "Não foi possível cadastrar",
        description: error.message || "Tente novamente em instantes.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const banks: BankName[] = ["nubank", "inter", "itau", "bradesco", "santander", "caixa", "bb", "alelo", "other"]

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-black/50">
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
            <label className="text-sm font-medium text-foreground">O que você está cadastrando?</label>
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
                    hasCredit
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-card text-muted-foreground",
                  )}
                >
                  Crédito
                </button>
                <button
                  type="button"
                  onClick={toggleDebit}
                  className={cn(
                    "p-3 rounded-[1vw] border-2 transition-all font-medium",
                    hasDebit
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-card text-muted-foreground",
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
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold">
                    R$
                  </span>
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

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Dia de Fechamento</label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={closingDate}
                    onChange={(e) => setClosingDate(e.target.value)}
                    placeholder="3"
                    className="w-full px-4 py-3 rounded-[1vw] bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
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
                </div>
              </div>
              <p className="text-xs text-muted-foreground -mt-4">
                Compras a partir do dia {closingDate} entram na fatura do mês seguinte, que vence dia {dueDate}
              </p>
            </>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 rounded-[1vw] bg-primary text-background font-semibold hover:opacity-90 transition-opacity disabled:opacity-60"
          >
            {isSubmitting ? "Salvando..." : "Adicionar Cartão"}
          </button>
        </form>
      </div>
    </div>
  )
}
