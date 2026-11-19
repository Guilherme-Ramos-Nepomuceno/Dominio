// Composição do saldo de uma reserva (PRD-001, ADR-033): o que vem do banco, o
// que a pessoa registrou pelo nome e o que sobra "sem detalhar". Lógica pura e
// espelho de utils/savings-composition.ts da API, para a tela mostrar o mesmo
// que a API grava. Sem alias de import, para ter teste de verdade.

export interface BankPart {
  investmentId: string
  name: string
  amount: number
}

export interface SourcePart {
  id: string
  name: string
  amount: number
  updatedAt: string
}

export interface Composition {
  bank: BankPart[]
  sources: SourcePart[]
  // O que sobra do saldo sem estar numa fonte nem no banco.
  rest: number
}

const toCents = (value: number) => Math.round(value * 100)

// Mostra cada fonte até onde o saldo alcança (as mais antigas primeiro). Se o
// saldo caiu por outro caminho, as fontes novas encolhem na tela em vez de
// somar mais do que a reserva tem. Só leitura.
export function composeSavings(reserve: { currentAmount: number; bank?: BankPart[]; sources?: SourcePart[] }): Composition {
  const bank = (reserve.bank ?? []).filter((b) => b.amount > 0)
  const bankCents = bank.reduce((sum, b) => sum + toCents(b.amount), 0)
  let room = Math.max(0, toCents(reserve.currentAmount) - bankCents)
  const sources = (reserve.sources ?? []).map((s) => {
    const cents = Math.min(toCents(s.amount), room)
    room -= cents
    return { ...s, amount: cents / 100 }
  })
  return { bank, sources: sources.filter((s) => s.amount > 0), rest: room / 100 }
}

// "CDB Banco X, Tesouro Selic e mais 1". Nada quando só há saldo sem detalhar.
export function compositionSummary(comp: Composition, max = 2): string | null {
  const names = [...comp.bank.map((b) => b.name), ...comp.sources.map((s) => s.name)]
  if (names.length === 0) return null
  if (names.length <= max) return names.length === 1 ? names[0] : `${names.slice(0, -1).join(", ")} e ${names[names.length - 1]}`
  const shown = names.slice(0, max)
  const more = names.length - max
  return `${shown.join(", ")} e mais ${more}`
}

// Fonte digitada à mão que ninguém atualiza há tempo: vale perguntar "ainda é esse valor?".
export function isStaleSource(updatedAt: string, now: Date = new Date(), days = 30): boolean {
  const time = new Date(updatedAt).getTime()
  if (!Number.isFinite(time)) return false
  return now.getTime() - time >= days * 24 * 60 * 60 * 1000
}

// A reserva padrão Guardado some da lista quando está zerada; as outras ficam
// (a pessoa acabou de criar, ou ainda vai direcionar valor).
export function visibleReserves<T extends { isDefault?: boolean; currentAmount: number }>(reserves: T[]): T[] {
  return reserves.filter((r) => !(r.isDefault && r.currentAmount <= 0))
}

// Quanto do investimento sobra para Guardado depois de dividir entre as reservas.
export function remainderAfter(balance: number, amounts: number[]): number {
  const assigned = amounts.reduce((sum, a) => sum + toCents(a), 0)
  return (toCents(balance) - assigned) / 100
}
