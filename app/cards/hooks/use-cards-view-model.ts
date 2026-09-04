"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { getCards, getTransactions, getSavingsGoals, deleteCard, updateCard, mergeCards } from "@/lib/storage"
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

    const { toast } = useToast()

    const loadData = useCallback(async () => {
        const [cardsData, transactionsData, savingsGoalsData] = await Promise.all([
            getCards(),
            getTransactions(),
            getSavingsGoals(),
        ])
        setCards(cardsData)
        setTransactions(transactionsData)
        setSavingsGoals(savingsGoalsData)
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

            // Cartão combinado (crédito + débito) recebe os dois cálculos ao
            // mesmo tempo — antes era um if/else mutuamente exclusivo.
            if (card.hasCredit) {
                const currentInvoiceTransactions = transactions.filter(
                    (t) =>
                        t.cardId === card.id &&
                        t.date.startsWith(currentMonth) &&
                        t.type === "expense",
                )
                spentAmount = currentInvoiceTransactions.reduce((sum, t) => sum + t.amount, 0)
            }
            if (card.hasDebit) {
                calculatedBalance = card.calculatedBalance ?? 0
                spentAmount = transactions
                    .filter((t) => t.cardId === card.id && t.date.startsWith(currentMonth) && t.type === "expense")
                    .reduce((sum, t) => sum + t.amount, 0)
            }

            const cardGoals = savingsGoals.filter((g) => g.cardId === card.id)

            return {
                ...card,
                spentAmount,
                calculatedBalance,
                cardGoals
            }
        })
    }, [cards, transactions, savingsGoals, currentMonth])

    return {
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
