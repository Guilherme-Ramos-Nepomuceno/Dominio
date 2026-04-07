"use client"

import Link from "next/link"
import { ArrowsLeftRight, Plus } from "@phosphor-icons/react"
import { AppLayout } from "@/components/layout/app-layout"
import { PageHeader } from "@/components/ui/page-header"
import { CardItem } from "./card-item"
import { AddCardDialog } from "./add-card-dialog"
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
import { useCardsViewModel } from "../hooks/use-cards-view-model"

export function CardsView() {
    const {
        isDialogOpen,
        setIsDialogOpen,
        cardToDelete,
        setCardToDelete,
        processedCards,
        confirmDeleteCard,
        handleCreateSuccess
    } = useCardsViewModel()

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
                {processedCards.map((card) => (
                    <CardItem
                        key={card.id}
                        card={card}
                        spent={card.spentAmount}
                        balance={card.calculatedBalance}
                        savingsGoals={card.cardGoals}
                        onDelete={(id) => setCardToDelete(id)}
                    />
                ))}

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
