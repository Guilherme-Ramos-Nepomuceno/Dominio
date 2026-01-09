"use client"

import { useState } from "react"
import { PlusIcon } from "@phosphor-icons/react"
import { AppLayout } from "@/components/layout/app-layout"
import { PageHeader } from "@/components/ui/page-header"
import { CardItem } from "@/components/cards/card-item" // Seu componente CardItem
import { AddCardDialog } from "@/components/cards/add-card-dialog"
import { getCards, getTransactions, getSavingsGoals, getAccountBalance } from "@/lib/storage" // Importe o getAccountBalance

export default function CardsPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  
  // Pegamos os dados
  const cards = getCards()
  const transactions = getTransactions()
  const savingsGoals = getSavingsGoals()

  // Definimos o mês atual para filtrar a FATURA do cartão de crédito
  const currentMonth = new Date().toISOString().slice(0, 7) // "2024-02"

  return (
    <AppLayout>
      <PageHeader title="Meus Cartões" subtitle="Gerencie suas contas e limites" />

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mt-6">
        {cards.map((card) => {
          // LÓGICA CORRIGIDA AQUI:

          let calculatedBalance = 0
          let spentAmount = 0

          if (card.type === "credit") {
            // CRÉDITO: Queremos ver apenas a fatura do MÊS ATUAL
            // Filtramos por cardId E pela data (começa com YYYY-MM)
            const currentInvoiceTransactions = transactions.filter(
              (t) => 
                t.cardId === card.id && 
                t.date.startsWith(currentMonth) &&
                t.type === 'expense'
            )
            
            // O "Gasto" é a soma apenas deste mês
            spentAmount = currentInvoiceTransactions.reduce((sum, t) => sum + t.amount, 0)
            
            // O saldo disponível considera o limite total menos o gasto DO MÊS (ou total, dependendo da sua regra de negócio)
            // Se quiser o limite real comprometido com parcelas futuras, teria que somar todas as pendentes.
            // Mas para "Fatura Atual", usamos o spentAmount do mês.
          } else {
            // DÉBITO: O saldo é TUDO que já foi pago/recebido na história
            calculatedBalance = getAccountBalance(card.id)
            
            // Gasto do mês (apenas visual)
            spentAmount = transactions
              .filter(t => t.cardId === card.id && t.date.startsWith(currentMonth) && t.type === 'expense')
              .reduce((sum, t) => sum + t.amount, 0)
          }

          // Filtra metas deste cartão
          const cardGoals = savingsGoals.filter((g) => g.cardId === card.id)

          return (
            <CardItem
              key={card.id}
              card={card}
              spent={spentAmount} // Manda o gasto filtrado por mês (para crédito)
              balance={calculatedBalance} // Manda o saldo acumulado total (para débito)
              savingsGoals={cardGoals}
              onDelete={(id) => {
                // Sua lógica de delete
                console.log("Delete", id)
              }}
            />
          )
        })}

        {/* Botão de Adicionar */}
        <button
          onClick={() => setIsDialogOpen(true)}
          className="min-h-45 rounded-2xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-primary hover:border-primary hover:bg-primary/5 transition-all"
        >
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
            <PlusIcon weight="bold" size={24} />
          </div>
          <span className="font-medium">Adicionar Cartão</span>
        </button>
      </div>

      <AddCardDialog 
        isOpen={isDialogOpen} 
        onClose={() => setIsDialogOpen(false)} 
        onSuccess={() => window.location.reload()} 
      />
    </AppLayout>
  )
}