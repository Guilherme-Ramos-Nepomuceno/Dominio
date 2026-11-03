"use client"

import Link from "next/link"
import { Tray } from "@phosphor-icons/react"
import { formatCurrency } from "@/lib/date-utils"
import { categoryRows, type WeekCategory } from "@/lib/week"

// "Para onde foi": gasto da semana por categoria. As barras usam uma cor só
// (é uma série) — a identidade vem do nome e do ponto com a cor da categoria.
// "Sem categoria" fica em cinza, como na barra do mês do Planejar.
export function WeekCategories({ categories }: { categories: WeekCategory[] }) {
  const rows = categoryRows(categories, formatCurrency)
  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">Nenhum gasto que conta no limite nesta semana.</p>
  }

  return (
    <ul className="space-y-3">
      {rows.map((row) => (
        <li key={row.key}>
          <div className="flex items-center gap-2">
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={row.color ? { backgroundColor: row.color } : { border: "1.5px dashed var(--muted-foreground)" }}
              aria-hidden
            />
            <span className="flex-1 min-w-0 truncate text-sm text-foreground">{row.name}</span>
            {row.categoryId === null && (
              <Link href="/inbox" className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline shrink-0">
                <Tray size={12} weight="bold" aria-hidden />
                Classificar
              </Link>
            )}
            <span className="text-sm font-semibold tabular-nums shrink-0">{row.spentText}</span>
          </div>
          <div className="mt-1.5 h-1.5 rounded-full bg-muted overflow-hidden" aria-hidden>
            <div
              className="h-full rounded-full"
              style={{ width: `${row.barPct}%`, background: row.categoryId === null ? "var(--plan-uncategorized)" : "var(--chart-3)" }}
            />
          </div>
          {row.plannedText && <p className="mt-1 text-xs text-muted-foreground">{row.plannedText}</p>}
        </li>
      ))}
    </ul>
  )
}
