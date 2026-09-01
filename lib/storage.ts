// Camada de dados do app: sempre busca/grava no backend (dominio-api).
// Não há mais persistência local — os dados vivem só no servidor.

import type {
  Transaction,
  Category,
  Goal,
  SavingsGoal,
  AppSettings,
  Card,
  TransactionStatus,
  BankName,
} from "./types"
import { fetchApi } from "./api"
import { getActiveAccountSelection } from "./active-account"
import * as familyApi from "./family"

// Categorias criadas automaticamente na primeira vez que uma conta (pessoal ou do casal)
// não tem nenhuma categoria ainda — o backend não vem com nada pré-cadastrado.
const DEFAULT_CATEGORIES: Omit<Category, "id">[] = [
  { name: "Salário", color: "#4ade80", type: "income", icon: "Money" },
  { name: "Freelance", color: "#34d399", type: "income", icon: "Briefcase" },
  { name: "Transferência", color: "#3b82f6", type: "income", icon: "HandArrowDown" },
  { name: "Transferência", color: "#3b82f6", type: "expense", icon: "HandArrowUp" },
  { name: "Investimento", color: "#8b5cf6", type: "expense", icon: "PiggyBank" },
  { name: "Alimentação", color: "#f87171", type: "expense", icon: "ForkKnife" },
  { name: "Transporte", color: "#fb923c", type: "expense", icon: "Car" },
  { name: "Moradia", color: "#ef4444", type: "expense", icon: "House" },
  { name: "Lazer", color: "#a78bfa", type: "expense", icon: "GameController" },
]

const DEFAULT_SETTINGS: AppSettings = {
  spendingGoal: 5000,
  currency: "BRL",
  firstDayOfWeek: 0,
  categoryGoals: [],
}

// O backend não persiste `color`/`icon` para Goal/SavingsGoal — geramos uma cor
// estável a partir do id só para manter alguma variedade visual na UI.
const PALETTE = ["#4ade80", "#34d399", "#22d3ee", "#a78bfa", "#f472b6", "#fb923c", "#f87171", "#facc15"]
function colorForId(id: string): string {
  let hash = 0
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0
  return PALETTE[hash % PALETTE.length]
}

function isReadOnly(): boolean {
  return getActiveAccountSelection().type === "partner"
}

function assertWritable(): void {
  if (isReadOnly()) {
    throw new Error("Você está vendo os dados de um parceiro (somente leitura) e não pode alterá-los.")
  }
}

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------

function mapCategoryFromApi(c: any): Category {
  return {
    id: c.id,
    name: c.name,
    color: c.color,
    type: String(c.type).toLowerCase() as Category["type"],
    icon: c.icon ?? undefined,
  }
}

function mapCategoryToApi(c: Partial<Category>) {
  const body: Record<string, unknown> = {}
  if (c.name !== undefined) body.name = c.name
  if (c.color !== undefined) body.color = c.color
  if (c.type !== undefined) body.type = c.type.toUpperCase()
  if (c.icon !== undefined) body.icon = c.icon
  return body
}

// Evita que múltiplos componentes montando ao mesmo tempo disparem a criação
// das categorias padrão em paralelo (o que gerava categorias duplicadas).
let seedingPromise: Promise<Category[]> | null = null

export async function getCategories(): Promise<Category[]> {
  const ctx = getActiveAccountSelection()
  const raw =
    ctx.type === "partner" ? await familyApi.getMemberCategories(ctx.id) : await fetchApi("/categories")

  const categories = (raw || []).map(mapCategoryFromApi)
  if (categories.length === 0 && ctx.type !== "partner") {
    if (!seedingPromise) {
      seedingPromise = seedDefaultCategories().finally(() => {
        seedingPromise = null
      })
    }
    return seedingPromise
  }
  return categories
}

async function seedDefaultCategories(): Promise<Category[]> {
  const created: Category[] = []
  for (const category of DEFAULT_CATEGORIES) {
    try {
      created.push(await addCategory(category))
    } catch (error) {
      console.error("Failed to seed default category:", category.name, error)
    }
  }
  return created
}

export async function addCategory(category: Omit<Category, "id">): Promise<Category> {
  assertWritable()
  const created = await fetchApi("/categories", { method: "POST", body: JSON.stringify(mapCategoryToApi(category)) })
  return mapCategoryFromApi(created)
}

export async function deleteCategory(id: string): Promise<void> {
  assertWritable()
  await fetchApi(`/categories/${id}`, { method: "DELETE" })
}

// Encontra (ou cria) uma categoria de sistema pelo nome+tipo — usado para transações
// internas (transferências, aportes em reservas) já que o backend gera ids próprios.
async function ensureSystemCategory(name: string, type: Category["type"], color: string, icon: string): Promise<string> {
  const categories = await getCategories()
  const existing = categories.find((c) => c.name === name && c.type === type)
  if (existing) return existing.id
  const created = await addCategory({ name, color, type, icon })
  return created.id
}

// ---------------------------------------------------------------------------
// Cards
// ---------------------------------------------------------------------------

function mapCardFromApi(c: any): Card {
  return {
    id: c.id,
    name: c.name,
    bankName: c.bankName as BankName,
    lastDigits: c.lastDigits,
    type: String(c.type).toLowerCase() as Card["type"],
    color: c.color,
    limit: c.limit != null ? Number(c.limit) : undefined,
    dueDate: c.dueDate ?? undefined,
    createdAt: c.createdAt,
    spentAmount: c.spentAmount != null ? Number(c.spentAmount) : undefined,
    calculatedBalance: c.calculatedBalance != null ? Number(c.calculatedBalance) : undefined,
  }
}

function mapCardToApi(c: Partial<Card>) {
  const body: Record<string, unknown> = {}
  if (c.name !== undefined) body.name = c.name
  if (c.bankName !== undefined) body.bankName = c.bankName
  if (c.lastDigits !== undefined) body.lastDigits = c.lastDigits
  if (c.type !== undefined) body.type = c.type.toUpperCase()
  if (c.color !== undefined) body.color = c.color
  if (c.limit !== undefined) body.limit = c.limit
  if (c.dueDate !== undefined) body.dueDate = c.dueDate
  return body
}

export async function getCards(): Promise<Card[]> {
  const ctx = getActiveAccountSelection()
  const raw = ctx.type === "partner" ? await familyApi.getMemberCards(ctx.id) : await fetchApi("/cards")
  return (raw || []).map(mapCardFromApi)
}

export async function addCard(card: Omit<Card, "id" | "createdAt">): Promise<Card> {
  assertWritable()
  const created = await fetchApi("/cards", { method: "POST", body: JSON.stringify(mapCardToApi(card)) })
  return mapCardFromApi(created)
}

export async function updateCard(id: string, updates: Partial<Card>): Promise<void> {
  assertWritable()
  await fetchApi(`/cards/${id}`, { method: "PUT", body: JSON.stringify(mapCardToApi(updates)) })
}

export async function deleteCard(id: string): Promise<void> {
  assertWritable()
  await fetchApi(`/cards/${id}`, { method: "DELETE" })
}

export async function getAccountBalance(cardId: string): Promise<number> {
  const cards = await getCards()
  return cards.find((c) => c.id === cardId)?.calculatedBalance ?? 0
}

// ---------------------------------------------------------------------------
// Transactions
// ---------------------------------------------------------------------------

function mapTransactionFromApi(t: any): Transaction {
  return {
    id: t.id,
    description: t.description,
    amount: Number(t.amount),
    type: String(t.type).toLowerCase() as Transaction["type"],
    categoryId: t.categoryId,
    date: t.date,
    recurrence: String(t.recurrence || "NONE").toLowerCase() as Transaction["recurrence"],
    installments: t.installments ?? undefined,
    currentInstallment: t.currentInstallment ?? undefined,
    parentId: t.parentId ?? undefined,
    status: String(t.status || "PAID").toLowerCase() as TransactionStatus,
    cardId: t.cardId ?? undefined,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
  }
}

function mapTransactionToApi(t: Partial<Transaction>) {
  const body: Record<string, unknown> = {}
  if (t.description !== undefined) body.description = t.description
  if (t.amount !== undefined) body.amount = t.amount
  if (t.type !== undefined) body.type = t.type.toUpperCase()
  if (t.status !== undefined) body.status = t.status.toUpperCase()
  if (t.date !== undefined) body.date = new Date(t.date).toISOString()
  if (t.recurrence !== undefined) body.recurrence = t.recurrence.toUpperCase()
  if (t.parentId !== undefined) body.parentId = t.parentId
  if (t.installments !== undefined) body.installments = t.installments
  if (t.currentInstallment !== undefined) body.currentInstallment = t.currentInstallment
  if (t.categoryId !== undefined) body.categoryId = t.categoryId
  if (t.cardId !== undefined) body.cardId = t.cardId
  return body
}

async function createTransactionApi(data: Partial<Transaction>): Promise<Transaction> {
  const created = await fetchApi("/transactions", { method: "POST", body: JSON.stringify(mapTransactionToApi(data)) })
  return mapTransactionFromApi(created)
}

export async function getTransactions(): Promise<Transaction[]> {
  const ctx = getActiveAccountSelection()
  const raw = ctx.type === "partner" ? await familyApi.getMemberTransactions(ctx.id) : await fetchApi("/transactions")
  return (raw || []).map(mapTransactionFromApi)
}

export async function addTransaction(
  transaction: Omit<Transaction, "id" | "createdAt" | "updatedAt">,
): Promise<Transaction> {
  assertWritable()

  const cards = await getCards()

  const transactionDate = new Date(transaction.date)
  transactionDate.setHours(0, 0, 0, 0)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const isOriginalFuture = transactionDate > today

  const selectedCard = transaction.cardId ? cards.find((c) => c.id === transaction.cardId) : null
  const isCreditCard = selectedCard?.type === "credit"

  const initialStatus: TransactionStatus = transaction.status
    ? transaction.status
    : isCreditCard || isOriginalFuture
      ? "pending"
      : "paid"

  // --- Parcelamento: cria a 1ª parcela, depois as demais referenciando o id real dela ---
  if (transaction.installments && transaction.installments > 1) {
    const totalAmount = transaction.amount
    const count = transaction.installments
    const installmentValue = Math.floor((totalAmount / count) * 100) / 100
    const remainder = Number((totalAmount - installmentValue * count).toFixed(2))
    const baseDate = new Date(transaction.date)

    const first = await createTransactionApi({
      ...transaction,
      amount: Number((installmentValue + remainder).toFixed(2)),
      date: baseDate.toISOString(),
      installments: count,
      currentInstallment: 1,
      status: "pending",
    })

    for (let i = 1; i < count; i++) {
      const currentDate = new Date(baseDate)
      currentDate.setMonth(currentDate.getMonth() + i)

      await createTransactionApi({
        ...transaction,
        amount: installmentValue,
        date: currentDate.toISOString(),
        parentId: first.id,
        installments: count,
        currentInstallment: i + 1,
        status: "pending",
      })
    }

    return first
  }

  // --- Recorrência: cria a transação "cabeça", depois 12 ocorrências futuras ---
  if (transaction.recurrence !== "none") {
    const baseDate = new Date(transaction.date)
    const head = await createTransactionApi({ ...transaction, status: initialStatus })

    for (let i = 1; i <= 12; i++) {
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

      recurringDate.setHours(0, 0, 0, 0)
      const isOccurrenceFuture = recurringDate > today
      const occurrenceStatus: TransactionStatus = isCreditCard || isOccurrenceFuture ? "pending" : "paid"

      await createTransactionApi({
        ...transaction,
        date: recurringDate.toISOString(),
        parentId: head.id,
        status: occurrenceStatus,
      })
    }

    return head
  }

  // --- Transação simples ---
  return createTransactionApi({ ...transaction, status: initialStatus })
}

export async function updateTransaction(id: string, updates: Partial<Transaction>): Promise<void> {
  assertWritable()
  await fetchApi(`/transactions/${id}`, { method: "PUT", body: JSON.stringify(mapTransactionToApi(updates)) })
}

// Apaga a transação. Se ela for a "cabeça" de um grupo de parcelas/recorrência,
// o backend já cancela as demais em cascata (FK onDelete: Cascade).
export async function deleteTransaction(id: string): Promise<void> {
  assertWritable()
  await fetchApi(`/transactions/${id}`, { method: "DELETE" })
}

export async function deleteAllTransactions(): Promise<void> {
  assertWritable()
  await fetchApi("/transactions", { method: "DELETE" })
}

export async function markTransactionAsPaid(id: string, cardId?: string, paidAt?: string): Promise<void> {
  assertWritable()
  await fetchApi(`/transactions/${id}/paid`, {
    method: "PATCH",
    body: JSON.stringify({ cardId, confirmDate: paidAt }),
  })
}

export async function cancelTransaction(id: string): Promise<void> {
  assertWritable()
  await fetchApi(`/transactions/${id}/cancel`, { method: "PATCH" })
}

export async function getPendingTransactions(): Promise<Transaction[]> {
  const transactions = await getTransactions()
  return transactions
    .filter((t) => t.status === "pending")
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
}

// ---------------------------------------------------------------------------
// Goals
// ---------------------------------------------------------------------------

function mapGoalFromApi(g: any): Goal {
  return {
    id: g.id,
    name: g.name,
    targetAmount: Number(g.targetAmount),
    currentAmount: Number(g.currentAmount),
    color: colorForId(g.id),
    icon: g.icon ?? undefined,
    deadline: g.deadline ?? undefined,
    createdAt: g.createdAt,
  }
}

function mapGoalToApi(g: Partial<Goal>) {
  const body: Record<string, unknown> = {}
  if (g.name !== undefined) body.name = g.name
  if (g.targetAmount !== undefined) body.targetAmount = g.targetAmount
  if (g.currentAmount !== undefined) body.currentAmount = g.currentAmount
  if (g.deadline !== undefined) body.deadline = g.deadline
  if (g.icon !== undefined) body.icon = g.icon
  return body
}

export async function getGoals(): Promise<Goal[]> {
  const ctx = getActiveAccountSelection()
  const raw = ctx.type === "partner" ? await familyApi.getMemberGoals(ctx.id) : await fetchApi("/goals")
  return (raw || []).map(mapGoalFromApi)
}

export async function addGoal(goal: Omit<Goal, "id" | "createdAt">): Promise<Goal> {
  assertWritable()
  const created = await fetchApi("/goals", { method: "POST", body: JSON.stringify(mapGoalToApi(goal)) })
  return mapGoalFromApi(created)
}

export async function updateGoal(id: string, updates: Partial<Goal>): Promise<void> {
  assertWritable()
  await fetchApi(`/goals/${id}`, { method: "PUT", body: JSON.stringify(mapGoalToApi(updates)) })
}

export async function deleteGoal(id: string): Promise<void> {
  assertWritable()
  await fetchApi(`/goals/${id}`, { method: "DELETE" })
}

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

function mapSettingsFromApi(s: any): AppSettings {
  return {
    spendingGoal: Number(s.spendingGoal),
    currency: s.currency,
    firstDayOfWeek: s.firstDayOfWeek,
    categoryGoals: Array.isArray(s.categoryGoals) ? s.categoryGoals : [],
  }
}

function mapSettingsToApi(s: Partial<AppSettings>) {
  const body: Record<string, unknown> = {}
  if (s.spendingGoal !== undefined) body.spendingGoal = s.spendingGoal
  if (s.currency !== undefined) body.currency = s.currency
  if (s.firstDayOfWeek !== undefined) body.firstDayOfWeek = s.firstDayOfWeek
  if (s.categoryGoals !== undefined) body.categoryGoals = s.categoryGoals
  return body
}

export async function getSettings(): Promise<AppSettings> {
  // Preferências (moeda, meta de gastos) são por conta que opera — não faz sentido
  // buscar as do parceiro, já que a tela de Configurações edita a conta ativa.
  if (isReadOnly()) return DEFAULT_SETTINGS
  const raw = await fetchApi("/settings")
  return mapSettingsFromApi(raw)
}

export async function setSettings(settings: Partial<AppSettings>): Promise<void> {
  assertWritable()
  await fetchApi("/settings", { method: "PUT", body: JSON.stringify(mapSettingsToApi(settings)) })
}

// ---------------------------------------------------------------------------
// Savings Goals (Reservas)
// ---------------------------------------------------------------------------

function mapSavingsFromApi(s: any): SavingsGoal {
  return {
    id: s.id,
    name: s.name,
    targetAmount: Number(s.targetAmount),
    currentAmount: Number(s.currentAmount),
    color: colorForId(s.id),
    icon: "PiggyBank",
    cardId: s.cardId ?? undefined,
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
  }
}

function mapSavingsToApi(s: Partial<SavingsGoal>) {
  const body: Record<string, unknown> = {}
  if (s.name !== undefined) body.name = s.name
  if (s.targetAmount !== undefined) body.targetAmount = s.targetAmount
  if (s.currentAmount !== undefined) body.currentAmount = s.currentAmount
  if (s.cardId !== undefined) body.cardId = s.cardId
  return body
}

export async function getSavingsGoals(): Promise<SavingsGoal[]> {
  const ctx = getActiveAccountSelection()
  const raw = ctx.type === "partner" ? await familyApi.getMemberSavings(ctx.id) : await fetchApi("/savings")
  return (raw || []).map(mapSavingsFromApi)
}

export async function addSavingsGoal(goal: Omit<SavingsGoal, "id" | "createdAt" | "updatedAt">): Promise<SavingsGoal> {
  assertWritable()
  const created = await fetchApi("/savings", { method: "POST", body: JSON.stringify(mapSavingsToApi(goal)) })
  return mapSavingsFromApi(created)
}

export async function updateSavingsGoal(id: string, updates: Partial<SavingsGoal>): Promise<void> {
  assertWritable()
  await fetchApi(`/savings/${id}`, { method: "PUT", body: JSON.stringify(mapSavingsToApi(updates)) })
}

export async function deleteSavingsGoal(id: string): Promise<void> {
  assertWritable()
  await fetchApi(`/savings/${id}`, { method: "DELETE" })
}

export async function addFundsToSavingsGoal(goalId: string, amount: number, cardId?: string): Promise<void> {
  assertWritable()
  const goals = await getSavingsGoals()
  const targetGoal = goals.find((g) => g.id === goalId)
  const finalCardId = cardId || targetGoal?.cardId

  await updateSavingsGoal(goalId, {
    currentAmount: (targetGoal?.currentAmount || 0) + amount,
    cardId: finalCardId,
  })

  if (finalCardId) {
    const categoryId = await ensureSystemCategory("Investimento", "expense", "#8b5cf6", "PiggyBank")
    await addTransaction({
      description: `Transferência para reserva: ${targetGoal?.name || "Meta"}`,
      amount,
      type: "expense",
      categoryId,
      date: new Date().toISOString(),
      recurrence: "none",
      cardId: finalCardId,
      status: "paid",
    })
  } else {
    console.warn("Transação de reserva criada sem conta vinculada (saldo não será afetado).")
  }
}

export async function removeFundsFromSavingsGoal(goalId: string, amount: number, cardId?: string): Promise<void> {
  assertWritable()
  const goals = await getSavingsGoals()
  const goal = goals.find((g) => g.id === goalId)
  if (!goal || goal.currentAmount < amount) return

  const finalCardId = cardId || goal.cardId

  await updateSavingsGoal(goalId, { currentAmount: goal.currentAmount - amount })

  if (finalCardId) {
    const categoryId = await ensureSystemCategory("Transferência", "income", "#3b82f6", "HandArrowDown")
    await addTransaction({
      description: `Retirada da reserva: ${goal.name}`,
      amount,
      type: "income",
      categoryId,
      date: new Date().toISOString(),
      recurrence: "none",
      cardId: finalCardId,
      status: "paid",
    })
  }
}

export { ensureSystemCategory, isReadOnly }
