"use client"

import { useState, useMemo, useEffect, useCallback } from "react"
import { getTransactions, getCards, getCategories, markTransactionAsPaid, cancelTransaction } from "@/lib/storage"
import type { Card, Transaction, Category } from "@/lib/types"

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

    const loadData = useCallback(async () => {
        const [allCards, allTransactions, allCategories] = await Promise.all([
            getCards(),
            getTransactions(),
            getCategories(),
        ])
        setCards(allCards.filter((c) => c.hasCredit))
        setTransactions(allTransactions)
        setCategories(allCategories)
    }, [])

    useEffect(() => {
        loadData()
    }, [loadData])

    useEffect(() => {
        if (selectedCardId === null && cards.length > 0) {
            setSelectedCardId(cards[0].id)
        }
    }, [cards, selectedCardId])

    const getFormattedMonthTitle = (monthStr: string) => {
        if (!monthStr) return ""
        const [year, month] = monthStr.split("-").map(Number)
        const date = new Date(year, month - 1, 1, 12, 0, 0)
        return date.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })
    }

    // --- NOVA LÓGICA: PROJEÇÃO DE PARCELAS ---
    const cardInvoices = useMemo(() => {
        return cards.map((card) => {
            // 1. Filtra transações deste cartão que são despesas
            const cardTransactions = transactions.filter(
                (t) =>
                    t.cardId === card.id &&
                    categories.find((c) => c.id === t.categoryId)?.type === "expense"
            )

            // 2. Processa as transações para o mês selecionado — cada parcela já é
            // sua própria transação, com data e valor corretos (addTransaction já
            // cria uma linha por parcela), então só filtra pelo mês selecionado.
            const monthTransactions: any[] = cardTransactions.filter((t) => t.date.startsWith(selectedMonth))

            const totalInvoice = monthTransactions.reduce((sum, t) => sum + t.amount, 0)
            const pendingTransactions = monthTransactions.filter(t => t.status === "pending")
            const totalPending = pendingTransactions.reduce((sum, t) => sum + t.amount, 0)

            return {
                card,
                transactions: monthTransactions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
                pendingTransactions,
                total: totalInvoice,
                totalPending: totalPending
            }
        })
    }, [cards, transactions, categories, selectedMonth])

    const selectedInvoice = cardInvoices.find((inv) => inv.card.id === selectedCardId)

    const handlePayFull = async () => {
        if (!selectedInvoice || selectedInvoice.pendingTransactions.length === 0) return

        if (confirm(`Deseja pagar o restante da fatura de R$ ${selectedInvoice.totalPending.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}?`)) {
            for (const transaction of selectedInvoice.pendingTransactions) {
                await markTransactionAsPaid(transaction.id, selectedCardId || undefined)
            }
            await loadData()
            setPartialAmount("")
        }
    }

    const handlePayPartial = async () => {
        if (!selectedInvoice || !partialAmount || selectedInvoice.pendingTransactions.length === 0) return

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
            for (const id of transactionsToPay) {
                await markTransactionAsPaid(id, selectedCardId || undefined)
            }
            await loadData()
            setPartialAmount("")
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
        handlePartialAmountChange
    }
}
