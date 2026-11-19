import Link from "next/link"
import { cn } from "@/lib/utils"

interface PageSwitchProps {
  items: { href: string; label: string }[]
  current: string
  label: string
  className?: string
}

// Alternador entre telas irmãs (ex.: Reservas e Objetivos). São links de
// verdade, então cada tela continua com a sua rota e o botão de voltar funciona.
export function PageSwitch({ items, current, label, className }: PageSwitchProps) {
  return (
    <nav aria-label={label} className={cn("flex w-fit rounded-full border border-border p-0.5", className)}>
      {items.map((item) => {
        const active = item.href === current
        return (
          <Link
            key={item.href}
            href={item.href}
            replace
            aria-current={active ? "page" : undefined}
            className={cn(
              "rounded-full px-4 py-1.5 text-sm font-semibold transition-colors",
              active ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}
