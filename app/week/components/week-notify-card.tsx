"use client"

import { Bell } from "@phosphor-icons/react"
import { IosInstallSteps } from "@/components/pwa/ios-install-steps"
import type { PushSupport } from "@/lib/push"

// Oferta de avisos na tela da semana (o lembrete do começo da semana é o
// gatilho do hábito). No iPhone fora da tela inicial, ensina a instalar.
export function WeekNotifyCard({
  support,
  isBusy,
  onEnable,
  onDismiss,
}: {
  support: PushSupport
  isBusy: boolean
  onEnable: () => void
  onDismiss: () => void
}) {
  return (
    <section data-guide="week-notify" aria-labelledby="week-notify-title" className="rounded-[20px] border border-border p-5">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-foreground/[0.05]">
          <Bell size={18} weight="duotone" aria-hidden />
        </span>
        <div className="min-w-0">
          <h2 id="week-notify-title" className="text-sm font-semibold text-foreground">
            {support === "ios-needs-install" ? "Coloque o Domínio na tela inicial" : "Um lembrete no começo da semana"}
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground text-pretty">
            {support === "ios-needs-install"
              ? "No iPhone, os avisos só chegam com o app instalado:"
              : "Avisamos quanto você pode gastar na semana que começa. No máximo 3 avisos por semana."}
          </p>
        </div>
      </div>
      {support === "ios-needs-install" && (
        <div className="mt-3 pl-12">
          <IosInstallSteps lastStep="Abra o Domínio pelo ícone e ative os avisos aqui." />
        </div>
      )}
      <div className="mt-4 flex justify-end gap-2">
        <button
          type="button"
          onClick={onDismiss}
          className="rounded-full px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-foreground/5 hover:text-foreground"
        >
          Agora não
        </button>
        {support === "supported" && (
          <button
            type="button"
            onClick={onEnable}
            disabled={isBusy}
            className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-background hover:bg-primary/90 disabled:opacity-60"
          >
            {isBusy ? "Ativando..." : "Ativar avisos"}
          </button>
        )}
      </div>
    </section>
  )
}
