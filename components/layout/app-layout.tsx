"use client"

import type { ReactNode } from "react"
import { cn } from "@/lib/utils"
import { BottomNav } from "./bottom-nav"
import { DesktopNav } from "./desktop-nav"

interface AppLayoutProps {
  children: ReactNode
  /** Mostra o seletor de mês no cabeçalho mobile fixo (Home, Stats, Categoria, Fatura). */
  showMonthFilter?: boolean
  /**
   * Ação principal da tela de cadastro (ex: "Nova categoria", "Nova reserva").
   * Com ela, o "+" central do menu faz essa ação em vez do registro rápido —
   * a tela não precisa de um botão flutuante próprio.
   */
  primaryAction?: { label: string; onPress: () => void }
}

// Add imports
import { NotificationCenter } from "@/components/notifications/notification-center"
import { AccountSwitcher } from "@/components/account/account-switcher"
import { MonthHeaderSelector } from "@/components/ui/month-header-selector"
import { usePathname } from "next/navigation"
import { QuickAddFab } from "@/components/quick-add/quick-add-fab"
import { useQuickAddViewModel } from "@/components/quick-add/use-quick-add-view-model"
import { useAccount } from "@/components/account/account-context"
import { useNavTrail } from "./back-link"

export function AppLayout({ children, showMonthFilter = false, primaryAction }: AppLayoutProps) {
  const pathname = usePathname()
  const { isReadOnly } = useAccount()
  // Anota as telas visitadas para o "← Voltar" das telas derivadas.
  useNavTrail()
  // Um só registro rápido: aberto pelo botão central do menu (celular) ou pelo "+" (desktop).
  const quickAdd = useQuickAddViewModel()
  // Hide header on login page if needed, although AuthGuard handles it.

  return (
    <div className="min-h-screen bg-background">
      <DesktopNav />

      {/* Mobile Top Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-background/80 backdrop-blur-md border-b border-border z-40 flex items-center px-4 justify-between gap-2">
        <div className="flex items-center gap-2 shrink-0">
          <NotificationCenter />
          <h1 className="font-bold text-lg text-foreground">Dominio</h1>
        </div>
        <div className="flex items-center gap-2 min-w-0 flex-1 justify-end">
          {showMonthFilter && <MonthHeaderSelector className="shrink-0" />}
          {/* Sem conta do casal o AccountSwitcher não renderiza nada: o espaço
              some (empty:hidden) e o seletor de mês vai para o canto direito. */}
          <div className={cn("flex-1 empty:hidden", showMonthFilter ? "max-w-[42%]" : "max-w-[55%]")}>
            <AccountSwitcher />
          </div>
        </div>
      </div>

      {/* Main content */}
      {/* pb usa calc() somando o BottomNav flutuante (0.75rem do rodapé + h-16 = 4.75rem) + folga (2.25rem) +
          env(safe-area-inset-bottom) para nunca deixar o último elemento do conteúdo
          coberto pelo BottomNav fixo, mesmo em iPhones com home indicator. */}
      <main className="pb-[calc(7rem+env(safe-area-inset-bottom))] pt-2 md:pt-0 md:pb-8 md:pl-64 mt-16 md:mt-0">
        <div className="container max-w-7xl mx-auto px-4 py-6 md:py-8">{children}</div>
      </main>

      <BottomNav
        onQuickAdd={isReadOnly ? undefined : (primaryAction?.onPress ?? quickAdd.openSheet)}
        quickAddLabel={primaryAction?.label}
      />
      {!isReadOnly && <QuickAddFab vm={quickAdd} primaryAction={primaryAction} />}
    </div>
  )
}
