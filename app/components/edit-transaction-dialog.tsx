"use client"

import { useEffect, useState } from "react"
import { TagIcon, Heart, ArrowLeft, ArrowRight } from "@phosphor-icons/react"
import { cn } from "@/lib/utils"
import { formatCurrencyInput, parseCurrencyInput } from "@/lib/date-utils"
import { getCategories, getCards, updateTransaction, moveTransactionInvoice } from "@/lib/storage"
import type { Category, Transaction, Card, PaymentMethod } from "@/lib/types"
import { useToast } from "@/hooks/use-toast"
import { useAccount } from "@/components/account/account-context"
import { AutoCategoryBadge } from "@/components/rules/auto-category-badge"
import { autoCategorizedLabel, isAutoCategorized } from "@/lib/rules"
import { FormSheet, SheetPrimaryButton, UnderlineInput } from "@/components/ui/form-sheet"
import { CategoryChip, Chip, ChipRow, DateChips, FieldLabel, PaymentMethodToggle } from "@/components/transaction-inputs/transaction-inputs"

interface EditTransactionDialogProps {
  transaction: Transaction | null
  onClose: () => void
  onSaved: () => void
}

export function EditTransactionDialog({ transaction, onClose, onSaved }: EditTransactionDialogProps) {
  const { toast } = useToast()
  const { family } = useAccount()
  const hasCoupleAccount = !!family?.members?.some((m) => m.accountType === "COUPLE")
  const [categories, setCategories] = useState<Category[]>([])
  const [cards, setCards] = useState<Card[]>([])
  const [description, setDescription] = useState("")
  const [amount, setAmount] = useState("")
  const [categoryId, setCategoryId] = useState("")
  // Estorno: de qual categoria de despesa ele desconta ("" = no próprio Estorno).
  const [refundCategoryId, setRefundCategoryId] = useState("")
  const [date, setDate] = useState("")
  const [isCasal, setIsCasal] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | "">("")
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (!transaction) return
    getCategories().then(setCategories)
    getCards().then(setCards)
    setDescription(transaction.description)
    setAmount(formatCurrencyInput(Math.round(transaction.amount * 100).toString()))
    setCategoryId(transaction.categoryId ?? "")
    setRefundCategoryId(transaction.refundCategoryId ?? "")
    setDate(transaction.date.split("T")[0])
    setIsCasal(!!transaction.isCasal)
    setPaymentMethod(transaction.paymentMethod ?? "")
  }, [transaction])

  if (!transaction) return null

  const filteredCategories = categories.filter((c) => c.type === transaction.type)
  const isRefund = !!categories.find((c) => c.id === categoryId)?.isRefund
  // Destino do estorno: categorias de despesa de verdade (fora transferência).
  const refundTargets = categories.filter((c) => c.type === "expense" && !c.excludedFromTotals && !c.isRefund)
  const selectedCard = cards.find((c) => c.id === transaction.cardId)
  const isComboCard = !!selectedCard?.hasCredit && !!selectedCard?.hasDebit
  // Fatura de credito so existe se o cartao tem credito e, num combinado,
  // essa transacao especifica esta do lado credito.
  const belongsToInvoice = transaction.type === "expense" && !!selectedCard?.hasCredit && (!selectedCard.hasDebit || paymentMethod === "credit")

  const handleAmountChange = (value: string) => {
    const onlyNumbers = value.replace(/\D/g, "")
    setAmount(formatCurrencyInput(onlyNumbers))
  }

  const handleSubmit = async () => {
    const numAmount = parseCurrencyInput(amount)
    // Categoria é opcional: sem ela, a transação continua em "A classificar".
    if (!description.trim() || isNaN(numAmount) || numAmount <= 0 || !date) {
      toast({ title: "Falta algo", description: "Preencha descrição, valor e data.", variant: "destructive" })
      return
    }

    if (isComboCard && !paymentMethod) {
      toast({ title: "Falta algo", description: "Escolha se foi no crédito ou no débito.", variant: "destructive" })
      return
    }

    const [year, month, day] = date.split("-").map(Number)
    const dateObj = new Date(year, month - 1, day, 12, 0, 0)

    setIsSaving(true)
    try {
      await updateTransaction(transaction.id, {
        description: description.trim(),
        amount: numAmount,
        // "Sem categoria" envia null — a transação volta para "A classificar".
        categoryId: categoryId || null,
        ...(isRefund ? { refundCategoryId: refundCategoryId || null } : {}),
        date: dateObj.toISOString(),
        isCasal: transaction.type === "expense" ? isCasal : undefined,
        paymentMethod: isComboCard ? (paymentMethod as PaymentMethod) : undefined,
      })
      toast({ title: "Lançamento atualizado", variant: "success" })
      onSaved()
      onClose()
    } catch (error: any) {
      toast({ title: "Erro ao salvar", description: error.message || "Não foi possível atualizar a transação.", variant: "destructive" })
    } finally {
      setIsSaving(false)
    }
  }

  // Categoria automática: desfazer manda o lançamento de volta para "A classificar".
  const handleUndoAutoCategory = async () => {
    setIsSaving(true)
    try {
      await updateTransaction(transaction.id, { categoryId: null })
      toast({ title: "Categoria desfeita", description: "O lançamento voltou para A classificar.", variant: "success" })
      onSaved()
      onClose()
    } catch (error: any) {
      toast({ title: "Não foi possível desfazer", description: error.message || "Tente novamente.", variant: "destructive" })
    } finally {
      setIsSaving(false)
    }
  }

  const handleMoveInvoice = async (direction: "next" | "previous") => {
    setIsSaving(true)
    try {
      await moveTransactionInvoice(transaction.id, direction)
      toast({
        title: direction === "next" ? "Movida para a fatura seguinte" : "Movida para a fatura anterior",
        variant: "success",
      })
      onSaved()
      onClose()
    } catch (error: any) {
      toast({ title: "Não foi possível mover", description: error.message || "Tente novamente.", variant: "destructive" })
    } finally {
      setIsSaving(false)
    }
  }

  const isExpense = transaction.type === "expense"
  const keepAutoBadge = isAutoCategorized(transaction) && categoryId === transaction.categoryId

  return (
    <FormSheet
      title={isExpense ? "Editar despesa" : "Editar receita"}
      onClose={onClose}
      onSubmit={(e) => {
        e.preventDefault()
        handleSubmit()
      }}
      footer={<SheetPrimaryButton disabled={isSaving}>{isSaving ? "Salvando..." : "Salvar"}</SheetPrimaryButton>}
    >
      {/* Valor + descrição */}
      <div className="space-y-3">
        <label className="flex items-baseline gap-2">
          <span className="text-lg font-semibold text-muted-foreground">R$</span>
          <span className="sr-only">Valor</span>
          <input
            type="text"
            inputMode="decimal"
            value={amount}
            onChange={(e) => handleAmountChange(e.target.value)}
            className={cn(
              "w-full bg-transparent text-4xl font-semibold tabular-nums focus:outline-none",
              isExpense ? "text-foreground" : "text-income",
            )}
          />
        </label>
        <label className="block">
          <span className="sr-only">Descrição</span>
          <UnderlineInput value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Descrição" />
        </label>
      </div>

      {/* Categoria */}
      <div className="space-y-3">
        <FieldLabel>Categoria</FieldLabel>
        {keepAutoBadge && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <AutoCategoryBadge transaction={transaction} />
            <span className="flex-1 min-w-0">{autoCategorizedLabel(transaction.categorizedBy)}.</span>
            <button type="button" onClick={handleUndoAutoCategory} disabled={isSaving} className="shrink-0 font-semibold text-primary hover:underline disabled:opacity-50">
              Desfazer
            </button>
          </div>
        )}
        <ChipRow wrap>
          {filteredCategories.map((category) => (
            <CategoryChip key={category.id} category={category} selected={categoryId === category.id} onClick={() => setCategoryId(category.id)} />
          ))}
          <Chip selected={!categoryId} onClick={() => setCategoryId("")}>
            <TagIcon size={14} weight="duotone" />
            Sem categoria
          </Chip>
        </ChipRow>
        {!categoryId && <p className="text-xs text-muted-foreground">Sem categoria, o lançamento volta para A classificar.</p>}
      </div>

      {/* Estorno: de onde desconta */}
      {isRefund && (
        <div className="space-y-3">
          <FieldLabel>Desconta de</FieldLabel>
          <ChipRow wrap>
            {refundTargets.map((category) => (
              <CategoryChip key={category.id} category={category} selected={refundCategoryId === category.id} onClick={() => setRefundCategoryId(category.id)} />
            ))}
            <Chip selected={!refundCategoryId} onClick={() => setRefundCategoryId("")}>
              Nenhuma
            </Chip>
          </ChipRow>
          <p className="text-xs text-muted-foreground">
            {refundCategoryId
              ? "O estorno reduz o gasto dessa categoria no mês em que caiu, em vez de contar como receita."
              : "Sem categoria, o estorno reduz o gasto total do mês e aparece como Estorno."}
          </p>
        </div>
      )}

      {/* Data */}
      {date && (
        <div className="space-y-3">
          <FieldLabel>Data</FieldLabel>
          <DateChips value={date} onChange={setDate} />
        </div>
      )}

      {/* Cartão combinado: de que lado é a transação */}
      {isComboCard && (
        <div className="flex items-center justify-between gap-3">
          <FieldLabel>No {selectedCard?.name}, foi no</FieldLabel>
          <PaymentMethodToggle
            value={paymentMethod === "credit" || paymentMethod === "debit" ? paymentMethod : null}
            onChange={setPaymentMethod}
          />
        </div>
      )}

      {/* Tag "do casal" — só para despesas */}
      {isExpense && hasCoupleAccount && (
        <button type="button" role="switch" aria-checked={isCasal} onClick={() => setIsCasal(!isCasal)} className="flex w-full items-center gap-3 text-left">
          <Heart size={20} weight={isCasal ? "fill" : "duotone"} className={cn("shrink-0", isCasal ? "text-primary" : "text-muted-foreground")} />
          <span className="flex-1 min-w-0">
            <span className="block text-sm font-medium text-foreground">Despesa do casal</span>
            <span className="block text-xs text-muted-foreground">Aparece também na conta do casal</span>
          </span>
          <span className={cn("relative h-6 w-11 shrink-0 rounded-full transition-colors", isCasal ? "bg-primary" : "bg-muted")}>
            <span className={cn("absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all", isCasal ? "left-5" : "left-0.5")} />
          </span>
        </button>
      )}

      {/* Mover de fatura — só se a transação pertence a uma fatura de crédito */}
      {belongsToInvoice && (
        <div className="space-y-3">
          <FieldLabel hint="Muda na hora, sem precisar salvar">Fatura</FieldLabel>
          <ChipRow wrap>
            <Chip selected={false} onClick={() => !isSaving && handleMoveInvoice("previous")}>
              <ArrowLeft size={14} weight="bold" />
              Para a anterior
            </Chip>
            <Chip selected={false} onClick={() => !isSaving && handleMoveInvoice("next")}>
              Para a seguinte
              <ArrowRight size={14} weight="bold" />
            </Chip>
          </ChipRow>
        </div>
      )}
    </FormSheet>
  )
}
