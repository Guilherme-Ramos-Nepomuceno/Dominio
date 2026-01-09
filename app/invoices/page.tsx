"use client"

import { useState } from "react"
import { CreditCardIcon, CalendarIcon, ReceiptIcon, CheckCircle } from "@phosphor-icons/react"
import { getTransactions, getCards, getCategories, markTransactionAsPaid, cancelTransaction } from "@/lib/storage"
import { formatCurrency, formatDate } from "@/lib/date-utils" // Removi getCurrentMonth do import para usar o local seguro
import { PageHeader } from "@/components/ui/page-header"
import { Button } from "@/components/ui/button"
import { getBankIcon } from "@/lib/bank-icons"
import { cn } from "@/lib/utils"
import { AppLayout } from "@/components/layout/app-layout"
import { PeriodSelector } from "@/components/dashboard/period-selector"

export default function InvoicesPage() {
  const [cards] = useState(getCards().filter((c) => c.type === "credit"))

  // 1. FIX: Garante que o mês atual seja gerado corretamente (Mês 0-11 + 1)
  const getSafeCurrentMonth = () => {
    const now = new Date()
    // getMonth() retorna 0 para Jan, então somamos 1
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
  }

  const [selectedMonth, setSelectedMonth] = useState(getSafeCurrentMonth())
  const [transactions, setTransactions] = useState(getTransactions())
  const [selectedCard, setSelectedCard] = useState<string | null>(cards[0]?.id || null)
  const [partialAmount, setPartialAmount] = useState("")
  const categories = getCategories()

  // 2. FIX: Formatação de data segura contra Fuso Horário
  const getFormattedMonthTitle = (monthStr: string) => {
    if (!monthStr) return ""
    const [year, month] = monthStr.split("-").map(Number)
    
    // Cria a data definindo a hora para 12:00 (meio-dia).
    // Isso evita que o fuso horário (GMT-4) volte o dia para o mês anterior.
    // month - 1 é necessário pois o construtor Date usa mês 0-11
    const date = new Date(year, month - 1, 1, 12, 0, 0)
    
    return date.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })
  }

  const cardInvoices = cards.map((card) => {
    const cardTransactions = transactions.filter(
      (t) =>
        t.cardId === card.id &&
        categories.find((c) => c.id === t.categoryId)?.type === "expense"
    )

    const monthTransactions = cardTransactions.filter((t) => t.date.startsWith(selectedMonth))

    const totalInvoice = monthTransactions.reduce((sum, t) => sum + t.amount, 0)
    const pendingTransactions = monthTransactions.filter(t => t.status === "pending")
    const totalPending = pendingTransactions.reduce((sum, t) => sum + t.amount, 0)

    return {
      card,
      transactions: monthTransactions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
      pendingTransactions,
      total: totalInvoice,
      totalPending: totalPending
    }
  })

  const selectedInvoice = cardInvoices.find((inv) => inv.card.id === selectedCard)

  const handlePayFull = () => {
    if (!selectedInvoice || selectedInvoice.pendingTransactions.length === 0) return

    if (confirm(`Deseja pagar o restante da fatura de ${formatCurrency(selectedInvoice.totalPending)}?`)) {
      selectedInvoice.pendingTransactions.forEach((transaction) => {
        markTransactionAsPaid(transaction.id, selectedCard || undefined)
      })
      setTransactions(getTransactions())
      setPartialAmount("")
    }
  }

  const handlePayPartial = () => {
    if (!selectedInvoice || !partialAmount || selectedInvoice.pendingTransactions.length === 0) return

    const amount = Number.parseFloat(partialAmount.replace(/\./g, "").replace(",", "."))
    if (isNaN(amount) || amount <= 0 || amount > selectedInvoice.totalPending) {
      alert("Valor inválido para pagamento parcial")
      return
    }

    let remaining = amount
    const transactionsToPay: string[] = []

    for (const transaction of selectedInvoice.pendingTransactions) {
      if (remaining >= transaction.amount) {
        transactionsToPay.push(transaction.id)
        remaining -= transaction.amount
      } else {
        break
      }
    }

    if (
      transactionsToPay.length > 0 &&
      confirm(`Pagar ${transactionsToPay.length} transações totalizando ${formatCurrency(amount - remaining)}?`)
    ) {
      transactionsToPay.forEach((id) => {
        markTransactionAsPaid(id, selectedCard || undefined)
      })
      setTransactions(getTransactions())
      setPartialAmount("")
    }
  }

  const handleCancelTransaction = (transactionId: string) => {
    if (confirm("Deseja cancelar esta transação?")) {
      cancelTransaction(transactionId)
      setTransactions(getTransactions())
    }
  }

  return (
    <AppLayout>
      <div className="min-h-screen bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 md:pb-8">
          <PageHeader title="Faturas de Cartão" subtitle="Gerencie seus pagamentos de crédito" />

          <PeriodSelector 
            selectedMonth={selectedMonth} 
            onMonthChange={setSelectedMonth} 
            className="mb-6" 
          />

          {cards.length === 0 ? (
            <div className="text-center py-12">
              <CreditCardIcon size={48} className="mx-auto text-muted-foreground mb-4" weight="light" />
              <p className="text-muted-foreground">Nenhum cartão de crédito cadastrado</p>
            </div>
          ) : (
            <div className="space-y-6 mt-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {cardInvoices.map((invoice) => {
                  const BankIcon = getBankIcon(invoice.card.bankName)
                  const isSelected = selectedCard === invoice.card.id

                  return (
                    <button
                      key={invoice.card.id}
                      onClick={() => setSelectedCard(invoice.card.id)}
                      className={cn(
                        "p-4 rounded-2xl border-2 transition-all text-left",
                        isSelected
                          ? "border-primary bg-primary/5 shadow-sm"
                          : "border-border bg-card hover:border-primary/50",
                      )}
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <div
                          className="w-10 h-10 rounded-lg flex items-center justify-center"
                          style={{ backgroundColor: invoice.card.color + "20" }}
                        >
                          <BankIcon size={24} color={invoice.card.color} weight="fill" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-foreground truncate">{invoice.card.name}</p>
                          <p className="text-xs text-muted-foreground">•••• {invoice.card.lastDigits}</p>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Total da Fatura</p>
                        <p className="text-lg font-bold text-foreground">{formatCurrency(invoice.total)}</p>
                        {invoice.totalPending < invoice.total && invoice.totalPending > 0 && (
                             <p className="text-xs text-expense font-medium">Restante: {formatCurrency(invoice.totalPending)}</p>
                        )}
                         {invoice.totalPending === 0 && invoice.total > 0 && (
                             <p className="text-xs text-income font-medium flex items-center gap-1">
                                <CheckCircle size={12} weight="fill"/> Fatura Paga
                             </p>
                        )}
                        
                        <div className="flex items-center justify-between mt-2">
                             {invoice.card.dueDate && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                                <CalendarIcon size={12} />
                                Venc. dia {invoice.card.dueDate}
                            </p>
                            )}
                            <p className="text-xs text-muted-foreground">{invoice.transactions.length} itens</p>
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>

              {selectedInvoice && (
                <div className="space-y-4">
                  {selectedInvoice.totalPending > 0 && (
                    <div className="bg-card rounded-2xl border border-border p-6 space-y-4">
                      <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                        <ReceiptIcon size={24} weight="bold" />
                        Pagar Fatura
                      </h3>

                      <div className="flex flex-col sm:flex-row gap-3">
                        <Button onClick={handlePayFull} className="flex-1 bg-income hover:bg-income/90">
                          Pagar Restante ({formatCurrency(selectedInvoice.totalPending)})
                        </Button>
                      </div>

                      <div className="pt-4 border-t border-border">
                        <label className="text-sm font-medium text-foreground mb-2 block">Pagamento Parcial</label>
                        <div className="flex gap-3">
                          <input
                            type="text"
                            value={partialAmount}
                            onChange={(e) => {
                              const value = e.target.value.replace(/\D/g, "")
                              const formatted = (Number.parseInt(value || "0") / 100).toLocaleString("pt-BR", {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })
                              setPartialAmount(formatted)
                            }}
                            placeholder="0,00"
                            className="flex-1 px-4 py-2 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                          />
                          <Button onClick={handlePayPartial} variant="outline" className="px-6 bg-transparent">
                            Pagar Parcial
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                          Máximo: {formatCurrency(selectedInvoice.totalPending)}
                        </p>
                      </div>
                    </div>
                  )}
                  
                   {selectedInvoice.transactions.length > 0 && selectedInvoice.totalPending === 0 && (
                        <div className="bg-income/10 rounded-2xl border border-income/20 p-4 flex items-center justify-center gap-2 text-income">
                            <CheckCircle size={24} weight="fill" />
                            <span className="font-semibold">Esta fatura está totalmente paga!</span>
                        </div>
                   )}

                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold text-foreground capitalize">
                      {/* Título seguro */}
                      Transações de {getFormattedMonthTitle(selectedMonth)}
                    </h3>

                    {selectedInvoice.transactions.length === 0 ? (
                      <div className="text-center py-12 bg-card rounded-2xl border border-border">
                        <ReceiptIcon size={48} className="mx-auto text-muted-foreground mb-4" weight="light" />
                        <p className="text-muted-foreground">Nenhuma transação nesta fatura</p>
                      </div>
                    ) : (
                      selectedInvoice.transactions.map((transaction) => {
                        const category = categories.find((c) => c.id === transaction.categoryId)
                        const isPaid = transaction.status === "paid"

                        return (
                          <div
                            key={transaction.id}
                            className={cn(
                                "p-4 rounded-2xl bg-card border transition-colors",
                                isPaid ? "border-income/30 bg-income/5 opacity-75" : "border-border hover:border-primary/50"
                            )}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex items-start gap-3 flex-1">
                                <div
                                  className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                                  style={{ backgroundColor: category?.color + "20" }}
                                >
                                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: category?.color }} />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="font-semibold text-foreground truncate">{transaction.description}</p>
                                  <p className="text-sm text-muted-foreground">{category?.name}</p>
                                  <div className="flex items-center gap-2 mt-1">
                                    <p className="text-xs text-muted-foreground">{formatDate(transaction.date)}</p>
                                    {isPaid && (
                                        <span className="text-xs px-2 py-0.5 rounded-full bg-income/20 text-income font-medium flex items-center gap-1">
                                            <CheckCircle size={10} weight="fill"/> Pago
                                        </span>
                                    )}
                                  </div>
                                  
                                  {transaction.installments && transaction.installments > 1 && (
                                    <p className="text-xs text-primary font-medium mt-1">
                                      Parcela {transaction.currentInstallment}/{transaction.installments}
                                    </p>
                                  )}
                                </div>
                              </div>
                              <div className="text-right">
                                <p className={cn("font-bold text-lg", isPaid ? "text-muted-foreground" : "text-expense")}>
                                    -{formatCurrency(transaction.amount)}
                                </p>
                                {!isPaid && (
                                    <Button
                                    onClick={() => handleCancelTransaction(transaction.id)}
                                    variant="outline"
                                    size="sm"
                                    className="mt-2 text-xs border-expense text-expense hover:bg-expense/10"
                                    >
                                    Cancelar
                                    </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        )
                      })
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  )
}