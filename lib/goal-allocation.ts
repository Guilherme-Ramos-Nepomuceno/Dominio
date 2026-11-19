// Regras puras de reservas e objetivos (ver ADR-031). Sem React e sem API,
// para ter teste de verdade (lib/__tests__/goal-allocation.test.ts).

// Grupo da reserva (PRD-001): "quando eu mexo nesse dinheiro?". Guardado é o
// estado "ainda sem destino", não uma escolha: a pessoa categoriza depois.
export const SAVINGS_KINDS = [
  { value: "SEGURANCA", label: "Segurança", hint: "Para imprevistos" },
  { value: "PLANEJADO", label: "Planejado", hint: "Para gastar em uma data" },
  { value: "FUTURO", label: "Futuro", hint: "Para deixar crescendo" },
  { value: "GUARDADO", label: "Guardado", hint: "Ainda sem destino" },
] as const

export type SavingsKind = (typeof SAVINGS_KINDS)[number]["value"]

// Os três que a pessoa escolhe no formulário (Guardado é o padrão quando não escolhe).
export const CHOOSABLE_SAVINGS_KINDS = SAVINGS_KINDS.filter((k) => k.value !== "GUARDADO")

// Tipos gravados antes do PRD-001 continuam em reservas antigas: lidos como o grupo equivalente.
const LEGACY_KINDS: Record<string, SavingsKind> = {
  EMERGENCIA: "SEGURANCA",
  VIAGEM: "PLANEJADO",
  CURTO_PRAZO: "PLANEJADO",
  LONGO_PRAZO: "FUTURO",
  OUTRO: "GUARDADO",
}

export function normalizeSavingsKind(kind: string | null | undefined): SavingsKind {
  if (!kind) return "GUARDADO"
  if (SAVINGS_KINDS.some((k) => k.value === kind)) return kind as SavingsKind
  return LEGACY_KINDS[kind] ?? "GUARDADO"
}

export function savingsKindLabel(kind: string | null | undefined): string {
  const normalized = normalizeSavingsKind(kind)
  return SAVINGS_KINDS.find((k) => k.value === normalized)?.label ?? "Guardado"
}

function stripAccents(text: string): string {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
}

const SUGGESTIONS: { kind: SavingsKind; words: string[] }[] = [
  { kind: "SEGURANCA", words: ["emergencia", "imprevisto", "reserva", "seguranca"] },
  { kind: "PLANEJADO", words: ["viagem", "carro", "reforma", "ipva", "iptu", "casamento", "curso", "mudanca", "ferias", "natal", "presente"] },
  { kind: "FUTURO", words: ["aposentadoria", "futuro", "patrimonio", "filho", "filhos", "faculdade", "imovel", "casa propria"] },
]

// Sugestão pré-marcada a partir do nome; a pessoa troca. Sem acerto, null (fica em Guardado).
export function suggestSavingsKind(name: string): SavingsKind | null {
  const text = stripAccents(name)
  if (!text.trim()) return null
  const words = text.split(/[^a-z0-9]+/).filter(Boolean)
  for (const rule of SUGGESTIONS) {
    if (rule.words.some((w) => (w.includes(" ") ? text.includes(w) : words.includes(w)))) return rule.kind
  }
  return null
}

export interface SavingsGroup<T> {
  kind: SavingsKind
  label: string
  total: number
  items: T[]
}

// Agrupa as reservas pelos grupos, na ordem Segurança, Planejado, Futuro e
// Guardado (por último). Só devolve grupos com reserva.
export function groupSavingsByKind<T extends { kind?: string | null; currentAmount: number }>(reserves: T[]): SavingsGroup<T>[] {
  return SAVINGS_KINDS.map((k) => {
    const items = reserves.filter((r) => normalizeSavingsKind(r.kind) === k.value)
    return { kind: k.value, label: k.label, total: sumCents(items.map((i) => ({ amount: i.currentAmount }))), items }
  }).filter((g) => g.items.length > 0)
}

// Quanto de uma reserva o objetivo já recebeu dela.
export interface AllocationRef {
  goalId: string
  goalName: string
  amount: number
}

// Saldo da reserva que ainda não foi separado para nenhum objetivo.
// Nunca negativo: se o saldo caiu (sync do banco) abaixo do separado, o livre é zero.
export function freeOfSavings(savings: { currentAmount: number; allocatedTo?: AllocationRef[] }): number {
  const allocated = sumCents(savings.allocatedTo ?? [])
  return Math.max(0, toCents(savings.currentAmount) - toCents(allocated)) / 100
}

// Quanto este objetivo recebe da reserva, ou zero.
export function allocationFor(savings: { allocatedTo?: AllocationRef[] }, goalId: string): number {
  return savings.allocatedTo?.find((a) => a.goalId === goalId)?.amount ?? 0
}

// Quanto da reserva está disponível para este objetivo: o livre mais o que
// ele já tem nela (é o que aparece ao editar a separação).
export function availableForGoal(savings: { currentAmount: number; allocatedTo?: AllocationRef[] }, goalId: string): number {
  return freeOfSavings(savings) + allocationFor(savings, goalId)
}

// Porcentagem do objetivo (pode passar de 100; a barra corta em 100).
export function goalProgress(saved: number, target: number): number {
  if (target <= 0) return 0
  return (saved / target) * 100
}

// Valor digitado (já convertido para número) passa pela mesma régua da API:
// centavos, positivo ou zero (zero tira a separação).
export function validateAllocationAmount(amount: number, available: number): string | null {
  if (!Number.isFinite(amount) || amount < 0) return "Informe um valor válido"
  if (amount > available + 0.000001) return "Passa do que está livre nessa reserva"
  return null
}

function toCents(value: number): number {
  return Math.round(value * 100)
}

function sumCents(rows: { amount: number }[]): number {
  return rows.reduce((total, row) => total + toCents(row.amount), 0) / 100
}
