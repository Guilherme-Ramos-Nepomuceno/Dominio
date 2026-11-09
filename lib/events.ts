// Telemetria de produto (eventos de uso) — POST /events, fire-and-forget.
// Nunca lança, nunca bloqueia a UI e NUNCA envia valores ou descrições de
// transações: só nomes de evento e propriedades agregadas (contagens, flags).

import { fetchApi } from "./api"
import { getActiveAccountSelection } from "./active-account"

export type EventName =
  | "app_opened"
  | "quick_add_opened"
  | "transaction_created"
  | "inbox_viewed"
  | "inbox_categorized"
  | "pluggy_auto_sync"
  | "plan_viewed"
  | "plan_confirmed"
  | "wish_created"
  | "wish_bought"
  | "week_viewed"
  | "month_closed"
  | "push_enabled"
  | "rule_created"
  | "wins_viewed"
  | "week_closed_celebrated"
  | "plan_confirmed_summary_viewed"
  | "home_week_opened"
  | "home_plan_opened"
  | "onboarding_finished"
  | "onboarding_skipped"
  | "plan_confirmed_negative_margin"
  | "wish_to_goal"
  | "week_leftover_saved"
  | "guide_skipped"
  | "guide_finished"
  | "guide_step_shown"
  | "feature_unlocked"
  | "guide_replayed"

export type EventProperties = Record<string, string | number | boolean | null>

export function trackEvent(name: EventName, properties?: EventProperties): void {
  try {
    if (typeof window === "undefined") return
    if (!localStorage.getItem("finance-token")) return
    // Visualizando um parceiro (somente leitura): não é uso do próprio app.
    if (getActiveAccountSelection().type === "partner") return
    const body = JSON.stringify(properties ? { name, properties } : { name })
    // fetchApi já trata 401 deslogando — um evento não deve ter esse poder,
    // mas o token é o mesmo das chamadas normais, então o efeito seria igual
    // ao da próxima chamada da própria tela. Erros são engolidos aqui.
    fetchApi("/events", { method: "POST", body, keepalive: true }).catch(() => {})
  } catch {
    // Telemetria nunca pode quebrar a tela.
  }
}

// Executa `fn` uma única vez por sessão do navegador (aba) para a chave dada.
// sessionStorage pode não existir/lançar (modo privado, bloqueio de site
// data) — nesse caso cai num controle em memória, que vale até o reload.
const memoryOnce = new Set<string>()

export function oncePerSession(key: string, fn: () => void): boolean {
  const storageKey = `finance-once:${key}`
  try {
    if (sessionStorage.getItem(storageKey)) return false
    sessionStorage.setItem(storageKey, "1")
  } catch {
    if (memoryOnce.has(storageKey)) return false
  }
  memoryOnce.add(storageKey)
  fn()
  return true
}
