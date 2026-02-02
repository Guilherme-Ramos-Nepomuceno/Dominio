"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { ArrowsLeftRight, Plus } from "@phosphor-icons/react"
import { AppLayout } from "@/components/layout/app-layout"
import { PageHeader } from "@/components/ui/page-header"
import { CardItem } from "@/components/cards/card-item"
import { AddCardDialog } from "@/components/cards/add-card-dialog"
import { getCards, getTransactions, getSavingsGoals, getAccountBalance, deleteCard } from "@/lib/storage"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useToast } from "@/hooks/use-toast"

export default function CardsPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [cards, setCards] = useState<any[]>([])
  const [transactions, setTransactions] = useState<any[]>([])
  const [savingsGoals, setSavingsGoals] = useState<any[]>([])
  const [cardToDelete, setCardToDelete] = useState<string | null>(null)

  const { toast } = useToast()

  useEffect(() => {
    setCards(getCards())
    setTransactions(getTransactions())
    setSavingsGoals(getSavingsGoals())
  }, [])

  const currentMonth = new Date().toISOString().slice(0, 7)

  const confirmDeleteCard = () => {
    if (cardToDelete) {
      deleteCard(cardToDelete)
      setCards((prevCards) => prevCards.filter((card) => card.id !== cardToDelete))
      setCardToDelete(null)
      toast({
        title: "Cartão removido",
        description: "O cartão foi excluído com sucesso.",
        variant: "success", // Using our new success variant
      })
    }
  }

  const handleCreateSuccess = () => {
    setCards(getCards())
    setIsDialogOpen(false)
    toast({
      title: "Cartão adicionado!",
      description: "Seu novo cartão já está disponível.",
      variant: "success",
    })
  }

  return (
    <AppLayout>
      <PageHeader title="Meus Cartões" subtitle="Gerencie suas contas e limites" />

      <div className="flex justify-center mt-6">
        <Link
          href="/transfer"
          className="flex items-center gap-2 px-6 py-3 rounded-full bg-primary text-background font-semibold shadow-lg hover:shadow-xl hover:bg-primary/90 hover:-translate-y-0.5 transition-all duration-300"
        >
          <ArrowsLeftRight size={20} weight="bold" />
          <span>Transferir</span>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mt-8">
        {cards.map((card) => {
          let calculatedBalance = 0
          let spentAmount = 0

          if (card.type === "credit") {
            const currentInvoiceTransactions = transactions.filter(
              (t) =>
                t.cardId === card.id &&
                t.date.startsWith(currentMonth) &&
                t.type === "expense",
            )
            spentAmount = currentInvoiceTransactions.reduce((sum, t) => sum + t.amount, 0)
          } else {
            calculatedBalance = getAccountBalance(card.id)
            spentAmount = transactions
              .filter((t) => t.cardId === card.id && t.date.startsWith(currentMonth) && t.type === "expense")
              .reduce((sum, t) => sum + t.amount, 0)
          }

          const cardGoals = savingsGoals.filter((g) => g.cardId === card.id)

          return (
            <CardItem
              key={card.id}
              card={card}
              spent={spentAmount}
              balance={calculatedBalance}
              savingsGoals={cardGoals}
              onDelete={(id) => setCardToDelete(id)}
            />
          )
        })}

        <button
          onClick={() => setIsDialogOpen(true)}
          className="min-h-[220px] rounded-[2rem] border-2 border-dashed border-foreground/40 flex flex-col items-center justify-center gap-3 text-neutral-500 hover:text-primary hover:border-primary hover:bg-primary/5 transition-all duration-300 group"
        >
          <div className="w-14 h-14 rounded-full bg-foreground/40 group-hover:bg-foreground flex items-center justify-center transition-colors">
            <Plus weight="bold" size={24} className="text-background" />
          </div>
          <span className="font-medium">Adicionar Cartão</span>
        </button>
      </div>

      <AddCardDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onSuccess={handleCreateSuccess}
      />

      <AlertDialog open={!!cardToDelete} onOpenChange={() => setCardToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Cartão?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover este cartão? O histórico de transações vinculado a ele poderá ser afetado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteCard} className="bg-destructive text-white hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  )
}