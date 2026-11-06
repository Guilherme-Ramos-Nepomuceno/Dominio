import type { APIRequestContext } from "@playwright/test"

export const API_URL = "http://localhost:3334"
export const PASSWORD = "senha-de-teste-123"

// E-mail único por teste: os testes rodam em paralelo e o banco é o mesmo.
export function uniqueEmail(prefix = "e2e") {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@teste.local`
}

// Cria a conta direto na API (mais rápido que pela tela) quando o teste não é
// sobre o cadastro.
export async function createAccount(request: APIRequestContext, name = "Pessoa de Teste") {
  const email = uniqueEmail()
  const response = await request.post(`${API_URL}/auth/register`, {
    data: { name, email, password: PASSWORD },
  })
  if (!response.ok()) throw new Error(`Cadastro falhou: ${response.status()} ${await response.text()}`)
  const body = (await response.json()) as { user: { id: string }; token: string }
  return { email, password: PASSWORD, name, id: body.user.id, token: body.token }
}

// POST autenticado direto na API, para montar o cenário do teste.
export async function apiPost<T = any>(request: APIRequestContext, token: string, path: string, data: unknown): Promise<T> {
  const response = await request.post(`${API_URL}${path}`, { data, headers: { Authorization: `Bearer ${token}` } })
  if (!response.ok()) throw new Error(`POST ${path} falhou: ${response.status()} ${await response.text()}`)
  return (await response.json()) as T
}

export async function login(page: import("@playwright/test").Page, account: { email: string; password: string }) {
  await page.goto("/login")
  await page.getByLabel("Email").fill(account.email)
  await page.getByLabel("Senha").fill(account.password)
  await page.getByRole("button", { name: "Entrar" }).click()
  await page.waitForURL(/\/$/)
}
