"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import {
  ArrowUpIcon,
  ArrowDownIcon,
  CalendarIcon,
  CreditCardIcon,
  TagIcon,
  WalletIcon,
  RepeatIcon,
  WarningCircle,
  PlusCircle,
  PiggyBank,
  Heart,
  ArrowsLeftRight,
} from "@phosphor-icons/react"
import * as PhosphorIcons from "@phosphor-icons/react"
import { addTransaction, getCategories, getCards, getMemberCardsMapped, getTransactions, getSavingsGoals, applySavingsGoalDelta, ensureSystemCategory } from "@/lib/storage"
import { transferToFamilyMember } from "@/lib/family"
import type { Category, Card, SavingsGoal, TransactionType, RecurrenceType } from "@/lib/types"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { getBankIcon } from "@/lib/bank-icons"
import { formatCurrency, parseCurrencyInput, formatCurrencyInput } from "@/lib/date-utils"
import { useAccount } from "@/components/account/account-context"
import { getCurrentUser } from "@/lib/auth"

import { useToast } from "@/hooks/use-toast"

// Categorias "de sistema" usadas quando a transação vem do fluxo de uma Reserva:
// despesa sempre aporta (Investimento), receita sempre saca (Saque) — nesse fluxo
// o usuário não escolhe a categoria manualmente, ela é implícita pelo tipo.
const RESERVE_CATEGORY_BY_TYPE: Record<TransactionType, { name: string; color: string; icon: string }> = {
  expense: { name: "Investimento", color: "#8b5cf6", icon: "PiggyBank" },
  income: { name: "Saque", color: "#3b82f6", icon: "HandCoins" },
}

const recurrenceOptions: { value: RecurrenceType; label: string }[] = [
  { value: "none", label: "Única" },
  { value: "daily", label: "Diária" },
  { value: "weekly", label: "Semanal" },
  { value: "monthly", label: "Mensal" },
  { value: "yearly", label: "Anual" },
]

export function TransactionForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [categories, setCategories] = useState<Category[]>([])
  const [cards, setCards] = useState<Card[]>([])
  const [goals, setGoals] = useState<SavingsGoal[]>([])
  const { toast } = useToast()
  const { family } = useAccount()
  const hasCoupleAccount = !!family?.members?.some((m) => m.accountType === "COUPLE")

  // Lido via useEffect (não direto no corpo do componente) para não pegar `null`
  // na primeira renderização (SSR/hidratação não tem acesso ao localStorage) —
  // isso já causou o parceiro errado (inclusive a própria conta) aparecer como
  // opção de transferência, já que `m.id !== currentUser?.id` nunca filtrava nada.
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  useEffect(() => {
    setCurrentUserId(getCurrentUser()?.id ?? null)
  }, [])
  const familyMembers = family?.members?.filter((m) => m.accountType === "PERSONAL" && m.id !== currentUserId) ?? []

  useEffect(() => {
    getCategories().then(setCategories)
    getCards().then(setCards)
    getSavingsGoals().then(setGoals)
  }, [])

  const hasDebitCard = cards.some((c) => c.hasDebit)

  const [type, setType] = useState<TransactionType>("expense")
  const [description, setDescription] = useState("")
  const [amount, setAmount] = useState("")
  const [categoryId, setCategoryId] = useState("")
  const [selectedGoalId, setSelectedGoalId] = useState("")
  // Inicializa com a data local correta
  const [date, setDate] = useState(() => {
    const now = new Date()
    // Ajuste para garantir YYYY-MM-DD local
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, "0")
    const day = String(now.getDate()).padStart(2, "0")
    return `${year}-${month}-${day}`
  })
  const [recurrence, setRecurrence] = useState<RecurrenceType>("none")
  const [installments, setInstallments] = useState("1")
  const [cardId, setCardId] = useState<string>("")
  const [paymentMethod, setPaymentMethod] = useState<"credit" | "debit" | "">("")
  const [isCasal, setIsCasal] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Transferência para a conta de um parceiro da família (ex: PIX pro cônjuge):
  // ativado quando a categoria "Transferência" é escolhida numa despesa. Se
  // confirmado, cria também a receita do outro lado (conta dele); se não, segue
  // como uma despesa comum mesmo.
  const [isFamilyTransfer, setIsFamilyTransfer] = useState(false)
  const [toMemberId, setToMemberId] = useState("")
  const [toCardId, setToCardId] = useState("")
  const [memberCards, setMemberCards] = useState<Card[]>([])

  const filteredCategories = categories.filter((cat) => cat.type === type)

  // Comparação de datas (apenas strings YYYY-MM-DD para evitar erro de fuso na UI)
  const todayStr = new Date().toLocaleDateString("sv-SE") // Hack confiável para YYYY-MM-DD local
  const isFutureTransaction = date > todayStr

  const isReserveShortcut = !!searchParams.get("goalId")
  const selectedCategory = categories.find((c) => c.id === categoryId)
  const isReserveCategory =
    isReserveShortcut || selectedCategory?.name === "Investimento" || selectedCategory?.name === "Saque"
  const selectedGoal = goals.find((g) => g.id === selectedGoalId)
  const linkedGoalCard = selectedGoal?.cardId ? cards.find((c) => c.id === selectedGoal.cardId) : undefined

  const isTransferCategory = type === "expense" && selectedCategory?.name === "Transferência" && familyMembers.length > 0

  const selectedCard = cardId ? cards.find((c) => c.id === cardId) : undefined
  const isComboCard = !!selectedCard?.hasCredit && !!selectedCard?.hasDebit && !isFamilyTransfer
  // Cartão de um tipo só: o lado é implícito. Cartão combinado: só é crédito se
  // foi essa a escolha explícita nos dois botões abaixo. Transferência para o
  // parceiro é sempre do lado débito, mesmo se o cartão escolhido for combinado.
  const isCreditCard = isFamilyTransfer ? false : isComboCard ? paymentMethod === "credit" : !!selectedCard?.hasCredit

  // Toda vez que troca de cartão, a escolha crédito/débito anterior não vale mais.
  useEffect(() => {
    setPaymentMethod("")
  }, [cardId])

  // Categoria deixou de ser "Transferência" (trocou tipo/categoria): desliga o
  // fluxo de transferência para o parceiro e limpa a seleção de destino.
  useEffect(() => {
    if (!isTransferCategory) {
      setIsFamilyTransfer(false)
      setToMemberId("")
      setToCardId("")
    }
  }, [isTransferCategory])

  // Só existe 1 parceiro possível na imensa maioria dos casos — seleciona
  // automaticamente ao ativar, mas continua trocável se houver mais de um.
  useEffect(() => {
    if (isFamilyTransfer && !toMemberId && familyMembers.length > 0) {
      setToMemberId(familyMembers[0].id)
    }
  }, [isFamilyTransfer, toMemberId, familyMembers])

  useEffect(() => {
    setToCardId("")
    if (!toMemberId) {
      setMemberCards([])
      return
    }
    let cancelled = false
    getMemberCardsMapped(toMemberId).then((memberAll) => {
      if (!cancelled) setMemberCards(memberAll.filter((c) => c.hasDebit))
    })
    return () => { cancelled = true }
  }, [toMemberId])

  useEffect(() => {
    const goalParam = searchParams.get("goalId")
    if (goalParam) setSelectedGoalId(goalParam)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // No fluxo de Reserva (chegou via link com goalId) a categoria não é escolhida
  // manualmente — despesa sempre é "Investimento", receita sempre é "Saque". Cria
  // a categoria de sistema na hora se a conta ainda não tiver uma.
  useEffect(() => {
    if (!isReserveShortcut || categories.length === 0) return

    const target = RESERVE_CATEGORY_BY_TYPE[type]
    const match = categories.find((c) => c.name === target.name && c.type === type)

    if (match) {
      if (categoryId !== match.id) setCategoryId(match.id)
      return
    }

    ensureSystemCategory(target.name, type, target.color, target.icon).then((id) => {
      getCategories().then(setCategories)
      setCategoryId(id)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, categories, isReserveShortcut])

  // Ao trocar de reserva, a conta usada passa a ser a vinculada a ela (se houver).
  // `goals` entra nas deps porque pode terminar de carregar depois da categoria
  // já estar marcada como reserva (fetches em paralelo, sem ordem garantida).
  useEffect(() => {
    if (!isReserveCategory) return
    setCardId(selectedGoal?.cardId || "")
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedGoalId, isReserveCategory, goals])

  const handleAmountChange = (value: string) => {
    const onlyNumbers = value.replace(/\D/g, "")
    setAmount(formatCurrencyInput(onlyNumbers))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (isSubmitting) return

    if (type === "income" && !hasDebitCard) {
      toast({
        title: "Erro",
        description: "Você precisa cadastrar uma conta/cartão de débito para receber valores.",
        variant: "destructive"
      })
      return
    }

    if (!description || !amount || !categoryId || !cardId) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios.",
        variant: "destructive"
      })
      return
    }

    if (isReserveCategory && !selectedGoalId) {
      toast({
        title: "Erro",
        description: "Selecione a reserva relacionada a esta transação.",
        variant: "destructive"
      })
      return
    }

    if (isFamilyTransfer && (!toMemberId || !toCardId)) {
      toast({
        title: "Erro",
        description: "Selecione a conta do parceiro para onde o dinheiro vai.",
        variant: "destructive"
      })
      return
    }

    if (isComboCard && !paymentMethod) {
      toast({
        title: "Erro",
        description: "Selecione se esta transação é no crédito ou no débito.",
        variant: "destructive"
      })
      return
    }

    const numAmount = parseCurrencyInput(amount)
    const numInstallments = Number.parseInt(installments)

    if (isNaN(numAmount) || numAmount <= 0) {
      toast({
        title: "Erro",
        description: "Valor inválido.",
        variant: "destructive"
      })
      return
    }

    if (isCreditCard && selectedCard?.limit) {
      const allTransactions = await getTransactions()
      const transactions = allTransactions.filter(
        (t) => t.cardId === cardId && (t.status === "paid" || t.status === "pending") && t.type === "expense",
      )
      const usedAmount = transactions.reduce((sum, t) => sum + t.amount, 0)
      const availableLimit = selectedCard.limit - usedAmount

      if (numAmount > availableLimit) {
        toast({
          title: "Erro",
          description: `Limite insuficiente no cartão ${selectedCard.name}.\n` +
            `Limite disponível: ${formatCurrency(availableLimit)}\n` +
            `Valor da transação: ${formatCurrency(numAmount)}`,
          variant: "destructive"
        })
        return
      }
    }

    const status = isCreditCard || isFutureTransaction ? "pending" : "paid"

    // --- CORREÇÃO DE DATA ---
    // Criamos a data usando o input (YYYY-MM-DD) e forçamos o horário para 12:00:00 (Meio-dia)
    // Isso garante que a data permaneça correta independente do fuso horário local.
    const [year, month, day] = date.split('-').map(Number);
    const dateObj = new Date(year, month - 1, day, 12, 0, 0);

    setIsSubmitting(true)
    try {
      if (isFamilyTransfer) {
        await transferToFamilyMember({
          fromCardId: cardId,
          toMemberId,
          toCardId,
          amount: numAmount,
          description: description || undefined,
        })

        toast({
          title: "Transferência enviada!",
          description: "O valor foi enviado para a conta do parceiro.",
          variant: "success"
        })
        router.push("/")
        return
      }

      await addTransaction({
        description,
        amount: numAmount,
        type,
        categoryId,
        date: dateObj.toISOString(), // Salva como ISO string segura
        recurrence,
        installments: recurrence === "none" && numInstallments > 1 ? numInstallments : undefined,
        cardId: cardId || undefined,
        paymentMethod: isComboCard && paymentMethod ? paymentMethod : undefined,
        status: status,
        isCasal: type === "expense" && !isReserveCategory ? isCasal : undefined,
      })

      // Reflete o lançamento no saldo da reserva — só quando já está pago; uma
      // transação futura/pendente ainda não moveu dinheiro de fato.
      if (isReserveCategory && selectedGoalId && status === "paid") {
        await applySavingsGoalDelta(selectedGoalId, numAmount, type === "expense" ? "add" : "remove", cardId || undefined)
      }

      toast({
        title: "Transação adicionada!",
        description: "Sua transação foi adicionada com sucesso.",
        variant: "success"
      })
      router.push("/")
    } catch (error: any) {
      toast({
        title: "Erro ao salvar",
        description: error.message || "Não foi possível salvar a transação.",
        variant: "destructive"
      })
      setIsSubmitting(false)
    }
  }

  const showIncomeWarning = type === "income" && !hasDebitCard;

  // Cartão, categoria, valor, título, data e recorrência são sempre obrigatórios
  // para habilitar o botão de salvar. Cartão combinado também exige a escolha
  // entre crédito/débito.
  const isFormValid =
    description.trim().length > 0 &&
    parseCurrencyInput(amount) > 0 &&
    !!categoryId &&
    !!cardId &&
    !!date &&
    !!recurrence &&
    (!isComboCard || !!paymentMethod) &&
    (!isFamilyTransfer || (!!toMemberId && !!toCardId))

  const renderCardOptions = (cardList: Card[]) =>
    cardList.map((card) => {
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
              •••• {card.lastDigits} {card.hasCredit && card.hasDebit ? " • Crédito + Débito" : card.hasCredit ? " • Crédito" : ""}
            </p>
          </div>
        </button>
      )
    })

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
            className="w-full max-w-xs h-12 rounded-[1vw] font-semibold text-background gap-2"
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
                inputMode="decimal"
                value={amount}
                onChange={(e) => handleAmountChange(e.target.value)}
                placeholder="0,00"
                className="w-full pl-12 pr-4 py-3 rounded-[1vw] bg-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary text-lg font-semibold"
                required
              />
            </div>
          </div>

          {/* Category — escondida no fluxo de Reserva, onde é implícita pelo tipo */}
          {!isReserveShortcut && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Categoria</label>
              <div className="grid grid-cols-2 gap-3">
                {filteredCategories.map((category) => {
                  const CategoryIcon = (category.icon && PhosphorIcons[category.icon as keyof typeof PhosphorIcons]) || PhosphorIcons.Circle
                  return (
                    <button
                      key={category.id}
                      type="button"
                      onClick={() => {
                        setCategoryId(category.id)
                        if (category.name !== "Investimento" && category.name !== "Saque") setSelectedGoalId("")
                      }}
                      className={cn(
                        "flex items-center gap-3 p-4 rounded-[1vw] border transition-all",
                        categoryId === category.id
                          ? "border-primary bg-primary/10 shadow-sm"
                          : "border-black/10 dark:border-white/10 bg-black/2 dark:bg-white/3 hover:bg-black/4 dark:hover:bg-white/6",
                      )}
                    >
                      <div className="w-10 h-10 flex items-center justify-center shrink-0 text-muted-foreground">
                        {/* @ts-ignore - Dynamic icon component */}
                        <CategoryIcon size={22} weight="duotone" />
                      </div>
                      <span className="text-sm font-medium text-foreground">{category.name}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Tag "do casal" — só para despesas normais (fora do fluxo de Reserva),
              já que aportes/investimentos compartilhados são marcados na própria Reserva,
              e só quando existe uma conta do casal de fato (senão não há pra onde replicar). */}
          {type === "expense" && !isReserveCategory && !isFamilyTransfer && hasCoupleAccount && (
            <button
              type="button"
              onClick={() => setIsCasal(!isCasal)}
              className={cn(
                "w-full flex items-center gap-3 p-4 rounded-[1vw] border transition-all text-left",
                isCasal
                  ? "border-primary bg-primary/10"
                  : "border-black/10 dark:border-white/10 bg-black/2 dark:bg-white/3 hover:bg-black/4 dark:hover:bg-white/6",
              )}
            >
              <div className={cn("w-10 h-10 flex items-center justify-center shrink-0 rounded-lg", isCasal ? "text-primary" : "text-muted-foreground")}>
                <Heart size={22} weight={isCasal ? "fill" : "duotone"} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">Despesa do casal</p>
                <p className="text-xs text-muted-foreground">Aparece também na conta do casal, mesmo paga por um cartão pessoal</p>
              </div>
              <div className={cn("w-11 h-6 rounded-full transition-colors shrink-0 relative", isCasal ? "bg-primary" : "bg-muted")}>
                <div className={cn("absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all", isCasal ? "left-5" : "left-0.5")} />
              </div>
            </button>
          )}

          {/* Reserva (categoria Investimento/Saque) */}
          {isReserveCategory && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground flex items-center gap-2">
                <PiggyBank size={16} weight="bold" />
                Reserva
              </label>
              {isReserveShortcut && (
                <p className="text-xs text-muted-foreground">
                  Categoria aplicada automaticamente: {type === "expense" ? "Investimento" : "Saque"}
                </p>
              )}
              <select
                value={selectedGoalId}
                onChange={(e) => setSelectedGoalId(e.target.value)}
                className="w-full px-4 py-3 rounded-[1vw] bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                required
              >
                <option value="">Selecione a reserva...</option>
                {goals.map((goal) => (
                  <option key={goal.id} value={goal.id}>
                    {goal.name}
                  </option>
                ))}
              </select>
              {goals.length === 0 && (
                <p className="text-xs text-muted-foreground">Nenhuma reserva cadastrada ainda.</p>
              )}
            </div>
          )}

          {/* Card */}
          {isReserveCategory ? (
            selectedGoal && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground flex items-center gap-2">
                  <WalletIcon size={16} weight="bold" />
                  Conta/Cartão
                </label>
                {linkedGoalCard ? (
                  <div className="flex items-center gap-3 p-3 rounded-[1vw] border-2 border-primary bg-primary/5">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: linkedGoalCard.color + "20" }}
                    >
                      {(() => {
                        const BankIcon = getBankIcon(linkedGoalCard.bankName)
                        return <BankIcon size={24} color={linkedGoalCard.color} weight="fill" />
                      })()}
                    </div>
                    <div className="flex-1 text-left">
                      <p className="text-sm font-medium text-foreground">{linkedGoalCard.name}</p>
                      <p className="text-xs text-muted-foreground">
                        •••• {linkedGoalCard.lastDigits} • Vinculado à reserva
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-2">
                    {renderCardOptions(cards.filter((c) => type === "expense" || c.hasDebit))}
                  </div>
                )}
              </div>
            )
          ) : (
            cards.length > 0 && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground flex items-center gap-2">
                  <WalletIcon size={16} weight="bold" />
                  {isFamilyTransfer ? "De qual conta (minha)?" : "Conta/Cartão"}
                </label>
                <div className="grid grid-cols-1 gap-2">
                  {/* Se for Receita ou transferência p/ parceiro, só cartões de débito. Se for Despesa comum, mostra todos */}
                  {renderCardOptions(cards.filter((c) => (type === "expense" && !isFamilyTransfer) || c.hasDebit))}
                </div>
              </div>
            )
          )}

          {/* Transferência para a conta de um parceiro (ex: PIX pro cônjuge) — só
              aparece quando a categoria escolhida é "Transferência". Se confirmado,
              some com o pagamento normal e cria a receita do outro lado também. */}
          {isTransferCategory && (
            <button
              type="button"
              onClick={() => setIsFamilyTransfer(!isFamilyTransfer)}
              className={cn(
                "w-full flex items-center gap-3 p-4 rounded-[1vw] border transition-all text-left",
                isFamilyTransfer
                  ? "border-primary bg-primary/10"
                  : "border-black/10 dark:border-white/10 bg-black/2 dark:bg-white/3 hover:bg-black/4 dark:hover:bg-white/6",
              )}
            >
              <div className={cn("w-10 h-10 flex items-center justify-center shrink-0 rounded-lg", isFamilyTransfer ? "text-primary" : "text-muted-foreground")}>
                <ArrowsLeftRight size={22} weight={isFamilyTransfer ? "fill" : "duotone"} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">É para uma conta do parceiro?</p>
                <p className="text-xs text-muted-foreground">
                  {familyMembers.length === 1
                    ? `Confirme selecionando a conta de ${familyMembers[0].name || familyMembers[0].email}`
                    : "Confirme selecionando quem e qual conta recebe"}
                </p>
              </div>
              <div className={cn("w-11 h-6 rounded-full transition-colors shrink-0 relative", isFamilyTransfer ? "bg-primary" : "bg-muted")}>
                <div className={cn("absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all", isFamilyTransfer ? "left-5" : "left-0.5")} />
              </div>
            </button>
          )}

          {isFamilyTransfer && (
            <div className="space-y-4">
              {familyMembers.length > 1 && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Para qual parceiro?</label>
                  <div className="grid grid-cols-1 gap-2">
                    {familyMembers.map((member) => (
                      <button
                        key={member.id}
                        type="button"
                        onClick={() => setToMemberId(member.id)}
                        className={cn(
                          "p-3 rounded-[1vw] border-2 text-left text-sm font-medium transition-all",
                          toMemberId === member.id ? "border-primary bg-primary/5 text-foreground" : "border-border bg-card text-muted-foreground hover:bg-muted",
                        )}
                      >
                        {member.name || member.email}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground flex items-center gap-2">
                  <WalletIcon size={16} weight="bold" />
                  Conta de destino
                </label>
                {memberCards.length === 0 ? (
                  <p className="text-xs text-muted-foreground p-3 rounded-[1vw] border border-dashed border-border">
                    Essa pessoa ainda não tem uma conta de débito cadastrada.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 gap-2">
                    {memberCards.map((card) => {
                      const BankIcon = getBankIcon(card.bankName)
                      return (
                        <button
                          key={card.id}
                          type="button"
                          onClick={() => setToCardId(toCardId === card.id ? "" : card.id)}
                          className={cn(
                            "flex items-center gap-3 p-3 rounded-[1vw] border-2 transition-all",
                            toCardId === card.id
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
                            <p className="text-xs text-muted-foreground">•••• {card.lastDigits}</p>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Cartão combinado (crédito + débito): pergunta de que lado é essa transação */}
          {isComboCard && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground flex items-center gap-2">
                <CreditCardIcon size={16} weight="bold" />
                Essa transação é no crédito ou no débito?
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setPaymentMethod("debit")}
                  className={cn(
                    "p-3 rounded-[1vw] border-2 transition-all font-medium",
                    paymentMethod === "debit"
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-card text-muted-foreground",
                  )}
                >
                  Débito
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod("credit")}
                  className={cn(
                    "p-3 rounded-[1vw] border-2 transition-all font-medium",
                    paymentMethod === "credit"
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-card text-muted-foreground",
                  )}
                >
                  Crédito
                </button>
              </div>
            </div>
          )}

          {/* Date, recorrência e parcelas não se aplicam a uma transferência para o
              parceiro (sempre um lançamento único e imediato, igual à página /transfer). */}
          {!isFamilyTransfer && (
            <>
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
              className="block w-full min-w-0 max-w-full box-border appearance-none px-4 py-3 rounded-[1vw] bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              required
            />
          </div>

          {/* Recurrence + Installments */}
          <div className="grid grid-cols-2 gap-3">
            <div className={cn("space-y-2", recurrence !== "none" && "col-span-2")}>
              <label className="text-sm font-medium text-foreground flex items-center gap-2">
                <RepeatIcon size={16} weight="bold" />
                Recorrência
              </label>
              <select
                value={recurrence}
                onChange={(e) => {
                  const val = e.target.value as RecurrenceType;
                  setRecurrence(val)
                  if (val !== 'none') {
                    setInstallments("1") // Reseta parcelas se for recorrente
                  }
                }}
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
                  onChange={(e) => {
                    const val = e.target.value;
                    setInstallments(val)
                    if (Number(val) > 1) {
                      setRecurrence("none") // Redundante pois o campo some, mas for safety
                    }
                  }}
                  className="w-full px-4 py-3 rounded-[1vw] bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            )}
          </div>
          {recurrence === "none" && Number.parseInt(installments) > 1 && (
            <p className="text-xs text-muted-foreground -mt-4">
              {installments}x de {formatCurrency(parseCurrencyInput(amount) / Number.parseInt(installments) || 0)}
            </p>
          )}
            </>
          )}

          {(isFutureTransaction || isCreditCard) && (
            <div className="p-4 rounded-[1vw] bg-primary/10 border border-primary/20">
              <p className="text-sm text-primary font-medium">
                {isCreditCard
                  ? "Compra no crédito: Será registrada como fatura pendente e não afetará seu saldo até o pagamento da fatura."
                  : "Transação futura: Será registrada como pendente e não afetará seu saldo até ser marcada como paga."}
              </p>
            </div>
          )}

          {/* Submit Button */}
          <div className="flex gap-2 sm:gap-3 pt-4 pb-4 md:pb-0">
            <Button
              type="button"
              className="flex-1 min-w-0 h-12 px-2 sm:px-4 rounded-[1vw] bg-background text-foreground hover:bg-background/70 truncate"
              onClick={() => {
                toast({ title: "Operação cancelada", description: "O lançamento não foi salvo.", variant: "default" })
                router.push("/")
              }}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !isFormValid}
              className={cn(
                "flex-1 min-w-0 h-12 px-2 sm:px-4 rounded-[1vw] font-semibold truncate",
                isFormValid
                  ? "text-background disabled:opacity-60"
                  : "bg-muted text-muted-foreground hover:bg-muted disabled:opacity-100 cursor-not-allowed",
              )}
            >
              {isSubmitting ? "Salvando..." : "Salvar Transação"}
            </Button>
          </div>
        </>
      )}
    </form>
  )
}