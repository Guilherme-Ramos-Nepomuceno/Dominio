"use client"

import Link from "next/link"
import { PiggyBank } from "@phosphor-icons/react"
import { wishProgressMessage, type WinsData } from "@/lib/wins"

// "Economia que vira desejo": a economia vs a média dos 3 meses, em % de cada
// desejo que ainda não cabe. Uma barra por desejo (série única, na cor dos
// desejos do plano); o número está no texto, a barra só dá a proporção.
export function WishProgressList({ items }: { items: WinsData["month"]["wishProgress"] }) {
  const shown = items.slice(0, 2)
  if (shown.length === 0) return null
  return (
    <section className="rounded-[20px] border border-border/50 bg-card p-5" aria-labelledby="wish-progress-title">
      <h2 id="wish-progress-title" className="flex items-center gap-2 text-base font-bold text-foreground">
        <PiggyBank size={18} weight="duotone" className="text-positive-ink" aria-hidden />
        Economia que vira desejo
      </h2>
      <ul className="mt-3 space-y-3">
        {shown.map((item) => (
          <li key={item.wishId}>
            <p className="text-sm text-foreground">{wishProgressMessage(item)}</p>
            <div
              className="mt-1.5 h-1.5 overflow-hidden rounded-full"
              style={{ backgroundColor: "var(--plan-track)" }}
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={item.pct}
              aria-label={`${item.pct}% de ${item.name}`}
            >
              <div
                className="h-full rounded-full transition-[width] duration-700"
                style={{ width: `${item.pct}%`, backgroundColor: "var(--plan-wishes)" }}
              />
            </div>
          </li>
        ))}
      </ul>
      <Link
        href="/plan#desejos"
        className="mt-3 inline-block text-xs font-semibold text-foreground underline decoration-foreground/30 underline-offset-4 hover:decoration-foreground"
      >
        Ver desejos do mês
      </Link>
    </section>
  )
}
