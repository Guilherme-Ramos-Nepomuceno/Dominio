"use client"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { ClockIcon, CheckCircleIcon, XCircleIcon } from "@phosphor-icons/react"
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
}

export default function PendingTransactionsPage() {
  const router = useRouter()
  // @ts-ignore
  const [pendingTransactions, setPendingTransactions] = useState<Transaction[]>(getPendingTransactions())
  const [selectedTransaction, setSelectedTransaction] = useState<string | null>(null)
  const [selectedCard, setSelectedCard] = useState<string>("")
  const categories = getCategories()
  const cards = getCards()

  // Lógica unificada para Recorrências e Parcelamentos
  const visibleTransactions = useMemo(() => {
    const grouped = new Map<string, Transaction>()
    const singles: Transaction[] = []

    pendingTransactions.forEach((t) => {
      // Verifica se é Recorrência (ex: Assinatura) OU Parcelamento (ex: Compra em 10x)
      const isRecurring = t.recurrence && t.recurrence !== "none"
      const isInstallment = t.installments && t.installments > 1

      // Se for compra única (nem recorrente, nem parcelada), passa direto
      if (!isRecurring && !isInstallment) {
        singles.push(t)
        return
      }

      // Se entrou aqui, é uma série (parcelas ou assinatura).
      // Agrupamos pelo ID único da série. Se não tiver ID (legado), tentamos agrupar pela descrição.
      const groupId = t.recurrenceId || t.description

      const existing = grouped.get(groupId)

      // Lógica do "Próximo da Fila":
      // Se ainda não pegamos nenhum desse grupo, OU se a transação atual (t)
      // tem uma data ANTERIOR à que já guardamos, ela assume o lugar.
      // Isso garante que mostramos a parcela 1/12. Quando ela for paga (sumir da lista),
      // a lógica rodará de novo e a parcela 2/12 será a "mais antiga", aparecendo automaticamente.
      if (!existing || new Date(t.date) < new Date(existing.date)) {
        grouped.set(groupId, t)
      }
    })

    // Junta as únicas com as "cabeças de chave" dos grupos e ordena por data
    return [...singles, ...Array.from(grouped.values())].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    )
  }, [pendingTransactions])

  const handleMarkAsPaid = (transactionId: string) => {
    setSelectedTransaction(transactionId)
  }

  const confirmPayment = () => {
    if (!selectedTransaction) return

    if (cards.length > 0 && !selectedCard) {
      alert("Selecione um cartão para confirmar o pagamento")
      return
    }

    markTransactionAsPaid(selectedTransaction, selectedCard || undefined)
    setPendingTransactions(getPendingTransactions())
    setSelectedTransaction(null)
    setSelectedCard("")
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
          <PageHeader title="Transações Pendentes" />

          <div className="space-y-4 mt-6">
            {visibleTransactions.length === 0 ? (
              <div className="text-center py-12">
                <ClockIcon size={48} className="mx-auto text-muted-foreground mb-4" weight="light" />
                <p className="text-muted-foreground">Nenhuma transação pendente</p>
              </div>
            ) : (
              visibleTransactions.map((transaction) => {
                const category = categories.find((c) => c.id === transaction.categoryId)
                const isExpense = category?.type === "expense"
                
                // Variável para exibir se é parcela ou recorrência
                const installmentLabel = transaction.installments 
                  ? `${transaction.currentInstallment}/${transaction.installments}` 
                  : transaction.recurrence === 'monthly' ? 'Mensal' : null

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
                          <div className="flex items-center gap-2 mt-1">
                             <p className="text-sm text-muted-foreground">{category?.name}</p>
                             
                             {/* Badge de Parcela/Recorrência */}
                             {installmentLabel && (
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-muted text-muted-foreground border border-border">
                                  {installmentLabel}
                                </span>
                             )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1 capitalize">
                            Vence em: {formatDate(transaction.date)}
                          </p>
                        </div>
                      </div>
                      <p className={cn("font-bold text-lg", isExpense ? "text-expense" : "text-income")}>
                        {isExpense ? "-" : "+"}
                        {formatCurrency(transaction.amount)}
                      </p>
                    </div>

                    {/* ... Restante do código de botões (igual ao anterior) ... */}
                    {selectedTransaction === transaction.id && cards.length > 0 ? (
                      <div className="space-y-3 mt-4 pt-4 border-t border-border">
                        <p className="text-sm font-medium text-foreground">Selecione o cartão de pagamento:</p>
                        <div className="grid grid-cols-1 gap-2">
                          {cards.map((card) => {
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
                                  <p className="text-xs text-muted-foreground">•••• {card.lastDigits}</p>
                                </div>
                              </button>
                            )
                          })}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            onClick={() => {
                              setSelectedTransaction(null)
                              setSelectedCard("")
                            }}
                            variant="outline"
                            className="flex-1"
                          >
                            Voltar
                          </Button>
                          <Button onClick={confirmPayment} className="flex-1">
                            <CheckCircleIcon size={20} weight="bold" className="mr-2" />
                            Confirmar Pagamento
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-2 mt-3">
                        <Button
                          onClick={() => handleMarkAsPaid(transaction.id)}
                          className="flex-1 bg-income hover:bg-income/90"
                        >
                          <CheckCircleIcon size={20} weight="bold" className="mr-2" />
                          Pagar
                        </Button>
                        <Button
                          onClick={() => handleCancel(transaction.id)}
                          variant="outline"
                          className="flex-1 border-expense text-expense hover:bg-expense/10"
                        >
                          <XCircleIcon size={20} weight="bold" className="mr-2" />
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