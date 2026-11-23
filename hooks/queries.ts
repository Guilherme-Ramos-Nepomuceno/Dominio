"use client"

import { useQuery } from "@tanstack/react-query"
import { queryKeys } from "@/lib/query-client"
import { getCards, getCategories, getSavingsGoals, getTransactions } from "@/lib/storage"

// Consultas cacheadas compartilhadas entre telas. O dado devolvido é o MESMO
// objeto para todos os componentes que usam a consulta — filtrar/ordenar com
// cópia (filter, [...lista].sort), nunca alterar no lugar.

export function useTransactionsQuery() {
  return useQuery({ queryKey: queryKeys.transactions(), queryFn: getTransactions })
}

export function useCategoriesQuery() {
  return useQuery({ queryKey: queryKeys.categories(), queryFn: getCategories })
}

export function useSavingsGoalsQuery() {
  return useQuery({ queryKey: queryKeys.savingsGoals(), queryFn: getSavingsGoals })
}

export function useCardsQuery() {
  return useQuery({ queryKey: queryKeys.cards(), queryFn: getCards })
}
