"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { House, CreditCard, DotsNine, Target, Plus } from "@phosphor-icons/react"
import { cn } from "@/lib/utils"
import { useInboxCount } from "@/hooks/use-inbox-count"
import { useVisibleOnScrollUp } from "@/hooks/use-visible-on-scroll-up"

// Reservas saiu do menu inferior — continua em "Todos".
const leftItems = [
  { href: "/", icon: House, label: "Home" },
  { href: "/plan", icon: Target, label: "Planejar" },
]
const rightItems = [
  { href: "/cards", icon: CreditCard, label: "Cartões" },
  { href: "/all-menus", icon: DotsNine, label: "Todos" },
]

interface BottomNavProps {
  /** Abre o registro rápido pelo botão central. Sem ele (conta só leitura) o botão some. */
  onQuickAdd?: () => void
  /** Nome da ação do "+" quando a tela troca o registro rápido pela dela (ex: "Nova categoria"). */
  quickAddLabel?: string
}

export function BottomNav({ onQuickAdd, quickAddLabel }: BottomNavProps) {
  const pathname = usePathname()
  // "A classificar" mora em "Todos" no celular — o contador aparece ali.
  const { count: inboxCount } = useInboxCount()
  // Rolando para baixo o menu desce para fora da tela; para cima (ou no topo) volta.
  const visible = useVisibleOnScrollUp()

  const renderItem = (item: (typeof leftItems)[number]) => {
    const isActive = item.href === "/" ? pathname === "/" : pathname === item.href || pathname.startsWith(`${item.href}/`)
    const Icon = item.icon

    return (
      <Link
        key={item.href}
        href={item.href}
        className={cn(
          "flex flex-1 flex-col items-center justify-center gap-1 py-2 rounded-full transition-colors",
          isActive ? "text-primary" : "text-muted-foreground hover:text-foreground",
        )}
      >
        <span className="relative">
          <Icon weight={isActive ? "fill" : "regular"} size={22} />
          {item.href === "/all-menus" && inboxCount > 0 && (
            <span className="absolute -top-1.5 -right-2.5 min-w-4 h-4 px-1 rounded-full bg-primary/15 text-primary text-[9px] font-bold leading-4 text-center tabular-nums">
              {inboxCount > 99 ? "99+" : inboxCount}
            </span>
          )}
        </span>
        <span className="text-[10px] font-medium leading-tight text-center">{item.label}</span>
      </Link>
    )
  }

  // Barra flutuante: solta das bordas da tela, com o "Registrar" no meio.
  return (
    <nav
      className={cn(
        "fixed inset-x-4 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-50 md:hidden",
        "rounded-full bg-card/85 backdrop-blur-xl backdrop-saturate-150 border border-black/10 dark:border-white/10 shadow-[0_8px_24px_rgba(0,0,0,0.18)]",
        "transition-transform duration-200 ease-out motion-reduce:transition-none",
        !visible && "translate-y-[calc(100%+1rem+env(safe-area-inset-bottom))]",
      )}
      aria-hidden={!visible || undefined}
      inert={!visible || undefined}
    >
      <div className="flex items-center h-16 px-2">
        {leftItems.map(renderItem)}
        {onQuickAdd && (
          <div className="flex flex-1 justify-center">
            <button
              type="button"
              onClick={onQuickAdd}
              aria-label={quickAddLabel ?? "Registrar"}
              title={quickAddLabel}
              className="w-12 h-12 rounded-full bg-primary text-background flex items-center justify-center shadow-md active:scale-95 transition-transform"
            >
              <Plus weight="bold" size={24} />
            </button>
          </div>
        )}
        {rightItems.map(renderItem)}
      </div>
    </nav>
  )
}
