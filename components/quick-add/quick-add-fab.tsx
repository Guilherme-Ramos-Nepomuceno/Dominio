"use client"

import { usePathname } from "next/navigation"
import { Plus } from "@phosphor-icons/react"
import { cn } from "@/lib/utils"
import { useAccount } from "@/components/account/account-context"
import { QuickAddSheet } from "./quick-add-sheet"
import { useQuickAddViewModel } from "./use-quick-add-view-model"

// Telas que já têm seu próprio botão flutuante (ou são o próprio formulário)
// — mesma lista que escondia o antigo "+" do BottomNav.
const HIDDEN_ON = ["/new", "/transfer", "/categories", "/settings", "/savings", "/cards", "/admin"]

// Botão flutuante do registro rápido, montado pelo AppLayout (Home e demais
// telas principais). No celular fica acima do menu inferior; no desktop, no
// canto inferior direito.
export function QuickAddFab() {
  const pathname = usePathname()
  const { isReadOnly } = useAccount()
  const vm = useQuickAddViewModel()

  if (isReadOnly || HIDDEN_ON.includes(pathname)) return null

  return (
    <>
      <button
        type="button"
        onClick={vm.openSheet}
        aria-label="Registro rápido"
        className={cn(
          "fixed z-40 w-14 h-14 rounded-full bg-primary text-background flex items-center justify-center shadow-lg hover:scale-110 transition-transform",
          "bottom-[calc(5rem+env(safe-area-inset-bottom))] right-6 md:bottom-8 md:right-8",
        )}
      >
        <Plus weight="bold" size={28} />
      </button>
      <QuickAddSheet vm={vm} />
    </>
  )
}
