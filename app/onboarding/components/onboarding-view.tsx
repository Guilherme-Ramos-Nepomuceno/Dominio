"use client"

import { CircleNotch, Wallet, Target, Gift } from "@phosphor-icons/react"
import { ONBOARDING_STEPS } from "@/lib/onboarding"
import { formatCurrency } from "@/lib/date-utils"
import { cn } from "@/lib/utils"
import { PlanTower } from "@/app/plan/components/plan-tower"
import { useOnboardingViewModel } from "../hooks/use-onboarding-view-model"

const inputClass =
  "w-full rounded-xl border border-border bg-transparent px-4 py-3 text-foreground placeholder:text-muted-foreground/60 outline-none transition-colors focus:border-foreground/50"

// Botões do rodapé de cada passo: o secundário em contorno, o principal cheio.
const secondaryButton = "flex-1 h-12 rounded-full border border-border font-semibold text-foreground hover:bg-muted transition-colors"
const primaryButton = "flex-1 h-12 rounded-full bg-primary font-semibold text-background hover:bg-primary/90 transition-colors disabled:opacity-50"

// Valor grande, como o herói das outras telas.
function AmountInput({ label, value, onChange, autoFocus }: { label: string; value: string; onChange: (v: string) => void; autoFocus?: boolean }) {
  return (
    <div className="flex items-baseline gap-2 border-b border-border pb-2 focus-within:border-foreground/50 transition-colors">
      <span className="text-2xl font-semibold text-muted-foreground">R$</span>
      <input
        autoFocus={autoFocus}
        inputMode="decimal"
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="0,00"
        className="w-full min-w-0 bg-transparent text-4xl font-semibold tracking-tight tabular-nums text-foreground placeholder:text-muted-foreground/40 outline-none"
      />
    </div>
  )
}

function StepHeader({ icon: Icon, title, text }: { icon: typeof Wallet; title: string; text: string }) {
  return (
    <div className="space-y-2">
      <Icon size={28} weight="duotone" className="text-muted-foreground" aria-hidden />
      <h1 className="text-2xl font-semibold tracking-tight text-foreground text-balance">{title}</h1>
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
      <div className="max-w-md mx-auto px-4 pt-[calc(1.5rem+env(safe-area-inset-top))] pb-[calc(2rem+env(safe-area-inset-bottom))] space-y-8">
        <div className="flex items-center justify-between">
          <div className="flex gap-1.5" aria-label={`Passo ${stepIndex + 1} de ${ONBOARDING_STEPS.length}`}>
            {ONBOARDING_STEPS.map((s, i) => (
              <span
                key={s}
                className={cn("h-1.5 rounded-full transition-all", i <= stepIndex ? "w-8 bg-foreground" : "w-4 bg-muted")}
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
            <AmountInput autoFocus label="Renda prevista do mês" value={vm.income} onChange={vm.setIncome} />
            {vm.error && <p className="text-sm text-expense">{vm.error}</p>}
            <div className="flex gap-2">
              <button type="button" onClick={vm.advance} className={secondaryButton}>
                Depois
              </button>
              <button
                type="submit"
                disabled={vm.isBusy}
                className={primaryButton}
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
                <div>
                  <p className="text-sm text-muted-foreground">Orçamento do mês</p>
                  <p className="mt-1 text-4xl font-semibold tracking-tight leading-none tabular-nums text-foreground">
                    {formatCurrency(vm.plan.budgetAmount ?? vm.plan.suggestedBudget)}
                  </p>
                </div>
                <PlanTower plan={vm.plan} groupHref={(id) => `/plan/${id}`} />
              </>
            )}
            <div className="flex gap-2">
              <button type="button" onClick={vm.advance} className={secondaryButton}>
                Depois
              </button>
              <button
                type="button"
                onClick={vm.confirmDraft}
                disabled={vm.isBusy || !vm.plan}
                className={primaryButton}
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
            <AmountInput label="Valor estimado do desejo" value={vm.wishAmount} onChange={vm.setWishAmount} />
            {vm.error && <p className="text-sm text-expense">{vm.error}</p>}
            <div className="flex gap-2">
              <button type="button" onClick={vm.advance} className={secondaryButton}>
                Agora não
              </button>
              <button
                type="submit"
                disabled={vm.isBusy}
                className={primaryButton}
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
