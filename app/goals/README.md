# Módulo de Objetivos (Goals)

Gerenciamento de metas de economia financeira, permitindo ao usuário definir alvos e acompanhar o progresso visualmente.

## Contexto

Motivar a economia através de gamificação visual (barras de progresso) e gestão de "envelopes" virtuais para objetivos específicos (ex: Viagem, Carro Novo).

## Especificações Técnicas

### Componentes Principais

- `GoalsPage` (`page.tsx`): Dashboard de objetivos.
- `GoalCard`: Card individual com barra de progresso.
- `GoalFormDialog` / `AddFundsDialog`: Modais de interação.

### Hooks & Utils

- `formatCurrency`: Formatação de valores monetários.
- `useState`: Controle local de diálogos e seleção de objetivos.

## Regras de Negócio

1. **Progresso Visual**: A barra de progresso é calculada como `(currentAmount / targetAmount) * 100`, limitando-se visualmente a 100%.
2. **Adição de Fundos**:
   - O valor adicionado é somado ao `currentAmount` existente.
   - Não há validação rígida de "saldo disponível" na conta principal nesta versão (lógica de alocação virtual).

## API / Events

| Evento | Ação | Detalhes |
| :--- | :--- | :--- |
| **Create Goal** | `addGoal(data)` | Cria novo registro de meta |
| **Add Funds** | `updateGoal(id, { currentAmount })` | Incrementa o valor acumulado |
| **Delete Goal** | `setGoals(filtered)` | Remove meta permanentemente |

## Diretrizes de Uso

### Adicionando Fundos

```typescript
const handleAddFunds = (amount: number) => {
  // Calcula novo montante
  const newAmount = Math.max(0, selectedGoal.currentAmount + amount)
  // Atualiza persistência
  updateGoal(selectedGoal.id, { currentAmount: newAmount })
}
```
