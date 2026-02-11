# Módulo de Configurações (Settings)

Central de preferências do usuário, gerenciamento de perfil e controle de dados sensíveis.

## Contexto

Permite ao usuário personalizar a experiência (Tema, Moeda) e gerenciar parâmetros críticos do orçamento (Metas de Gastos). Inclui também a "Zona de Perigo" para reset de dados.

## Especificações Técnicas

### Funcionalidades

- **Theme Engine**: Alternância Light/Dark via `useTheme` / `next-themes`.
- **Budget Control**: Definição de metas percentuais por categoria.
- **Data Management**: Limpeza total do LocalStorage para reset da aplicação.

### Data Layer

- Interage com múltiplas chaves do Storage: `settings`, `user`, `transactions`, `categories`.

## Regras de Negócio

1. **Alocação de Categoria**: A soma das porcentagens das categorias deve idealmente ser 100%. O sistema avisa se estiver acima ou abaixo.
2. **Alertas de Gasto**: O sistema calcula se o gasto atual da categoria excede `(MetaMensal * PorcentagemCategoria)`.
3. **Zona de Perigo**: A ação de "Apagar Todas as Transações" é irreversível e recarrega a página (`window.location.reload()`) para limpar estados em memória.

## API / Events

| Evento | Payload | Efeito |
| :--- | :--- | :--- |
| **Update Profile** | `{ name, email }` | Atualiza dados do usuário no header/perfil |
| **Save Settings** | `{ spendingGoal, currency, categoryGoals }` | Persiste configurações globais |
| **Clear Data** | `[]` (Empty Array) | `setTransactions([])` e limpa histórico |

## Diretrizes de Uso

### Validação de Budget

```typescript
// Verifica se categoria estourou o budget
const allowedAmount = (monthlyExpense * goal.percentage) / 100
if (categoryTotal > allowedAmount) {
  warnings.push(`${category.name}: Excedeu limite`)
}
```
