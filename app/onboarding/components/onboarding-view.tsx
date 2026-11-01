"use client"

import { CircleNotch, Wallet, Target, Gift } from "@phosphor-icons/react"
import { ONBOARDING_STEPS } from "@/lib/onboarding"
import { formatCurrency } from "@/lib/date-utils"
import { cn } from "@/lib/utils"
import { PlanTower } from "@/app/plan/components/plan-tower"
import { useOnboardingViewModel } from "../hooks/use-onboarding-view-model"

const inputClass =
  "w-full px-4 py-3 rounded-xl bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary"

function StepHeader({ icon: Icon, title, text }: { icon: typeof Wallet; title: string; text: string }) {
  return (
    <div className="space-y-2">
      <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
        <Icon size={26} weight="duotone" className="text-primary" />
      </div>
      <h1 className="text-2xl font-bold text-foreground text-balance">{title}</h1>
      <p className="text-sm text-muted-foreground text-pretty">{text}</p>
    </div>
  )
}

// Onboarding pós-cadastro: renda prevista → rascunho do plano → um desejo →
// Home. Todo passo pode ser pulado.
export function OnboardingView() {
  const vm = useOnboardingViewModel()
  const stepIndex = ONBOARDING_STEPS.indexOf(vm.step)

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-md mx-auto px-4 pt-[calc(1.5rem+env(safe-area-inset-top))] pb-[calc(2rem+env(safe-area-inset-bottom))] space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex gap-1.5" aria-label={`Passo ${stepIndex + 1} de ${ONBOARDING_STEPS.length}`}>
            {ONBOARDING_STEPS.map((s, i) => (
              <span
                key={s}
                className={cn("h-1.5 rounded-full transition-all", i <= stepIndex ? "w-8 bg-primary" : "w-4 bg-muted")}
              />
            ))}
          </div>
          <button type="button" onClick={vm.skipAll} className="text-sm font-medium text-muted-foreground hover:text-foreground">
            Pular
          </button>
        </div>

        {vm.step === "income" && (
          <form
            className="space-y-5"
            onSubmit={(e) => {
              e.preventDefault()
              vm.saveIncome()
            }}
          >
            <StepHeader
              icon={Wallet}
              title="Quanto você espera receber por mês?"
              text="É o ponto de partida do seu plano: o orçamento do mês. Dá para mudar quando quiser."
            />
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold">R$</span>
              <input
                autoFocus
                inputMode="decimal"
                aria-label="Renda prevista do mês"
                value={vm.income}
                onChange={(e) => vm.setIncome(e.target.value)}
                placeholder="0,00"
                className={cn(inputClass, "pl-12 text-2xl font-bold tabular-nums")}
              />
            </div>
            {vm.error && <p className="text-sm text-expense">{vm.error}</p>}
            <div className="flex gap-2">
              <button type="button" onClick={vm.advance} className="flex-1 py-3 rounded-xl border border-border font-semibold">
                Depois
              </button>
              <button
                type="submit"
                disabled={vm.isBusy}
                className="flex-1 py-3 rounded-xl bg-primary text-background font-semibold disabled:opacity-50"
              >
                {vm.isBusy ? "Salvando..." : "Continuar"}
              </button>
            </div>
          </form>
        )}

        {vm.step === "plan" && (
          <div className="space-y-5">
            <StepHeader
              icon={Target}
              title="Seu plano do mês"
              text="Montamos um rascunho com o que já está comprometido e uma estimativa para o resto. Confira e confirme — ajustes finos ficam em Planejar."
            />
            {!vm.plan ? (
              <div className="flex justify-center py-10">
                <CircleNotch size={24} className="animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between rounded-2xl bg-card border border-border/50 px-4 py-3">
                  <span className="text-sm text-muted-foreground">Orçamento do mês</span>
                  <span className="font-bold tabular-nums">{formatCurrency(vm.plan.budgetAmount ?? vm.plan.suggestedBudget)}</span>
                </div>
                <PlanTower plan={vm.plan} groupHref={(id) => `/plan/${id}`} />
              </>
            )}
            <div className="flex gap-2">
              <button type="button" onClick={vm.advance} className="flex-1 py-3 rounded-xl border border-border font-semibold">
                Depois
              </button>
              <button
                type="button"
                onClick={vm.confirmDraft}
                disabled={vm.isBusy || !vm.plan}
                className="flex-1 py-3 rounded-xl bg-primary text-background font-semibold disabled:opacity-50"
              >
                {vm.isBusy ? "Confirmando..." : "Confirmar plano"}
              </button>
            </div>
          </div>
        )}

        {vm.step === "wish" && (
          <form
            className="space-y-5"
            onSubmit={(e) => {
              e.preventDefault()
              vm.saveWish()
            }}
          >
            <StepHeader
              icon={Gift}
              title="Tem algo que você quer comprar?"
              text="Anote um desejo. O plano mostra se ele cabe na margem deste mês ou quanto falta."
            />
            <input
              aria-label="Nome do desejo"
              value={vm.wishName}
              onChange={(e) => vm.setWishName(e.target.value)}
              placeholder="Ex.: Fone novo"
              className={inputClass}
            />
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold">R$</span>
              <input
                inputMode="decimal"
                aria-label="Valor estimado do desejo"
                value={vm.wishAmount}
                onChange={(e) => vm.setWishAmount(e.target.value)}
                placeholder="0,00"
                className={cn(inputClass, "pl-12 tabular-nums")}
              />
            </div>
            {vm.error && <p className="text-sm text-expense">{vm.error}</p>}
            <div className="flex gap-2">
              <button type="button" onClick={vm.advance} className="flex-1 py-3 rounded-xl border border-border font-semibold">
                Agora não
              </button>
              <button
                type="submit"
                disabled={vm.isBusy}
                className="flex-1 py-3 rounded-xl bg-primary text-background font-semibold disabled:opacity-50"
              >
                {vm.isBusy ? "Salvando..." : "Salvar e ir para a Home"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
