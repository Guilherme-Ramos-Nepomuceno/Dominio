// Core type definitions for the finance app

export type TransactionType = "income" | "expense"
export type RecurrenceType = "none" | "daily" | "weekly" | "monthly" | "yearly"
export type TransactionStatus = "pending" | "paid" | "cancelled"
export type CardKind = "card" | "checking" | "savings"
export type PaymentMethod = "credit" | "debit"
export type BankName = "nubank" | "inter" | "itau" | "bradesco" | "santander" | "caixa" | "bb" | "alelo" | "other" | "cash"
export type PeriodType = "week" | "month" | "lastMonth"
// Quem/como definiu a categoria de uma transação (null = sem categoria ou
// transação anterior a esse controle).
export type CategorizedBy = "MANUAL" | "RULE" | "HISTORY" | "MERCHANT" | "PLUGGY" | "DICTIONARY"

export interface Category {
  id: string
  name: string
  color: string
  type: TransactionType
  icon?: string
  // Transferência entre contas / pagamento de fatura: dinheiro que sai de um
  // lado e entra no outro sem representar receita/despesa real — excluída dos
  // totais por essa flag em vez de comparar nome (só categorias de sistema,
  // via ensureSystemCategory, marcam isso).
  excludedFromTotals?: boolean
  // Categoria de sistema "Estorno" (uma por conta). Receita na conta, mas nos
  // totais desconta do gasto da categoria da compra (ver asSpending).
  isRefund?: boolean
}

export interface Transaction {
  id: string
  description: string
  amount: number
  type: TransactionType
  // null = "Sem categoria" (vai para a caixa de entrada "A classificar").
  categoryId: string | null
  date: string
  recurrence: RecurrenceType
  installments?: number
  currentInstallment?: number
  paidInstallments?: number 
  parentId?: string // For installment transactions
  status?: TransactionStatus
  cardId?: string // Added cardId to Transaction interface
  paymentMethod?: PaymentMethod // Só relevante p/ cartão combinado (crédito+débito)
  isCasal?: boolean // Marca uma despesa pessoal como do casal (aparece agregada na conta do casal)
  userId?: string // dono do lançamento (útil na conta do casal, que junta os dois)
  paidByUserId?: string | null // quem deu baixa pela conta do casal (null = o dono)
  refundCategoryId?: string | null // Estorno: de qual categoria de despesa ele desconta
  invoiceId?: string // Fatura (do cartão de crédito) em que essa despesa efetivamente entra
  // Import de extrato: descrição crua do banco (preservada mesmo se `description`
  // for editada) e id único do banco (FITID) — nulos em transações manuais.
  originalDescription?: string
  externalId?: string
  // Chave normalizada do estabelecimento (agrupa a caixa de entrada) e origem
  // da categorização — preenchidas pelo backend, só leitura no front.
  merchantKey?: string | null
  categorizedBy?: CategorizedBy | null
  createdAt: string
  updatedAt: string
}

// Import de extrato (OFX/CSV) — uma linha parseada do arquivo, antes de confirmar.
export interface ImportPreviewRow {
  externalId: string
  date: string
  amount: number
  type: TransactionType
  originalDescription: string
  suggestedDescription: string
  suggestedCategoryId: string | null
  isDuplicate: boolean
  // Detectado por um sufixo "N/M" na descrição (ex: "Loja X 03/12").
  installments?: number
  currentInstallment?: number
  // Pendência em aberto (mesmo cartão/conta e mês) que parece ser essa mesma
  // conta — ex: recorrência do "Wellhub" pré-cadastrada. Se confirmado, ela é
  // dada como paga em vez de criar uma transação nova.
  pendingMatch: { id: string; description: string; amount: number } | null
}

export interface Invoice {
  id: string
  cardId: string
  year: number
  month: number // 1-12
  closingDate: string // ISO
  dueDate: string // ISO
  // Fatura vinda do banco (Pluggy): total, quitação e a conta registrado /
  // aguardando revisão / não registrado. Nulo = fatura sem vínculo com banco.
  bank?: InvoiceBank | null
  // Cartão ligado ao banco, fatura aberta ou futura: parcelas de compras
  // antigas que o banco ainda não mandou (o banco já conta na fatura dele).
  projectedInstallments?: ProjectedInstallment[]
}

export interface ProjectedInstallment {
  sourceTransactionId: string
  description: string
  amount: number
  currentInstallment: number
  installments: number
  year: number
  month: number
}

// "É a mesma compra?": lançamento à mão × compra que veio do banco.
export interface ManualBankMatch {
  manual: { id: string; description: string; amount: number; date: string; currentInstallment: number | null; installments: number | null }
  bank: { id: string; description: string; originalDescription: string | null; amount: number; date: string }
}

export interface InvoiceBank {
  total: number
  paidAmount: number
  minimumPayment: number | null
  paid: boolean
  syncedAt: string | null
  registered: number
  awaitingReview: number
  unregistered: number
}

// Retrato do banco pra um cartão/conta vinculado à Pluggy.
export interface CardBank {
  account: { balance: number; syncedAt: string | null } | null
  credit: {
    used: number // limite em uso (o que está devido no cartão)
    limit: number | null
    available: number | null
    minimumPayment: number | null
    dueDate: string | null // AAAA-MM-DD
    syncedAt: string | null
  } | null
}

export interface CardTransaction extends Transaction {
  cardId?: string
}

export interface Goal {
  id: string
  name: string
  targetAmount: number
  // Soma do que as reservas separaram para este objetivo (vem da API).
  currentAmount: number
  color: string
  icon?: string
  deadline?: string
  createdAt: string
  // Quanto cada reserva separou para este objetivo.
  allocations?: { savingsGoalId: string; name: string; amount: number }[]
}

export interface SavingsGoal {
  id: string
  name: string
  targetAmount: number
  currentAmount: number
  color: string
  icon: string
  cardId?: string // Added cardId to track which card the savings are from
  isCasal?: boolean // Reserva compartilhada: entra inteira (com todo o histórico) na conta do casal
  // Tipo da reserva: EMERGENCIA, VIAGEM, CURTO_PRAZO, LONGO_PRAZO ou OUTRO (ver lib/goal-allocation.ts).
  kind?: string
  // Quanto desta reserva foi separado para cada objetivo. O que sobra é livre.
  allocatedTo?: { goalId: string; goalName: string; amount: number }[]
  // Investimentos do banco ligados a ela: com algum, o saldo vem do banco
  // (atualizado a cada sincronização) e não é editado à mão.
  bankInvestmentNames?: string[]
  // Reserva padrão "Guardado": recebe o dinheiro guardado que ainda não tem destino.
  isDefault?: boolean
  // Composição do saldo (ver lib/savings-composition.ts): partes de investimentos
  // do banco e fontes registradas pelo nome. O que sobra é "sem detalhar".
  bank?: { investmentId: string; name: string; amount: number }[]
  sources?: { id: string; name: string; amount: number; updatedAt: string }[]
  createdAt: string
  updatedAt: string
}

export interface Card {
  id: string
  name: string // Changed from 'name' to match existing usage
  bankName: BankName // Changed from 'bankName' to match existing usage
  lastDigits: string
  hasCredit: boolean
  hasDebit: boolean
  kind: CardKind
  color: string
  limit?: number
  dueDate?: number // Day of month (1-31)
  closingDate?: number // Dia de fechamento da fatura (1-31)
  createdAt: string
  spentAmount?: number // Calculado pelo backend (cartões de crédito, mês atual)
  calculatedBalance?: number // Calculado pelo backend (contas de débito)
  investmentTotal?: number // Calculado pelo backend (soma das Reservas vinculadas)
  bank?: CardBank | null // Vinculado à Pluggy: saldo/limite/fatura do banco
  // Cartão de crédito: a fatura aberta (a que recebe as compras de hoje) — o
  // que vai pagar no próximo vencimento. Ligado ao banco, só conta o que veio
  // do banco; lançamento manual fica em `manualExcluded`.
  openInvoice?: OpenInvoice | null
}

export interface OpenInvoice {
  year: number
  month: number
  closingDate: string // AAAA-MM-DD
  dueDate: string // AAAA-MM-DD
  total: number
  registered: number
  awaitingReview: number
  manualExcluded: number
  // Parcelas previstas (o banco ainda não mandou) — já somadas no total.
  projected: number
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
  // Dia em que o "mês" do plano começa (1–31). Ver lib/period.ts.
  monthStartDay?: number
  // Sobra/excesso da semana: ajusta as próximas (MONTH) ou fica nela (WEEK).
  weekCarryOver?: "MONTH" | "WEEK"
  // Sincronização direta: o que chega da Pluggy entra sem revisão.
  pluggyDirectSync?: boolean
  // Quais notificações push a pessoa quer receber (ver lib/push.ts).
  notificationPrefs?: { weekStart: boolean; weekly80: boolean; monthPlan: boolean; bankTransactions: boolean; bankConnection: boolean }
}

export interface CategoryGoal {
  categoryId: string
  percentage: number
}
