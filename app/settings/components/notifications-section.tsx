"use client"

import { Bell, BellSlash, Export, PlusSquare, DeviceMobile } from "@phosphor-icons/react"
import { Switch } from "@/components/ui/switch"
import { Skeleton } from "@/components/ui/skeleton"
import { usePushNotifications } from "@/hooks/use-push-notifications"
import type { NotificationPrefs } from "@/lib/push"

const PREFS: Array<{ key: keyof NotificationPrefs; label: string; description: string }> = [
  { key: "weekStart", label: "Começo da semana", description: "Quanto você tem para gastar na semana que começa." },
  { key: "weekly80", label: "80% do limite da semana", description: "Aviso quando a semana chegar a 80% do limite." },
  { key: "monthPlan", label: "Plano do mês", description: "Lembrete para planejar e fechar o mês." },
]

// Configurações > Notificações: ativar push neste aparelho e escolher os avisos.
export function NotificationsSection() {
  const push = usePushNotifications()

  return (
    <div className="rounded-[20px] bg-card p-6 border border-border/50">
      <div className="flex items-center gap-2 mb-2">
        <Bell size={24} weight="fill" className="text-primary" />
        <h3 className="text-lg font-semibold">Notificações</h3>
      </div>

      {push.isLoading ? (
        <Skeleton className="h-20 rounded-xl" />
      ) : push.publicKey === null ? (
        <p className="text-sm text-muted-foreground">
          As notificações ainda não estão disponíveis no servidor. Assim que forem liberadas, você poderá ativá-las aqui.
        </p>
      ) : push.support === "ios-needs-install" ? (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            No iPhone, as notificações funcionam com o Domínio instalado na tela inicial (iOS 16.4 ou mais novo):
          </p>
          <ol className="space-y-2 text-sm">
            <li className="flex items-center gap-2">
              <Export size={18} className="text-primary shrink-0" />
              Toque em <strong>Compartilhar</strong> no Safari.
            </li>
            <li className="flex items-center gap-2">
              <PlusSquare size={18} className="text-primary shrink-0" />
              Escolha <strong>Adicionar à Tela de Início</strong>.
            </li>
            <li className="flex items-center gap-2">
              <DeviceMobile size={18} className="text-primary shrink-0" />
              Abra o Domínio pelo ícone e volte aqui para ativar.
            </li>
          </ol>
        </div>
      ) : push.support === "unsupported" ? (
        <p className="text-sm text-muted-foreground">Este navegador não suporta notificações push.</p>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {push.subscribed
              ? "Ativadas neste aparelho."
              : push.permission === "denied"
                ? "As notificações estão bloqueadas para o Domínio neste navegador. Libere nas configurações do navegador."
                : "Receba avisos da semana e do plano neste aparelho."}
          </p>
          {push.subscribed ? (
            <button
              type="button"
              onClick={push.disable}
              disabled={push.isBusy}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-[1vw] font-semibold border border-border hover:bg-muted transition-colors disabled:opacity-50"
            >
              <BellSlash size={20} weight="bold" />
              {push.isBusy ? "Desativando..." : "Desativar neste aparelho"}
            </button>
          ) : (
            <button
              type="button"
              onClick={push.enable}
              disabled={push.isBusy || push.permission === "denied"}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-[1vw] font-semibold bg-primary text-background hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              <Bell size={20} weight="bold" />
              {push.isBusy ? "Ativando..." : "Ativar notificações"}
            </button>
          )}
        </div>
      )}

      {push.publicKey && (
        <div className="mt-5 space-y-3 border-t border-border/50 pt-4">
          {PREFS.map((pref) => (
            <div key={pref.key} className="flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">{pref.label}</p>
                <p className="text-xs text-muted-foreground">{pref.description}</p>
              </div>
              <Switch
                checked={push.prefs[pref.key]}
                onCheckedChange={(checked) => push.updatePref(pref.key, checked)}
                aria-label={pref.label}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
