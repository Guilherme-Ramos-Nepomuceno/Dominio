// Categoria passou a ser opcional numa transação (registro rápido, importação
// e Open Finance podem deixar sem categoria — ela vai para "A classificar").
// Helpers compartilhados para tratar `categoryId: null` do mesmo jeito em
// todas as telas: rótulo, cor neutra e o tipo (receita/despesa) efetivo.

import type { Category, Transaction, TransactionType } from "./types"

export const UNCATEGORIZED_LABEL = "Sem categoria"
// Cinza neutro (equivalente ao gray-400) — nunca vermelho/alerta.
export const UNCATEGORIZED_COLOR = "#9ca3af"
// Chave usada em agregações (fatia "Sem categoria" nos gráficos/filtros) no
// lugar de um id real de categoria.
export const UNCATEGORIZED_KEY = "__uncategorized__"

export function findCategory(categories: Category[], categoryId: string | null | undefined): Category | undefined {
  if (!categoryId) return undefined
  return categories.find((c) => c.id === categoryId)
}

// Receita ou despesa de uma transação. Historicamente as telas usavam o tipo
// da categoria; sem categoria, cai para o tipo da própria transação (que o
// backend sempre preenche) em vez de sumir dos totais. Com categoria que
// ainda não carregou/não existe, devolve undefined — mesmo comportamento de
// antes (fica fora da conta até a lista de categorias chegar).
export function effectiveTransactionType(
  categories: Category[],
  t: Pick<Transaction, "categoryId" | "type">,
): TransactionType | undefined {
  if (!t.categoryId) return t.type
  return findCategory(categories, t.categoryId)?.type
}

// Chave de agrupamento por categoria (id real ou a chave "Sem categoria").
export function categoryKeyOf(t: Pick<Transaction, "categoryId">): string {
  return t.categoryId || UNCATEGORIZED_KEY
}

export function categoryLabel(category: Category | undefined | null): string {
  return category?.name ?? UNCATEGORIZED_LABEL
}

export function categoryColor(category: Category | undefined | null): string {
  return category?.color ?? UNCATEGORIZED_COLOR
}

// Rótulo de categoria de uma transação: "Sem categoria" só quando de fato não
// tem categoria — se tem id mas a lista de categorias ainda não carregou (ou a
// categoria sumiu), fica vazio em vez de piscar "Sem categoria".
export function transactionCategoryLabel(categories: Category[], t: Pick<Transaction, "categoryId">): string {
  if (!t.categoryId) return UNCATEGORIZED_LABEL
  return findCategory(categories, t.categoryId)?.name ?? ""
}

export function transactionCountLabel(count: number): string {
  return count === 1 ? "1 transação" : `${count} transações`
}

// Ícone sugerido pelo nome da categoria (enquanto a pessoa não escolhe um):
// "Mercado" → carrinho, "Academia" → haltere. Sem palavra conhecida, null.
const ICON_KEYWORDS: Array<[RegExp, string]> = [
  [/mercad|supermerc|feira|hortifr/, "ShoppingCart"],
  [/restaur|delivery|ifood|comida|lanche|almo[cç]o|jantar/, "ForkKnife"],
  [/caf[eé]|padaria/, "Coffee"],
  [/[oô]nibus|metr[oô]|trem/, "Bus"],
  [/gasolina|combust|posto/, "GasPump"],
  [/uber|99|transporte|carro|t[aá]xi|estaciona/, "Car"],
  [/bike|bicicleta/, "Bicycle"],
  [/viage|passage|hotel|f[eé]rias/, "Airplane"],
  [/aluguel|moradia|casa|condom/, "House"],
  [/limpeza|diarista/, "Broom"],
  [/manuten|reforma|conserto/, "Wrench"],
  [/luz|energia|[aá]gua|g[aá]s/, "Lightbulb"],
  [/internet|wi-?fi/, "WifiHigh"],
  [/celular|telefone|plano m[oó]vel/, "DeviceMobile"],
  [/farm[aá]cia|rem[eé]dio/, "Pill"],
  [/sa[uú]de|m[eé]dic|consulta|plano de sa/, "Stethoscope"],
  [/academia|gym|esporte|treino/, "Barbell"],
  [/beleza|sal[aã]o|cabel|est[eé]tica/, "Sparkle"],
  [/escola|curso|faculdade|educa/, "GraduationCap"],
  [/livro|leitura/, "BookOpen"],
  [/jogo|game/, "GameController"],
  [/cinema|filme|streaming|netflix|lazer/, "FilmSlate"],
  [/m[uú]sica|spotify|show/, "MusicNotes"],
  [/presente|anivers/, "Gift"],
  [/pet|cachorro|gato|veterin/, "PawPrint"],
  [/roupa|vestu[aá]rio|moda/, "TShirt"],
  [/assinatura|conta|boleto/, "Receipt"],
  [/compra|shopping/, "ShoppingBag"],
  [/sal[aá]rio|pagamento|renda/, "Money"],
  [/freela|trabalho|neg[oó]cio/, "Briefcase"],
  [/invest|reserva|poupan/, "PiggyBank"],
  [/reembolso|cashback/, "HandCoins"],
  [/banco|tarifa|juros/, "Bank"],
]

export function suggestCategoryIcon(name: string): string | null {
  const text = name.trim().toLowerCase()
  if (!text) return null
  return ICON_KEYWORDS.find(([pattern]) => pattern.test(text))?.[1] ?? null
}
