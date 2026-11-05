"use client"

import {
    CompassIcon,
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
    FlagBannerIcon,
} from "@phosphor-icons/react"
import { useInboxCount } from "@/hooks/use-inbox-count"

// Os menus em 4 grupos, na ordem de uso: planejar, registrar, acompanhar o
// dinheiro e ajustar. Home fica fora (já está no menu inferior).
export function useAllMenusViewModel() {
    const { count: inboxCount } = useInboxCount()
    const menuGroups = [
        {
            title: "Planejar",
            items: [
                { href: "/plan", icon: TargetIcon, label: "Planejar mês", description: "Orçamento, grupos e desejos do mês" },
                { href: "/week", icon: CalendarDotsIcon, label: "Minha semana", description: "Quanto ainda dá para gastar até o fim da semana" },
                { href: "/month-closing", icon: CalendarCheckIcon, label: "Fechamento", description: "Fechar o plano e o que vence no próximo mês" },
                { href: "/goals", icon: FlagBannerIcon, label: "Objetivos", description: "Metas de economia de longo prazo" },
            ],
        },
        {
            title: "Registrar",
            items: [
                { href: "/new", icon: PlusIcon, label: "Nova transação", description: "Registre receitas e despesas" },
                { href: "/inbox", icon: TrayIcon, label: "A classificar", description: "Transações sem categoria, agrupadas" },
                { href: "/pending", icon: ClockIcon, label: "Pendentes", description: "Transações agendadas" },
                { href: "/recurring", icon: RepeatIcon, label: "Recorrentes", description: "Dívidas e parcelas" },
            ],
        },
        {
            title: "Dinheiro",
            items: [
                { href: "/cards", icon: CreditCardIcon, label: "Cartões", description: "Contas, cartões e limites" },
                { href: "/invoices", icon: ReceiptIcon, label: "Faturas", description: "Pagamento de faturas de crédito" },
                { href: "/savings", icon: PiggyBankIcon, label: "Reservas", description: "Dinheiro guardado por objetivo" },
                { href: "/stats", icon: CompassIcon, label: "Bússola", description: "Para onde foi o dinheiro, mês a mês, e o extrato" },
            ],
        },
        {
            title: "Ajustes",
            items: [
                { href: "/categories", icon: FoldersIcon, label: "Categorias", description: "Organize suas transações" },
                { href: "/settings", icon: GearIcon, label: "Configurações", description: "Perfil, preferências e conexões" },
            ],
        },
    ]

    return {
        menuGroups,
        inboxCount,
    }
}
