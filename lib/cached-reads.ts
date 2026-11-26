import { getQueryClient, queryKeys } from "./query-client"
import { getCards, getCategories, getMemberCardsMapped, getTransactions } from "./storage"
import type { Card, Category, Transaction } from "./types"

// Leituras para usar FORA de componentes (handler de salvar, validação antes
// de gravar...). Passam pelo mesmo cache dos hooks de hooks/queries.ts:
// devolvem o que já está carregado se ainda estiver fresco, senão buscam (e
// guardam). Assim um handler não baixa o histórico inteiro de novo só para
// conferir um detalhe.

export function readTransactions(): Promise<Transaction[]> {
  return getQueryClient().fetchQuery({ queryKey: queryKeys.transactions(), queryFn: getTransactions })
}

export function readCategories(): Promise<Category[]> {
  return getQueryClient().fetchQuery({ queryKey: queryKeys.categories(), queryFn: getCategories })
}

export function readCards(): Promise<Card[]> {
  return getQueryClient().fetchQuery({ queryKey: queryKeys.cards(), queryFn: getCards })
}

export function readMemberCards(memberId: string): Promise<Card[]> {
  return getQueryClient().fetchQuery({ queryKey: queryKeys.member("cards", memberId), queryFn: () => getMemberCardsMapped(memberId) })
}
