import { expect, test } from "@playwright/test"
import { createAccount, PASSWORD, uniqueEmail } from "./support/accounts"

test.describe("Entrada no app", () => {
  test("cria a conta pela tela e cai em Planejar com o guiado", async ({ page }) => {
    await page.goto("/login")
    await page.getByRole("tab", { name: "Criar conta" }).click()
    await page.getByLabel("Nome").fill("Pessoa Nova")
    await page.getByLabel("Email").fill(uniqueEmail("cadastro"))
    await page.getByLabel("Senha").fill(PASSWORD)
    await page.getByRole("button", { name: "Criar conta" }).click()

    await expect(page).toHaveURL(/\/plan/)
    // Os 3 grupos aparecem mesmo sem valor (conta nova).
    await expect(page.getByRole("link", { name: /Essenciais/ })).toBeVisible()
    await expect(page.getByRole("link", { name: /Estilo de vida/ })).toBeVisible()
    await expect(page.getByRole("link", { name: /Futuro/ })).toBeVisible()
    // Primeiro passo do guiado: o orçamento.
    const tip = page.getByRole("dialog", { name: "Quanto entra no mês?" })
    await expect(tip).toBeVisible()
  })

  test("guiado do plano avança pela ação e termina ao confirmar", async ({ page }) => {
    await page.goto("/login")
    await page.getByRole("tab", { name: "Criar conta" }).click()
    await page.getByLabel("Nome").fill("Pessoa Guiada")
    await page.getByLabel("Email").fill(uniqueEmail("guiado"))
    await page.getByLabel("Senha").fill(PASSWORD)
    await page.getByRole("button", { name: "Criar conta" }).click()
    await expect(page).toHaveURL(/\/plan/)

    // Orçamento pelo lápis: o passo termina pela própria ação.
    await page.getByLabel("Editar orçamento do mês").click()
    const budget = page.locator('input[inputmode="decimal"]').first()
    await budget.fill("6000")
    await budget.press("Enter")
    await expect(page.getByRole("dialog", { name: "Primeiro, o essencial" })).toBeVisible()

    // Essenciais: entra no grupo, digita o valor e volta.
    await page.getByRole("link", { name: /Essenciais/ }).click()
    await expect(page.getByRole("dialog", { name: "Digite quanto vai para cada categoria" })).toBeVisible()
    const first = page.locator('[data-guide="group-first-input"] input')
    await first.fill("1500")
    await first.press("Enter")
    await expect(page.getByRole("dialog", { name: "Pronto! Volte ao plano" })).toBeVisible()
    await page.getByRole("button", { name: "Voltar" }).click()
    await expect(page.getByRole("dialog", { name: "Agora, o estilo de vida" })).toBeVisible()

    // Pula o resto até confirmar.
    await page.getByRole("button", { name: "Pular este grupo" }).click()
    await page.getByRole("button", { name: "Pular este grupo" }).click()
    await page.getByRole("button", { name: "Entendi" }).click()
    await page.getByRole("button", { name: "Agora não" }).click()
    await expect(page.getByRole("dialog", { name: "Tudo certo? Confirme o plano" })).toBeVisible()
    await page.getByRole("button", { name: "Confirmar plano" }).click()
    await expect(page.getByRole("dialog", { name: /Confirme o plano/ })).toHaveCount(0)

    // Guiado concluído: não volta ao recarregar.
    await page.reload()
    await expect(page.getByText("Passo", { exact: false })).toHaveCount(0)
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
