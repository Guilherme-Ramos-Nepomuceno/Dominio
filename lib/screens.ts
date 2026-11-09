// Nome estável de cada tela (sem ids da URL) — usado no evento
// "screen_viewed" e no ranking "o que mais acessam" do admin. Lógica pura.

const SCREENS: Array<[RegExp, string, string]> = [
  [/^\/$/, "home", "Home"],
  [/^\/plan$/, "plan", "Planejar"],
  [/^\/plan\/[^/]+$/, "plan-group", "Detalhe do grupo"],
  [/^\/week$/, "week", "Minha semana"],
  [/^\/inbox$/, "inbox", "A classificar"],
  [/^\/rules$/, "rules", "Regras"],
  [/^\/stats$/, "stats", "Bússola"],
  [/^\/cards/, "cards", "Cartões"],
  [/^\/invoices/, "invoices", "Faturas"],
  [/^\/goals/, "goals", "Objetivos"],
  [/^\/savings/, "savings", "Reservas"],
  [/^\/categories/, "categories", "Categorias"],
  [/^\/recurring/, "recurring", "Recorrentes"],
  [/^\/pending/, "pending", "Pendentes"],
  [/^\/month-closing/, "month-closing", "Fechamento"],
  [/^\/bank-sync/, "bank-sync", "Sincronização bancária"],
  [/^\/new/, "new-transaction", "Nova transação"],
  [/^\/transfer/, "transfer", "Transferir"],
  [/^\/all-menus/, "menu", "Todos os menus"],
  [/^\/settings/, "settings", "Configurações"],
]

// null = tela que não entra na conta (login, convite, admin).
export function screenKey(pathname: string): string | null {
  const path = pathname.split("?")[0].replace(/\/+$/, "") || "/"
  return SCREENS.find(([pattern]) => pattern.test(path))?.[1] ?? null
}

export function screenLabel(key: string): string {
  return SCREENS.find(([, k]) => k === key)?.[2] ?? key
}
