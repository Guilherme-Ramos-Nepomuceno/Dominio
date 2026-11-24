// Aviso de "dados mudaram" depois de uma gravação. Cada gravação diz QUE TIPO
// de dado mexeu (o domínio), e o QueryProvider (components/session/
// query-provider.tsx) invalida só as consultas que dependem dele — ver
// DOMAIN_INVALIDATES em lib/query-client.ts.

export type DataDomain =
  | "transactions" // lançamentos (criar, editar, pagar, categorizar, importar...)
  | "categories"
  | "cards"
  | "savings" // reservas e suas fontes
  | "goals" // objetivos e alocações
  | "settings"
  | "plan" // plano do mês, grupos, desejos, semana, fechamento
  | "rules" // regras de categorização, termos genéricos, mapa da Pluggy
  | "pluggy" // sync, confirmação, conexão e contas do banco
  | "pluggy-review" // edição de uma linha da revisão do banco (só a fila muda)
  | "family" // acertos do casal

export interface DataChangeDetail {
  domains: DataDomain[]
}

// Evento antigo: além do cache, as telas que ainda escutam "storage-update"
// direto recarregam tudo (comportamento de sempre).
export const STORAGE_UPDATE_EVENT = "storage-update"
// Evento só do cache: nenhuma tela antiga reage. Usado nas gravações que
// antes não avisavam ninguém — fazê-las disparar "storage-update" faria telas
// antigas recarregarem no meio de uma edição (ex.: a revisão do banco a cada
// linha alterada).
export const CACHE_INVALIDATE_EVENT = "data-changed"

function dispatch(type: string, domains: DataDomain[]): void {
  if (typeof window === "undefined") return
  window.dispatchEvent(new CustomEvent<DataChangeDetail>(type, { detail: { domains } }))
}

export function notifyDataChanged(...domains: DataDomain[]): void {
  dispatch(STORAGE_UPDATE_EVENT, domains)
}

export function invalidateCachedData(...domains: DataDomain[]): void {
  dispatch(CACHE_INVALIDATE_EVENT, domains)
}
