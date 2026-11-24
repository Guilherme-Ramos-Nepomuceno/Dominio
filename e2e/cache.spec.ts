import { expect, test, type Page } from "@playwright/test"
import { apiPost, createAccount, login } from "./support/accounts"

// Cache das leituras (TanStack Query, lib/query-client.ts): voltar para uma
// tela já visitada mostra o que estava carregado sem buscar o histórico de
// novo; uma gravação feita no app invalida o cache e a tela se atualiza.

// Conta as buscas do histórico feitas COM a página na Home — uma busca
// atrasada da tela anterior (que ainda não usa o cache) não entra.
function countHomeTransactionReads(page: Page) {
  const counter = { count: 0 }
  page.on("request", (req) => {
    if (req.method() !== "GET" || new URL(req.url()).pathname !== "/transactions") return
    if (new URL(page.url()).pathname === "/") counter.count++
  })
  return counter
}

function today() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`
}

test("voltar para a Home usa o cache, sem baixar as transações de novo", async ({ page, request }) => {
  const account = await createAccount(request)
  await apiPost(request, account.token, "/transactions", {
    description: "Salário de teste",
    amount: 1234.56,
    type: "INCOME",
    status: "PAID",
    date: `${today()}T12:00:00`,
  })

  // O login dispara o sync automático do Pluggy, que avisa "dados mudaram"
  // ao terminar e invalida o cache (correto). Espera ele acabar para medir
  // só a navegação.
  const autoSync = page.waitForResponse((r) => r.request().method() === "POST" && new URL(r.url()).pathname === "/pluggy/sync")
  await login(page, account)
  await autoSync
  await expect(page.getByText("1.234,56").first()).toBeVisible()
  await page.waitForLoadState("networkidle")

  const nav = page.getByRole("navigation").last()
  await nav.getByRole("link", { name: "Cartões" }).click()
  await page.waitForURL(/\/cards$/)
  await page.waitForLoadState("networkidle")

  const reads = countHomeTransactionReads(page)
  await nav.getByRole("link", { name: "Home" }).click()
  await page.waitForURL(/\/$/)
  await expect(page.getByText("1.234,56").first()).toBeVisible()
  await page.waitForLoadState("networkidle")

  expect(reads.count).toBe(0)
})

test("registro rápido invalida o cache e a Home mostra o lançamento novo", async ({ page, request }) => {
  const account = await createAccount(request)
  await apiPost(request, account.token, "/transactions", {
    description: "Salário de teste",
    amount: 1000,
    type: "INCOME",
    status: "PAID",
    date: `${today()}T12:00:00`,
  })

  // Espera o sync automático do login (ele também invalida o cache).
  const autoSync = page.waitForResponse((r) => r.request().method() === "POST" && new URL(r.url()).pathname === "/pluggy/sync")
  await login(page, account)
  await autoSync
  await expect(page.getByText("1.000,00").first()).toBeVisible()

  await page.getByRole("button", { name: "Registrar", exact: true }).click()
  const sheet = page.getByRole("dialog")
  for (const key of ["4", "2", "0", "0"]) await sheet.getByRole("button", { name: key, exact: true }).click()
  await page.waitForLoadState("networkidle")

  // Depois que a gravação responde: o que depende de lançamentos é buscado de
  // novo; o que um gasto não muda (categorias, cartões, reservas,
  // configurações) não. (Antes do POST, addTransaction confere o cartão com
  // uma leitura fresca de /cards de propósito — essa não conta.)
  const reads = countHomeTransactionReads(page)
  const untouched: string[] = []
  let saved = false
  page.on("response", (res) => {
    if (res.request().method() === "POST" && new URL(res.url()).pathname === "/transactions") saved = true
  })
  page.on("request", (req) => {
    const path = new URL(req.url()).pathname
    if (saved && req.method() === "GET" && ["/categories", "/cards", "/savings", "/settings"].includes(path)) untouched.push(path)
  })
  await sheet.getByRole("button", { name: "Registrar despesa" }).click()
  await expect(sheet).toBeHidden()

  // Saldo 1.000,00 − 42,00 (despesa paga hoje).
  await expect(page.getByText("958,00").first()).toBeVisible()
  await page.waitForLoadState("networkidle")
  expect(reads.count).toBeGreaterThan(0)
  expect(untouched).toEqual([])
})
