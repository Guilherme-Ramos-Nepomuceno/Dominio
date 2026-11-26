"use client"

import { useQuery } from "@tanstack/react-query"
import { queryKeys } from "@/lib/query-client"
import {
  getCards,
  getCategories,
  getGoals,
  getInbox,
  getInboxCount,
  getManualBankMatches,
  getMemberCardsMapped,
  getMonthData,
  getPendingPaymentMatches,
  getPluggyConnection,
  getPluggyInvestments,
  getPluggyPending,
  getPluggyPendingCount,
  getSavingsAdjustments,
  getSavingsGoals,
  getSettings,
  getTransactions,
} from "@/lib/storage"
import {
  getCategoryGroups,
  getClosingSummary,
  getPlan,
  getWeek,
  getWins,
  getWishCandidates,
} from "@/lib/planning-api"
import { getCategoryRules, getGenericTerms, getPluggyCategoryMap, getRuleSuggestions } from "@/lib/rules-api"
import { getCoupleSettlements } from "@/lib/family"

// Consultas cacheadas compartilhadas entre telas (lib/query-client.ts). O
// dado devolvido é o MESMO objeto para todos os componentes que usam a
// consulta — filtrar/ordenar com cópia (filter, [...lista].sort), nunca
// alterar no lugar.
//
// `enabled: false` = não busca (ex.: tela que só precisa do dado em um modo).
// Gravações invalidam pelo domínio (lib/data-events.ts) — a tela não precisa
// recarregar à mão depois de salvar.

type Opts = { enabled?: boolean }

// --- Dados base ------------------------------------------------------------

export function useTransactionsQuery(opts: Opts = {}) {
  return useQuery({ queryKey: queryKeys.transactions(), queryFn: getTransactions, ...opts })
}

export function useCategoriesQuery(opts: Opts = {}) {
  return useQuery({ queryKey: queryKeys.categories(), queryFn: getCategories, ...opts })
}

export function useCardsQuery(opts: Opts = {}) {
  return useQuery({ queryKey: queryKeys.cards(), queryFn: getCards, ...opts })
}

export function useSavingsGoalsQuery(opts: Opts = {}) {
  return useQuery({ queryKey: queryKeys.savingsGoals(), queryFn: getSavingsGoals, ...opts })
}

export function useSavingsAdjustmentsQuery(opts: Opts = {}) {
  return useQuery({ queryKey: queryKeys.savingsAdjustments(), queryFn: getSavingsAdjustments, ...opts })
}

export function useGoalsQuery(opts: Opts = {}) {
  return useQuery({ queryKey: queryKeys.goals(), queryFn: getGoals, ...opts })
}

export function useSettingsQuery(opts: Opts = {}) {
  return useQuery({ queryKey: queryKeys.settings(), queryFn: getSettings, ...opts })
}

// --- Inbox e banco ---------------------------------------------------------

export function useInboxQuery(opts: Opts = {}) {
  return useQuery({ queryKey: queryKeys.inbox(), queryFn: getInbox, ...opts })
}

export function useInboxCountQuery(opts: Opts = {}) {
  return useQuery({ queryKey: queryKeys.inboxCount(), queryFn: getInboxCount, ...opts })
}

export function usePluggyConnectionQuery(opts: Opts = {}) {
  return useQuery({ queryKey: queryKeys.pluggyConnection(), queryFn: getPluggyConnection, ...opts })
}

export function usePluggyPendingQuery(opts: Opts = {}) {
  return useQuery({ queryKey: queryKeys.pluggyPending(), queryFn: getPluggyPending, ...opts })
}

export function usePluggyPendingCountQuery(opts: Opts = {}) {
  return useQuery({ queryKey: queryKeys.pluggyPendingCount(), queryFn: getPluggyPendingCount, ...opts })
}

export function usePluggyInvestmentsQuery(opts: Opts = {}) {
  return useQuery({ queryKey: queryKeys.pluggyInvestments(), queryFn: getPluggyInvestments, ...opts })
}

// --- Plano -----------------------------------------------------------------

export function usePlanQuery(year: number, month: number, opts: Opts = {}) {
  return useQuery({ queryKey: queryKeys.plan(year, month), queryFn: () => getPlan(year, month), ...opts })
}

export function useWeekQuery(year: number, month: number, date?: string, opts: Opts = {}) {
  return useQuery({ queryKey: queryKeys.week(year, month, date), queryFn: () => getWeek(year, month, date), ...opts })
}

export function useWinsQuery(year: number, month: number, date?: string, opts: Opts = {}) {
  return useQuery({ queryKey: queryKeys.wins(year, month, date), queryFn: () => getWins(year, month, date), ...opts })
}

export function useClosingSummaryQuery(year: number, month: number, opts: Opts = {}) {
  return useQuery({ queryKey: queryKeys.closingSummary(year, month), queryFn: () => getClosingSummary(year, month), ...opts })
}

export function useCategoryGroupsQuery(opts: Opts = {}) {
  return useQuery({ queryKey: queryKeys.categoryGroups(), queryFn: getCategoryGroups, ...opts })
}

export function useWishCandidatesQuery(wishId: string, opts: Opts = {}) {
  return useQuery({ queryKey: queryKeys.wishCandidates(wishId), queryFn: () => getWishCandidates(wishId), ...opts })
}

// --- Faturas, pendências e totais ------------------------------------------

export function useManualBankMatchesQuery(cardId: string, opts: Opts = {}) {
  return useQuery({ queryKey: queryKeys.manualBankMatches(cardId), queryFn: () => getManualBankMatches(cardId), ...opts })
}

export function usePendingPaymentMatchesQuery(opts: Opts = {}) {
  return useQuery({ queryKey: queryKeys.pendingPaymentMatches(), queryFn: getPendingPaymentMatches, ...opts })
}

export function useMonthDataQuery(year: number, month: number, opts: Opts = {}) {
  return useQuery({ queryKey: queryKeys.monthData(year, month), queryFn: () => getMonthData(year, month), ...opts })
}

// --- Regras ----------------------------------------------------------------

export function useCategoryRulesQuery(opts: Opts = {}) {
  return useQuery({ queryKey: queryKeys.rules(), queryFn: getCategoryRules, ...opts })
}

export function useRuleSuggestionsQuery(opts: Opts = {}) {
  return useQuery({ queryKey: queryKeys.ruleSuggestions(), queryFn: getRuleSuggestions, ...opts })
}

export function usePluggyCategoryMapQuery(opts: Opts = {}) {
  return useQuery({ queryKey: queryKeys.pluggyCategoryMap(), queryFn: getPluggyCategoryMap, ...opts })
}

export function useGenericTermsQuery(opts: Opts = {}) {
  return useQuery({ queryKey: queryKeys.genericTerms(), queryFn: getGenericTerms, ...opts })
}

// --- Família ---------------------------------------------------------------

export function useMemberCardsQuery(memberId: string, opts: Opts = {}) {
  return useQuery({ queryKey: queryKeys.member("cards", memberId), queryFn: () => getMemberCardsMapped(memberId), ...opts })
}

export function useCoupleSettlementsQuery(month: string, opts: Opts = {}) {
  return useQuery({ queryKey: queryKeys.coupleSettlements(month), queryFn: () => getCoupleSettlements(month), ...opts })
}
