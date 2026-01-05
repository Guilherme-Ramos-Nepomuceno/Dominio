"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { House, Plus, CreditCard, PiggyBank, DotsNine } from "@phosphor-icons/react"
import { cn } from "@/lib/utils"

const navItems = [
  { href: "/", icon: House, label: "Home" },
  { href: "/cards", icon: CreditCard, label: "Cartões" },
  { href: "/savings", icon: PiggyBank, label: "Reservas" },
  { href: "/all-menus", icon: DotsNine, label: "Todos" },
]

export function BottomNav() {
  const pathname = usePathname()

  const hideFloatingButton = ["/new", "/transfer", "/categories", "/settings", "/savings", "/cards"].includes(pathname)

  return (
    <>
      {!hideFloatingButton && (
        <Link
          href="/new"
          className="fixed bottom-20 right-6 z-40 w-14 h-14 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg hover:scale-110 transition-transform md:hidden"
        >
          <Plus weight="bold" size={28} />
        </Link>
      )}

      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border md:hidden">
        <div className="flex items-center justify-around h-16 px-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href
            const Icon = item.icon

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-[1vw] transition-colors min-w-[70px]",
                  isActive ? "text-primary" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon weight={isActive ? "fill" : "regular"} size={22} />
                <span className="text-[10px] font-medium leading-tight text-center">{item.label}</span>
              </Link>
            )
          })}
        </div>
      </nav>
    </>
  )
}
