"use client"

import { useState, useEffect } from "react"
import { Bell, CalendarCheck, Warning } from "@phosphor-icons/react"
import { usePendingSummary } from "@/hooks/use-transactions"
import { formatCurrency } from "@/lib/date-utils"
import * as Popover from "@radix-ui/react-popover"

interface Notification {
    id: string
    title: string
    message: string
    type: "warning" | "info"
    date: string
    amount: number
}

export function NotificationCenter() {
    const { items } = usePendingSummary()
    const [isOpen, setIsOpen] = useState(false)
    const [hasUnread, setHasUnread] = useState(false)

    // usePendingSummary só traz o que já venceu ou vence hoje (não pendências futuras).
    const notifications: Notification[] = items.map((t) => {
        const isExpense = t.type === "expense"
        const isOverdue = new Date(t.date) < new Date(new Date().setHours(0, 0, 0, 0))
        const label = isOverdue ? "Atrasado" : "Vence hoje"

        return {
            id: t.id,
            title: isExpense ? "Conta pendente" : "Recebimento pendente",
            message: `${t.description}: ${label}.`,
            type: isOverdue ? "warning" : "info",
            date: t.date,
            amount: t.amount,
        }
    })

    useEffect(() => {
        if (notifications.length > 0) setHasUnread(true)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [items])

    const handleNotificationClick = () => {
        setIsOpen(false)
        window.location.href = "/pending"
    }

    return (
        <Popover.Root open={isOpen} onOpenChange={setIsOpen}>
            <Popover.Trigger asChild>
                <button
                    className="relative p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground outline-none"
                    onClick={() => setHasUnread(false)}
                >
                    <Bell size={24} weight={hasUnread ? "fill" : "bold"} className={hasUnread ? "text-primary wobble-animation" : ""} />
                    {hasUnread && (
                        <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border border-background animate-pulse" />
                    )}
                </button>
            </Popover.Trigger>

            <Popover.Portal>
                <Popover.Content
                    className="z-50 w-80 bg-card border border-border shadow-xl rounded-2xl p-0 focus:outline-none mr-4 mt-2 origin-top-right data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
                    sideOffset={5}
                    align="end"
                >
                    <div className="p-4 border-b border-border flex items-center justify-between bg-muted/30 rounded-t-2xl">
                        <h3 className="font-semibold text-foreground">Notificações</h3>
                        <span className="text-xs text-muted-foreground bg-background px-2 py-0.5 rounded-full border border-border">
                            {notifications.length} novas
                        </span>
                    </div>

                    <div className="max-h-[70vh] overflow-y-auto p-2 space-y-2">
                        {notifications.length === 0 ? (
                            <div className="py-8 text-center text-muted-foreground">
                                <Bell size={32} className="mx-auto mb-2 opacity-20" weight="duotone" />
                                <p className="text-sm">Tudo tranquilo por aqui.</p>
                            </div>
                        ) : (
                            notifications.map((notif) => (
                                <div
                                    key={notif.id}
                                    onClick={handleNotificationClick}
                                    className="p-3 rounded-xl bg-background border border-border/50 hover:bg-muted/50 transition-colors flex gap-3 relative group cursor-pointer"
                                >
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${notif.type === 'warning' ? 'bg-expense/10 text-expense' : 'bg-primary/10 text-primary'
                                        }`}>
                                        {notif.type === 'warning' ? <Warning weight="fill" size={20} /> : <CalendarCheck weight="fill" size={20} />}
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-foreground truncate">{notif.title}</p>
                                        <p className="text-xs text-muted-foreground leading-relaxed">{notif.message}</p>
                                        {notif.amount && (
                                            <p className="text-xs font-bold text-foreground mt-1">{formatCurrency(notif.amount)}</p>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    <Popover.Arrow className="fill-border" />
                </Popover.Content>
            </Popover.Portal>
        </Popover.Root>
    )
}
