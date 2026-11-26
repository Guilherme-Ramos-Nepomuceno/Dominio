# Domínio

Front do Domínio: planejamento financeiro pessoal e do casal. A pessoa planeja o mês, acompanha a semana e vê para onde foi o dinheiro. Os dados vêm da API ([dominio-api](../dominio-api)), e as contas bancárias podem ser ligadas pela Pluggy.

Next.js 16 (App Router), React 19, TanStack Query e Tailwind 4.

## Rodar localmente

Precisa da API rodando (por padrão em `http://localhost:3333`).

```bash
npm install
npm run dev        # http://localhost:3001
```

| Variável | Para quê | Padrão |
| --- | --- | --- |
| `NEXT_PUBLIC_API_URL` | Endereço da API | `http://localhost:3333` |
| `DOMINIO_API_DIR` | Onde está o repositório da API, para os testes E2E e a pilha local | `../dominio-api` |

## Comandos

| Comando | O que faz |
| --- | --- |
| `npm run dev` | Servidor de desenvolvimento na porta 3001 |
| `npm run build` | Build de produção (checa os tipos) |
| `npm run lint` | ESLint |
| `npm test` | Testes das regras puras (`lib/__tests__`) |
| `npm run check:debt` | knip (arquivo, export e dependência sem uso), teto do lint e TODO ([ADR-035](docs/adr/035-checagem-de-debito-tecnico-no-ci.md)) |
| `npm run test:e2e` | Playwright contra banco, API e front de teste |
| `npm run stack` | Sobe a pilha de teste (banco 5434, API 3334, front 3100) |
| `npm run test:all` | Todos os testes dos dois repositórios |

## Arquitetura

MVVM no App Router ([ADR-022](docs/adr/022-logica-pura-testavel-e-mvvm.md)):

- **View**: `app/<tela>/components`
- **ViewModel**: `app/<tela>/hooks`
- **Regras puras e testáveis**: `lib/*.ts`, com testes em `lib/__tests__`
- **Chamadas à API**: `lib/storage.ts`, `lib/planning-api.ts` e vizinhos, via `lib/api.ts`
- **Cache das leituras**: TanStack Query em `hooks/queries.ts`, invalidado por domínio ([ADR-034](docs/adr/034-cache-das-leituras-com-tanstack-query.md))
- **Componentes compartilhados**: `components/` (o kit shadcn fica em `components/ui`)

As decisões ficam em [docs/adr](docs/adr/README.md).

## Telas

| Tela | Rota | O que é |
| --- | --- | --- |
| Home | `/` | O dia, a semana e o mês de relance |
| Planejar | `/plan` | Orçamento do mês, grupos e desejos |
| Minha semana | `/week` | Quanto ainda dá para gastar até o fim da semana |
| Fechamento | `/month-closing` | Fecha o plano e decide a sobra |
| A classificar | `/inbox` | Transações sem categoria, agrupadas |
| Bússola | `/stats` ([README](app/stats/README.md)) | Para onde foi o dinheiro, mês a mês, e o extrato |
| Nova transação | `/new` ([README](app/new/README.md)) | Formulário completo (o registro rápido leva para cá, já preenchido) |
| Pendentes | `/pending` ([README](app/pending/README.md)) | Contas a pagar e a receber |
| Recorrentes | `/recurring` ([README](app/recurring/README.md)) | Parcelas e assinaturas |
| Cartões | `/cards` ([README](app/cards/README.md)) | Contas, cartões e importação de extrato |
| Faturas | `/invoices` ([README](app/invoices/README.md)) | Fatura de cada cartão e pagamento |
| Transferir | `/transfer` ([README](app/transfer/README.md)) | Transferência entre contas (aberta pelos Cartões) |
| Reservas | `/savings` ([README](app/savings/README.md)) | Dinheiro guardado por grupo |
| Objetivos | `/goals` ([README](app/goals/README.md)) | Metas que recebem dinheiro das reservas |
| Categorias | `/categories` ([README](app/categories/README.md)) | Categorias e histórico |
| Regras | `/rules` | Regras de categoria automática |
| Banco | `/bank-sync` | Conexão Pluggy, contas e pendências do banco |
| Configurações | `/settings` ([README](app/settings/README.md)) | Perfil, casal, notificações e conexões |
| Todos os menus | `/all-menus` ([README](app/all-menus/README.md)) | Todas as telas, em 4 grupos |
| Admin | `/admin` | Eventos de produto (só administradores) |
| Login e convite | `/login` ([README](app/login/README.md)), `/join/[token]` | Entrada e convite para a conta do casal |
