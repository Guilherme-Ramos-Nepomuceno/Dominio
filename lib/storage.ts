// LocalStorage utilities for offline-first data persistence

import type { Transaction, Category, Goal, AppSettings, Card, TransactionStatus } from "./types"

const STORAGE_KEYS = {
  TRANSACTIONS: "finance-transactions",
  CATEGORIES: "finance-categories",
  GOALS: "finance-goals",
  SETTINGS: "finance-settings",
  CARDS: "finance-cards",
  SAVINGS_GOALS: "finance-savings-goals",
} as const

// Default categories
const DEFAULT_CATEGORIES: Category[] = [
  { id: "1", name: "Salário", color: "#4ade80", type: "income", icon: "Money" },
  { id: "2", name: "Freelance", color: "#34d399", type: "income", icon: "Briefcase" },
  { id: "transfer_income", name: "Transferência", color: "#3b82f6", type: "income", icon: "HandArrowDown" },
  { id: "transfer_expense", name: "Transferência", color: "#3b82f6", type: "expense", icon: "HandArrowUp" },
  { id: "savings_deposit", name: "Investimento", color: "#8b5cf6", type: "expense", icon: "PiggyBank" },
  { id: "3", name: "Alimentação", color: "#f87171", type: "expense", icon: "ForkKnife" },
  { id: "4", name: "Transporte", color: "#fb923c", type: "expense", icon: "Car" },
  { id: "5", name: "Moradia", color: "#ef4444", type: "expense", icon: "House" },
  { id: "6", name: "Lazer", color: "#a78bfa", type: "expense", icon: "GameController" },
]

const DEFAULT_SETTINGS: AppSettings = {
  spendingGoal: 5000,
  currency: "BRL",
  firstDayOfWeek: 0,
}

// Generic storage functions
function getItem<T>(key: string, defaultValue: T): T {
  if (typeof window === "undefined") return defaultValue

  try {
    const item = localStorage.getItem(key)
    return item ? JSON.parse(item) : defaultValue
  } catch (error) {
    console.error(`Error reading ${key} from localStorage:`, error)
    return defaultValue
  }
}

function setItem<T>(key: string, value: T): void {
  if (typeof window === "undefined") return

  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch (error) {
    console.error(`Error writing ${key} to localStorage:`, error)
  }
}

export const getTransactions = (): Transaction[] => {
  return getItem(STORAGE_KEYS.TRANSACTIONS, [])
}

export const setTransactions = (transactions: Transaction[]): void => {
  setItem(STORAGE_KEYS.TRANSACTIONS, transactions)
}

export const addTransaction = (transaction: Omit<Transaction, "id" | "createdAt" | "updatedAt">): Transaction => {
  const transactions = getTransactions()
  const now = new Date().toISOString()
  const cards = getCards()

  const transactionDate = new Date(transaction.date)
  transactionDate.setHours(0, 0, 0, 0)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const isFutureTransaction = transactionDate > today

  const selectedCard = transaction.cardId ? cards.find((c) => c.id === transaction.cardId) : null
  const isCreditCard = selectedCard?.type === "credit"

  const newTransaction: Transaction = {
    ...transaction,
    id: `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    status: transaction.status 
            ? transaction.status 
            : (isCreditCard || isFutureTransaction ? "pending" : "paid"),
    createdAt: now,
    updatedAt: now,
  }

  // Handle installments - divide amount by number of installments
  if (transaction.installments && transaction.installments > 1) {
    const installmentTransactions: Transaction[] = []
    const baseDate = new Date(transaction.date)
    const amountPerInstallment = transaction.amount / transaction.installments

    for (let i = 0; i < transaction.installments; i++) {
      const installmentDate = new Date(baseDate)
      installmentDate.setMonth(installmentDate.getMonth() + i)

      installmentTransactions.push({
        ...newTransaction,
        id: `${newTransaction.id}_inst_${i}`,
        amount: amountPerInstallment,
        currentInstallment: i + 1,
        date: installmentDate.toISOString(),
        parentId: newTransaction.id,
      })
    }

    setTransactions([...transactions, ...installmentTransactions])
    return newTransaction
  }

  // Handle recurring transactions - create transactions for next 12 months
  if (transaction.recurrence !== "none") {
    const recurringTransactions: Transaction[] = []
    const baseDate = new Date(transaction.date)

    for (let i = 0; i < 12; i++) {
      const recurringDate = new Date(baseDate)

      switch (transaction.recurrence) {
        case "daily":
          recurringDate.setDate(recurringDate.getDate() + i)
          break
        case "weekly":
          recurringDate.setDate(recurringDate.getDate() + i * 7)
          break
        case "monthly":
          recurringDate.setMonth(recurringDate.getMonth() + i)
          break
        case "yearly":
          recurringDate.setFullYear(recurringDate.getFullYear() + i)
          break
      }

      recurringTransactions.push({
        ...newTransaction,
        id: `${newTransaction.id}_rec_${i}`,
        date: recurringDate.toISOString(),
        parentId: newTransaction.id,
      })
    }

    setTransactions([...transactions, ...recurringTransactions])
    return newTransaction
  }

  setTransactions([...transactions, newTransaction])
  return newTransaction
}

export const updateTransaction = (id: string, updates: Partial<Transaction>): void => {
  const transactions = getTransactions()
  const updatedTransactions = transactions.map((t) =>
    t.id === id ? { ...t, ...updates, updatedAt: new Date().toISOString() } : t,
  )
  setTransactions(updatedTransactions)
}

export const deleteTransaction = (id: string): void => {
  const transactions = getTransactions()
  const filtered = transactions.filter((t) => t.id !== id && t.parentId !== id)
  setTransactions(filtered)
}

export const markTransactionAsPaid = (id: string, cardId?: string): void => {
  const transactions = getTransactions()
  const updatedTransactions = transactions.map((t) =>
    t.id === id
      ? {
          ...t,
          status: "paid" as TransactionStatus,
          cardId: cardId || t.cardId,
          updatedAt: new Date().toISOString(),
        }
      : t,
  )
  setTransactions(updatedTransactions)
}

export const cancelTransaction = (id: string): void => {
  const transactions = getTransactions()
  const updatedTransactions = transactions.map((t) =>
    t.id === id
      ? {
          ...t,
          status: "cancelled" as TransactionStatus,
          updatedAt: new Date().toISOString(),
        }
      : t,
  )
  setTransactions(updatedTransactions)
}

export const getPendingTransactions = (): Transaction[] => {
  const transactions = getTransactions()
  return transactions
    .filter((t) => t.status === "pending")
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
}

// Categories
export const getCategories = (): Category[] => {
  return getItem(STORAGE_KEYS.CATEGORIES, DEFAULT_CATEGORIES)
}

export const setCategories = (categories: Category[]): void => {
  setItem(STORAGE_KEYS.CATEGORIES, categories)
}

export const addCategory = (category: Omit<Category, "id">): Category => {
  const categories = getCategories()
  const newCategory: Category = {
    ...category,
    id: `cat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
  }
  setCategories([...categories, newCategory])
  return newCategory
}

export const deleteCategory = (id: string): void => {
  const categories = getCategories()
  setCategories(categories.filter((c) => c.id !== id))
}

// Goals
export const getGoals = (): Goal[] => {
  return getItem(STORAGE_KEYS.GOALS, [])
}

export const setGoals = (goals: Goal[]): void => {
  setItem(STORAGE_KEYS.GOALS, goals)
}

export const addGoal = (goal: Omit<Goal, "id" | "createdAt">): Goal => {
  const goals = getGoals()
  const newGoal: Goal = {
    ...goal,
    id: `goal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    createdAt: new Date().toISOString(),
  }
  setGoals([...goals, newGoal])
  return newGoal
}

export const updateGoal = (id: string, updates: Partial<Goal>): void => {
  const goals = getGoals()
  const updatedGoals = goals.map((g) => (g.id === id ? { ...g, ...updates } : g))
  setGoals(updatedGoals)
}

// Settings
export const getSettings = (): AppSettings => {
  return getItem(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS)
}

export const setSettings = (settings: Partial<AppSettings>): void => {
  const current = getSettings()
  setItem(STORAGE_KEYS.SETTINGS, { ...current, ...settings })
}

// Cards
export const getCards = (): Card[] => {
  return getItem(STORAGE_KEYS.CARDS, [])
}

export const setCards = (cards: Card[]): void => {
  setItem(STORAGE_KEYS.CARDS, cards)
}

export const addCard = (card: Omit<Card, "id" | "createdAt">): Card => {
  const cards = getCards()
  const newCard: Card = {
    ...card,
    id: `card_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    createdAt: new Date().toISOString(),
  }
  setCards([...cards, newCard])
  return newCard
}

export const updateCard = (id: string, updates: Partial<Card>): void => {
  const cards = getCards()
  const updatedCards = cards.map((c) => (c.id === id ? { ...c, ...updates } : c))
  setCards(updatedCards)
}

export const deleteCard = (id: string): void => {
  const cards = getCards()
  setCards(cards.filter((c) => c.id !== id))
}

// Savings Goals
export const getSavingsGoals = (): any[] => {
  return getItem(STORAGE_KEYS.SAVINGS_GOALS, [])
}

export const setSavingsGoals = (goals: any[]): void => {
  setItem(STORAGE_KEYS.SAVINGS_GOALS, goals)
}

export const addSavingsGoal = (goal: any): any => {
  const goals = getSavingsGoals()
  const now = new Date().toISOString()
  const newGoal = {
    ...goal,
    id: `sgoal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    currentAmount: 0,
    createdAt: now,
    updatedAt: now,
  }
  setSavingsGoals([...goals, newGoal])
  return newGoal
}

export const updateSavingsGoal = (id: string, updates: any): void => {
  const goals = getSavingsGoals()
  const updatedGoals = goals.map((g) => {
    if (g.id === id) {
      return {
        ...g,
        ...updates,
        updatedAt: new Date().toISOString(),
      }
    }
    return g
  })
  setSavingsGoals(updatedGoals)
}

export const deleteSavingsGoal = (id: string): void => {
  const goals = getSavingsGoals()
  setSavingsGoals(goals.filter((g) => g.id !== id))
}
export const addFundsToSavingsGoal = (goalId: string, amount: number, cardId?: string): void => {
  const goals = getSavingsGoals()
  
  // 1. Encontra a meta para pegar o cartão vinculado caso o argumento cardId venha vazio
  const targetGoal = goals.find((g) => g.id === goalId)
  
  // AQUI ESTAVA O ERRO: Resolvemos qual cartão usar (o do argumento OU o salvo na meta)
  const finalCardId = cardId || targetGoal?.cardId
  
  const updatedGoals = goals.map((g) => {
    if (g.id === goalId) {
      return {
        ...g,
        currentAmount: g.currentAmount + amount,
        // Se veio um novo cardId, atualizamos a meta. Se não, mantemos o antigo.
        cardId: finalCardId, 
        updatedAt: new Date().toISOString(),
      }
    }
    return g
  })
  setSavingsGoals(updatedGoals)

  // 2. Cria a transação usando o ID do cartão resolvido (finalCardId)
  if (finalCardId) {
    addTransaction({
      description: `Transferência para reserva: ${targetGoal?.name || "Meta"}`,
      amount: amount,
      type: "expense",
      categoryId: "savings_deposit",
      date: new Date().toISOString(),
      recurrence: "none",
      cardId: finalCardId, // Usa o ID resolvido
      status: "paid",      // Força o pagamento imediato
    })
  } else {
    console.warn("Transação de reserva criada sem conta vinculada (saldo não será afetado).")
  }
}

export const removeFundsFromSavingsGoal = (goalId: string, amount: number, cardId?: string): void => {
  const goals = getSavingsGoals()
  const goal = goals.find((g) => g.id === goalId)

  if (!goal || goal.currentAmount < amount) {
    return
  }

  // Resolvemos o cartão de destino (para onde o dinheiro volta)
  const finalCardId = cardId || goal.cardId

  const updatedGoals = goals.map((g) => {
    if (g.id === goalId) {
      return {
        ...g,
        currentAmount: g.currentAmount - amount,
        updatedAt: new Date().toISOString(),
      }
    }
    return g
  })
  setSavingsGoals(updatedGoals)

  // Cria a transação de entrada (Devolução para a conta)
  if (finalCardId) {
    addTransaction({
      description: `Retirada da reserva: ${goal.name}`,
      amount: amount,
      type: "income",
      categoryId: "transfer_income",
      date: new Date().toISOString(),
      recurrence: "none",
      cardId: finalCardId, // Usa o ID resolvido
      status: "paid",
    })
  }
}