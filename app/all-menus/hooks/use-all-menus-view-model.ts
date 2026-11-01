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
    CalendarCheckIcon,
    TrayIcon,
    TargetIcon,
    CalendarDotsIcon,
} from "@phosphor-icons/react"
import { useInboxCount } from "@/hooks/use-inbox-count"

export function useAllMenusViewModel() {
    const { count: inboxCount } = useInboxCount()
    const allMenus = [
        { href: "/", icon: HouseIcon, label: "Home", description: "Visão geral das suas finanças" },
        { href: "/plan", icon: TargetIcon, label: "Planejar mês", description: "Orçamento, grupos e desejos do mês" },
        { href: "/week", icon: CalendarDotsIcon, label: "Minha semana", description: "Quanto ainda dá para gastar até domingo" },
        { href: "/inbox", icon: TrayIcon, label: "A classificar", description: "Transações sem categoria, agrupadas" },
        { href: "/stats", icon: ChartBarIcon, label: "Estatísticas", description: "Gráficos e análises detalhadas" },
        { href: "/cards", icon: CreditCardIcon, label: "Cartões", description: "Gerencie seus cartões bancários" },
        { href: "/categories", icon: FoldersIcon, label: "Categorias", description: "Organize suas transações" },
        { href: "/savings", icon: PiggyBankIcon, label: "Reservas", description: "Acompanhe suas economias" },
        { href: "/recurring", icon: RepeatIcon, label: "Recorrentes", description: "Dívidas e parcelas" },
        { href: "/pending", icon: ClockIcon, label: "Pendentes", description: "Transações agendadas" },
        { href: "/month-closing", icon: CalendarCheckIcon, label: "Fechamento", description: "Tudo que vence no mês seguinte" },
        { href: "/invoices", icon: ReceiptIcon, label: "Faturas", description: "Pagamento de faturas de crédito" },
        { href: "/settings", icon: GearIcon, label: "Configurações", description: "Personalize o app" },
        { href: "/new", icon: PlusIcon, label: "Nova Transação", description: "Registre receitas e despesas" },
    ]

    return {
        allMenus,
        inboxCount,
    }
}
