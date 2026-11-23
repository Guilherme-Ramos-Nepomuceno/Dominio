"use client"

import { useCategoryGroupsQuery } from "@/hooks/queries"
import type { CategoryGroup } from "@/lib/plan"

// Referência estável para "ainda sem dado" (ou erro) — um [] novo a cada
// render invalidaria os useMemo de quem usa.
const NO_GROUPS: CategoryGroup[] = []

// Grupos do plano (com as categorias de cada um) — para pintar ícones e
// barras na cor do grupo. Vem do cache, compartilhado por todas as telas.
// Erro = sem grupos (as cores caem no padrão).
export function useCategoryGroups(): CategoryGroup[] {
  return useCategoryGroupsQuery().data ?? NO_GROUPS
}
