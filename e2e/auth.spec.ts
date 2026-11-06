import { expect, test } from "@playwright/test"
import { createAccount, PASSWORD, uniqueEmail } from "./support/accounts"

test.describe("Entrada no app", () => {
  test("cria a conta pela tela e cai no onboarding", async ({ page }) => {
    await page.goto("/login")
    await page.getByRole("tab", { name: "Criar conta" }).click()
    await page.getByLabel("Nome").fill("Pessoa Nova")
    await page.getByLabel("Email").fill(uniqueEmail("cadastro"))
    await page.getByLabel("Senha").fill(PASSWORD)
    await page.getByRole("button", { name: "Criar conta" }).click()

    await expect(page).toHaveURL(/\/onboarding/)
  })

  test("entra com uma conta existente e vê a Home", async ({ page, request }) => {
    const account = await createAccount(request)

    await page.goto("/login")
    await page.getByLabel("Email").fill(account.email)
    await page.getByLabel("Senha").fill(account.password)
    await page.getByRole("button", { name: "Entrar" }).click()

    await expect(page).toHaveURL(/\/$/)
    await expect(page.getByText("Para gastar hoje")).toBeVisible()
    await expect(page.getByRole("button", { name: "Registrar" })).toBeVisible()
  })

  test("senha errada mostra o erro e continua no login", async ({ page, request }) => {
    const account = await createAccount(request)

    await page.goto("/login")
    await page.getByLabel("Email").fill(account.email)
    await page.getByLabel("Senha").fill("senha-errada-000")
    await page.getByRole("button", { name: "Entrar" }).click()

    await expect(page.getByRole("alert")).toBeVisible()
    await expect(page).toHaveURL(/\/login/)
  })

  test("sem sessão, uma tela protegida volta para o login", async ({ page }) => {
    await page.goto("/plan")
    await expect(page).toHaveURL(/\/login/)
  })
})
