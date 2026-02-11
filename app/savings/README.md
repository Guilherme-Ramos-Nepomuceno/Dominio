# Módulo de Reservas (Savings)

Diferente de "Objetivos" (Goals), este módulo foca na categorização de dinheiro guardado (Envelopes Financeiros), permitindo separar o saldo global em "caixinhas".

## Contexto

Permite ao usuário dizer: "Do meu saldo total de R$ 10.000, R$ 2.000 são para Emergência". Isso evita a ilusão de riqueza.

## Especificações Técnicas

- **Entidade**: `SavingsGoal` (No código, compartilha terminologia com Goals, mas a UX é de "Reservas").
- **Ações**: Adicionar Valor (`AddFunds`), Resgatar Valor (`RemoveFunds`).

## Regras de Negócio

1. **Saldo Virtual**: Os valores adicionados às reservas não somem da conta bancária real, apenas são "carimbados" logicamente no sistema.
2. **Proteção de Exclusão**: O sistema impede/alerta exclusão de reservas que ainda possuem saldo positivo (`currentAmount > 0`).
3. **Persistência**: Entidade `savingsGoals` no LocalStorage.

## Componentes

- `SavingsGoalCard`: Card com display de valor e botões de ação rápida (+ / -).
- `EditSavingsDialog`: Edição de nome/meta/cor.

## API / Events

| Evento | Função | Descrição |
| :--- | :--- | :--- |
| **Add Funds** | `addFundsToSavingsGoal` | Incrementa saldo da reserva |
| **Remove** | `removeFundsFromSavingsGoal` | Decrementa saldo (Resgate) |
| **Delete** | `deleteSavingsGoal` | Remove a categoria de reserva |
