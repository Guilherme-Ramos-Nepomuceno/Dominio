"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  HouseIcon,
  PlusIcon,
  ChartBarIcon,
  GearIcon,
  MoonIcon,
  SunIcon,
  CreditCardIcon,
  FoldersIcon,
  PiggyBankIcon,
  RepeatIcon,
  ClockIcon,
  ReceiptIcon,
} from "@phosphor-icons/react"
import { cn } from "@/lib/utils"
import { useTheme } from "@/hooks/use-theme"

const navItems = [
  { href: "/", icon: HouseIcon, label: "Home" },
  { href: "/stats", icon: ChartBarIcon, label: "Estatísticas" },
  { href: "/cards", icon: CreditCardIcon, label: "Cartões" },
  { href: "/categories", icon: FoldersIcon, label: "Categorias" },
  { href: "/savings", icon: PiggyBankIcon, label: "Reservas" },
  { href: "/recurring", icon: RepeatIcon, label: "Recorrentes" },
  { href: "/pending", icon: ClockIcon, label: "Pendentes" },
  { href: "/invoices", icon: ReceiptIcon, label: "Faturas" },
  { href: "/settings", icon: GearIcon, label: "Configurações" },
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
            {theme === "dark" ? <SunIcon weight="bold" size={20} /> : <MoonIcon weight="bold" size={20} />}
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
                  "flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium",
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
            className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:bg-primary/90 transition-colors"
          >
            <PlusIcon weight="bold" size={20} />
            Nova Transação
          </Link>
        </div>
      </div>
    </aside>
  )
}
