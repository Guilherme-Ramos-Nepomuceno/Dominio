"use client"

import { useState, useEffect, useCallback } from "react"
import type { Transaction, Category, MonthData } from "@/lib/types"
import { getTransactions, getCategories, getSavingsGoals, getPendingTransactions, getCards } from "@/lib/storage"
import { getCurrentMonth, isSameMonth } from "@/lib/date-utils"

// Transferências entre contas (e retiradas de reserva) usam a categoria de sistema
// "Transferência" nos dois lados do lançamento. Retiradas de reserva usam a mesma
// categoria de entrada, mas devem seguir contando como receita (o dinheiro sai da
// reserva e entra na conta corrente de fato), então são excluídas daqui.
export function isInternalTransfer(categories: Category[], t: Transaction): boolean {
  if (t.description?.startsWith("Retirada da reserva")) return false
  const category = categories.find((c) => c.id === t.categoryId)
  return category?.name === "Transferência"
}

export function useTransactions(selectedMonth?: string) {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)

  const month = selectedMonth || getCurrentMonth()

  const loadTransactions = useCallback(async () => {
    setLoading(true)
    const allTransactions = await getTransactions()
    const monthTransactions = allTransactions.filter((t) => isSameMonth(t.date, month + "-01"))
    setTransactions(monthTransactions)
    setLoading(false)
  }, [month])

  useEffect(() => {
    loadTransactions()

    // Listen for storage updates (same window)
    const handleStorageUpdate = () => {
      loadTransactions()
    }
    window.addEventListener("storage-update", handleStorageUpdate)

    return () => {
      window.removeEventListener("storage-update", handleStorageUpdate)
    }
  }, [loadTransactions])

  const refresh = () => {
    loadTransactions()
  }

  return { transactions, loading, refresh }
}

export function useMonthData(month: string): MonthData {
  const { transactions } = useTransactions(month)
  const [categories, setCategories] = useState<Category[]>([])

  useEffect(() => {
    getCategories().then(setCategories)
  }, [])

  const paidTransactions = transactions.filter((t) => t.status !== "pending" && t.status !== "cancelled")

  const income = paidTransactions
    .filter((t) => {
      const category = categories.find((c) => c.id === t.categoryId)
      return category?.type === "income"
    })
    .reduce((sum, t) => sum + t.amount, 0)

  const expense = paidTransactions
    .filter((t) => {
      const category = categories.find((c) => c.id === t.categoryId)
      return category?.type === "expense"
    })
    .reduce((sum, t) => sum + t.amount, 0)

  const balance = income - expense

  return {
    month,
    income,
    expense,
    balance,
    transactions: paidTransactions,
  }
}

// Calcula o resumo (saldo, receita/despesa do mês, transferências) a partir de um
// conjunto de transações/categorias/reservas já carregado — extraído de
// useTotalBalance para poder ser reaproveitado com um dataset consolidado (ex:
// a soma dos dois parceiros na visão "Total da Família").
export function computeTotalBalanceFrom(
  allTransactions: Transaction[],
  categories: Category[],
  savingsGoals: { currentAmount?: number }[],
  month: string,
  // Na visão "Total da Família" (soma dos dois parceiros), uma transferência de
  // um parceiro para o outro ("Transferência Familiar") é dinheiro que só mudou
  // de bolso DENTRO da família — não deve contar como receita/despesa a mais no
  // total combinado, e sim aparecer separado (junto com as demais
  // transferências). Fora dessa visão (conta "Casal" ou de cada um), continua
  // contando normal, pois é dinheiro que entrou/saiu de verdade daquela conta.
  extraInternalTransferCategoryNames: string[] = [],
) {
  const isExcludedTransfer = (t: Transaction) => {
    if (isInternalTransfer(categories, t)) return true
    if (extraInternalTransferCategoryNames.length === 0) return false
    const category = categories.find((c) => c.id === t.categoryId)
    return !!category && extraInternalTransferCategoryNames.includes(category.name)
  }

  const totalSavings = savingsGoals.reduce((sum, goal) => sum + (goal.currentAmount || 0), 0)

  // O saldo da conta corrente é acumulado (todo o histórico pago), e não só do mês
  // selecionado — pagar hoje uma conta de um mês anterior precisa refletir no saldo atual,
  // mesmo que o gráfico/relatório mensal continue agrupando pelo mês da despesa.
  const allPaidTransactions = allTransactions.filter((t) => t.status === "paid" && !isExcludedTransfer(t))

  const transfers = allTransactions
    .filter((t) => t.status !== "cancelled" && isExcludedTransfer(t))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  const checkingBalance = allPaidTransactions.reduce((sum, t) => {
    const category = categories.find((c) => c.id === t.categoryId)
    if (category?.type === "income") return sum + t.amount
    if (category?.type === "expense") return sum - t.amount
    return sum
  }, 0)

  const totalBalance = checkingBalance + totalSavings

  // income/expense abaixo seguem escopados ao mês selecionado (usados nos cards e
  // mini-gráficos mensais da Home/Stats, não no saldo total). Transferências entre
  // contas ficam de fora — elas aparecem só na lista de transferências recentes.
  const monthTransactions = allTransactions.filter((t) => isSameMonth(t.date, month + "-01"))
  const paidTransactions = monthTransactions
    .filter((t) => t.status !== "pending" && t.status !== "cancelled")
    .filter((t) => !isExcludedTransfer(t))

  const income = paidTransactions
    .filter((t) => {
      const category = categories.find((c) => c.id === t.categoryId)
      return category?.type === "income"
    })
    .reduce((sum, t) => sum + t.amount, 0)

  const expense = paidTransactions
    .filter((t) => {
      const category = categories.find((c) => c.id === t.categoryId)
      return category?.type === "expense"
    })
    .reduce((sum, t) => sum + t.amount, 0)

  return {
    checkingBalance,
    totalBalance,
    totalSavings,
    income,
    expense,
    transactions: paidTransactions,
    // Todo o histórico pago (sem recorte de mês) — usado pelo gráfico semanal, que
    // pode cair numa semana com dias em dois meses diferentes.
    allTransactions: allPaidTransactions,
    transfers,
  }
}

export function useTotalBalance(month: string) {
  const [savingsGoals, setSavingsGoals] = useState<any[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([])

  useEffect(() => {
    const load = async () => {
      const [savings, cats, all] = await Promise.all([getSavingsGoals(), getCategories(), getTransactions()])
      setSavingsGoals(savings)
      setCategories(cats)
      setAllTransactions(all)
    }
    load()

    window.addEventListener("storage-update", load)
    return () => window.removeEventListener("storage-update", load)
  }, [])

  return computeTotalBalanceFrom(allTransactions, categories, savingsGoals, month)
}

// Pendências de qualquer mês (incluindo meses anteriores não pagos), com a mesma
// deduplicação de recorrência/parcelas usada na tela de Contas a Pagar/Receber.
export function usePendingSummary() {
  const [items, setItems] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)

  const loadPending = useCallback(async () => {
    setLoading(true)
    const [pending, cards] = await Promise.all([getPendingTransactions(), getCards()])

    const visible = pending.filter((t) => {
      if (t.cardId) {
        const card = cards.find((c) => c.id === t.cardId)
        if (card?.hasCredit) {
          // Cartão só-crédito: tudo é fatura. Cartão combinado: só o lado
          // crédito vai pra fatura — o lado débito continua pendência normal.
          if (!card.hasDebit || t.paymentMethod === "credit") return false
        }
      }
      return true
    })

    // Só mostra o que já venceu ou vence hoje — uma recorrência com vencimento daqui
    // a alguns dias não deve gerar alerta antecipado na tela principal.
    const endOfToday = new Date()
    endOfToday.setHours(23, 59, 59, 999)
    const due = visible.filter((t) => new Date(t.date) <= endOfToday)

    const grouped = new Map<string, Transaction>()
    const singles: Transaction[] = []

    due.forEach((t) => {
      const isRecurring = t.recurrence && t.recurrence !== "none"
      const isInstallment = t.installments && t.installments > 1

      if (!isRecurring && !isInstallment) {
        singles.push(t)
        return
      }

      // Ver comentário equivalente em use-pending-view-model.ts: a raiz não tem
      // parentId, então usar o próprio id como chave a mantém no mesmo grupo das
      // demais ocorrências (que referenciam esse id via parentId).
      const groupId = t.parentId || t.id
      const existing = grouped.get(groupId)
      if (!existing || new Date(t.date) < new Date(existing.date)) {
        grouped.set(groupId, t)
      }
    })

    const result = [...singles, ...Array.from(grouped.values())].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    )

    setItems(result)
    setLoading(false)
  }, [])

  useEffect(() => {
    loadPending()

    const handleStorageUpdate = () => {
      loadPending()
    }
    window.addEventListener("storage-update", handleStorageUpdate)

    return () => {
      window.removeEventListener("storage-update", handleStorageUpdate)
    }
  }, [loadPending])

  const total = items.reduce((sum, t) => sum + t.amount, 0)

  return { items, total, count: items.length, loading, refresh: loadPending }
}
