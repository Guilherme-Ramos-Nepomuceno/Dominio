import { QueryClient } from "@tanstack/react-query"
import { ApiError } from "./api"
import { getActiveAccountSelection } from "./active-account"
import { getCurrentUser } from "./auth"

// Cache das leituras da API (TanStack Query). A ideia: ao trocar de tela, o
// que já foi carregado aparece na hora e, se estiver velho, é atualizado em
// segundo plano — sem voltar ao skeleton.
//
// Os dados só mudam quando a pessoa grava algo (lançamento, categorização...)
// ou quando chega coisa do Pluggy. As duas coisas já disparam "storage-update"
// (lib/storage.ts, lib/planning-api.ts), e o QueryProvider transforma esse
// evento em invalidação do cache. Por isso o staleTime pode ser generoso.

// Quem é o dono do dado: o usuário logado + a conta ativa (pessoal, casal ou
// parceiro). A mesma rota devolve dados diferentes conforme a conta, então a
// conta tem que fazer parte da chave — senão um cache "vaza" para a outra.
export function accountScope(): string {
  const userId = getCurrentUser()?.id ?? "anon"
  const ctx = getActiveAccountSelection()
  const account = ctx.type === "personal" ? "personal" : `${ctx.type}:${ctx.id}`
  return `${userId}|${account}`
}

// Chaves de todas as consultas num lugar só — invalidar por prefixo
// (ex.: ["transactions"]) pega todas as contas de uma vez.
export const queryKeys = {
  transactions: () => ["transactions", accountScope()] as const,
  categories: () => ["categories", accountScope()] as const,
  savingsGoals: () => ["savings-goals", accountScope()] as const,
  cards: () => ["cards", accountScope()] as const,
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
