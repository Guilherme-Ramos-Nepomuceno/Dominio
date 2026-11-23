"use client"

import { useState, useMemo, useCallback } from "react"
import { deleteCard, updateCard, mergeCards } from "@/lib/storage"
import type { Card, SavingsGoal, Transaction } from "@/lib/types"
import { useToast } from "@/hooks/use-toast"
import { useCardsQuery, useSavingsGoalsQuery, useTransactionsQuery } from "@/hooks/queries"

// Referências estáveis para "ainda sem dado" — um [] novo a cada render
// invalidaria o useMemo de processedCards.
const NO_CARDS: Card[] = []
const NO_TRANSACTIONS: Transaction[] = []
const NO_SAVINGS: SavingsGoal[] = []

export function useCardsViewModel() {
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [cardToDelete, setCardToDelete] = useState<string | null>(null)
    const [editingCard, setEditingCard] = useState<Card | null>(null)
    const [mergingCard, setMergingCard] = useState<Card | null>(null)
    const [importingCard, setImportingCard] = useState<Card | null>(null)
    const { toast } = useToast()

    // Tudo do cache: as gravações abaixo avisam o domínio e as consultas se
    // atualizam sozinhas (components/session/query-provider.tsx).
    const cardsQuery = useCardsQuery()
    const transactionsQuery = useTransactionsQuery()
    const savingsQuery = useSavingsGoalsQuery()
    const cards = cardsQuery.data ?? NO_CARDS
    const transactions = transactionsQuery.data ?? NO_TRANSACTIONS
    const savingsGoals = savingsQuery.data ?? NO_SAVINGS

    // Só no primeiro carregamento — revalidação em segundo plano não volta o skeleton.
    const loading = cardsQuery.isPending || transactionsQuery.isPending || savingsQuery.isPending

    const refetchCards = cardsQuery.refetch
    const refetchTransactions = transactionsQuery.refetch
    const refetchSavings = savingsQuery.refetch
    const loadData = useCallback(async () => {
        await Promise.all([refetchCards(), refetchTransactions(), refetchSavings()])
    }, [refetchCards, refetchTransactions, refetchSavings])

    const currentMonth = useMemo(() => new Date().toISOString().slice(0, 7), [])

    const confirmDeleteCard = async () => {
        if (cardToDelete) {
            await deleteCard(cardToDelete)
            setCardToDelete(null)
            toast({
                title: "Cartão removido",
                description: "O cartão foi excluído com sucesso.",
                variant: "success",
            })
        }
    }

    const handleCreateSuccess = async () => {
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
                // Limite disponível é reduzido por TUDO que ainda não foi pago — a
                // fatura do ciclo atual em aberto E qualquer fatura anterior já
                // fechada mas vencida sem pagar. Não escopa por mês: uma fatura
                // atrasada continua comprometendo o limite até ser paga de fato.
                const pendingTransactions = transactions.filter(
                    (t) =>
                        t.cardId === card.id &&
                        t.status === "pending" &&
                        t.type === "expense" &&
                        // Cartão combinado: débito não entra na fatura de crédito. Só
                        // exclui quem tem a tag "debit" explícita — invoiceId sozinho
                        // não é confiável (o backend em produção pode não estar
                        // atribuindo isso ainda).
                        (!card.hasDebit || t.invoiceId || t.paymentMethod === "credit"),
                )
                spentAmount = pendingTransactions.reduce((sum, t) => sum + t.amount, 0)
                // Vinculado ao banco: o que está devido é o que o banco diz, não a
                // soma dos registros (que não tem o que veio antes da importação).
                if (card.bank?.credit) spentAmount = card.bank.credit.used
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
        importingCard,
        setImportingCard,
        processedCards,
        confirmDeleteCard,
        handleCreateSuccess,
        handleSaveEdit,
        handleMerge,
        loadData,
    }
}
