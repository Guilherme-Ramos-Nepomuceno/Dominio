"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  House,
  Plus,
  ChartBar,
  Gear,
  Moon,
  Sun,
  CreditCard,
  Folders,
  PiggyBank,
  Repeat,
  Clock,
} from "@phosphor-icons/react"
import { cn } from "@/lib/utils"
import { useTheme } from "@/hooks/use-theme"

const navItems = [
  { href: "/", icon: House, label: "Home" },
  { href: "/stats", icon: ChartBar, label: "Estatísticas" },
  { href: "/cards", icon: CreditCard, label: "Cartões" },
  { href: "/categories", icon: Folders, label: "Categorias" },
  { href: "/savings", icon: PiggyBank, label: "Reservas" },
  { href: "/recurring", icon: Repeat, label: "Recorrentes" },
  { href: "/pending", icon: Clock, label: "Pendentes" },
  { href: "/settings", icon: Gear, label: "Configurações" },
]

export function DesktopNav() {
  const pathname = usePathname()
  const { theme, toggleTheme, mounted } = useTheme()

  if (!mounted) return null

  return (
    <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 bg-card border-r border-border">
      <div className="flex flex-col flex-1 overflow-y-auto">
        {/* Logo / Brand */}
        <div className="flex items-center justify-between h-20 px-6 border-b border-border">
          <h1 className="text-2xl font-bold text-foreground">Dominio</h1>
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg hover:bg-muted transition-colors"
            aria-label="Toggle theme"
          >
            {theme === "dark" ? <Sun weight="bold" size={20} /> : <Moon weight="bold" size={20} />}
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-4 py-6 space-y-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href
            const Icon = item.icon

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-[1vw] transition-all font-medium",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted",
                )}
              >
                <Icon weight={isActive ? "fill" : "regular"} size={22} />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>

        {/* Quick Action Button */}
        <div className="p-4 border-t border-border">
          <Link
            href="/new"
            className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-primary text-primary-foreground rounded-[1vw] font-semibold hover:bg-primary/90 transition-colors"
          >
            <Plus weight="bold" size={20} />
            Nova Transação
          </Link>
        </div>
      </div>
    </aside>
  )
}
