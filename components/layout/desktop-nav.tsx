"use client"

import { useState, type ComponentType } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  HouseIcon,
  PlusIcon,
  CompassIcon,
  GearIcon,
  MoonIcon,
  SunIcon,
  CreditCardIcon,
  FoldersIcon,
  PiggyBankIcon,
  RepeatIcon,
  ClockIcon,
  ReceiptIcon,
  CalendarCheckIcon,
  TrayIcon,
  TargetIcon,
  CalendarDotsIcon,
  FlagBannerIcon,
  DotsNineIcon,
  CaretDownIcon,
  SidebarSimpleIcon,
  type IconProps,
} from "@phosphor-icons/react"
import { cn } from "@/lib/utils"
import { useTheme } from "@/hooks/use-theme"
import { UserProfileBox } from "@/components/profile/user-profile-box"
import { NotificationCenter } from "@/components/notifications/notification-center"
import { AccountSwitcher } from "@/components/account/account-switcher"
import { InboxCountBadge } from "@/components/inbox/inbox-count-badge"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { useInboxCount } from "@/hooks/use-inbox-count"

interface NavItem {
  href: string
  icon: ComponentType<IconProps>
  label: string
}

// O dia a dia fica sempre à vista; o resto mora em "Mais" (mesma ideia do
// "Todos" no celular).
const mainItems: NavItem[] = [
  { href: "/", icon: HouseIcon, label: "Home" },
  { href: "/plan", icon: TargetIcon, label: "Planejar" },
  { href: "/week", icon: CalendarDotsIcon, label: "Minha semana" },
  { href: "/inbox", icon: TrayIcon, label: "A classificar" },
  { href: "/stats", icon: CompassIcon, label: "Bússola" },
  { href: "/cards", icon: CreditCardIcon, label: "Cartões" },
]

const moreItems: NavItem[] = [
  { href: "/savings", icon: PiggyBankIcon, label: "Reservas" },
  { href: "/goals", icon: FlagBannerIcon, label: "Objetivos" },
  { href: "/invoices", icon: ReceiptIcon, label: "Faturas" },
  { href: "/recurring", icon: RepeatIcon, label: "Recorrentes" },
  { href: "/pending", icon: ClockIcon, label: "Pendentes" },
  { href: "/month-closing", icon: CalendarCheckIcon, label: "Fechamento" },
  { href: "/categories", icon: FoldersIcon, label: "Categorias" },
]

const settingsItem: NavItem = { href: "/settings", icon: GearIcon, label: "Configurações" }

function isActivePath(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`)
}

/** Recolhido, o nome aparece num balão ao passar o mouse. */
function WithTooltip({ show, label, children }: { show: boolean; label: string; children: React.ReactElement }) {
  if (!show) return children
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side="right" sideOffset={8}>
        {label}
      </TooltipContent>
    </Tooltip>
  )
}

interface DesktopNavProps {
  collapsed: boolean
  onToggleCollapsed: () => void
  /** Mesma ação do "+" do celular. Sem ela (conta só leitura) o botão some. */
  onQuickAdd?: () => void
  /** Nome da ação quando a tela troca o registro rápido pela dela (ex: "Nova categoria"). */
  quickAddLabel?: string
}

export function DesktopNav({ collapsed, onToggleCollapsed, onQuickAdd, quickAddLabel }: DesktopNavProps) {
  const pathname = usePathname()
  const { theme, toggleTheme, mounted } = useTheme()
  const { count: inboxCount } = useInboxCount()
  const moreHasActive = moreItems.some((item) => isActivePath(pathname, item.href))
  const [moreOpen, setMoreOpen] = useState(moreHasActive)

  if (!mounted) return null

  const renderItem = (item: NavItem) => {
    const isActive = isActivePath(pathname, item.href)
    const Icon = item.icon
    const isInbox = item.href === "/inbox"

    return (
      <WithTooltip key={item.href} show={collapsed} label={item.label}>
        <Link
          href={item.href}
          aria-label={collapsed ? item.label : undefined}
          aria-current={isActive ? "page" : undefined}
          className={cn(
            "relative flex items-center gap-3 h-10 rounded-xl transition-colors text-sm font-medium",
            collapsed ? "justify-center w-10 mx-auto" : "px-3",
            isActive
              ? "bg-primary/10 text-primary"
              : "text-muted-foreground hover:text-foreground hover:bg-muted",
          )}
        >
          <Icon weight={isActive ? "fill" : "regular"} size={20} className="shrink-0" />
          {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
          {isInbox && !collapsed && <InboxCountBadge count={inboxCount} />}
          {isInbox && collapsed && inboxCount > 0 && (
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-primary" aria-hidden />
          )}
        </Link>
      </WithTooltip>
    )
  }

  const toggleMore = () => {
    // Recolhido não cabe a lista: abre o menu já com "Mais" aberto.
    if (collapsed) {
      onToggleCollapsed()
      setMoreOpen(true)
      return
    }
    setMoreOpen((open) => !open)
  }

  const quickAddText = quickAddLabel ?? "Registrar"

  return (
    <aside
      className={cn(
        "hidden md:flex md:flex-col md:fixed md:inset-y-0 z-40 bg-card border-r border-border",
        "transition-[width] duration-200 ease-out motion-reduce:transition-none",
        collapsed ? "md:w-20" : "md:w-64",
      )}
    >
      {/* Marca + recolher */}
      <div className={cn("flex items-center h-16 shrink-0", collapsed ? "justify-center" : "justify-between pl-5 pr-3")}>
        {!collapsed && <span className="text-xl font-bold text-foreground">Dominio</span>}
        <WithTooltip show label={collapsed ? "Abrir menu" : "Recolher menu"}>
          <button
            type="button"
            onClick={onToggleCollapsed}
            aria-label={collapsed ? "Abrir menu" : "Recolher menu"}
            aria-expanded={!collapsed}
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <SidebarSimpleIcon size={20} weight="bold" />
          </button>
        </WithTooltip>
      </div>

      {/* Registrar — o mesmo "+" do celular */}
      {onQuickAdd && (
        <div className={cn("pb-3 shrink-0", collapsed ? "px-0 flex justify-center" : "px-3")}>
          <WithTooltip show={collapsed} label={quickAddText}>
            <button
              type="button"
              data-guide="quick-add"
              onClick={onQuickAdd}
              aria-label={quickAddText}
              className={cn(
                "flex items-center justify-center gap-2 bg-primary text-background font-semibold shadow-sm hover:bg-primary/90 active:scale-95 transition-[background-color,scale]",
                collapsed ? "w-11 h-11 rounded-full" : "w-full h-11 px-4 rounded-xl",
              )}
            >
              <PlusIcon weight="bold" size={20} className="shrink-0" />
              {!collapsed && <span className="truncate">{quickAddText}</span>}
            </button>
          </WithTooltip>
        </div>
      )}

      {/* Navegação */}
      <nav className={cn("flex-1 overflow-y-auto overflow-x-hidden py-2 space-y-1", collapsed ? "px-2" : "px-3")}>
        {mainItems.map(renderItem)}

        <div className={cn("pt-2", !collapsed && "mt-2 border-t border-border")}>
          <WithTooltip show={collapsed} label="Mais">
            <button
              type="button"
              onClick={toggleMore}
              aria-expanded={!collapsed && moreOpen}
              aria-label={collapsed ? "Mais" : undefined}
              className={cn(
                "relative flex items-center gap-3 h-10 w-full rounded-xl text-sm font-medium transition-colors",
                collapsed ? "justify-center w-10 mx-auto" : "px-3",
                collapsed && moreHasActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted",
              )}
            >
              <DotsNineIcon size={20} weight={collapsed && moreHasActive ? "fill" : "regular"} className="shrink-0" />
              {!collapsed && (
                <>
                  <span className="flex-1 text-left">Mais</span>
                  <CaretDownIcon
                    size={14}
                    weight="bold"
                    className={cn("transition-transform", moreOpen && "rotate-180")}
                  />
                </>
              )}
            </button>
          </WithTooltip>
          {!collapsed && moreOpen && <div className="mt-1 space-y-1">{moreItems.map(renderItem)}</div>}
        </div>
      </nav>

      {/* Rodapé: conta, avisos, tema, ajustes, perfil */}
      <div className={cn("shrink-0 border-t border-border py-3 space-y-2", collapsed ? "px-2" : "px-3")}>
        {!collapsed && <AccountSwitcher />}

        <div className={cn("flex items-center gap-1", collapsed ? "flex-col" : "justify-between")}>
          {renderItem(settingsItem)}
          <div className={cn("flex items-center gap-1", collapsed && "flex-col")}>
            <NotificationCenter />
            <WithTooltip show label={theme === "dark" ? "Tema claro" : "Tema escuro"}>
              <button
                type="button"
                onClick={toggleTheme}
                className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                aria-label={theme === "dark" ? "Tema claro" : "Tema escuro"}
              >
                {theme === "dark" ? <SunIcon weight="bold" size={20} /> : <MoonIcon weight="bold" size={20} />}
              </button>
            </WithTooltip>
          </div>
        </div>

        <UserProfileBox compact={collapsed} />
      </div>
    </aside>
  )
}
