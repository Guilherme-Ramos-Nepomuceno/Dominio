// Core type definitions for the finance app

export type TransactionType = "income" | "expense"
export type RecurrenceType = "none" | "daily" | "weekly" | "monthly" | "yearly"
export type TransactionStatus = "pending" | "paid" | "cancelled"
export type CardType = "credit" | "debit"
export type BankName = "nubank" | "inter" | "itau" | "bradesco" | "santander" | "caixa" | "bb" | "alelo" | "other"
export type PeriodType = "week" | "month" | "lastMonth"

export interface Category {
  id: string
  name: string
  color: string
  type: TransactionType
  icon?: string
}

export interface Transaction {
  id: string
  description: string
  amount: number
  type: TransactionType
  categoryId: string
  date: string
  recurrence: RecurrenceType
  installments?: number
  currentInstallment?: number
  parentId?: string // For installment transactions
  status?: TransactionStatus
  cardId?: string // Added cardId to Transaction interface
  createdAt: string
  updatedAt: string
}

export interface CardTransaction extends Transaction {
  cardId?: string
}

export interface Goal {
  id: string
  name: string
  targetAmount: number
  currentAmount: number
  color: string
  icon?: string
  deadline?: string
  createdAt: string
}

export interface SavingsGoal {
  id: string
  name: string
  targetAmount: number
  currentAmount: number
  color: string
  icon: string
  cardId?: string // Added cardId to track which card the savings are from
  createdAt: string
  updatedAt: string
}

export interface Card {
  id: string
  name: string // Changed from 'name' to match existing usage
  bankName: BankName // Changed from 'bankName' to match existing usage
  lastDigits: string
  type: CardType
  color: string
  limit?: number
  dueDate?: number // Day of month (1-31)
  createdAt: string
}

export interface MonthData {
  month: string // Format: YYYY-MM
  income: number
  expense: number
  balance: number
  transactions: Transaction[]
}

export interface AppSettings {
  spendingGoal: number
  currency: string
  firstDayOfWeek: number
  categoryGoals?: CategoryGoal[] // Added category spending goals
}

export interface CategoryGoal {
  categoryId: string
  percentage: number
}
