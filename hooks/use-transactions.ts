"use client"

import { useCallback, useMemo } from "react"
import type { Transaction, Category, MonthData, SavingsGoal, Card } from "@/lib/types"
import { useCardsQuery, useCategoriesQuery, useSavingsGoalsQuery, useTransactionsQuery } from "@/hooks/queries"
import { isInPlanMonth } from "@/lib/period"
import { useSelectedMonth } from "@/lib/selected-month-context"
import { asSpending, effectiveTransactionType, findCategory, spendingType } from "@/lib/category-utils"

// Transferências entre contas (e retiradas de reserva) usam a categoria de sistema
// "Transferência" nos dois lados do lançamento. Retiradas de reserva usam a mesma
// categoria de entrada, mas devem seguir contando como receita (o dinheiro sai da
// reserva e entra na conta corrente de fato), então são excluídas daqui.
// "Pagamento de Fatura" (sincronização Pluggy) entra na mesma exclusão por um motivo
// diferente: cada compra da fatura já conta como gasto na própria categoria (Alimentação,
// Transporte...) — contar o pagamento agregado de novo aqui duplicaria o valor.
// Checagem é pela flag `excludedFromTotals`, não pelo nome da categoria — nome é frágil
// (acento, maiúscula, ou uma categoria homônima que o próprio usuário tenha criado antes
// dessa flag existir quebrava o match).
export function isInternalTransfer(categories: Category[], t: Transaction): boolean {
  if (t.description?.startsWith("Retirada da reserva")) return false
  // Sem categoria nunca é transferência interna — entra nos totais normais.
  return !!findCategory(categories, t.categoryId)?.excludedFromTotals
}

// Referências estáveis para "ainda sem dado" — um [] novo a cada render
// invalidaria os useMemo abaixo.
const NO_TRANSACTIONS: Transaction[] = []
const NO_CATEGORIES: Category[] = []
const NO_SAVINGS: SavingsGoal[] = []
const NO_CARDS: Card[] = []

export function useTransactions(selectedMonth?: string) {
  // "Mês" segue o período do plano (Configurações > Meu mês começa no dia).
  const { currentMonth, monthStartDay } = useSelectedMonth()
  const month = selectedMonth || currentMonth

  // Histórico inteiro vem do cache (uma busca serve todas as telas e meses);
  // trocar de mês é só filtro em memória. Gravações invalidam o cache pelo
  // "storage-update" (components/session/query-provider.tsx).
  const query = useTransactionsQuery()
  const all = query.data ?? NO_TRANSACTIONS
  const transactions = useMemo(
    () => all.filter((t) => isInPlanMonth(t.date, month, monthStartDay)),
    [all, month, monthStartDay],
  )

  const { refetch } = query
  const refresh = useCallback(() => {
    void refetch()
  }, [refetch])

  // `loading` só no primeiro carregamento: com dado em cache, uma
  // revalidação em segundo plano não volta a mostrar skeleton.
  return { transactions, loading: query.isPending, refresh }
}

export function useMonthData(month: string): MonthData {
  const { transactions } = useTransactions(month)
  const categories = useCategoriesQuery().data ?? NO_CATEGORIES

  const paidTransactions = transactions.filter((t) => t.status !== "pending" && t.status !== "cancelled")
  // Estorno desconta da despesa em vez de contar como receita (asSpending).
  const forTotals = paidTransactions.map((t) => asSpending(categories, t))

  const income = forTotals
    .filter((t) => spendingType(categories, t) === "income")
    .reduce((sum, t) => sum + t.amount, 0)

  const expense = forTotals
    .filter((t) => spendingType(categories, t) === "expense")
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
  // Dia em que o mês começa (lib/period.ts) — 1 = mês civil.
  monthStartDay = 1,
) {
  const isExcludedTransfer = (t: Transaction) => {
    if (isInternalTransfer(categories, t)) return true
    if (extraInternalTransferCategoryNames.length === 0) return false
    const category = findCategory(categories, t.categoryId)
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

  // Sem categoria conta pelo tipo da própria transação (effectiveTransactionType).
  const checkingBalance = allPaidTransactions.reduce((sum, t) => {
    const type = effectiveTransactionType(categories, t)
    if (type === "income") return sum + t.amount
    if (type === "expense") return sum - t.amount
    return sum
  }, 0)

  const totalBalance = checkingBalance + totalSavings

  // income/expense abaixo seguem escopados ao mês selecionado (usados nos cards e
  // mini-gráficos mensais da Home/Stats, não no saldo total). Transferências entre
  // contas ficam de fora — elas aparecem só na lista de transferências recentes.
  const monthTransactions = allTransactions.filter((t) => isInPlanMonth(t.date, month, monthStartDay))
  const paidTransactions = monthTransactions
    .filter((t) => t.status !== "pending" && t.status !== "cancelled")
    .filter((t) => !isExcludedTransfer(t))
  // Estorno: no saldo acima é dinheiro entrando; aqui, desconta da despesa do
  // mês (na categoria da compra) em vez de contar como receita.
  const forTotals = paidTransactions.map((t) => asSpending(categories, t))

  const income = forTotals
    .filter((t) => spendingType(categories, t) === "income")
    .reduce((sum, t) => sum + t.amount, 0)

  const expense = forTotals
    .filter((t) => spendingType(categories, t) === "expense")
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
  const { monthStartDay } = useSelectedMonth()
  const savingsQuery = useSavingsGoalsQuery()
  const categoriesQuery = useCategoriesQuery()
  const transactionsQuery = useTransactionsQuery()

  const savingsGoals = savingsQuery.data ?? NO_SAVINGS
  const categories = categoriesQuery.data ?? NO_CATEGORIES
  const allTransactions = transactionsQuery.data ?? NO_TRANSACTIONS

  // Só true até o primeiro carregamento — revalidações depois (troca de
  // tela, storage-update) mostram o dado em cache em vez do skeleton.
  const isLoading = savingsQuery.isPending || categoriesQuery.isPending || transactionsQuery.isPending

  const totals = useMemo(
    () => computeTotalBalanceFrom(allTransactions, categories, savingsGoals, month, [], monthStartDay),
    [allTransactions, categories, savingsGoals, month, monthStartDay],
  )

  return { ...totals, isLoading }
}

// Pendências de qualquer mês (incluindo meses anteriores não pagos), com a mesma
// deduplicação de recorrência/parcelas usada na tela de Contas a Pagar/Receber.
export function usePendingSummary() {
  // Mesmo cache do resto da Home: as pendências saem do histórico já
  // carregado (getPendingTransactions baixava tudo de novo só para filtrar).
  const transactionsQuery = useTransactionsQuery()
  const cardsQuery = useCardsQuery()
  const allTransactions = transactionsQuery.data ?? NO_TRANSACTIONS
  const cards = cardsQuery.data ?? NO_CARDS

  const items = useMemo(() => {
    const pending = allTransactions.filter((t) => t.status === "pending")

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

    // Só o que já venceu, vence hoje ou vence amanhã (aviso na véspera) — uma
    // recorrência com vencimento daqui a alguns dias não gera alerta antecipado.
    const endOfTomorrow = new Date()
    endOfTomorrow.setDate(endOfTomorrow.getDate() + 1)
    endOfTomorrow.setHours(23, 59, 59, 999)
    const due = visible.filter((t) => new Date(t.date) <= endOfTomorrow)

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

    return [...singles, ...Array.from(grouped.values())].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    )
  }, [allTransactions, cards])

  const refetchTransactions = transactionsQuery.refetch
  const refetchCards = cardsQuery.refetch
  const refresh = useCallback(async () => {
    await Promise.all([refetchTransactions(), refetchCards()])
  }, [refetchTransactions, refetchCards])

  const total = items.reduce((sum, t) => sum + t.amount, 0)
  const loading = transactionsQuery.isPending || cardsQuery.isPending

  return { items, total, count: items.length, loading, refresh }
}
