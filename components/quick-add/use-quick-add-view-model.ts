"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { addTransaction, getCards, getCategories, suggestCategory, type CategorySuggestion } from "@/lib/storage"
import type { Card, Category, PaymentMethod, TransactionType } from "@/lib/types"
import { trackEvent } from "@/lib/events"
import { getLastUsedCardId, setLastUsedCardId } from "@/lib/preferences"
import {
  applyKeypadKey,
  buildCategoryChips,
  buildMoreOptionsQuery,
  centsToAmount,
  defaultDescription,
  todayLocalISODate,
  toggleChip,
  type KeypadKey,
} from "@/lib/quick-add"
import { useToast } from "@/hooks/use-toast"

const SUGGEST_DEBOUNCE_MS = 350

export function useQuickAddViewModel() {
  const router = useRouter()
  const { toast } = useToast()

  const [open, setOpen] = useState(false)
  const [type, setType] = useState<TransactionType>("expense")
  const [cents, setCents] = useState(0)
  const [description, setDescription] = useState("")
  const [cardId, setCardId] = useState<string | null>(null)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("credit")
  const [date, setDate] = useState(() => todayLocalISODate())
  const [categoryId, setCategoryId] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const [categories, setCategories] = useState<Category[]>([])
  const [cards, setCards] = useState<Card[]>([])
  const [suggestion, setSuggestion] = useState<CategorySuggestion | null>(null)
  const [frequent, setFrequent] = useState<string[]>([])

  // Receita só entra em conta com débito (mesma regra do formulário completo).
  const availableCards = useMemo(
    () => (type === "income" ? cards.filter((c) => c.hasDebit) : cards),
    [cards, type],
  )
  const selectedCard = availableCards.find((c) => c.id === cardId)
  const isComboCard = !!selectedCard?.hasCredit && !!selectedCard?.hasDebit && type === "expense"

  const openSheet = useCallback(() => {
    setType("expense")
    setCents(0)
    setDescription("")
    setDate(todayLocalISODate())
    setCategoryId(null)
    setSuggestion(null)
    setPaymentMethod("credit")
    setOpen(true)
    trackEvent("quick_add_opened")

    Promise.all([getCategories(), getCards()])
      .then(([cats, allCards]) => {
        setCategories(cats)
        setCards(allCards)
        const last = getLastUsedCardId()
        setCardId(last && allCards.some((c) => c.id === last) ? last : null)
      })
      .catch(() => {
        // Sem categorias/contas carregadas o registro ainda funciona (vai
        // sem conta e sem categoria) — a tela não pode travar por isso.
      })
  }, [])

  // Conta escolhida não serve pro tipo atual (ex: cartão só-crédito numa
  // receita): desmarca em vez de salvar algo inválido.
  useEffect(() => {
    if (cardId && cards.length > 0 && !availableCards.some((c) => c.id === cardId)) setCardId(null)
  }, [availableCards, cardId, cards.length])

  // Sugestão de categoria pela descrição, com debounce. Sem descrição também
  // consulta (o backend devolve as mais frequentes do tipo).
  const requestIdRef = useRef(0)
  useEffect(() => {
    if (!open) return
    const requestId = ++requestIdRef.current
    const timer = setTimeout(() => {
      suggestCategory(description.trim(), type)
        .then((result) => {
          if (requestId !== requestIdRef.current) return
          setSuggestion(result.suggestion)
          setFrequent(result.frequent)
        })
        .catch(() => {
          if (requestId !== requestIdRef.current) return
          setSuggestion(null)
        })
    }, description.trim() ? SUGGEST_DEBOUNCE_MS : 0)
    return () => clearTimeout(timer)
  }, [open, description, type])

  const chips = useMemo(
    () => buildCategoryChips(categories, type, suggestion, frequent, categoryId),
    [categories, type, suggestion, frequent, categoryId],
  )

  // Todas as categorias do tipo, as mais registradas primeiro (para "Outras").
  const allCategories = useMemo(() => {
    const ofType = categories.filter((c) => c.type === type && !c.excludedFromTotals)
    const rank = (id: string) => {
      const i = frequent.indexOf(id)
      return i === -1 ? Number.MAX_SAFE_INTEGER : i
    }
    return ofType.slice().sort((a, b) => rank(a.id) - rank(b.id) || a.name.localeCompare(b.name, "pt-BR"))
  }, [categories, type, frequent])

  const changeType = (next: TransactionType) => {
    if (next === type) return
    setType(next)
    // Categoria é de um tipo só — trocar o tipo desmarca.
    setCategoryId(null)
    setSuggestion(null)
  }

  const pressKey = (key: KeypadKey) => setCents((prev) => applyKeypadKey(prev, key))
  const tapChip = (id: string) => setCategoryId((prev) => toggleChip(prev, id))

  const save = async () => {
    if (cents <= 0 || isSaving) return
    const category = categories.find((c) => c.id === categoryId)
    const [year, month, day] = date.split("-").map(Number)
    // Meio-dia local — mesma proteção de fuso do formulário completo.
    const dateObj = new Date(year, month - 1, day, 12, 0, 0)

    setIsSaving(true)
    try {
      await addTransaction({
        description: description.trim() || defaultDescription(type, category?.name),
        amount: centsToAmount(cents),
        type,
        categoryId: categoryId ?? null,
        date: dateObj.toISOString(),
        recurrence: "none",
        cardId: cardId ?? undefined,
        paymentMethod: isComboCard ? paymentMethod : undefined,
      })
      trackEvent("transaction_created", { source: "quick", hasCategory: !!categoryId })
      if (cardId) setLastUsedCardId(cardId)
      toast({
        title: type === "income" ? "Receita registrada" : "Despesa registrada",
        description: categoryId ? undefined : "Sem categoria por enquanto — ficou em A classificar.",
        variant: "success",
      })
      setOpen(false)
    } catch (error: any) {
      toast({
        title: "Não foi possível registrar",
        description: error?.message || "Tente novamente.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const goToFullForm = () => {
    const query = buildMoreOptionsQuery({ type, cents, description, cardId, date, categoryId })
    setOpen(false)
    router.push(`/new?${query}`)
  }

  return {
    open,
    setOpen,
    openSheet,
    type,
    changeType,
    cents,
    pressKey,
    description,
    setDescription,
    availableCards,
    cardId,
    setCardId,
    isComboCard,
    paymentMethod,
    setPaymentMethod,
    date,
    setDate,
    chips,
    allCategories,
    suggestedCategoryId: suggestion?.categoryId ?? null,
    categoryId,
    tapChip,
    isSaving,
    canSave: cents > 0 && !isSaving,
    save,
    goToFullForm,
  }
}

export type QuickAddViewModel = ReturnType<typeof useQuickAddViewModel>
