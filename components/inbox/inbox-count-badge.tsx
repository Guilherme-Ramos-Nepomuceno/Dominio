"use client"

import { cn } from "@/lib/utils"

// Badge discreto do contador de "A classificar" — tom neutro/primário, nunca
// o vermelho de erro: ter coisa para classificar não é um problema.
export function InboxCountBadge({ count, className }: { count: number; className?: string }) {
  if (count <= 0) return null
  return (
    <span
      className={cn(
        "inline-flex min-w-5 h-5 px-1.5 items-center justify-center rounded-full bg-primary/10 text-primary text-[11px] font-semibold tabular-nums leading-none",
        className,
      )}
      aria-label={`${count} para classificar`}
    >
      {count > 99 ? "99+" : count}
    </span>
  )
}
