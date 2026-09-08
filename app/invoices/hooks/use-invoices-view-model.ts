"use client"

import { useState, useMemo, useEffect, useCallback } from "react"
import { getTransactions, getCards, getCategories, markTransactionAsPaid, cancelTransaction, getInvoice, updateInvoiceDates, moveTransactionInvoice } from "@/lib/storage"
import { getInvoiceMonth } from "@/lib/date-utils"
import type { Card, Transaction, Category, Invoice } from "@/lib/types"

export function useInvoicesViewModel() {
    const [cards, setCards] = useState<Card[]>([])

    // Garante que o mês atual seja gerado corretamente
    const getSafeCurrentMonth = () => {
        const now = new Date()
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
    }

    const [selectedMonth, setSelectedMonth] = useState(getSafeCurrentMonth())
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
            setSelectedCardId(cards[0].id)
        }
    }, [cards, selectedCardId])

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
            // 1. Filtra transações deste cartão que são despesas (exclui canceladas)
            const cardTransactions = transactions.filter(
                (t) =>
                    t.cardId === card.id &&
                    t.status !== "cancelled" &&
                    categories.find((c) => c.id === t.categoryId)?.type === "expense"
            )

            const realInvoice = invoicesByCard[card.id]

            // 2. Processa as transações para o mês selecionado — cada parcela já é
            // sua própria transação, com data e valor corretos (addTransaction já
            // cria uma linha por parcela). Transações novas já têm invoiceId
            // atribuído (respeita edição manual da fatura, ou "mover para fatura
            // seguinte/anterior"); lançamentos antigos sem invoiceId caem no
            // cálculo pelo dia de fechamento do cartão, como antes.
            const monthTransactions: any[] = cardTransactions.filter((t) => {
                if (t.invoiceId && realInvoice) return t.invoiceId === realInvoice.id
                return getInvoiceMonth(t.date, card.closingDate) === selectedMonth
            })

            const totalInvoice = monthTransactions.reduce((sum, t) => sum + t.amount, 0)
            const pendingTransactions = monthTransactions.filter(t => t.status === "pending")
            const totalPending = pendingTransactions.reduce((sum, t) => sum + t.amount, 0)

            return {
                card,
                invoice: realInvoice,
                transactions: monthTransactions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
                pendingTransactions,
                total: totalInvoice,
                totalPending: totalPending
            }
        })
    }, [cards, transactions, categories, selectedMonth, invoicesByCard])

    const selectedInvoice = cardInvoices.find((inv) => inv.card.id === selectedCardId)

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
    }
}
