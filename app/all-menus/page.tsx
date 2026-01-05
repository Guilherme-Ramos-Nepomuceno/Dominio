"use client"

import Link from "next/link"
import { House, ChartBar, CreditCard, Folders, PiggyBank, Repeat, Gear, Plus, Clock } from "@phosphor-icons/react"
import { AppLayout } from "@/components/layout/app-layout"
import { PageHeader } from "@/components/ui/page-header"

const allMenus = [
  { href: "/", icon: House, label: "Home", description: "Visão geral das suas finanças" },
  { href: "/stats", icon: ChartBar, label: "Estatísticas", description: "Gráficos e análises detalhadas" },
  { href: "/cards", icon: CreditCard, label: "Cartões", description: "Gerencie seus cartões bancários" },
  { href: "/categories", icon: Folders, label: "Categorias", description: "Organize suas transações" },
  { href: "/savings", icon: PiggyBank, label: "Reservas", description: "Acompanhe suas economias" },
  { href: "/recurring", icon: Repeat, label: "Recorrentes", description: "Dívidas e parcelas" },
  { href: "/pending", icon: Clock, label: "Pendentes", description: "Transações agendadas" },
  { href: "/settings", icon: Gear, label: "Configurações", description: "Personalize o app" },
  { href: "/new", icon: Plus, label: "Nova Transação", description: "Registre receitas e despesas" },
]

export default function AllMenusPage() {
  return (
    <AppLayout>
      <PageHeader title="Todos os Menus" subtitle="Acesse todas as funcionalidades" />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {allMenus.map((menu) => {
          const Icon = menu.icon
          return (
            <Link
              key={menu.href}
              href={menu.href}
              className="flex items-start gap-4 p-5 rounded-2xl bg-card border border-border/50 hover:border-primary/50 hover:shadow-md transition-all"
            >
              <div className="w-12 h-12 rounded-[1vw] bg-primary/10 flex items-center justify-center shrink-0">
                <Icon size={24} weight="fill" className="text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-foreground mb-1">{menu.label}</h3>
                <p className="text-sm text-muted-foreground">{menu.description}</p>
              </div>
            </Link>
          )
        })}
      </div>
    </AppLayout>
  )
}
