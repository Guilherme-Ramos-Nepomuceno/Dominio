# Módulo de Categorias (Categories)

Gerenciamento de categorias de transações, permitindo classificação de Receitas e Despesas.

## Contexto

Fundamental para a organização financeira, o módulo permite criar, visualizar e excluir categorias, além de fornecer estatísticas rápidas de uso (total gasto e % do budget) por categoria.

## Especificações Técnicas

Este módulo utiliza o padrão **MVVM**:

- **View**: `CategoriesView` (`components/categories-view.tsx`)
- **ViewModel**: `useCategoriesViewModel` (`hooks/use-categories-view-model.ts`)
- **UI Components**: `CategoryItem`, `AddCategoryDialog`

### Componentes

- `CategoryItem`: Exibe ícone, nome e dados financeiros da categoria.
- `AddCategoryDialog`: Modal para criação.

### Lógica de Estatísticas

O controlador calcula:

- **Total**: Soma das transações do mês atual vinculadas à categoria.
- **Percentage**:
  - Baseado na `spendingGoal` global definida em Settings.
  - Fórmula: `(GastoCategoria / (MetaGlobal * %Definida)) * 100`.

## Regras de Negócio

1. **Integridade Referencial**: Não é permitido excluir categorias que possuem transações vinculadas. O sistema alerta o usuário.
2. **Separação de Tipo**: Categorias são estritamente `income` ou `expense`.
3. **Persistência**: Dados salvos em `localStorage` via `categories`.

## API / Events

| Evento | Ação | Guardas |
| :--- | :--- | :--- |
| **Load** | Calcula stats do mês atual | Filtra por `date.startsWith(currentMonth)` |
| **Delete** | `setCategories(filtered)` | Verifica `hasTransactions` antes |

## Diretrizes de Estilo

O filtro de abas utiliza um "fundo deslizante" (sliding pill) calculado com CSS tailwind (`translate-x-[...]`) para uma animação fluida de seleção.
