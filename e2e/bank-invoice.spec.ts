import { expect, test } from "@playwright/test"
import { apiPost, createAccount, login } from "./support/accounts"
import { q, sql } from "./support/db"

// Cartão do Banco do Brasil ligado pela Pluggy (cenário real de 2026-11-18):
// o BB só manda a parcela de uma compra antiga quando ela é lançada, então a
// fatura aberta no app ficava menor que a do banco; o estorno descontava numa
// tela e não na outra; e uma compra lançada à mão em parcelas era a mesma que
// veio do banco.
//
// Cartão fecha dia 1: a compra de hoje cai na fatura do mês que vem (aberta),
// a do mês passado na fatura deste mês (já fechada).
const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`

async function seedBankCard(request: Parameters<typeof createAccount>[0]) {
  const account = await createAccount(request)
  const card = await apiPost<{ id: string }>(request, account.token, "/cards", {
    name: "Ourocard",
    bankName: "bb",
    lastDigits: "4040",
    hasCredit: true,
    hasDebit: false,
    color: "#f5c400",
    limit: 3000,
    closingDate: 1,
    dueDate: 8,
  })
  const now = new Date()
  const today = ymd(now)
  const lastMonth = (day: number) => ymd(new Date(now.getFullYear(), now.getMonth() - 1, day))

  const purchase = (description: string, amount: number, date: string, extra: Record<string, unknown> = {}) =>
    apiPost<{ id: string }>(request, account.token, "/transactions", {
      description,
      amount,
      type: "EXPENSE",
      status: "PENDING",
      date: `${date}T12:00:00`,
      cardId: card.id,
      paymentMethod: "CREDIT",
      ...extra,
    })

  // Fatura deste mês (fechada): duas compras parceladas que vieram do banco.
  const gol = await purchase("GOL LINHAS A* PARC 01/03 SAO PAULO   BR", 160.97, lastMonth(15))
  const amazon = await purchase("AMAZONMKTPLC* PARC 05/09 SANTO ANDRE BR", 64.29, lastMonth(18))
  // A mesma compra da Amazon lançada à mão em 2x, com o valor dividido à mão.
  const kit1 = await purchase("kitshampoo", 64.33, lastMonth(20), { installments: 2, currentInstallment: 1 })
  await purchase("kitshampoo", 64.28, today, { installments: 2, currentInstallment: 2, parentId: kit1.id })
  // Fatura aberta: uma compra e um estorno que vieram do banco.
  const padaria = await purchase("PADARIA A TRIGUEIRA", 100, today)
  const estorno = await apiPost<{ id: string }>(request, account.token, "/transactions", {
    description: "99Food *McDonalds - Cuiaba",
    amount: 24.04,
    type: "INCOME",
    status: "PAID",
    date: `${today}T12:00:00`,
    cardId: card.id,
    paymentMethod: "CREDIT",
  })

  const tag = account.id
  const bankIds = [gol.id, amazon.id, padaria.id, estorno.id]
  sql(`
    UPDATE "Transaction" SET "externalId" = 'pluggy-' || id, "originalDescription" = description
      WHERE id IN (${bankIds.map(q).join(", ")});
    UPDATE "Transaction" SET "invoiceId" = (SELECT "invoiceId" FROM "Transaction" WHERE id = ${q(padaria.id)})
      WHERE id = ${q(estorno.id)};
    INSERT INTO "PluggyConnection" (id, "userId", "clientIdCiphertext", "clientSecretCiphertext", "updatedAt")
      VALUES (${q(`${tag}-conn`)}, ${q(account.id)}, 'x', 'x', now());
    -- Sincronizou agora: a sincronização automática não tenta falar com a Pluggy.
    INSERT INTO "PluggyItem" (id, "connectionId", "pluggyItemId", "lastSyncedAt")
      VALUES (${q(`${tag}-item`)}, ${q(`${tag}-conn`)}, ${q(`${tag}-pluggy-item`)}, now());
    INSERT INTO "PluggyAccountMapping"
      (id, "itemId", "pluggyAccountId", "cardId", "paymentMethod", "accountType", "bankBalance", "creditLimit", "availableCreditLimit", "bankSyncedAt")
      VALUES (${q(`${tag}-map`)}, ${q(`${tag}-item`)}, ${q(`${tag}-acc`)}, ${q(card.id)}, 'CREDIT', 'CREDIT', 2671, 3000, 329, now());
  `)
  return { account, card, amazonId: amazon.id }
}

test("fatura aberta do cartão ligado ao banco: parcelas previstas, estorno e a mesma compra lançada à mão", async ({ page, request }) => {
  const { account, card, amazonId } = await seedBankCard(request)
  // 100 − 24,04 de estorno + GOL 02/03 (160,97) + AMAZON 06/09 (64,29) previstas.
  // O kitshampoo 2/2 (64,28, à mão) fica fora do total.
  const expected = "R$ 301,22"

  await login(page, account)
  await page.goto("/cards")
  const row = page.locator(`a[href^="/invoices?card=${card.id}"]`)
  await expect(row).toContainText(expected)

  await row.click()
  await expect(page.getByText(expected).first()).toBeVisible()
  await expect(page.getByText("Inclui R$ 225,26 em parcelas que o banco ainda não mandou.")).toBeVisible()
  await expect(page.getByText("GOL LINHAS A* PARC 02/03 SAO PAULO   BR")).toBeVisible()
  await expect(page.getByText("Parcela 2/3 · prevista")).toBeVisible()
  await expect(page.getByText("−R$ 24,04")).toBeVisible()

  const suggestion = page.getByRole("region", { name: "Parece a mesma compra" })
  await expect(suggestion).toContainText("kitshampoo")
  await expect(suggestion).toContainText("AMAZONMKTPLC* PARC 05/09")
  await suggestion.getByRole("button", { name: "É a mesma, juntar" }).click()
  await expect(page.getByText("Compras juntadas").first()).toBeVisible()
  await expect(suggestion).toBeHidden()

  // As duas parcelas à mão sumiram; a compra do banco ficou com o nome dado.
  expect(sql(`SELECT count(*) FROM "Transaction" WHERE "userId" = ${q(account.id)} AND "externalId" IS NULL`)).toBe("0")
  expect(sql(`SELECT description FROM "Transaction" WHERE id = ${q(amazonId)}`)).toBe("kitshampoo")
  // A parcela prevista da Amazon agora aparece com o mesmo nome, e o total não muda.
  await expect(page.getByText("kitshampoo", { exact: true })).toBeVisible()
  await expect(page.getByText("Parcela 6/9 · prevista")).toBeVisible()
  await expect(page.getByText(expected).first()).toBeVisible()
})
