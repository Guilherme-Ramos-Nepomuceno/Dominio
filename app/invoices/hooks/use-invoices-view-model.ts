"use client"

import { useState, useMemo, useEffect, useLayoutEffect, useCallback, useRef } from "react"
import { getTransactions, getCards, getCategories, markTransactionAsPaid, cancelTransaction, getInvoice, updateInvoiceDates, moveTransactionInvoice, getManualBankMatches, mergeManualWithBank, dismissManualBankMatch } from "@/lib/storage"
import { getInvoiceMonth } from "@/lib/date-utils"
import { useSelectedMonth } from "@/lib/selected-month-context"
import type { Card, Transaction, Category, Invoice, ManualBankMatch } from "@/lib/types"
import { effectiveTransactionType, findCategory } from "@/lib/category-utils"
import { countsAsInvoiceRefund, countsInInvoice, invoiceTotal, openInvoiceMonthKey, sumAmounts } from "@/lib/card-invoice"
import { useToast } from "@/hooks/use-toast"

export function useInvoicesViewModel() {
    const [cards, setCards] = useState<Card[]>([])
    const { selectedMonth, setSelectedMonth } = useSelectedMonth()
    const [transactions, setTransactions] = useState<Transaction[]>([])
    const [selectedCardId, setSelectedCardId] = useState<string | null>(null)
    const [partialAmount, setPartialAmount] = useState("")
    const [categories, setCategories] = useState<Category[]>([])
    // A fatura REAL de cada cartão nesse mês (pode ter sido editada individualmente,
    // diferente do padrão do cartão) — buscada sob demanda por cartão+mês.
    const [invoicesByCard, setInvoicesByCard] = useState<Record<string, Invoice>>({})
    const [loading, setLoading] = useState(true)
    const [isPaying, setIsPaying] = useState(false)
    const [isMoving, setIsMoving] = useState(false)
    // "É a mesma compra?" do cartão selecionado (só cartão ligado ao banco).
    const [bankMatches, setBankMatches] = useState<ManualBankMatch[]>([])
    const [busyMatchId, setBusyMatchId] = useState<string | null>(null)
    const { toast } = useToast()

    const loadData = useCallback(async () => {
        try {
            const [allCards, allTransactions, allCategories] = await Promise.all([
                getCards(),
                getTransactions(),
                getCategories(),
            ])
            setCards(allCards.filter((c) => c.hasCredit))
            setTransactions(allTransactions)
            setCategories(allCategories)
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        loadData()
    }, [loadData])

    useEffect(() => {
        if (selectedCardId === null && cards.length > 0) {
            // Vindo de Cartões (?card=id), abre direto naquele cartão.
            const fromUrl = new URLSearchParams(window.location.search).get("card")
            setSelectedCardId(cards.some((c) => c.id === fromUrl) ? fromUrl : cards[0].id)
        }
    }, [cards, selectedCardId])

    // Vindo de Cartões (?month=AAAA-MM): abre na fatura aberta do cartão, que
    // pode ser a do mês seguinte (cartão que já fechou este mês). O mês
    // escolhido vale pro app todo, então ao sair volta o que estava — a não
    // ser que a pessoa tenha trocado o mês aqui de propósito.
    const monthRef = useRef(selectedMonth)
    useLayoutEffect(() => {
        monthRef.current = selectedMonth
    })
    useEffect(() => {
        const month = new URLSearchParams(window.location.search).get("month")
        if (!month || !/^\d{4}-\d{2}$/.test(month) || month === monthRef.current) return
        const previous = monthRef.current
        setSelectedMonth(month)
        return () => {
            if (monthRef.current === month) setSelectedMonth(previous)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    // Pelo menu (sem ?month=), a tela também abre na fatura aberta do cartão
    // mostrado: em novembro, um cartão que fecha dia 1 já está na fatura de
    // dezembro. Vale só nesta tela — ao sair volta o mês que estava, a não ser
    // que a pessoa tenha trocado o mês aqui de propósito.
    const appliedOpenMonth = useRef<{ month: string; previous: string } | null>(null)
    const openMonthHandled = useRef(false)
    useEffect(() => {
        if (openMonthHandled.current || cards.length === 0 || selectedCardId === null) return
        openMonthHandled.current = true
        if (new URLSearchParams(window.location.search).get("month")) return
        const card = cards.find((c) => c.id === selectedCardId)
        const month = card?.openInvoice ? openInvoiceMonthKey(card.openInvoice) : null
        if (!month || month === monthRef.current) return
        appliedOpenMonth.current = { month, previous: monthRef.current }
        setSelectedMonth(month)
    }, [cards, selectedCardId, setSelectedMonth])
    useEffect(
        () => () => {
            const applied = appliedOpenMonth.current
            if (applied && monthRef.current === applied.month) setSelectedMonth(applied.previous)
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [],
    )

    useEffect(() => {
        if (cards.length === 0) return
        const [year, month] = selectedMonth.split("-").map(Number)
        let cancelled = false

        Promise.all(cards.map((card) => getInvoice(card.id, year, month).then((inv) => [card.id, inv] as const)))
            .then((entries) => {
                if (cancelled) return
                setInvoicesByCard(Object.fromEntries(entries))
            })
            .catch(() => { /* fatura ainda funciona pelo cálculo padrão se isso falhar */ })

        return () => { cancelled = true }
    }, [cards, selectedMonth])

    const getFormattedMonthTitle = (monthStr: string) => {
        if (!monthStr) return ""
        const [year, month] = monthStr.split("-").map(Number)
        const date = new Date(year, month - 1, 1, 12, 0, 0)
        return date.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })
    }

    // --- NOVA LÓGICA: PROJEÇÃO DE PARCELAS ---
    const cardInvoices = useMemo(() => {
        return cards.map((card) => {
            // 1. Filtra transações deste cartão que são despesas (exclui canceladas).
            // Em cartão combinado (crédito+débito), só a perna crédito compõe a
            // fatura — exige a tag explícita "credit", não só "diferente de
            // debit": uma transação sem paymentMethod (ex: transferência lançada
            // manualmente pelo /transfer, sem passar pelo fluxo de cartão) não é
            // fatura de cartão nenhuma e não pode contar aqui só por omissão.
            const cardTransactions = transactions.filter(
                (t) =>
                    t.cardId === card.id &&
                    t.status !== "cancelled" &&
                    // Sem categoria também entra na fatura (tipo da própria transação).
                    effectiveTransactionType(categories, t) === "expense" &&
                    (!card.hasDebit || t.paymentMethod === "credit")
            )

            const realInvoice = invoicesByCard[card.id]
            const inThisInvoice = (t: Transaction) =>
                t.invoiceId ? (realInvoice ? t.invoiceId === realInvoice.id : getInvoiceMonth(t.date, card.closingDate) === selectedMonth) : getInvoiceMonth(t.date, card.closingDate) === selectedMonth

            // 2. Processa as transações para o mês selecionado — cada parcela já é
            // sua própria transação, com data e valor corretos (addTransaction já
            // cria uma linha por parcela). Transações novas já têm invoiceId
            // atribuído (respeita edição manual da fatura, ou "mover para fatura
            // seguinte/anterior"); lançamentos antigos sem invoiceId caem no
            // cálculo pelo dia de fechamento do cartão, como antes.
            const monthTransactions: any[] = cardTransactions.filter(inThisInvoice)

            // Cartão ligado ao banco: lançamento manual aparece, mas fica fora
            // do total (a fonte da fatura é o banco — somar contaria duas vezes).
            const counted = monthTransactions.filter((t) => countsInInvoice(card, t))
            // Ligado ao banco: estorno do banco desconta e as parcelas que o banco
            // ainda não mandou entram como previstas — a mesma conta do "a pagar"
            // da tela de Cartões (e da fatura que o banco mostra).
            const refunds = card.bank?.credit
                ? transactions.filter(
                      (t) =>
                          t.cardId === card.id &&
                          t.status !== "cancelled" &&
                          effectiveTransactionType(categories, t) === "income" &&
                          (!card.hasDebit || t.paymentMethod === "credit") &&
                          inThisInvoice(t) &&
                          countsAsInvoiceRefund(card, t, findCategory(categories, t.categoryId)),
                  )
                : []
            const projected = card.bank?.credit && !realInvoice?.bank ? (realInvoice?.projectedInstallments ?? []) : []
            const totalInvoice = invoiceTotal({ purchases: sumAmounts(counted), refunds: sumAmounts(refunds), projected: sumAmounts(projected) })
            const pendingTransactions = counted.filter(t => t.status === "pending")
            const totalPending = pendingTransactions.reduce((sum, t) => sum + t.amount, 0)
            const manualExcluded = monthTransactions.length - counted.length
            // Fatura aberta: o que ainda está na revisão do banco também vai ser cobrado.
            const awaitingReview = card.openInvoice && openInvoiceMonthKey(card.openInvoice) === selectedMonth ? card.openInvoice.awaitingReview : 0

            return {
                card,
                invoice: realInvoice,
                transactions: monthTransactions
                    .map((t) => (countsInInvoice(card, t) ? t : { ...t, outOfTotal: true }))
                    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
                pendingTransactions,
                total: totalInvoice,
                totalPending: totalPending,
                manualExcluded,
                awaitingReview,
                refunds,
                projected,
                projectedTotal: sumAmounts(projected),
            }
        })
    }, [cards, transactions, categories, selectedMonth, invoicesByCard])

    const selectedInvoice = cardInvoices.find((inv) => inv.card.id === selectedCardId)

    const selectedBankLinked = !!cards.find((c) => c.id === selectedCardId)?.bank?.credit
    const loadBankMatches = useCallback(async () => {
        if (!selectedCardId || !selectedBankLinked) {
            setBankMatches([])
            return
        }
        setBankMatches(await getManualBankMatches(selectedCardId))
    }, [selectedCardId, selectedBankLinked])

    useEffect(() => {
        loadBankMatches()
    }, [loadBankMatches])

    // "É a mesma": a compra do banco fica com o nome e a categoria do
    // lançamento à mão, que some (com as outras parcelas dele).
    const handleMergeMatch = async (match: ManualBankMatch) => {
        if (busyMatchId) return
        setBusyMatchId(match.manual.id)
        try {
            const result = await mergeManualWithBank(match.manual.id, match.bank.id)
            toast({
                title: "Compras juntadas",
                description: result.removed > 1
                    ? `As ${result.removed} parcelas lançadas à mão viraram as do banco, com o nome "${match.manual.description}".`
                    : `"${match.manual.description}" agora é a compra do banco.`,
                variant: "success",
            })
            await Promise.all([loadData(), loadBankMatches()])
        } catch (error: any) {
            toast({ title: "Não foi possível juntar", description: error?.message, variant: "destructive" })
        } finally {
            setBusyMatchId(null)
        }
    }

    const handleDismissMatch = async (match: ManualBankMatch) => {
        setBankMatches((prev) => prev.filter((m) => m.manual.id !== match.manual.id))
        await dismissManualBankMatch(match.manual.id, match.bank.id).catch(() => {})
    }

    const handleUpdateInvoiceDates = async (updates: { closingDate?: string; dueDate?: string }) => {
        if (!selectedCardId) return
        const [year, month] = selectedMonth.split("-").map(Number)
        const updated = await updateInvoiceDates(selectedCardId, year, month, updates)
        setInvoicesByCard((prev) => ({ ...prev, [selectedCardId]: updated }))
    }

    const handleMoveTransaction = async (transactionId: string, direction: "next" | "previous") => {
        if (isMoving) return
        setIsMoving(true)
        try {
            await moveTransactionInvoice(transactionId, direction)
            await loadData()
        } finally {
            setIsMoving(false)
        }
    }

    const handlePayFull = async () => {
        if (isPaying || !selectedInvoice || selectedInvoice.pendingTransactions.length === 0) return

        if (confirm(`Deseja pagar o restante da fatura de R$ ${selectedInvoice.totalPending.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}?`)) {
            setIsPaying(true)
            try {
                for (const transaction of selectedInvoice.pendingTransactions) {
                    await markTransactionAsPaid(transaction.id, selectedCardId || undefined)
                }
                await loadData()
                setPartialAmount("")
            } finally {
                setIsPaying(false)
            }
        }
    }

    const handlePayPartial = async () => {
        if (isPaying || !selectedInvoice || !partialAmount || selectedInvoice.pendingTransactions.length === 0) return

        const amount = Number.parseFloat(partialAmount.replace(/\./g, "").replace(",", "."))
        if (isNaN(amount) || amount <= 0 || amount > selectedInvoice.totalPending) {
            alert("Valor inválido para pagamento parcial")
            return
        }

        let remaining = amount
        const transactionsToPay: string[] = []

        for (const transaction of selectedInvoice.pendingTransactions) {
            if (remaining >= transaction.amount) {
                transactionsToPay.push(transaction.id)
                remaining -= transaction.amount
            } else {
                break
            }
        }

        if (
            transactionsToPay.length > 0 &&
            confirm(`Pagar ${transactionsToPay.length} transações?`)
        ) {
            setIsPaying(true)
            try {
                for (const id of transactionsToPay) {
                    await markTransactionAsPaid(id, selectedCardId || undefined)
                }
                await loadData()
                setPartialAmount("")
            } finally {
                setIsPaying(false)
            }
        }
    }

    const handleCancelTransaction = async (transactionId: string) => {
        if (confirm("Deseja cancelar esta transação?")) {
            await cancelTransaction(transactionId)
            await loadData()
        }
    }

    const handlePartialAmountChange = (value: string) => {
        const rawValue = value.replace(/\D/g, "")
        const formatted = (Number.parseInt(rawValue || "0") / 100).toLocaleString("pt-BR", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        })
        setPartialAmount(formatted)
    }

    return {
        loading,
        isPaying,
        isMoving,
        cards,
        selectedMonth,
        setSelectedMonth,
        selectedCardId,
        setSelectedCardId,
        partialAmount,
        setPartialAmount,
        categories,
        allTransactions: transactions,
        getFormattedMonthTitle,
        cardInvoices,
        selectedInvoice,
        handlePayFull,
        handlePayPartial,
        handleCancelTransaction,
        handlePartialAmountChange,
        handleUpdateInvoiceDates,
        handleMoveTransaction,
        bankMatches,
        busyMatchId,
        handleMergeMatch,
        handleDismissMatch,
    }
}
