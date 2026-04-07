# Módulo de Cartões (Cards)

Este módulo gerencia a criação, visualização e exclusão de cartões de crédito e débito, servindo como ponto central para a organização das contas do usuário.

## Contexto

Permite ao usuário manter múltiplos cartões, visualizando o saldo (conta corrente) ou o gasto atual da fatura (cartão de crédito).

## Especificações Técnicas

Este módulo utiliza o padrão **MVVM**:

- **View**: `CardsView` (`components/cards-view.tsx`)
- **ViewModel**: `useCardsViewModel` (`hooks/use-cards-view-model.ts`)
- **UI Components**: `CardItem`, `AddCardDialog` (localizados em `components/`)

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
