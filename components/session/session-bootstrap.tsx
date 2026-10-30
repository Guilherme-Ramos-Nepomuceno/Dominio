"use client"

import { useEffect, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { CircleNotch } from "@phosphor-icons/react"
import { getCurrentUser } from "@/lib/auth"
import { getActiveAccountSelection } from "@/lib/active-account"
import { oncePerSession, trackEvent } from "@/lib/events"
import { syncPluggyTransactions } from "@/lib/storage"
import { useToast } from "@/hooks/use-toast"
import { ToastAction } from "@/components/ui/toast"

// Só mostra o indicador se o sync demorar um pouco — quem nem tem Pluggy
// conectada recebe um "NO_CONNECTION" rápido e não deve ver nada piscando.
const INDICATOR_DELAY_MS = 600

// Tarefas de "abertura do app", uma vez por sessão do navegador (aba) e por
// usuário: evento app_opened e sincronização automática da Pluggy em segundo
// plano. Roda ao abrir com sessão ativa e logo depois do login (a navegação
// para fora de /login dispara o efeito de novo).
export function SessionBootstrap() {
  const pathname = usePathname()
  const router = useRouter()
  const { toast } = useToast()
  const [isSyncing, setIsSyncing] = useState(false)

  useEffect(() => {
    if (pathname === "/login" || pathname.startsWith("/join/")) return
    const user = getCurrentUser()
    if (!user) return

    oncePerSession(`app_opened:${user.id}`, () => trackEvent("app_opened"))

    // Só na conta pessoal: a do casal não tem conexão própria com a Pluggy e
    // a de um parceiro é somente leitura. Se a pessoa trocar para a pessoal
    // depois (a troca recarrega a página), o sync roda nessa hora.
    if (getActiveAccountSelection().type !== "personal") return

    oncePerSession(`pluggy_auto_sync:${user.id}`, () => {
      const indicatorTimer = setTimeout(() => setIsSyncing(true), INDICATOR_DELAY_MS)
      syncPluggyTransactions({ auto: true })
        .then((result) => {
          const created = result.created
          // `skipped` = o backend nem sincronizou (reason diz o motivo);
          // `skippedCount` = lançamentos pulados num sync que rodou.
          trackEvent("pluggy_auto_sync", {
            created,
            skipped: result.skipped,
            skippedCount: result.skippedCount,
            reason: result.reason ?? null,
          })
          if (created > 0) {
            toast({
              title: `${created} ${created === 1 ? "transação nova" : "transações novas"} do banco`,
              description: "Já estão na revisão da sincronização bancária.",
              action: (
                <ToastAction altText="Revisar transações do banco" onClick={() => router.push("/bank-sync")}>
                  Revisar
                </ToastAction>
              ),
            })
          }
        })
        .catch((error) => {
          // Silencioso por design: o sync automático é um bônus, o botão
          // manual em /bank-sync continua mostrando erros normalmente. Não há
          // central de notificações genérica para erros — fica só no console.
          console.warn("Sincronização automática da Pluggy falhou:", error)
        })
        .finally(() => {
          clearTimeout(indicatorTimer)
          setIsSyncing(false)
        })
    })
  }, [pathname, router, toast])

  if (!isSyncing) return null

  return (
    <div
      role="status"
      className="fixed left-1/2 -translate-x-1/2 top-[calc(4.5rem+env(safe-area-inset-top))] md:top-4 z-50 flex items-center gap-2 px-3 py-1.5 rounded-full bg-card/95 backdrop-blur border border-border shadow-sm text-xs text-muted-foreground pointer-events-none"
    >
      <CircleNotch size={12} weight="bold" className="animate-spin" />
      Buscando novidades do banco
    </div>
  )
}
