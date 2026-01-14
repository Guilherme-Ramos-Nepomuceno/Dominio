"use client"

import { useState, useEffect } from "react" // Adicionado useEffect
import Link from "next/link" 
import { ArrowsLeftRight, Plus } from "@phosphor-icons/react"
import { AppLayout } from "@/components/layout/app-layout"
import { PageHeader } from "@/components/ui/page-header"
import { CardItem } from "@/components/cards/card-item"
import { AddCardDialog } from "@/components/cards/add-card-dialog"
// 1. IMPORTANTE: Importar a função deleteCard (supondo que ela exista no seu storage)
import { getCards, getTransactions, getSavingsGoals, getAccountBalance, deleteCard } from "@/lib/storage"

export default function CardsPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  
  // 2. MUDANÇA: Usar useState para os dados. 
  // Se 'cards' for apenas uma constante const cards = getCards(), a tela não atualiza quando apaga.
  const [cards, setCards] = useState<any[]>([]) 
  const [transactions, setTransactions] = useState<any[]>([])
  const [savingsGoals, setSavingsGoals] = useState<any[]>([])

  // Carregar os dados ao iniciar a página
  useEffect(() => {
    setCards(getCards())
    setTransactions(getTransactions())
    setSavingsGoals(getSavingsGoals())
  }, [])

  const currentMonth = new Date().toISOString().slice(0, 7)

  // 3. A NOVA FUNÇÃO DE DELETAR
  const handleDeleteCard = (id: string) => {
    // Pergunta de segurança
    if (window.confirm("Tem certeza que deseja excluir este cartão?")) {
      
      // A. Remove do armazenamento (Banco de dados/LocalStorage)
      deleteCard(id) 
      
      // B. Remove da tela instantaneamente (Estado do React)
      setCards((prevCards) => prevCards.filter((card) => card.id !== id))
    }
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
                t.type === 'expense'
            )
            spentAmount = currentInvoiceTransactions.reduce((sum, t) => sum + t.amount, 0)
          } else {
            calculatedBalance = getAccountBalance(card.id)
            spentAmount = transactions
              .filter(t => t.cardId === card.id && t.date.startsWith(currentMonth) && t.type === 'expense')
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
              // 4. MUDANÇA: Passar a nova função aqui
              onDelete={handleDeleteCard}
            />
          )
        })}

        <button
          onClick={() => setIsDialogOpen(true)}
          className="min-h-[220px] rounded-[2rem] border-2 border-dashed border-foreground/40 flex flex-col items-center justify-center gap-3 text-neutral-500 hover:text-primary hover:border-primary hover:bg-primary/5 transition-all duration-300 group"
        >
          <div className="w-14 h-14 rounded-full bg-foreground/40 group-hover:bg-foreground flex items-center justify-center transition-colors">
            <Plus weight="bold" size={24}  className="text-background"/>
          </div>
          <span className="font-medium">Adicionar Cartão</span>
        </button>
      </div>

      <AddCardDialog 
        isOpen={isDialogOpen} 
        onClose={() => setIsDialogOpen(false)} 
        // Atualiza a lista ao criar um novo cartão também
        onSuccess={() => {
            setCards(getCards()) 
            setIsDialogOpen(false)
        }} 
      />
    </AppLayout>
  )
}