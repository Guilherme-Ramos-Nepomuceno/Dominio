// Texto do aviso depois de uma sincronização com a Pluggy, com ou sem a
// sincronização direta. Lógica pura — sem aliases "@/" — para rodar no test
// runner do Node.

export interface PluggySyncCounts {
  // Pendências novas que a sincronização trouxe.
  created: number
  // Quantas entraram sozinhas (sincronização direta ligada).
  autoConfirmedCount: number
}

export interface PluggySyncMessage {
  title: string
  description: string
  // Para onde o botão do aviso leva: a revisão ou o que entrou sem categoria.
  target: "review" | "inbox"
}

const plural = (n: number, one: string, many: string) => (n === 1 ? one : many)

// null = nada novo (o aviso automático fica em silêncio).
export function pluggySyncMessage({ created, autoConfirmedCount }: PluggySyncCounts): PluggySyncMessage | null {
  if (autoConfirmedCount > 0) {
    const toReview = Math.max(created - autoConfirmedCount, 0)
    return {
      title: `${autoConfirmedCount} ${plural(autoConfirmedCount, "lançamento do banco entrou", "lançamentos do banco entraram")} direto`,
      description:
        toReview > 0
          ? `${toReview} ainda ${plural(toReview, "pede", "pedem")} revisão na sincronização bancária.`
          : "Os sem categoria estão em A classificar.",
      target: toReview > 0 ? "review" : "inbox",
    }
  }
  if (created > 0) {
    return {
      title: `${created} ${plural(created, "transação nova", "transações novas")} do banco`,
      description: "Já estão na revisão da sincronização bancária.",
      target: "review",
    }
  }
  return null
}
