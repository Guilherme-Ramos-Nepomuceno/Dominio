# Módulo de Reservas (Savings)

Dinheiro guardado, separado em "caixinhas" (reservas). Cada reserva pertence a um **grupo** (Segurança, Planejado, Futuro ou Guardado, o padrão sem destino) e pode ser **separada para objetivos** (ver `app/goals/README.md` e [ADR-031](../../docs/adr/031-reservas-alocadas-em-objetivos.md)).

## Contexto

Permite dizer: "Do meu saldo total de R$ 10.000, R$ 2.000 são para emergência". Isso evita a ilusão de riqueza. Com a ADR-031, a reserva também é a origem do dinheiro dos objetivos: o que um objetivo tem é o que foi separado de uma ou mais reservas.

## Especificações técnicas

- **Entidade**: `SavingsGoal` (a UX chama de "Reservas").
- **Grupo**: campo `kind` com lista fixa (`SAVINGS_KINDS` em `lib/goal-allocation.ts`): `SEGURANCA`, `PLANEJADO`, `FUTURO`, `GUARDADO` (padrão). Valores antigos (`EMERGENCIA`, `VIAGEM`, `CURTO_PRAZO`, `LONGO_PRAZO`, `OUTRO`) ainda existem no banco e são lidos como o grupo equivalente (`normalizeSavingsKind`). O grupo é sugerido pelo nome (`suggestSavingsKind`). Ver [PRD-001](../../docs/prd/001-reservas-e-objetivos-simplificados.md).
- **Cartão e meta**: não são mais pedidos. `cardId` é opcional na API e a meta pode ser zero (sem meta).
- **Saldo**: `currentAmount`. Se a reserva tem investimentos do banco ligados (ADR-028), o saldo vem do banco e não é editado à mão.
- **Separado para objetivos**: `allocatedTo` (lista de objetivo e valor). O livre é o saldo menos o que está separado (`freeOfSavings`).

## Regras de negócio

1. **Saldo virtual**: o dinheiro da reserva não sai da conta bancária real, só fica "carimbado" no sistema.
2. **Composição** ([ADR-033](../../docs/adr/033-composicao-do-saldo-das-reservas.md)): o saldo é o total gravado; o detalhe é a parte do banco (investimentos divididos entre reservas), as fontes registradas pelo nome e o que sobra "sem detalhar". Quem não usa o Pluggy usa só as fontes.
3. **Guardado**: reserva padrão que recebe o dinheiro sem destino (investimento do banco ainda não direcionado, fonte registrada sem escolher reserva). Não se exclui e some quando zerada.
4. **Ajuste automático**: resgate e rendimento no banco ajustam as partes (Guardado primeiro no resgate); o separado para objetivos encolhe se o saldo não o cobre, com aviso e "Corrigir".
5. **Separado não some por ação direta**: editar o saldo abaixo do separado, ou abaixo da parte do banco, é recusado (400). Antes, retire dos objetivos.
6. **Exclusão**: pede confirmação na própria folha. A parte dos investimentos do banco volta para Guardado; as fontes dela somem. Reserva apagada tira a separação dos objetivos (cascata).
7. **Casal**: reserva marcada como casal entra inteira na conta do casal.

## Componentes

- `SavingsView`: duas visões, **Reservas** (total, separado e livre, e as reservas agrupadas por grupo com subtotal) e **Tudo investido** (`InvestedView`). Aceita `?view=invested`.
- `SavingsRow`: uma reserva na lista (ícone, nome, saldo, meta se houver). Toque abre o detalhe.
- `SavingsDetailSheet`: saldo e meta, "em que está" (banco, fontes e sem detalhar), separado para objetivos, guardar ou retirar, editar e excluir (com confirmação no lugar).
- `InvestedView`: investimentos do banco por tipo (só saldo positivo), "Registrados por você" e "Sem detalhar", cada um com a reserva de destino.
- `InvestmentDestinationSheet`: divide o valor de um investimento entre reservas; o resto fica em Guardado.
- `SourceFormSheet` / `SourceSheet`: registrar o que tem guardado pelo nome; guardei mais, retirei, atualizar valor, mover, remover e "ainda é esse valor?" (30 dias).
- `AdjustmentNotices`: avisos dos ajustes automáticos, com "Corrigir".
- `SavingsFormSheet`: criar e editar em `FormSheet` (ADR-016). Só o nome é obrigatório.

## API

| Evento | Endpoint | Descrição |
| :--- | :--- | :--- |
| Listar / criar / editar / excluir | `GET/POST /savings`, `PUT/DELETE /savings/:id` | `kind` e `currentAmount` aceitos na criação e edição; a resposta traz `investmentAllocations` e `sources` |
| Fontes | `POST /savings/sources`, `PUT/DELETE /savings/sources/:id` | Nome e valor; `fromRest` detalha sem somar; `amount` zero remove |
| Dividir investimento | `PUT /pluggy/investments/:id/allocations` | Valor por reserva; o resto vai para Guardado |
| Avisos | `GET /savings/adjustments`, `POST /savings/adjustments/:id/dismiss` | Ajustes automáticos ainda não dispensados |
| Separar para objetivo | `PUT /goals/:id/allocations/:savingsGoalId` | Ver `app/goals/README.md` |
