"use client"

import Link from "next/link"
import { AppLayout } from "@/components/layout/app-layout"
import { PageHeader } from "@/components/ui/page-header"
import { useAllMenusViewModel } from "../hooks/use-all-menus-view-model"

export function AllMenusView() {
    const { allMenus } = useAllMenusViewModel()

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
                            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
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
