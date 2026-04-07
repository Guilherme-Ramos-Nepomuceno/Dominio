"use client"

import { useState, useMemo, useEffect } from "react"
import {
    getPendingTransactions,
    getCategories,
    markTransactionAsPaid,
    cancelTransaction,
    getCards
} from "@/lib/storage"
import { useToast } from "@/hooks/use-toast"
import type { Category, Card, Transaction } from "@/lib/types"

export function usePendingViewModel() {
    const { toast } = useToast()

    const [pendingTransactions, setPendingTransactions] = useState<Transaction[]>([])
    const [categories, setCategories] = useState<Category[]>([])
    const [cards, setCards] = useState<Card[]>([])
    const [isLoaded, setIsLoaded] = useState(false)

    const [selectedTransaction, setSelectedTransaction] = useState<string | null>(null)
    const [selectedCard, setSelectedCard] = useState<string>("")
    const [confirmDate, setConfirmDate] = useState<string>("")
    const [transactionToCancel, setTransactionToCancel] = useState<string | null>(null)

    const loadData = () => {
        setPendingTransactions(getPendingTransactions())
        setCategories(getCategories())
        setCards(getCards())
        setIsLoaded(true)
    }

    useEffect(() => {
        loadData()
    }, [])

    const visibleTransactions = useMemo(() => {
        const filtered = pendingTransactions.filter((t) => {
            if (t.cardId) {
                const card = cards.find((c) => c.id === t.cardId)
                if (card?.type === "credit") return false
            }
            return true
        })

        const grouped = new Map<string, Transaction>()
        const singles: Transaction[] = []

        filtered.forEach((t) => {
            const isRecurring = t.recurrence && t.recurrence !== "none"
            const isInstallment = t.installments && t.installments > 1

            if (!isRecurring && !isInstallment) {
                singles.push(t)
                return
            }

            const groupId = t.parentId || t.description
            const existing = grouped.get(groupId)

            if (!existing || new Date(t.date) < new Date(existing.date)) {
                grouped.set(groupId, t)
            }
        })

        return [...singles, ...Array.from(grouped.values())].sort(
            (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
        )
    }, [pendingTransactions, cards])

    const handleMarkAsPaid = (transactionId: string) => {
        const transaction = pendingTransactions.find((t) => t.id === transactionId)
        if (transaction) {
            if (transaction.cardId) setSelectedCard(transaction.cardId)
            else setSelectedCard("")
            setConfirmDate(transaction.date.split('T')[0])
        }
        setSelectedTransaction(transactionId)
    }

    const confirmPayment = () => {
        if (!selectedTransaction) return
        const transaction = pendingTransactions.find(t => t.id === selectedTransaction)
        if (!transaction) return

        if (cards.length > 0 && !selectedCard) {
            toast({
                title: "Selecione uma conta",
                description: "É necessário informar de onde saiu/entrou o dinheiro.",
                variant: "warning"
            })
            return
        }

        markTransactionAsPaid(selectedTransaction, selectedCard || undefined, confirmDate)

        toast({
            title: transaction.type === 'expense' ? "Pago com sucesso!" : "Recebido com sucesso!",
            description: "A transação foi confirmada.",
            variant: "success"
        })

        loadData()
        setSelectedTransaction(null)
        setSelectedCard("")
        setConfirmDate("")
    }

    const confirmCancel = () => {
        if (transactionToCancel) {
            cancelTransaction(transactionToCancel)
            loadData()
            toast({
                title: "Transação cancelada",
                description: "A transação foi removida das pendências.",
                variant: "default"
            })
            setTransactionToCancel(null)
        }
    }

    return {
        pendingTransactions,
        categories,
        cards,
        isLoaded,
        visibleTransactions,
        selectedTransaction,
        setSelectedTransaction,
        selectedCard,
        setSelectedCard,
        confirmDate,
        setConfirmDate,
        transactionToCancel,
        setTransactionToCancel,
        handleMarkAsPaid,
        confirmPayment,
        confirmCancel
    }
}
