"use client"

import { useEffect, useState } from "react"
import { getCategoryGroups } from "@/lib/planning-api"
import type { CategoryGroup } from "@/lib/plan"

// Grupos do plano (com as categorias de cada um) — para pintar ícones e
// barras na cor do grupo. Recarrega quando os dados mudam (storage-update).
export function useCategoryGroups(): CategoryGroup[] {
  const [groups, setGroups] = useState<CategoryGroup[]>([])
  useEffect(() => {
    let cancelled = false
    const load = () =>
      getCategoryGroups()
        .then((g) => !cancelled && setGroups(g))
        .catch(() => {})
    load()
    window.addEventListener("storage-update", load)
    return () => {
      cancelled = true
      window.removeEventListener("storage-update", load)
    }
  }, [])
  return groups
}
