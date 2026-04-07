"use client"

import {
    HouseIcon,
    ChartBarIcon,
    CreditCardIcon,
    FoldersIcon,
    PiggyBankIcon,
    RepeatIcon,
    GearIcon,
    PlusIcon,
    ClockIcon,
    ReceiptIcon,
} from "@phosphor-icons/react"

export function useAllMenusViewModel() {
    const allMenus = [
        { href: "/", icon: HouseIcon, label: "Home", description: "Visão geral das suas finanças" },
        { href: "/stats", icon: ChartBarIcon, label: "Estatísticas", description: "Gráficos e análises detalhadas" },
        { href: "/cards", icon: CreditCardIcon, label: "Cartões", description: "Gerencie seus cartões bancários" },
        { href: "/categories", icon: FoldersIcon, label: "Categorias", description: "Organize suas transações" },
        { href: "/savings", icon: PiggyBankIcon, label: "Reservas", description: "Acompanhe suas economias" },
        { href: "/recurring", icon: RepeatIcon, label: "Recorrentes", description: "Dívidas e parcelas" },
        { href: "/pending", icon: ClockIcon, label: "Pendentes", description: "Transações agendadas" },
        { href: "/invoices", icon: ReceiptIcon, label: "Faturas", description: "Pagamento de faturas de crédito" },
        { href: "/settings", icon: GearIcon, label: "Configurações", description: "Personalize o app" },
        { href: "/new", icon: PlusIcon, label: "Nova Transação", description: "Registre receitas e despesas" },
    ]

    return {
        allMenus,
    }
}
