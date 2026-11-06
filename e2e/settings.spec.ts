import { expect, test } from "@playwright/test"
import { createAccount, login } from "./support/accounts"
import { q, sql } from "./support/db"

test.describe("Configurações", () => {
  test("liga a sincronização direta, que vem desligada e fica salva", async ({ page, request }) => {
    const account = await createAccount(request)
    await login(page, account)
    await page.goto("/settings")

    const toggle = page.getByRole("switch", { name: "Sincronização direta" })
    await expect(toggle).not.toBeChecked()

    await toggle.click()
    // O aviso aparece duas vezes no DOM (o toast e o anúncio para leitor de tela).
    await expect(page.getByText("Sincronização direta ligada").first()).toBeVisible()
    expect(sql(`SELECT "pluggyDirectSync" FROM "Setting" WHERE "userId" = ${q(account.id)}`)).toBe("t")

    await page.reload()
    await expect(page.getByRole("switch", { name: "Sincronização direta" })).toBeChecked()
  })
})
