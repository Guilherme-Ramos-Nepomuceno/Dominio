"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { getCards, getTransactions, getSavingsGoals, deleteCard, updateCard, mergeCards } from "@/lib/storage"
import { getInvoiceMonth } from "@/lib/date-utils"
import type { Card } from "@/lib/types"
import { useToast } from "@/hooks/use-toast"

export function useCardsViewModel() {
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [cards, setCards] = useState<any[]>([])
    const [transactions, setTransactions] = useState<any[]>([])
    const [savingsGoals, setSavingsGoals] = useState<any[]>([])
    const [cardToDelete, setCardToDelete] = useState<string | null>(null)
    const [editingCard, setEditingCard] = useState<Card | null>(null)
    const [mergingCard, setMergingCard] = useState<Card | null>(null)

    const [loading, setLoading] = useState(true)
    const { toast } = useToast()

    const loadData = useCallback(async () => {
        try {
            const [cardsData, transactionsData, savingsGoalsData] = await Promise.all([
                getCards(),
                getTransactions(),
                getSavingsGoals(),
            ])
            setCards(cardsData)
            setTransactions(transactionsData)
            setSavingsGoals(savingsGoalsData)
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        loadData()
    }, [loadData])

    const currentMonth = useMemo(() => new Date().toISOString().slice(0, 7), [])

    const confirmDeleteCard = async () => {
        if (cardToDelete) {
            await deleteCard(cardToDelete)
            setCardToDelete(null)
            await loadData()
            toast({
                title: "Cartão removido",
                description: "O cartão foi excluído com sucesso.",
                variant: "success",
            })
        }
    }

    const handleCreateSuccess = async () => {
        await loadData()
        setIsDialogOpen(false)
        toast({
            title: "Cartão adicionado!",
            description: "Seu novo cartão já está disponível.",
            variant: "success",
        })
    }

    const handleSaveEdit = async (id: string, updates: Partial<Card>) => {
        await updateCard(id, updates)
        setEditingCard(null)
        await loadData()
        toast({
            title: "Cartão atualizado!",
            description: "As alterações foram salvas.",
            variant: "success",
        })
    }

    const handleMerge = async (mergeCardId: string) => {
        if (!mergingCard) return
        await mergeCards(mergingCard.id, mergeCardId)
        setMergingCard(null)
        await loadData()
        toast({
            title: "Cartões mesclados!",
            description: "As transações e reservas foram unificadas.",
            variant: "success",
        })
    }

    const processedCards = useMemo(() => {
        return cards.map((card) => {
            let calculatedBalance = 0
            let spentAmount = 0
            let debitSpentAmount = 0

            // Cartão combinado (crédito + débito) recebe os dois cálculos ao
            // mesmo tempo — antes era um if/else mutuamente exclusivo.
            if (card.hasCredit) {
                // A fatura "atual" (ainda aberta) considera o dia de fechamento do
                // cartão — se hoje já passou do fechamento, a fatura em aberto já é
                // a do mês seguinte, então compras de hoje já entram nela.
                const currentInvoiceMonth = getInvoiceMonth(new Date().toISOString(), card.closingDate)
                const currentInvoiceTransactions = transactions.filter(
                    (t) =>
                        t.cardId === card.id &&
                        t.status !== "cancelled" &&
                        t.type === "expense" &&
                        // Cartão combinado: débito não entra na fatura de crédito. Só
                        // exclui quem tem a tag "debit" explícita — invoiceId sozinho
                        // não é confiável (o backend em produção pode não estar
                        // atribuindo isso ainda).
                        (!card.hasDebit || t.invoiceId || t.paymentMethod === "credit") &&
                        getInvoiceMonth(t.date, card.closingDate) === currentInvoiceMonth,
                )
                spentAmount = currentInvoiceTransactions.reduce((sum, t) => sum + t.amount, 0)
            }
            if (card.hasDebit) {
                calculatedBalance = card.calculatedBalance ?? 0
                debitSpentAmount = transactions
                    .filter(
                        (t) =>
                            t.cardId === card.id &&
                            t.status !== "cancelled" &&
                            t.date.startsWith(currentMonth) &&
                            t.type === "expense" &&
                            // Cartão combinado: crédito não entra no gasto de débito —
                            // se já tem invoiceId (fatura de crédito) ou tag "credit",
                            // não conta aqui.
                            (!card.hasCredit || (!t.invoiceId && t.paymentMethod !== "credit")),
                    )
                    .reduce((sum, t) => sum + t.amount, 0)
            }

            const cardGoals = savingsGoals.filter((g) => g.cardId === card.id)

            return {
                ...card,
                spentAmount,
                debitSpentAmount,
                calculatedBalance,
                cardGoals
            }
        })
    }, [cards, transactions, savingsGoals, currentMonth])

    return {
        loading,
        isDialogOpen,
        setIsDialogOpen,
        cardToDelete,
        setCardToDelete,
        editingCard,
        setEditingCard,
        mergingCard,
        setMergingCard,
        processedCards,
        confirmDeleteCard,
        handleCreateSuccess,
        handleSaveEdit,
        handleMerge,
    }
}
