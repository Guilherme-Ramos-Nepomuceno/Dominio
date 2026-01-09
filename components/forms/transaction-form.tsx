"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { 
  ArrowUpIcon, 
  ArrowDownIcon, 
  CalendarIcon, 
  CreditCardIcon, 
  TagIcon, 
  WalletIcon, 
  RepeatIcon,
  WarningCircle, // Importando ícone de aviso
  PlusCircle // Importando ícone de adicionar
} from "@phosphor-icons/react"
import { addTransaction, getCategories, getCards, getTransactions } from "@/lib/storage"
import type { TransactionType, RecurrenceType } from "@/lib/types"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { getBankIcon } from "@/lib/bank-icons"
import { formatCurrency, parseCurrencyInput, formatCurrencyInput } from "@/lib/date-utils"

const recurrenceOptions: { value: RecurrenceType; label: string }[] = [
  { value: "none", label: "Única" },
  { value: "daily", label: "Diária" },
  { value: "weekly", label: "Semanal" },
  { value: "monthly", label: "Mensal" },
  { value: "yearly", label: "Anual" },
]

const QUICK_AMOUNTS = [2, 5, 10, 20, 50, 100]

export function TransactionForm() {
  const router = useRouter()
  const categories = getCategories()
  const cards = getCards()

  // Verifica se existe cartão de débito
  const hasDebitCard = cards.some((c) => c.type === "debit")

  const [type, setType] = useState<TransactionType>("expense")
  const [description, setDescription] = useState("")
  const [amount, setAmount] = useState("")
  const [categoryId, setCategoryId] = useState("")
  const [date, setDate] = useState(new Date().toISOString().split("T")[0])
  const [recurrence, setRecurrence] = useState<RecurrenceType>("none")
  const [installments, setInstallments] = useState("1")
  const [cardId, setCardId] = useState<string>("")

  const filteredCategories = categories.filter((cat) => cat.type === type)

  const selectedDate = new Date(date)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  const selectedDateStr = date;
  const todayStr = new Date().toISOString().split("T")[0];
  const isFutureTransaction = selectedDateStr > todayStr;

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

    // Bloqueio extra no submit caso o usuário tente burlar
    if (type === "income" && !hasDebitCard) {
      alert("Você precisa cadastrar uma conta/cartão de débito para receber valores.")
      return
    }

    if (!description || !amount || !categoryId) {
      alert("Preencha todos os campos obrigatórios")
      return
    }

    const numAmount = parseCurrencyInput(amount)
    const numInstallments = Number.parseInt(installments)

    if (isNaN(numAmount) || numAmount <= 0) {
      alert("Valor inválido")
      return
    }

    const selectedCard = cardId ? cards.find((c) => c.id === cardId) : null
    const isCreditCard = selectedCard?.type === "credit"

    if (isCreditCard && selectedCard?.limit) {
      const transactions = getTransactions().filter(
        (t) => t.cardId === cardId && (t.status === "paid" || t.status === "pending") && t.type === "expense",
      )
      const usedAmount = transactions.reduce((sum, t) => sum + t.amount, 0)
      const availableLimit = selectedCard.limit - usedAmount

      if (numAmount > availableLimit) {
        alert(
          `Limite insuficiente no cartão ${selectedCard.name}.\n` +
            `Limite disponível: ${formatCurrency(availableLimit)}\n` +
            `Valor da transação: ${formatCurrency(numAmount)}`,
        )
        return
      }
    }

    if (!isFutureTransaction && !isCreditCard && !cardId && cards.length > 0 && type === "expense") {
      alert("Selecione um cartão para despesas atuais")
      return
    }

    const status = isCreditCard || isFutureTransaction ? "pending" : "paid"

    addTransaction({
      description,
      amount: numAmount,
      type,
      categoryId,
      date: new Date(date).toISOString(),
      recurrence,
      installments: recurrence === "none" && numInstallments > 1 ? numInstallments : undefined,
      cardId: cardId || undefined,
      status: status, 
    })

    router.push("/")
  }

  // Se for Receita E não tiver cartão de débito, mostramos o aviso bloqueante
  const showIncomeWarning = type === "income" && !hasDebitCard;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Type Toggle */}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => setType("expense")}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-4 px-6 rounded-2xl font-semibold transition-all",
            type === "expense"
              ? "bg-expense text-white shadow-lg"
              : "bg-card text-muted-foreground border border-border hover:bg-muted",
          )}
        >
          <ArrowDownIcon weight="bold" size={20} />
          Despesa
        </button>

        <button
          type="button"
          onClick={() => setType("income")}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-4 px-6 rounded-2xl font-semibold transition-all",
            type === "income"
              ? "bg-income text-white shadow-lg"
              : "bg-card text-muted-foreground border border-border hover:bg-muted",
          )}
        >
          <ArrowUpIcon weight="bold" size={20} />
          Receita
        </button>
      </div>

      {/* BLOCO DE AVISO - Se não tiver conta para receber */}
      {showIncomeWarning ? (
        <div className="flex flex-col items-center justify-center py-8 px-4 text-center space-y-6 bg-card border border-border rounded-[20px]">
          <div className="w-16 h-16 rounded-full bg-warning/10 flex items-center justify-center">
            <WarningCircle size={32} className="text-warning" weight="duotone" />
             
          </div>
          
          <div className="space-y-2 max-w-sm">
            <h3 className="text-lg font-semibold text-foreground">Conta necessária</h3>
            <p className="text-muted-foreground text-sm">
              Para registrar uma <b>Receita</b>, você precisa ter ao menos uma conta (cartão de débito) cadastrada para onde o dinheiro irá.
            </p>
          </div>

          <Button 
            type="button"
            onClick={() => router.push("/cards")} 
            className="w-full max-w-xs h-12 rounded-[1vw] font-semibold gap-2"
          >
            <PlusCircle size={20} weight="bold" />
            Cadastrar Conta
          </Button>
          
          <Button
            type="button"
            variant="ghost"
            onClick={() => router.push("/")}
            className="text-sm text-muted-foreground"
          >
            Voltar
          </Button>
        </div>
      ) : (
        /* Renderiza o formulário normal se tiver cartão ou for despesa */
        <>
          {/* Description */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground flex items-center gap-2">
              <TagIcon size={16} weight="bold" />
              Descrição
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex: Almoço, Salário, Conta de luz..."
              className="w-full px-4 py-3 rounded-[1vw] bg-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              required
            />
          </div>

          {/* Amount */}
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

          {/* Category */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Categoria</label>
            <div className="grid grid-cols-2 gap-3">
              {filteredCategories.map((category) => (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => setCategoryId(category.id)}
                  className={cn(
                    "flex items-center gap-3 p-4 rounded-[1vw] border-2 transition-all",
                    categoryId === category.id
                      ? "border-primary bg-primary/5 shadow-sm"
                      : "border-border bg-card hover:bg-muted",
                  )}
                >
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: category.color + "20" }}
                  >
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: category.color }} />
                  </div>
                  <span className="text-sm font-medium text-foreground">{category.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Card */}
          {cards.length > 0 && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground flex items-center gap-2">
                <WalletIcon size={16} weight="bold" />
                Conta/Cartão {isFutureTransaction ? "(opcional para futuras)" : ""}
              </label>
              <div className="grid grid-cols-1 gap-2">
                {cards
                  // Se for Receita, filtramos para mostrar APENAS cartões de débito
                  // Se for Despesa, mostramos todos
                  .filter(c => type === 'expense' || c.type === 'debit')
                  .map((card) => {
                  const BankIcon = getBankIcon(card.bankName)
                  return (
                    <button
                      key={card.id}
                      type="button"
                      onClick={() => setCardId(cardId === card.id ? "" : card.id)}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-[1vw] border-2 transition-all",
                        cardId === card.id
                          ? "border-primary bg-primary/5 shadow-sm"
                          : "border-border bg-card hover:bg-muted",
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
                        <p className="text-xs text-muted-foreground">
                          •••• {card.lastDigits} {card.type === "credit" && " • Crédito"}
                        </p>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Date */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground flex items-center gap-2">
              <CalendarIcon size={16} weight="bold" />
              Data
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-4 py-3 rounded-[1vw] bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              required
            />
          </div>

          {/* Recurrence */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground flex items-center gap-2">
              <RepeatIcon size={16} weight="bold" />
              Recorrência
            </label>
            <select
              value={recurrence}
              onChange={(e) => setRecurrence(e.target.value as RecurrenceType)}
              className="w-full px-4 py-3 rounded-[1vw] bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {recurrenceOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Installments (only for non-recurring) */}
          {recurrence === "none" && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground flex items-center gap-2">
                <CreditCardIcon size={16} weight="bold" />
                Parcelas
              </label>
              <input
                type="number"
                min="1"
                max="60"
                value={installments}
                onChange={(e) => setInstallments(e.target.value)}
                className="w-full px-4 py-3 rounded-[1vw] bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
              {Number.parseInt(installments) > 1 && (
                <p className="text-xs text-muted-foreground">
                  {installments}x de {formatCurrency(parseCurrencyInput(amount) / Number.parseInt(installments) || 0)}
                </p>
              )}
            </div>
          )}

          {(isFutureTransaction || (cardId && cards.find((c) => c.id === cardId)?.type === "credit")) && (
            <div className="p-4 rounded-[1vw] bg-primary/10 border border-primary/20">
              <p className="text-sm text-primary font-medium">
                {cardId && cards.find((c) => c.id === cardId)?.type === "credit"
                  ? "Compra no crédito: Será registrada como fatura pendente e não afetará seu saldo até o pagamento da fatura."
                  : "Transação futura: Será registrada como pendente e não afetará seu saldo até ser marcada como paga."}
              </p>
            </div>
          )}

          {/* Submit Button */}
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
              Salvar Transação
            </Button>
          </div>
        </>
      )}
    </form>
  )
}