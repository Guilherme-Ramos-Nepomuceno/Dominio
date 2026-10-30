// Pequenas preferências locais do aparelho (não sincronizadas com o backend).
// Todo acesso ao localStorage é protegido — pode lançar em modo privado ou
// com dados do site bloqueados, e a tela precisa funcionar mesmo assim.

import { getActiveAccountSelection } from "./active-account"

function accountScope(): string {
  const selection = getActiveAccountSelection()
  return selection.type === "personal" ? "personal" : `${selection.type}:${selection.id}`
}

const LAST_CARD_KEY = "finance-last-card"

// Última conta/cartão usada num lançamento — pré-selecionada no registro
// rápido. Separada por conta ativa (pessoal x casal têm cartões diferentes).
export function getLastUsedCardId(): string | null {
  try {
    return localStorage.getItem(`${LAST_CARD_KEY}:${accountScope()}`)
  } catch {
    return null
  }
}

export function setLastUsedCardId(cardId: string | null | undefined): void {
  try {
    const key = `${LAST_CARD_KEY}:${accountScope()}`
    if (cardId) localStorage.setItem(key, cardId)
    else localStorage.removeItem(key)
  } catch {
    // Sem armazenamento local — só não lembra a última conta.
  }
}
