"use client"

import Link from "next/link"
import { CaretRight } from "@phosphor-icons/react"
import { AppLayout } from "@/components/layout/app-layout"
import { PageHeader } from "@/components/ui/page-header"
import { InboxCountBadge } from "@/components/inbox/inbox-count-badge"
import { SectionTitle } from "@/app/plan/components/plan-ui"
import { useAllMenusViewModel } from "../hooks/use-all-menus-view-model"

// Página corrida, no desenho do Planejar: títulos de seção em caixa alta e
// listas com divisórias, sem um cartão em volta de cada grupo.
export function AllMenusView() {
    const { menuGroups, inboxCount } = useAllMenusViewModel()

    return (
        <AppLayout>
            <div className="max-w-2xl mx-auto space-y-10 pb-24 md:pb-10">
                <PageHeader title="Todos os menus" subtitle="Acesse todas as funcionalidades" />

                {menuGroups.map((group) => {
                    const id = `menu-${group.title.toLowerCase()}`
                    return (
                        <section key={group.title} aria-labelledby={id}>
                            <SectionTitle id={id}>{group.title}</SectionTitle>
                            <ul className="mt-2 divide-y divide-border">
                                {group.items.map((menu) => {
                                    const Icon = menu.icon
                                    return (
                                        <li key={menu.href}>
                                            <Link href={menu.href} className="group flex items-center gap-3 py-3.5">
                                                <Icon size={20} weight="duotone" className="shrink-0 text-muted-foreground group-hover:text-foreground transition-colors" />
                                                <span className="flex-1 min-w-0">
                                                    <span className="flex items-center gap-2 text-sm font-medium text-foreground">
                                                        {menu.label}
                                                        {menu.href === "/inbox" && <InboxCountBadge count={inboxCount} />}
                                                    </span>
                                                    <span className="block text-xs text-muted-foreground truncate">{menu.description}</span>
                                                </span>
                                                <CaretRight size={12} weight="bold" className="shrink-0 text-muted-foreground/60 transition-transform group-hover:translate-x-0.5" />
                                            </Link>
                                        </li>
                                    )
                                })}
                            </ul>
                        </section>
                    )
                })}
            </div>
        </AppLayout>
    )
}
