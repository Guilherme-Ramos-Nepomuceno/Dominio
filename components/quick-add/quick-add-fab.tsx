"use client"

import { useEffect, useRef, useState } from "react"
import { usePathname } from "next/navigation"
import { Plus } from "@phosphor-icons/react"
import { cn } from "@/lib/utils"
import { useAccount } from "@/components/account/account-context"
import { QuickAddSheet } from "./quick-add-sheet"
import { useQuickAddViewModel } from "./use-quick-add-view-model"
import { fabVisibleAfterScroll } from "@/lib/scroll"

// Some ao rolar para baixo (não cobre o conteúdo que a pessoa está lendo) e
// volta ao rolar para cima ou perto do topo.
function useVisibleOnScrollUp(): boolean {
  const [visible, setVisible] = useState(true)
  const lastY = useRef(0)
  const visibleRef = useRef(true)
  useEffect(() => {
    lastY.current = window.scrollY
    const onScroll = () => {
      const y = window.scrollY
      const next = fabVisibleAfterScroll(lastY.current, y, visibleRef.current)
      if (Math.abs(y - lastY.current) >= 12 || y <= 40) lastY.current = y
      if (next !== visibleRef.current) {
        visibleRef.current = next
        setVisible(next)
      }
    }
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])
  return visible
}

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
  const visible = useVisibleOnScrollUp()

  if (isReadOnly || HIDDEN_ON.includes(pathname)) return null

  return (
    <>
      <button
        type="button"
        onClick={vm.openSheet}
        aria-label="Registro rápido"
        className={cn(
          "fixed z-40 w-14 h-14 rounded-full bg-primary text-background flex items-center justify-center shadow-lg hover:scale-110 transition-[translate,scale,opacity] duration-200",
          "bottom-[calc(5rem+env(safe-area-inset-bottom))] right-6 md:bottom-8 md:right-8",
          !visible && "pointer-events-none translate-y-24 opacity-0",
        )}
        aria-hidden={!visible || undefined}
        tabIndex={visible ? undefined : -1}
      >
        <Plus weight="bold" size={28} />
      </button>
      <QuickAddSheet vm={vm} />
    </>
  )
}
