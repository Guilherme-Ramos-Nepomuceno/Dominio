import { QueryClient } from "@tanstack/react-query"
import { ApiError } from "./api"
import { getActiveAccountSelection } from "./active-account"
import { getCurrentUser } from "./auth"
import type { DataDomain } from "./data-events"
import { rootsToInvalidate } from "./cache-domains"

// Cache das leituras da API (TanStack Query). A ideia: ao trocar de tela, o
// que já foi carregado aparece na hora e, se estiver velho, é atualizado em
// segundo plano — sem voltar ao skeleton.
//
// Os dados só mudam quando a pessoa grava algo (lançamento, categorização...)
// ou quando chega coisa do Pluggy. As gravações avisam qual domínio mexeram
// (lib/data-events.ts) e o QueryProvider invalida só o que depende dele. Por
// isso o staleTime pode ser generoso.

// Quem é o dono do dado: o usuário logado + a conta ativa (pessoal, casal ou
// parceiro). A mesma rota devolve dados diferentes conforme a conta, então a
// conta tem que fazer parte da chave — senão um cache "vaza" para a outra.
export function accountScope(): string {
  const userId = getCurrentUser()?.id ?? "anon"
  const ctx = getActiveAccountSelection()
  const account = ctx.type === "personal" ? "personal" : `${ctx.type}:${ctx.id}`
  return `${userId}|${account}`
}

// Chaves de todas as consultas num lugar só. Sempre [raiz, conta, ...resto].
export const queryKeys = {
  transactions: () => ["transactions", accountScope()] as const,
  categories: () => ["categories", accountScope()] as const,
  cards: () => ["cards", accountScope()] as const,
  savingsGoals: () => ["savings", accountScope()] as const,
  savingsAdjustments: () => ["savings", accountScope(), "adjustments"] as const,
  goals: () => ["goals", accountScope()] as const,
  settings: () => ["settings", accountScope()] as const,

  inbox: () => ["inbox", accountScope(), "list"] as const,
  inboxCount: () => ["inbox", accountScope(), "count"] as const,

  pluggyConnection: () => ["pluggy", accountScope(), "connection"] as const,
  pluggyPending: () => ["pluggy", accountScope(), "pending"] as const,
  pluggyPendingCount: () => ["pluggy", accountScope(), "pending-count"] as const,
  pluggyInvestments: () => ["pluggy", accountScope(), "investments"] as const,
  pluggyAccounts: (itemId: string) => ["pluggy", accountScope(), "accounts", itemId] as const,

  plan: (year: number, month: number) => ["plan", accountScope(), "plan", year, month] as const,
  week: (year: number, month: number, date?: string) => ["plan", accountScope(), "week", year, month, date ?? null] as const,
  wins: (year: number, month: number, date?: string) => ["plan", accountScope(), "wins", year, month, date ?? null] as const,
  closingSummary: (year: number, month: number) => ["plan", accountScope(), "closing", year, month] as const,
  categoryGroups: () => ["plan", accountScope(), "groups"] as const,
  wishes: (year: number, month: number) => ["plan", accountScope(), "wishes", year, month] as const,
  wishCandidates: (wishId: string) => ["plan", accountScope(), "wish-candidates", wishId] as const,

  invoice: (cardId: string, year: number, month: number) => ["invoice", accountScope(), cardId, year, month] as const,
  manualBankMatches: (cardId: string) => ["invoice", accountScope(), "manual-matches", cardId] as const,

  pendingPaymentMatches: () => ["pending-matches", accountScope()] as const,

  monthData: (year: number, month: number) => ["month-data", accountScope(), year, month] as const,
  memberMonthData: (memberId: string, year: number, month: number) => ["month-data", accountScope(), "member", memberId, year, month] as const,

  rules: () => ["rules", accountScope(), "list"] as const,
  ruleSuggestions: () => ["rules", accountScope(), "suggestions"] as const,
  pluggyCategoryMap: () => ["rules", accountScope(), "pluggy-map"] as const,
  genericTerms: () => ["rules", accountScope(), "generic-terms"] as const,

  // Dados de um membro da família (visão "Total da Família", acerto do casal).
  member: (kind: "transactions" | "categories" | "cards" | "savings", memberId: string) =>
    ["family", accountScope(), kind, memberId] as const,
  coupleSettlements: (month: string) => ["family", accountScope(), "settlements", month] as const,
}

// Sem domínio (aviso antigo, sem detalhe) = invalida tudo. Qual domínio
// invalida o quê: lib/cache-domains.ts.
export function invalidateDomains(client: QueryClient, domains: readonly DataDomain[] | undefined): Promise<void> {
  const roots = rootsToInvalidate(domains)
  if (roots === "all") return client.invalidateQueries()
  const rootNames: ReadonlySet<string> = roots
  return client.invalidateQueries({ predicate: (query) => rootNames.has(String(query.queryKey[0])) })
}

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Gravações do próprio app invalidam na hora; isto só limita quanto
        // tempo uma mudança vinda de fora (outro aparelho, o parceiro) demora
        // a aparecer sem a pessoa fazer nada.
        staleTime: 5 * 60 * 1000,
        // Mantém o dado de uma tela que saiu de cena por meia hora — voltar
        // a ela mostra o que tinha enquanto revalida.
        gcTime: 30 * 60 * 1000,
        // Voltar ao app (trocar de aba, desbloquear o celular) revalida o que
        // estiver velho.
        refetchOnWindowFocus: true,
        // Erro 4xx (sessão expirada, sem permissão) não melhora tentando de
        // novo; falha de rede/5xx ganha uma segunda chance.
        retry: (failureCount, error) => {
          if (error instanceof ApiError && error.status < 500) return false
          return failureCount < 1
        },
      },
    },
  })
}

// No navegador, um cliente só para a vida da aba. No servidor (pré-render),
// um por chamada — nunca compartilhar cache entre requisições.
let browserClient: QueryClient | undefined

export function getQueryClient(): QueryClient {
  if (typeof window === "undefined") return createQueryClient()
  if (!browserClient) browserClient = createQueryClient()
  return browserClient
}
