"use client"

import { useState, useMemo, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Clock, CheckCircle, XCircle, Wallet, CalendarCheck } from "@phosphor-icons/react"
import {
  getPendingTransactions,
  getCategories,
  markTransactionAsPaid,
  cancelTransaction,
  getCards,
} from "@/lib/storage"
import { formatCurrency, formatDate } from "@/lib/date-utils"
import { PageHeader } from "@/components/ui/page-header"
import { Button } from "@/components/ui/button"
import { getBankIcon } from "@/lib/bank-icons"
import { cn } from "@/lib/utils"
import { AppLayout } from "@/components/layout/app-layout"

interface Transaction {
  id: string
  description: string
  amount: number
  date: string
  categoryId: string
  type: "income" | "expense"
  recurrence?: string
  recurrenceId?: string
  installments?: number
  currentInstallment?: number
  cardId?: string
}

export default function PendingTransactionsPage() {
  const router = useRouter()
  // @ts-ignore
  const [pendingTransactions, setPendingTransactions] = useState<Transaction[]>(getPendingTransactions())
  
  const [selectedTransaction, setSelectedTransaction] = useState<string | null>(null)
  const [selectedCard, setSelectedCard] = useState<string>("")
  
  // NOVO ESTADO: Data de confirmação do pagamento
  const [confirmDate, setConfirmDate] = useState<string>("")

  const categories = getCategories()
  const cards = getCards()

  const visibleTransactions = useMemo(() => {
    const grouped = new Map<string, Transaction>()
    const singles: Transaction[] = []

    const filteredTransactions = pendingTransactions.filter((t) => {
      if (!t.cardId) return true 
      const card = cards.find((c) => c.id === t.cardId)
      return card?.type !== "credit" 
    })

    filteredTransactions.forEach((t) => {
      const isRecurring = t.recurrence && t.recurrence !== "none"
      const isInstallment = t.installments && t.installments > 1

      if (!isRecurring && !isInstallment) {
        singles.push(t)
        return
      }

      const groupId = t.recurrenceId || t.description
      const existing = grouped.get(groupId)

      if (!existing || new Date(t.date) < new Date(existing.date)) {
        grouped.set(groupId, t)
      }
    })

    return [...singles, ...Array.from(grouped.values())].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    )
  }, [pendingTransactions, cards]) 

  const handleMarkAsPaid = (transactionId: string) => {
    const transaction = pendingTransactions.find((t) => t.id === transactionId)
    
    if (transaction) {
        // Se já tem cartão, seleciona
        if (transaction.cardId) setSelectedCard(transaction.cardId)
        else setSelectedCard("")

        // DEFINE A DATA INICIAL:
        // Aqui você escolhe a estratégia:
        // Opção A: Pega a data original da transação (respeita o agendamento)
        // Opção B: Pega a data de hoje (assume que está pagando agora)
        
        // Estou usando a Data Original da transação (t.date) para atender seu pedido
        // de "não mudar a data automaticamente para o momento do clique".
        // O .split('T')[0] é para formatar YYYY-MM-DD para o input
        setConfirmDate(transaction.date.split('T')[0])
    }
    
    setSelectedTransaction(transactionId)
  }

  const confirmPayment = () => {
    if (!selectedTransaction) return

    if (cards.length > 0 && !selectedCard) {
      alert("Selecione uma conta/cartão para confirmar onde o dinheiro saiu/entrou")
      return
    }

    // Passamos a confirmDate para a função de storage
    markTransactionAsPaid(selectedTransaction, selectedCard || undefined, confirmDate)
    
    setPendingTransactions(getPendingTransactions())
    setSelectedTransaction(null)
    setSelectedCard("")
    setConfirmDate("")
  }

  const handleCancel = (transactionId: string) => {
    if (confirm("Tem certeza que deseja cancelar esta transação?")) {
      cancelTransaction(transactionId)
      setPendingTransactions(getPendingTransactions())
    }
  }

  return (
    <AppLayout>
      <div className="min-h-screen bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 md:pb-8">
          <PageHeader 
            title="Contas a Pagar/Receber" 
            subtitle="Confirme seus pagamentos e recebimentos"
          />

          <div className="space-y-4 mt-6">
            {visibleTransactions.length === 0 ? (
              <div className="text-center py-12">
                <Clock size={48} className="mx-auto text-muted-foreground mb-4" weight="light" />
                <p className="text-muted-foreground">Nenhuma pendência encontrada</p>
              </div>
            ) : (
              visibleTransactions.map((transaction) => {
                const category = categories.find((c) => c.id === transaction.categoryId)
                const isExpense = category?.type === "expense"
                const linkedCard = transaction.cardId ? cards.find(c => c.id === transaction.cardId) : null

                const installmentLabel = transaction.installments
                  ? `${transaction.currentInstallment}/${transaction.installments}`
                  : transaction.recurrence === "monthly" ? "Mensal" : null

                return (
                  <div
                    key={transaction.id}
                    className="p-4 rounded-2xl bg-card border border-border hover:border-primary/50 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-start gap-3 flex-1">
                        <div
                          className="w-12 h-12 rounded-[1vw] flex items-center justify-center shrink-0"
                          style={{ backgroundColor: category?.color + "20" }}
                        >
                          {/* @ts-ignore */}
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: category?.color }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-foreground truncate">{transaction.description}</p>
                          <div className="flex flex-wrap items-center gap-2 mt-1">
                            <p className="text-sm text-muted-foreground">{category?.name}</p>

                            {installmentLabel && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-muted text-muted-foreground border border-border">
                                {installmentLabel}
                              </span>
                            )}
                            
                            {linkedCard && (
                                <span className="text-[10px] flex items-center gap-1 font-medium px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                                   <Wallet size={10} weight="fill" />
                                   {linkedCard.name}
                                </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1 capitalize">
                            Vencimento: {formatDate(transaction.date)}
                          </p>
                        </div>
                      </div>
                      <p className={cn("font-bold text-lg text-text-primary")}>
                        {isExpense ? "-" : "+"}
                        {formatCurrency(transaction.amount)}
                      </p>
                    </div>

                    {selectedTransaction === transaction.id && cards.length > 0 ? (
                      <div className="space-y-4 mt-4 pt-4 border-t border-border animate-in fade-in slide-in-from-top-2">
                        
                        {/* SELEÇÃO DE DATA - NOVO CAMPO */}
                        <div>
                            <label className="text-sm font-medium text-foreground flex items-center gap-2 mb-2">
                                <CalendarCheck size={16} />
                                Data da baixa (Efetivação)
                            </label>
                            <input 
                                type="date"
                                value={confirmDate}
                                onChange={(e) => setConfirmDate(e.target.value)}
                                className="w-full px-4 py-2 rounded-[1vw] bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                                {isExpense ? "Data que o dinheiro saiu." : "Data que o dinheiro entrou."}
                            </p>
                        </div>

                        {/* SELEÇÃO DE CONTA */}
                        <div>
                            <p className="text-sm font-medium text-foreground mb-2">
                                {isExpense ? "Debitar de qual conta?" : "Receber em qual conta?"}
                            </p>
                            
                            <div className="grid grid-cols-1 gap-2">
                            {cards
                                .map((card) => {
                                const BankIcon = getBankIcon(card.bankName)
                                return (
                                <button
                                    key={card.id}
                                    type="button"
                                    onClick={() => setSelectedCard(card.id)}
                                    className={cn(
                                    "flex items-center gap-3 p-3 rounded-[1vw] border-2 transition-all",
                                    selectedCard === card.id
                                        ? "border-primary bg-primary/5 shadow-sm"
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
                                    <div className="flex items-center gap-2">
                                        <p className="text-xs text-muted-foreground">•••• {card.lastDigits}</p>
                                        <span className="text-[10px] bg-muted px-1 rounded">{card.type === 'credit' ? 'Crédito' : 'Débito'}</span>
                                    </div>
                                    </div>
                                </button>
                                )
                            })}
                            </div>
                        </div>

                        <div className="flex gap-2 pt-2">
                          <Button
                            onClick={() => {
                              setSelectedTransaction(null)
                              setSelectedCard("")
                              setConfirmDate("")
                            }}
                            variant="outline"
                            className="flex-1"
                          >
                            Cancelar
                          </Button>
                          <Button onClick={confirmPayment} className="flex-1">
                            <CheckCircle size={20} weight="bold" className="mr-2" />
                            Confirmar
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-2 mt-3">
                        <Button
                          onClick={() => handleMarkAsPaid(transaction.id)}
                          className={cn("flex-1", isExpense ? "bg-primary" : "bg-income hover:bg-income/90 text-background")}
                        >
                          <CheckCircle size={20} weight="bold" className="mr-2 text-background" />
                          {isExpense ? "Pagar" : "Receber"}
                        </Button>
                        <Button
                          onClick={() => handleCancel(transaction.id)}
                          variant="outline"
                          className="flex-1 border-expense text-expense hover:bg-expense/10"
                        >
                          <XCircle size={20} weight="bold" className="mr-2" />
                          Cancelar
                        </Button>
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  )
}