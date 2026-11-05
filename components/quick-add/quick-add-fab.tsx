"use client"

import { usePathname } from "next/navigation"
import { Plus } from "@phosphor-icons/react"
import { cn } from "@/lib/utils"
import { QuickAddSheet } from "./quick-add-sheet"
import type { useQuickAddViewModel } from "./use-quick-add-view-model"
import { useVisibleOnScrollUp } from "@/hooks/use-visible-on-scroll-up"

// Telas que são o próprio formulário (ou não registram nada).
const HIDDEN_ON = ["/new", "/transfer", "/settings", "/admin"]

interface QuickAddFabProps {
  vm: ReturnType<typeof useQuickAddViewModel>
  /** Tela de cadastro: o "+" faz a ação dela (ex: "Nova categoria"). */
  primaryAction?: { label: string; onPress: () => void }
}

// Registro rápido, montado pelo AppLayout. No celular quem abre é o botão
// central do menu inferior; o botão flutuante aqui só aparece no desktop.
export function QuickAddFab({ vm, primaryAction }: QuickAddFabProps) {
  const pathname = usePathname()
  const visible = useVisibleOnScrollUp()

  return (
    <>
      {!HIDDEN_ON.includes(pathname) && (
        <button
          type="button"
          onClick={primaryAction?.onPress ?? vm.openSheet}
          aria-label={primaryAction?.label ?? "Registro rápido"}
          title={primaryAction?.label}
          className={cn(
            "hidden md:flex fixed z-40 bottom-8 right-8 w-14 h-14 rounded-full bg-primary text-background items-center justify-center shadow-lg hover:scale-110 transition-[translate,scale,opacity] duration-200",
            !visible && "pointer-events-none translate-y-24 opacity-0",
          )}
          aria-hidden={!visible || undefined}
          tabIndex={visible ? undefined : -1}
        >
          <Plus weight="bold" size={28} />
        </button>
      )}
      <QuickAddSheet vm={vm} />
    </>
  )
}
