import { expect, test } from "@playwright/test"
import { apiPost, createAccount, login } from "./support/accounts"
import { q, sql } from "./support/db"

// Três transferências entre duas contas minhas já reconhecidas pela Pluggy
// (uma saída num banco e a entrada no outro, mesmo valor e data).
async function seedTransferPairs(request: Parameters<typeof createAccount>[0]) {
  const account = await createAccount(request)
  const card = (name: string, bankName: string, lastDigits: string) =>
    apiPost<{ id: string }>(request, account.token, "/cards", {
      name,
      bankName,
      lastDigits,
      hasCredit: false,
      hasDebit: true,
      kind: "CHECKING",
      color: "#8b5cf6",
    })
  const nubank = await card("Nubank", "Nubank", "1111")
  const inter = await card("Inter", "Inter", "2222")
  const category = (type: "EXPENSE" | "INCOME") =>
    apiPost<{ id: string }>(request, account.token, "/categories", {
      name: "Transferência",
      type,
      color: "#3b82f6",
      excludedFromTotals: true,
    })
  const out = await category("EXPENSE")
  const into = await category("INCOME")

  const tag = account.id
  const pairs = [
    { amount: "10.00", date: "2026-11-03T12:00:00Z" },
    { amount: "902.54", date: "2026-11-02T12:00:00Z" },
    { amount: "30.00", date: "2026-11-01T12:00:00Z" },
  ]
  const pendingRows = pairs.flatMap((pair, i) => [
    `(${q(`${tag}-out-${i}`)}, ${q(`${tag}-map-nu`)}, ${q(`${tag}-ext-out-${i}`)}, ${q(pair.date)}, ${pair.amount}, 'EXPENSE', 'PIX ENVIADO', 'Pix enviado', 'Pix enviado', ${q(out.id)})`,
    `(${q(`${tag}-in-${i}`)}, ${q(`${tag}-map-inter`)}, ${q(`${tag}-ext-in-${i}`)}, ${q(pair.date)}, ${pair.amount}, 'INCOME', 'PIX RECEBIDO', 'Pix recebido', 'Pix recebido', ${q(into.id)})`,
  ])

  sql(`
    INSERT INTO "PluggyConnection" (id, "userId", "clientIdCiphertext", "clientSecretCiphertext", "updatedAt")
      VALUES (${q(`${tag}-conn`)}, ${q(account.id)}, 'x', 'x', now());
    -- Sincronizou agora: a sincronização automática não tenta falar com a Pluggy.
    INSERT INTO "PluggyItem" (id, "connectionId", "pluggyItemId", "lastSyncedAt")
      VALUES (${q(`${tag}-item`)}, ${q(`${tag}-conn`)}, ${q(`${tag}-pluggy-item`)}, now());
    INSERT INTO "PluggyAccountMapping" (id, "itemId", "pluggyAccountId", "cardId", "paymentMethod") VALUES
      (${q(`${tag}-map-nu`)}, ${q(`${tag}-item`)}, ${q(`${tag}-acc-nu`)}, ${q(nubank.id)}, 'DEBIT'),
      (${q(`${tag}-map-inter`)}, ${q(`${tag}-item`)}, ${q(`${tag}-acc-inter`)}, ${q(inter.id)}, 'DEBIT');
    INSERT INTO "PluggyPendingTransaction"
      (id, "accountMappingId", "externalId", date, amount, type, "originalDescription", "suggestedDescription", description, "categoryId")
      VALUES ${pendingRows.join(",\n")};
  `)
  return account
}

test.describe("Sincronização bancária", () => {
  test("confirma as transferências em lote, deixando de fora a desmarcada", async ({ page, request }) => {
    const account = await seedTransferPairs(request)
    await login(page, account)
    await page.goto("/bank-sync")

    const section = page.getByRole("region", { name: "Transferências entre contas" })
    await expect(section.getByText("Entre as suas contas")).toBeVisible()
    await expect(section).toContainText("3 transferências")
    await expect(section).toContainText("R$ 942,54")

    // Desmarca a de R$ 30 nos detalhes.
    await section.getByRole("button", { name: "Ver detalhes" }).click()
    await section.getByRole("checkbox", { name: /R\$\s?30,00/ }).click()
    await expect(section).toContainText("2 transferências de 3")
    await expect(section).toContainText("R$ 912,54")

    await section.getByRole("button", { name: "Confirmar 2" }).click()
    await expect(page.getByText("Confirmado!")).toBeVisible()

    // Só a desmarcada continua na fila, na tela e no banco.
    await expect(section).toContainText("1 transferência")
    await expect(section).toContainText("R$ 30,00")
    expect(sql(`SELECT count(*) FROM "PluggyPendingTransaction" WHERE id LIKE ${q(`${account.id}-%`)}`)).toBe("2")
    expect(sql(`SELECT count(*) FROM "Transaction" WHERE "userId" = ${q(account.id)} AND "externalId" IS NOT NULL`)).toBe("4")
  })
})
