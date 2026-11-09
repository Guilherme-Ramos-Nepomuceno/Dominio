"use client"

import { useRouter } from "next/navigation"
import { CaretRight, ChartLineUp, House, Lightbulb, Target, Tray } from "@phosphor-icons/react"
import { SectionTitle } from "@/app/plan/components/plan-ui"
import { useGuide } from "@/components/guide/guide-provider"
import { useAccount } from "@/components/account/account-context"
import { GUIDE_SCREENS, HOME_TOUR, INBOX_TOUR, PLAN_TOUR, WEEK_TOUR } from "@/lib/guide"

const ICONS: Record<string, typeof Lightbulb> = {
  [PLAN_TOUR]: Target,
  [HOME_TOUR]: House,
  [WEEK_TOUR]: ChartLineUp,
  [INBOX_TOUR]: Tray,
}

// Configurações > Dicas: as telas que têm explicação. Um toque abre a tela e
// mostra as dicas dela de novo (sem mexer no que já foi visto).
export function GuideSection() {
  const guide = useGuide()
  const router = useRouter()
  const { selection } = useAccount()
  if (selection.type !== "personal") return null

  return (
    <section aria-labelledby="settings-guide" className="space-y-1">
      <SectionTitle id="settings-guide">Dicas das telas</SectionTitle>
      <p className="pb-1 text-sm text-muted-foreground">Toque numa tela para ver as explicações dela de novo.</p>
      <ul className="divide-y divide-border">
        {GUIDE_SCREENS.map((screen) => {
          const Icon = ICONS[screen.tour] ?? Lightbulb
          return (
            <li key={screen.tour}>
              <button
                type="button"
                onClick={() => {
                  guide.startReplay(screen.tour, screen.href)
                  router.push(screen.href)
                }}
                className="group flex w-full items-center gap-3 py-3.5 text-left"
              >
                <Icon size={20} weight="duotone" className="shrink-0 text-muted-foreground" aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-foreground">{screen.title}</span>
                  <span className="block text-xs text-muted-foreground">
                    {screen.description}
                    {screen.tour === INBOX_TOUR ? " · aparece quando houver algo para classificar" : ""}
                  </span>
                </span>
                <CaretRight size={14} weight="bold" className="shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
