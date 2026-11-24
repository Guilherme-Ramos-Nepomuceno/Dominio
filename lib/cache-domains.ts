// Qual consulta do cache depende de qual tipo de gravação. Sem imports de
// runtime (só tipos) para poder ser testado direto pelo node --test.
import type { DataDomain } from "./data-events"

// Raiz de cada chave = o "assunto" do dado. A invalidação por domínio
// (DOMAIN_INVALIDATES) trabalha nessas raízes.
export type QueryRoot =
  | "transactions"
  | "categories"
  | "cards"
  | "savings"
  | "goals"
  | "settings"
  | "inbox"
  | "pluggy"
  | "plan"
  | "invoice"
  | "pending-matches"
  | "month-data"
  | "rules"
  | "family"

// O que cada tipo de gravação pode ter mudado. Conservador de propósito: na
// dúvida, invalida — buscar de novo é barato, mostrar dado errado não é. O
// ganho é não rebuscar o que com certeza não mudou (ex.: lançar um gasto não
// mexe em categorias, cartões, reservas, objetivos, configurações, regras).
export const DOMAIN_INVALIDATES: Record<DataDomain, QueryRoot[]> = {
  transactions: ["transactions", "inbox", "plan", "invoice", "pending-matches", "month-data", "pluggy", "family"],
  categories: ["categories", "transactions", "inbox", "plan", "invoice", "month-data", "rules", "pluggy", "family"],
  cards: ["cards", "transactions", "invoice", "plan", "month-data", "savings", "pluggy", "pending-matches", "family"],
  savings: ["savings", "goals", "plan", "transactions", "month-data", "pluggy", "family"],
  goals: ["goals", "savings", "plan"],
  settings: ["settings", "plan", "month-data", "invoice"],
  // Plano em si (orçamento, grupos, desejos). Quem também mexe em dinheiro
  // (comprar desejo, guardar sobra, fechar o mês) avisa os outros domínios.
  plan: ["plan", "month-data"],
  rules: ["rules", "transactions", "inbox", "plan", "pluggy"],
  pluggy: ["pluggy", "transactions", "inbox", "cards", "savings", "plan", "invoice", "pending-matches", "month-data", "family"],
  "pluggy-review": ["pluggy"],
  family: ["family", "month-data", "plan"],
}

// Raízes de chave a invalidar para os domínios avisados. Sem domínio (aviso
// antigo, sem detalhe) = tudo.
export function rootsToInvalidate(domains: readonly DataDomain[] | undefined): Set<QueryRoot> | "all" {
  if (!domains || domains.length === 0) return "all"
  return new Set(domains.flatMap((d) => DOMAIN_INVALIDATES[d] ?? []))
}
