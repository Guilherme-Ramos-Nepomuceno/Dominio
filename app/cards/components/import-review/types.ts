import type { ImportPreviewRow } from "@/lib/types"

export interface ReviewRow extends ImportPreviewRow {
  include: boolean
  description: string
  categoryId: string
  // Resposta do usuário pra "essa é a mesma conta da pendência X?" — undefined
  // enquanto não decidido (só existe quando `pendingMatch` não é nulo).
  settleDecision?: "yes" | "no"
  // Só existem quando a categoria escolhida é "Transferência" (só faz
  // sentido no lado débito — no crédito não existe "transferência entre
  // cartões"). "" = uma das minhas próprias contas; caso contrário, id do
  // membro da família dono da conta de destino/origem.
  transferMemberId?: string
  transferCardId?: string
  // Preenchido depois de uma tentativa de importação que falhou pra essa
  // linha (backend ou criação da ponta de transferência) — limpo assim que
  // o usuário mexe em qualquer campo da linha.
  rowError?: string
}
