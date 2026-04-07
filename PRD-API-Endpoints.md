# Backend API Endpoints (PRD para Frontend)

Este documento detalha todos os endpoints disponíveis na API do Dominio SaaS para integração com o frontend.

## 📌 Base URL

- **Local:** `http://localhost:3000`
- **Produção:** *[A Definir]*

---

## 🔒 Autenticação (Auth)

A API utiliza Bearer Token (JWT). A maioria das rotas exige que o header contenha:
`Authorization: Bearer <seu_token_aqui>`

### 1. Registrar Usuário

- **Endpoint:** `POST /auth/register`
- **Autenticação:** Não
- **Body:**

  ```json
  {
    "name": "João da Silva",
    "email": "joao@email.com",
    "password": "senha_segura"
  }
  ```

### 2. Login

- **Endpoint:** `POST /auth/login`
- **Autenticação:** Não
- **Body:**

  ```json
  {
    "email": "joao@email.com",
    "password": "senha_segura"
  }
  ```

- **Retorno Esperado:** Token JWT e dados do usuário.

---

## 👤 Usuário (User)

*Todas as requisições deste e dos próximos grupos necessitam do header de autenticação.*

### 1. Obter Perfil

- **Endpoint:** `GET /users/me`

### 2. Atualizar Perfil

- **Endpoint:** `PUT /users/me`
- **Body:**

  ```json
  {
    "name": "João da Silva Sauro",
    "email": "novo@email.com"
  }
  ```

### 3. Excluir Conta

- **Endpoint:** `DELETE /users/me`

---

## 💳 Cartões (Cards)

### 1. Listar Cartões

- **Endpoint:** `GET /cards`
- **Retorno Esperado:** Lista de cartões com saldos calculados e gastos processados.

### 2. Obter Detalhes de um Cartão

- **Endpoint:** `GET /cards/:id`

### 3. Criar Cartão

- **Endpoint:** `POST /cards`
- **Body:**

  ```json
  {
    "name": "Nubank",
    "bankName": "nubank",
    "lastDigits": "1234",
    "type": "CREDIT", // CREDIT | DEBIT
    "color": "#8A05BE",
    "limit": 5000.50, // Apenas para crédito (opcional)
    "dueDate": 15     // Apenas para crédito (opcional)
  }
  ```

### 4. Editar Cartão

- **Endpoint:** `PUT /cards/:id`
- **Body:** Parcial dos valores usados na criação.

### 5. Apagar Cartão

- **Endpoint:** `DELETE /cards/:id`

---

## 🏷️ Categorias (Categories)

### 1. Listar Categorias

- **Endpoint:** `GET /categories`

### 2. Criar Categoria

- **Endpoint:** `POST /categories`
- **Body:**

  ```json
  {
    "name": "Supermercado",
    "color": "#FF5733",
    "type": "EXPENSE", // INCOME | EXPENSE
    "icon": "shopping-cart"
  }
  ```

### 3. Deletar/Editar Categoria

- **Endpoint Editar:** `PUT /categories/:id`
- **Endpoint Deletar:** `DELETE /categories/:id`

---

## 💵 Transações (Transactions)

### 1. Listar Transações

- **Endpoint:** `GET /transactions`
- **Query Params (opcionais):** `?month=YYYY-MM&type=EXPENSE&status=PAID&cardId=123&categoryId=123`

### 2. Criar Transação

- **Endpoint:** `POST /transactions`
- **Body:**

  ```json
  {
    "description": "Compra do Mês",
    "amount": 450.00,
    "type": "EXPENSE",
    "status": "PAID", // PAID | PENDING | CANCELLED
    "date": "2023-11-01T10:00:00Z",
    "recurrence": "NONE", // DAILY | WEEKLY | MONTHLY | YEARLY | NONE
    "installments": 1, // opcional
    "categoryId": "cuid_da_categoria",
    "cardId": "cuid_do_cartao" // opcional
  }
  ```

### 3. Marcar como Paga

- **Endpoint:** `PATCH /transactions/:id/paid`
- **Body (opcional):** `{ "cardId": "cuid_novo", "confirmDate": "2023-11-01" }`

### 4. Cancelar Transação

- **Endpoint:** `PATCH /transactions/:id/cancel`

### 5. Pagar Faturas de Cartão

- **Fatura Total:** `POST /transactions/pay-invoice/full`
  - Body: `{ "cardId": "cuid", "month": "YYYY-MM" }`
- **Fatura Parcial:** `POST /transactions/pay-invoice/partial`
  - Body: `{ "cardId": "cuid", "month": "YYYY-MM", "amount": 250.00 }`

### 6. Outras rotas úteis

- **Obter única transação:** `GET /transactions/:id`
- **Pegar as pendentes de cartões selecionados:** `GET /transactions/pending/visible`
- **Transferência entre cartões/contas:** `POST /transactions/transfer`
- **Deletar transação:** `DELETE /transactions/:id`
- **Editar transação:** `PUT /transactions/:id`

---

## 🎯 Metas (Goals)

### 1. Listar Metas

- **Endpoint:** `GET /goals`

### 2. Criar Meta

- **Endpoint:** `POST /goals`
- **Body:**

  ```json
  {
    "name": "Carro Novo",
    "targetAmount": 50000.00,
    "currentAmount": 1000.00,
    "deadline": "2026-12-31T00:00:00Z",
    "icon": "car"
  }
  ```

### 3. Editar / Apagar Meta

- **Editar:** `PUT /goals/:id`
- **Apagar:** `DELETE /goals/:id`

---

## 🐖 Reservas / Caixinhas (Savings)

### 1. Listar Reservas

- **Endpoint:** `GET /savings`

### 2. Criar Reserva

- **Endpoint:** `POST /savings`
- **Body:**

  ```json
  {
    "name": "Fundos de Emergência",
    "targetAmount": 20000.00,
    "currentAmount": 500.00,
    "cardId": "cuid_da_conta_atrelada"
  }
  ```

### 3. Editar / Apagar Reserva

- **Editar:** `PUT /savings/:id`
- **Apagar:** `DELETE /savings/:id`

---

## ⚙️ Configurações (Settings)

### 1. Obter e Editar Configurações

- **GET:** `GET /settings`
- **PUT:** `PUT /settings`
  - Body: `{ "currency": "BRL", "spendingGoal": 2500, "theme": "dark" }`

---

## 📊 Estatísticas (Stats / Dashboarding)

*Retornam métricas agregadas perfeitas para a tela inicial.*

- **Dashboard do Mês:** `GET /stats/month-data/:year/:month`
- **Saldos Totais:** `GET /stats/total-balance/:year/:month`
- **Faturas Previstas e Pendentes:** `GET /stats/card-invoices/:year/:month`
- **Categorias (Gráfico Pizzas):** `GET /stats/category-breakdown/:year/:month`
- **Alertas de Orçamento por Categoria:** `GET /stats/category-alerts/:year/:month`

---

## 🔄 Sincronização em Massa (Sync - Offline First)

### 1. Sincronização (Bulk Sync)

Útil caso o front-end crie dados enquanto o usuário estava sem internet e depois envie tudo num lote só.

- **Endpoint:** `POST /sync/bulk`
- **Body:**

  ```json
  [
    {
      "entity": "transaction", // transaction | card | category | goal | savingsGoal | setting
      "action": "create",      // create | update | delete
      "data": { "description": "Lanche no app", "amount": 25.50 /*...*/ }
    }
  ]
  ```
