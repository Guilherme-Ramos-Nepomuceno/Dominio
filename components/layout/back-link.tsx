"use client"

import { useEffect } from "react"
import { usePathname, useRouter } from "next/navigation"
import { ArrowLeft } from "@phosphor-icons/react"
import { cn } from "@/lib/utils"

// Caminho das telas visitadas nesta aba (só o necessário para saber se dá
// para voltar sem sair do app).
const KEY = "dominio:nav-trail"

function readTrail(): string[] {
  try {
    const raw = sessionStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as string[]) : []
  } catch {
    return []
  }
}

// Montado pelo AppLayout: anota cada tela aberta.
export function useNavTrail() {
  const pathname = usePathname()
  useEffect(() => {
    try {
      const trail = readTrail()
      if (trail[trail.length - 1] === pathname) return
      // Voltou para a tela anterior: tira a atual do fim em vez de empilhar.
      if (trail[trail.length - 2] === pathname) trail.pop()
      else trail.push(pathname)
      sessionStorage.setItem(KEY, JSON.stringify(trail.slice(-30)))
    } catch {
      // Sem sessionStorage o "Voltar" usa a tela-mãe.
    }
  }, [pathname])
}

// "← Voltar": volta para a tela de onde a pessoa veio; aberta direto (link,
// recarregou), vai para a tela-mãe (`fallback`).
export function BackLink({ fallback, className, guide }: { fallback: string; className?: string; guide?: string }) {
  const router = useRouter()
  const pathname = usePathname()
  return (
    <button
      type="button"
      data-guide={guide}
      onClick={() => {
        const trail = readTrail()
        const cameFromApp = trail.length >= 2 && trail[trail.length - 1] === pathname
        if (cameFromApp) router.back()
        else router.push(fallback)
      }}
      className={cn("inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors", className)}
    >
      <ArrowLeft size={14} weight="bold" />
      Voltar
    </button>
  )
}
