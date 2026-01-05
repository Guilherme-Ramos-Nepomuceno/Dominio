"use client"

import { useState, useEffect } from "react"
import { PlusIcon } from "@phosphor-icons/react"
import { AppLayout } from "@/components/layout/app-layout"
import { PageHeader } from "@/components/ui/page-header"
import { CardItem } from "@/components/cards/card-item"
import { AddCardDialog } from "@/components/cards/add-card-dialog"
import { getCards, deleteCard, getTransactions, getSavingsGoals } from "@/lib/storage"
import type { Card, Transaction, SavingsGoal } from "@/lib/types"

export default function CardsPage() {
  const [cards, setCards] = useState<Card[]>([])
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [cardExpenses, setCardExpenses] = useState<Record<string, number>>({})
  const [cardBalances, setCardBalances] = useState<Record<string, number>>({})
  const [savingsGoalsByCard, setSavingsGoalsByCard] = useState<Record<string, SavingsGoal[]>>({})

  const loadCards = () => {
    const allCards = getCards()
    setCards(allCards)

    const transactions = getTransactions() as Array<Transaction & { cardId?: string }>
    const expenses: Record<string, number> = {}
    const balances: Record<string, number> = {}

    const savingsGoals = getSavingsGoals()
    const goalsByCard: Record<string, SavingsGoal[]> = {}
    savingsGoals.forEach((goal) => {
      if (goal.cardId) {
        if (!goalsByCard[goal.cardId]) {
          goalsByCard[goal.cardId] = []
        }
        goalsByCard[goal.cardId].push(goal)
      }
    })
    setSavingsGoalsByCard(goalsByCard)

    allCards.forEach((card) => {
      expenses[card.id] = transactions
        .filter((t) => t.cardId === card.id && t.type === "expense")
        .reduce((sum, t) => sum + t.amount, 0)

      if (card.type === "debit") {
        const income = transactions
          .filter((t) => t.cardId === card.id && t.type === "income")
          .reduce((sum, t) => sum + t.amount, 0)

        balances[card.id] = income - expenses[card.id]
      }
    })

    setCardExpenses(expenses)
    setCardBalances(balances)
  }

  useEffect(() => {
    loadCards()
  }, [])

  const handleDelete = (id: string) => {
    if (confirm("Deseja excluir este cartão? As transações vinculadas não serão excluídas.")) {
      deleteCard(id)
      loadCards()
    }
  }

  return (
    <AppLayout>
      <PageHeader title="Meus Cartões" subtitle="Gerencie seus cartões de crédito e débito" />

      <div className="space-y-4">
        {cards.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">Nenhum cartão cadastrado</p>
            <button
              onClick={() => setIsDialogOpen(true)}
              className="px-6 py-3 rounded-[1vw] bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity"
            >
              Adicionar Primeiro Cartão
            </button>
          </div>
        ) : (
          <>
            {cards.map((card) => (
              <CardItem
                key={card.id}
                card={card}
                spent={cardExpenses[card.id] || 0}
                balance={cardBalances[card.id]}
                savingsGoals={savingsGoalsByCard[card.id] || []}
                onDelete={handleDelete}
              />
            ))}
          </>
        )}
      </div>

      {cards.length > 0 && (
        <button
          onClick={() => setIsDialogOpen(true)}
          className="fixed bottom-24 right-6 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:scale-110 transition-transform md:bottom-6"
        >
          <PlusIcon weight="bold" size={24} />
        </button>
      )}

      <AddCardDialog isOpen={isDialogOpen} onClose={() => setIsDialogOpen(false)} onSuccess={loadCards} />
    </AppLayout>
  )
}
