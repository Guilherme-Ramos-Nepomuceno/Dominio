import { expect, test } from "@playwright/test"
import { apiPost, createAccount, login } from "./support/accounts"

const MONTHS = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"]

// Cartão que fecha dia 1: em qualquer dia do mês a compra de hoje já cai na
// fatura do mês seguinte. A tela de Cartões tem que mostrar essa fatura e o
// toque tem que abri-la — não o mês corrente (regressão de 2026-11-17).
test("cartão mostra a fatura aberta e o toque abre o mês dela", async ({ page, request }) => {
  const account = await createAccount(request)
  const card = await apiPost<{ id: string }>(request, account.token, "/cards", {
    name: "Cartão Fecha Dia 1",
    bankName: "nubank",
    lastDigits: "4321",
    hasCredit: true,
    hasDebit: false,
    color: "#8a05be",
    limit: 1000,
    closingDate: 1,
    dueDate: 8,
  })
  const now = new Date()
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`
  await apiPost(request, account.token, "/transactions", {
    description: "Compra no cartão",
    amount: 123.45,
    type: "EXPENSE",
    status: "PENDING",
    date: `${today}T12:00:00`,
    cardId: card.id,
    paymentMethod: "CREDIT",
  })

  const next = new Date(now.getFullYear(), now.getMonth() + 1, 1)
  const nextKey = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}`
  const nextName = MONTHS[next.getMonth()]

  await login(page, account)
  await page.goto("/cards")

  const row = page.locator(`a[href^="/invoices?card=${card.id}"]`)
  await expect(row).toHaveAttribute("href", `/invoices?card=${card.id}&month=${nextKey}`)
  await expect(row).toContainText(`Fatura de ${nextName}`)
  await expect(row).toContainText("R$ 123,45")
  await expect(page.getByText("A pagar nos cartões")).toBeVisible()

  await row.click()
  await expect(page).toHaveURL(new RegExp(`month=${nextKey}`))
  await expect(page.getByText(`${nextName} de ${next.getFullYear()}`).first()).toBeVisible()
  await expect(page.getByText("Compra no cartão")).toBeVisible()
})
