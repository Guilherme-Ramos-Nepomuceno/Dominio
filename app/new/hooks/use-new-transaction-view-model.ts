"use client"

import { useMemo } from "react"

export function useNewTransactionViewModel() {
    // Currently, the page doesn't have much logic, 
    // but this is where we would put form submission handlers,
    // data fetching, or complex validations for this specific page.

    return useMemo(() => ({
        title: "Nova Transação",
        subtitle: "Registre um novo gasto ou receita",
    }), [])
}
