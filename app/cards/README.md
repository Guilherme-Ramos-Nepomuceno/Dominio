# Módulo de Cartões (Cards)

Este módulo gerencia a criação, visualização e exclusão de cartões de crédito e débito, servindo como ponto central para a organização das contas do usuário.

## Contexto

Permite ao usuário manter múltiplos cartões, visualizando o saldo (conta corrente) ou o gasto atual da fatura (cartão de crédito).

## Especificações Técnicas

### Componentes Principais

- `CardsPage` (`page.tsx`): Controller principal da view.
- `CardItem`: Componente de UI para renderizar o cartão visualmente.
- `AddCardDialog`: Modal de criação de novos cartões.

### Data Layer

- **Source**: `lib/storage`
- **Functions**: `getCards()`, `deleteCard()`, `getAccountBalance()`.

## Regras de Negócio

1. **Cálculo de Saldo**:
   - **Crédito**: Soma das transações do tipo `expense` na fatura atual.
   - **Débito**: Saldo da conta (`accountBalance`) calculado via movimentações.
2. **Exclusão**:
   - Só é permitida após confirmação em modal (`AlertDialog`).
   - *Atenção*: Excluir um cartão pode afetar o histórico de transações vinculadas.

## API / Events

| Evento | Ação | Payload Exemplo |
| :--- | :--- | :--- |
| **Create Card** | `storage.addCard(card)` | `{ name: "NuBank", limit: 5000, type: "credit" }` |
| **Delete Card** | `storage.deleteCard(id)` | `id: "uuid-v4..."` |

## Diretrizes de Uso

### Exemplo de Delete

```typescript
const confirmDeleteCard = () => {
  if (cardToDelete) {
    deleteCard(cardToDelete)
    toast({ title: "Cartão removido", variant: "success" })
  }
}
```
