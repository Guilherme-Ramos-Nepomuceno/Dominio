"use client"

import { useState, useMemo, useCallback } from "react"
import { useQueryClient } from "@tanstack/react-query"
import {
    markTransactionAsPaid,
    cancelTransaction,
    cancelRecurringTransaction,
    settlePendingWithPayment,
    dismissPendingPaymentMatch,
    type PendingPaymentMatch,
} from "@/lib/storage"
import { useToast } from "@/hooks/use-toast"
import { useAccount } from "@/components/account/account-context"
import { getCurrentUser } from "@/lib/auth"
import { queryKeys } from "@/lib/query-client"
import { useCardsQuery, useCategoriesQuery, usePendingPaymentMatchesQuery, useTransactionsQuery } from "@/hooks/queries"
import type { Category, Card, Transaction } from "@/lib/types"

// Referências estáveis para "ainda sem dado" — um [] novo a cada render
// invalidaria os useMemo abaixo.
const NO_TRANSACTIONS: Transaction[] = []
const NO_CATEGORIES: Category[] = []
const NO_CARDS: Card[] = []
const NO_MATCHES: PendingPaymentMatch[] = []

export function usePendingViewModel() {
    const { toast } = useToast()
    const queryClient = useQueryClient()

    // Tudo do cache: dar baixa, cancelar etc. avisam o domínio e as consultas
    // se atualizam sozinhas.
    const transactionsQuery = useTransactionsQuery()
    const categoriesQuery = useCategoriesQuery()
    const cardsQuery = useCardsQuery()
    const matchesQuery = usePendingPaymentMatchesQuery()
    const allTransactions = transactionsQuery.data ?? NO_TRANSACTIONS
    const categories = categoriesQuery.data ?? NO_CATEGORIES
    const cards = cardsQuery.data ?? NO_CARDS
    const matches = matchesQuery.data ?? NO_MATCHES
    // Só no primeiro carregamento — revalidação em segundo plano não volta o skeleton.
    const isLoaded = !transactionsQuery.isPending && !categoriesQuery.isPending && !cardsQuery.isPending && !matchesQuery.isPending

    // Pendências de qualquer mês, mais antigas primeiro (o que
    // getPendingTransactions fazia, mas sem baixar o histórico de novo).
    const pendingTransactions = useMemo(
        () =>
            allTransactions
                .filter((t) => t.status === "pending")
                .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
        [allTransactions],
    )
    // "Parece que você já pagou": pendência → lançamento do banco que a pagou.
    const paymentMatches = useMemo(
        () => new Map<string, PendingPaymentMatch["transaction"]>(matches.map((m) => [m.pendingId, m.transaction])),
        [matches],
    )

    const refetchTransactions = transactionsQuery.refetch
    const refetchCategories = categoriesQuery.refetch
    const refetchCards = cardsQuery.refetch
    const refetchMatches = matchesQuery.refetch
    const refresh = useCallback(async () => {
        await Promise.all([refetchTransactions(), refetchCategories(), refetchCards(), refetchMatches()])
    }, [refetchTransactions, refetchCategories, refetchCards, refetchMatches])
    // A gravação já disparou a revalidação; dar baixa espera ela terminar antes
    // de fechar/liberar (cancelRefetch: false pega carona na mesma busca) —
    // senão a pendência paga continuava na lista e dava para pagar de novo.
    const waitForFreshTransactions = () => refetchTransactions({ cancelRefetch: false })

    const [busyMatchId, setBusyMatchId] = useState<string | null>(null)

    const [selectedTransaction, setSelectedTransaction] = useState<string | null>(null)
    const [selectedCard, setSelectedCard] = useState<string>("")
    const [confirmDate, setConfirmDate] = useState<string>("")
    const [transactionToCancel, setTransactionToCancel] = useState<string | null>(null)
    const [transactionToCancelRecurrence, setTransactionToCancelRecurrence] = useState<string | null>(null)
    const [isConfirmingPayment, setIsConfirmingPayment] = useState(false)

    // Conta do casal: a baixa pergunta qual dos dois pagou (entra no acerto do
    // mês), não de qual conta saiu — a conta do casal não tem o dinheiro.
    const { selection, family } = useAccount()
    const isCoupleView = selection.type === "couple"
    const payers = (family?.members ?? [])
        .filter((m) => m.accountType === "PERSONAL")
        .map((m) => ({ id: m.id, name: (m.name || m.email).split(" ")[0] }))
    const [paidBy, setPaidBy] = useState<string>("")

    const visibleTransactions = useMemo(() => {
        const filtered = pendingTransactions.filter((t) => {
            if (t.cardId) {
                const card = cards.find((c) => c.id === t.cardId)
                if (card?.hasCredit) {
                    // Cartão só-crédito: tudo é fatura. Cartão combinado: só o lado
                    // crédito vai pra fatura — identificado pelo invoiceId (quando o
                    // backend atribui) ou pela tag "credit" — o lado débito continua
                    // pendência normal.
                    if (!card.hasDebit || t.invoiceId || t.paymentMethod === "credit") return false
                }
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

            // A 1ª parcela/ocorrência não tem parentId (ela É a raiz) — usar o próprio id
            // como chave garante que ela caia no mesmo grupo das demais, que referenciam
            // esse id via parentId. Usar a descrição como fallback juntava só as demais
            // ocorrências entre si, deixando a raiz sempre visível junto com a próxima.
            const groupId = t.parentId || t.id
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
            // Dar baixa é registrar o que acabou de acontecer: hoje por padrão.
            const now = new Date()
            setConfirmDate(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`)
            setPaidBy(getCurrentUser()?.id ?? "")
        }
        setSelectedTransaction(transactionId)
    }

    const confirmPayment = async () => {
        if (isConfirmingPayment) return
        if (!selectedTransaction) return
        const transaction = pendingTransactions.find(t => t.id === selectedTransaction)
        if (!transaction) return

        if (isCoupleView && !paidBy) {
            toast({ title: "Quem pagou?", description: "Escolha qual dos dois pagou esta conta.", variant: "warning" })
            return
        }

        if (!isCoupleView && cards.length > 0 && !selectedCard) {
            toast({
                title: "Selecione uma conta",
                description: "É necessário informar de onde saiu/entrou o dinheiro.",
                variant: "warning"
            })
            return
        }

        setIsConfirmingPayment(true)
        try {
            await markTransactionAsPaid(selectedTransaction, isCoupleView ? undefined : selectedCard || undefined, confirmDate, isCoupleView ? paidBy : undefined)

            toast({
                title: transaction.type === 'expense' ? "Pago com sucesso!" : "Recebido com sucesso!",
                description: "A transação foi confirmada.",
                variant: "success"
            })

            await waitForFreshTransactions()
            setSelectedTransaction(null)
            setSelectedCard("")
            setConfirmDate("")
        } finally {
            setIsConfirmingPayment(false)
        }
    }

    // "É esse": baixa na pendência com a data/conta do banco, sem duplicar.
    const settleWithMatch = async (pendingId: string) => {
        const match = paymentMatches.get(pendingId)
        if (!match || busyMatchId) return
        setBusyMatchId(pendingId)
        try {
            await settlePendingWithPayment(pendingId, match.id)
            toast({ title: "Baixa feita", description: `Ligada a "${match.description}" do banco, sem contar duas vezes.`, variant: "success" })
            await waitForFreshTransactions()
        } catch (error: any) {
            toast({ title: "Não foi possível dar baixa", description: error?.message, variant: "destructive" })
        } finally {
            setBusyMatchId(null)
        }
    }

    const dismissMatch = async (pendingId: string) => {
        const match = paymentMatches.get(pendingId)
        if (!match) return
        // Some da lista na hora (cópia nova no cache, nunca alterar no lugar);
        // a invalidação depois da gravação confirma com o servidor.
        queryClient.setQueryData<PendingPaymentMatch[]>(queryKeys.pendingPaymentMatches(), (prev) =>
            prev?.filter((m) => m.pendingId !== pendingId),
        )
        await dismissPendingPaymentMatch(pendingId, match.id).catch(() => {})
    }

    const confirmCancel = async () => {
        if (transactionToCancel) {
            await cancelTransaction(transactionToCancel)
            toast({
                title: "Transação cancelada",
                description: "A transação foi removida das pendências.",
                variant: "default"
            })
            setTransactionToCancel(null)
        }
    }

    const confirmCancelRecurrence = async () => {
        if (!transactionToCancelRecurrence) return
        try {
            await cancelRecurringTransaction(transactionToCancelRecurrence)
            toast({
                title: "Recorrência cancelada",
                description: "Esta e todas as próximas ocorrências foram canceladas.",
                variant: "success"
            })
        } catch (error: any) {
            toast({
                title: "Erro ao cancelar",
                description: error.message || "Não foi possível cancelar a recorrência.",
                variant: "destructive"
            })
        } finally {
            setTransactionToCancelRecurrence(null)
        }
    }

    return {
        pendingTransactions,
        categories,
        cards,
        isLoaded,
        visibleTransactions,
        paymentMatches,
        busyMatchId,
        settleWithMatch,
        dismissMatch,
        selectedTransaction,
        setSelectedTransaction,
        selectedCard,
        setSelectedCard,
        confirmDate,
        setConfirmDate,
        transactionToCancel,
        setTransactionToCancel,
        transactionToCancelRecurrence,
        setTransactionToCancelRecurrence,
        handleMarkAsPaid,
        confirmPayment,
        isConfirmingPayment,
        confirmCancel,
        confirmCancelRecurrence,
        refresh,
        isCoupleView,
        payers,
        paidBy,
        setPaidBy,
    }
}
