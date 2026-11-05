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
import { addTransaction, getCategories, getCards, getMemberCardsMapped, getTransactions, getSavingsGoals, applySavingsGoalDelta, ensureSystemCategory, suggestCategory } from "@/lib/storage"
import { CardChips, CategoryChip, Chip, ChipRow, DateChips, FieldLabel, PaymentMethodToggle } from "@/components/transaction-inputs/transaction-inputs"
import { transferToFamilyMember } from "@/lib/family"
import type { Category, Card, SavingsGoal, TransactionType, RecurrenceType } from "@/lib/types"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { getBankIcon } from "@/lib/bank-icons"
import { formatCurrency, parseCurrencyInput, formatCurrencyInput } from "@/lib/date-utils"
import { useAccount } from "@/components/account/account-context"
import { getCurrentUser } from "@/lib/auth"

import { useToast } from "@/hooks/use-toast"
import { trackEvent } from "@/lib/events"
import { setLastUsedCardId } from "@/lib/preferences"
import { amountToCents, parseNewTransactionPrefill } from "@/lib/quick-add"
import { AppSelect } from "@/components/ui/app-select"

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
  // As mais registradas primeiro (mesma ordem das pílulas do registro rápido).
  const [frequent, setFrequent] = useState<string[]>([])
  useEffect(() => {
    let cancelled = false
    suggestCategory("", type)
      .then((r) => !cancelled && setFrequent(r.frequent))
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [type])
  const rankOf = (id: string) => {
    const i = frequent.indexOf(id)
    return i === -1 ? Number.MAX_SAFE_INTEGER : i
  }
  const orderedCategories = filteredCategories
    .slice()
    .sort((a, b) => rankOf(a.id) - rankOf(b.id) || a.name.localeCompare(b.name, "pt-BR"))

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

  // "Mais opções" do registro rápido: chega aqui com o que já foi digitado lá
  // (valor, descrição, conta, data, categoria) na URL.
  useEffect(() => {
    if (searchParams.get("goalId")) return
    const prefill = parseNewTransactionPrefill(searchParams)
    if (prefill.type) setType(prefill.type)
    if (prefill.description) setDescription(prefill.description)
    if (prefill.amount) setAmount(formatCurrencyInput(String(amountToCents(prefill.amount))))
    if (prefill.date) setDate(prefill.date)
    if (prefill.categoryId) setCategoryId(prefill.categoryId)
    // O reset de paymentMethod ao trocar de cartão roda depois deste efeito
    // — não tem problema, cartão combinado pede a escolha de novo de todo jeito.
    if (prefill.cardId) setCardId(prefill.cardId)
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

    ensureSystemCategory(target.name, type, target.color, target.icon, false).then((id) => {
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

    // Categoria é opcional — sem ela, a transação vai para "A classificar".
    if (!description || !amount || !cardId) {
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
        categoryId: categoryId || null,
        date: dateObj.toISOString(), // Salva como ISO string segura
        recurrence,
        installments: recurrence === "none" && numInstallments > 1 ? numInstallments : undefined,
        cardId: cardId || undefined,
        paymentMethod: isComboCard && paymentMethod ? paymentMethod : undefined,
        status: status,
        isCasal: type === "expense" && !isReserveCategory ? isCasal : undefined,
      })

      trackEvent("transaction_created", { source: "full", hasCategory: !!categoryId })
      setLastUsedCardId(cardId)

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

  // Cartão, valor, título, data e recorrência são sempre obrigatórios (categoria
  // é opcional — sem ela a transação vai para "A classificar")
  // para habilitar o botão de salvar. Cartão combinado também exige a escolha
  // entre crédito/débito.
  const isFormValid =
    description.trim().length > 0 &&
    parseCurrencyInput(amount) > 0 &&
    !!cardId &&
    !!date &&
    !!recurrence &&
    (!isComboCard || !!paymentMethod) &&
    (!isFamilyTransfer || (!!toMemberId && !!toCardId))

  const renderCardOptions = (cardList: Card[]) => (
    <CardChips cards={cardList} value={cardId || null} onChange={(id) => setCardId(id ?? "")} wrap />
  )

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Despesa / receita */}
      <div role="radiogroup" aria-label="Tipo" className="inline-flex rounded-full bg-muted/50 p-0.5 text-sm font-semibold">
        {(["expense", "income"] as const).map((t) => (
          <button
            key={t}
            type="button"
            role="radio"
            aria-checked={type === t}
            onClick={() => {
              // Categoria escolhida é de um tipo só — trocar o tipo desmarca.
              if (type !== t && !isReserveShortcut) setCategoryId("")
              setType(t)
            }}
            className={cn(
              "flex items-center gap-1.5 rounded-full px-4 py-1.5 transition-colors",
              type === t ? (t === "income" ? "bg-income text-white" : "bg-expense text-white") : "text-muted-foreground",
            )}
          >
            {t === "income" ? <ArrowUpIcon weight="bold" size={14} /> : <ArrowDownIcon weight="bold" size={14} />}
            {t === "income" ? "Receita" : "Despesa"}
          </button>
        ))}
      </div>

      {/* BLOCO DE AVISO - Se não tiver conta para receber */}
      {showIncomeWarning ? (
        <div className="flex flex-col items-center justify-center py-8 px-4 text-center space-y-6">
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
          {/* Valor em destaque, descrição embaixo */}
          <div className="space-y-3">
            <label className="block">
              <span className="sr-only">Valor</span>
              <span className="flex items-baseline gap-2 border-b border-border pb-2 focus-within:border-foreground">
                <span className="text-2xl font-semibold text-muted-foreground">R$</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={amount}
                  onChange={(e) => handleAmountChange(e.target.value)}
                  placeholder="0,00"
                  className="w-full min-w-0 bg-transparent text-4xl font-semibold tabular-nums tracking-tight text-foreground placeholder:text-muted-foreground/50 focus:outline-none"
                  required
                />
              </span>
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descrição (ex: almoço, conta de luz)"
              aria-label="Descrição"
              className="w-full px-4 py-3 rounded-xl bg-muted/40 border border-transparent text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              required
            />
          </div>

          {/* Category — escondida no fluxo de Reserva, onde é implícita pelo tipo */}
          {!isReserveShortcut && (
            <div className="space-y-2">
              <FieldLabel hint={categoryId ? "Toque de novo para desmarcar" : "Opcional, sem categoria vai para A classificar"}>Categoria</FieldLabel>
              <ChipRow wrap>
                {orderedCategories.map((category) => (
                  <CategoryChip
                    key={category.id}
                    category={category}
                    selected={categoryId === category.id}
                    onClick={() => {
                      if (categoryId === category.id) {
                        setCategoryId("")
                        setSelectedGoalId("")
                        return
                      }
                      setCategoryId(category.id)
                      if (category.name !== "Investimento" && category.name !== "Saque") setSelectedGoalId("")
                    }}
                  />
                ))}
              </ChipRow>
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
                "w-full flex items-center gap-3 py-3 border-y border-border text-left",
              )}
            >
              <div className={cn("flex items-center justify-center shrink-0", isCasal ? "text-primary" : "text-muted-foreground")}>
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
              <FieldLabel>Reserva</FieldLabel>
              {isReserveShortcut && (
                <p className="text-xs text-muted-foreground">
                  Categoria aplicada automaticamente: {type === "expense" ? "Investimento" : "Saque"}
                </p>
              )}
              <AppSelect
                aria-label="Reserva"
                value={selectedGoalId}
                onChange={setSelectedGoalId}
                placeholder="Selecione a reserva..."
                options={goals.map((goal) => ({ value: goal.id, label: goal.name }))}
                required
              />
              {goals.length === 0 && (
                <p className="text-xs text-muted-foreground">Nenhuma reserva cadastrada ainda.</p>
              )}
            </div>
          )}

          {/* Card */}
          {isReserveCategory ? (
            selectedGoal && (
              <div className="space-y-2">
                <FieldLabel>Conta</FieldLabel>
                {linkedGoalCard ? (
                  <p className="flex items-center gap-2 text-sm text-foreground">
                    {(() => {
                      const BankIcon = getBankIcon(linkedGoalCard.bankName)
                      return <BankIcon size={16} color={linkedGoalCard.color} weight="fill" />
                    })()}
                    {linkedGoalCard.name}
                    <span className="text-muted-foreground">· vinculada à reserva</span>
                  </p>
                ) : (
                  renderCardOptions(cards.filter((c) => type === "expense" || c.hasDebit))
                )}
              </div>
            )
          ) : (
            cards.length > 0 && (
              <div className="space-y-2">
                <FieldLabel
                  hint={isComboCard ? <PaymentMethodToggle value={paymentMethod as "credit" | "debit" | undefined} onChange={setPaymentMethod} /> : undefined}
                >
                  {isFamilyTransfer ? "De qual conta (minha)?" : "Conta"}
                </FieldLabel>
                {/* Receita ou transferência p/ parceiro: só contas com débito. Despesa comum: todas */}
                {renderCardOptions(cards.filter((c) => (type === "expense" && !isFamilyTransfer) || c.hasDebit))}
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
                "w-full flex items-center gap-3 py-3 border-y border-border text-left",
              )}
            >
              <div className={cn("flex items-center justify-center shrink-0", isFamilyTransfer ? "text-primary" : "text-muted-foreground")}>
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
                  <FieldLabel>Para qual parceiro?</FieldLabel>
                  <ChipRow wrap>
                    {familyMembers.map((member) => (
                      <Chip key={member.id} selected={toMemberId === member.id} onClick={() => setToMemberId(member.id)}>
                        {member.name || member.email}
                      </Chip>
                    ))}
                  </ChipRow>
                </div>
              )}

              <div className="space-y-2">
                <FieldLabel>Conta de destino</FieldLabel>
                {memberCards.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    Essa pessoa ainda não tem uma conta de débito cadastrada.
                  </p>
                ) : (
                  <CardChips cards={memberCards} value={toCardId || null} onChange={(id) => setToCardId(id ?? "")} wrap />
                )}
              </div>
            </div>
          )}

          {/* Date, recorrência e parcelas não se aplicam a uma transferência para o
              parceiro (sempre um lançamento único e imediato, igual à página /transfer). */}
          {!isFamilyTransfer && (
            <>
          {/* Data */}
          <div className="space-y-2">
            <FieldLabel>Quando</FieldLabel>
            <DateChips value={date} onChange={setDate} />
          </div>

          {/* Repetição e parcelas */}
          <div className="space-y-2">
            <FieldLabel>Repete?</FieldLabel>
            <ChipRow wrap>
              {recurrenceOptions.map((option) => (
                <Chip
                  key={option.value}
                  selected={recurrence === option.value}
                  onClick={() => {
                    setRecurrence(option.value)
                    if (option.value !== "none") setInstallments("1") // recorrente não parcela
                  }}
                >
                  {option.value === "none" ? "Não repete" : option.label}
                </Chip>
              ))}
            </ChipRow>
          </div>

          {recurrence === "none" && (
            <div className="space-y-2">
              <FieldLabel hint={Number.parseInt(installments) > 1 ? `${installments}x de ${formatCurrency(parseCurrencyInput(amount) / Number.parseInt(installments) || 0)}` : undefined}>
                Parcelas
              </FieldLabel>
              <div className="inline-flex items-center rounded-full bg-muted/50">
                <button
                  type="button"
                  onClick={() => setInstallments(String(Math.max(1, (Number.parseInt(installments) || 1) - 1)))}
                  className="h-9 w-10 text-lg text-muted-foreground hover:text-foreground"
                  aria-label="Menos uma parcela"
                >
                  −
                </button>
                <input
                  type="number"
                  min="1"
                  max="60"
                  value={installments}
                  onChange={(e) => setInstallments(e.target.value)}
                  aria-label="Parcelas"
                  className="w-12 bg-transparent text-center text-sm font-semibold tabular-nums text-foreground focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
                />
                <button
                  type="button"
                  onClick={() => setInstallments(String(Math.min(60, (Number.parseInt(installments) || 1) + 1)))}
                  className="h-9 w-10 text-lg text-muted-foreground hover:text-foreground"
                  aria-label="Mais uma parcela"
                >
                  +
                </button>
              </div>
            </div>
          )}
            </>
          )}

          {(isFutureTransaction || isCreditCard) && (
            <p className="flex items-start gap-2 text-xs text-muted-foreground">
              <PhosphorIcons.Info size={14} weight="bold" className="mt-0.5 shrink-0" aria-hidden />
              {isCreditCard
                ? "No crédito: entra na fatura e só sai do saldo quando a fatura for paga."
                : "Data futura: fica pendente e só sai do saldo quando for marcada como paga."}
            </p>
          )}

          {/* Submit Button */}
          <div className="flex gap-2 sm:gap-3 pt-4 pb-4 md:pb-0">
            <Button
              type="button"
              variant="ghost"
              className="flex-1 min-w-0 h-12 px-2 sm:px-4 rounded-2xl text-muted-foreground truncate"
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
                "flex-1 min-w-0 h-12 px-2 sm:px-4 rounded-2xl font-semibold truncate",
                isFormValid
                  ? "text-background disabled:opacity-60"
                  : "bg-muted text-muted-foreground hover:bg-muted disabled:opacity-100 cursor-not-allowed",
              )}
            >
              {isSubmitting ? "Salvando..." : type === "income" ? "Salvar receita" : "Salvar despesa"}
            </Button>
          </div>
        </>
      )}
    </form>
  )
}