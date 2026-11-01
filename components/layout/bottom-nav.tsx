"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { House, CreditCard, PiggyBank, DotsNine, Target } from "@phosphor-icons/react"
import { cn } from "@/lib/utils"
import { useInboxCount } from "@/hooks/use-inbox-count"

const navItems = [
  { href: "/", icon: House, label: "Home" },
  { href: "/plan", icon: Target, label: "Planejar" },
  { href: "/cards", icon: CreditCard, label: "Cartões" },
  { href: "/savings", icon: PiggyBank, label: "Reservas" },
  { href: "/all-menus", icon: DotsNine, label: "Todos" },
]

export function BottomNav() {
  const pathname = usePathname()
  // "A classificar" mora em "Todos" no celular — o contador aparece ali.
  const { count: inboxCount } = useInboxCount()

  // O botão flutuante "+" agora é o registro rápido (QuickAddFab, no AppLayout).
  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-black/10 dark:border-white/10 shadow-[0_-4px_16px_rgba(0,0,0,0.08)] md:hidden pb-[env(safe-area-inset-bottom)]">
        <div className="flex items-center justify-around h-16 px-2">
          {navItems.map((item) => {
            const isActive = item.href === "/" ? pathname === "/" : pathname === item.href || pathname.startsWith(`${item.href}/`)
            const Icon = item.icon

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-[1vw] transition-colors min-w-16",
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
          })}
        </div>
      </nav>
    </>
  )
}
