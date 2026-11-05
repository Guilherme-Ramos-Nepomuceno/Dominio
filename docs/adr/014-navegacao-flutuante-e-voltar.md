# ADR-014: Menu inferior flutuante e "Voltar" com trilha de navegação

- **Data**: 2026-11-05
- **Status**: Aceito
- **Decisores**: Guilherme Ramos Nepomuceno
- **Tags**: ui, navegação

## Contexto e problema

No celular, o menu inferior era uma barra fixa colada na borda, com Reservas ocupando um lugar, e o botão "+" flutuava separado. A barra ocupava espaço o tempo todo, inclusive enquanto a pessoa lia. As telas abertas a partir de outras (Regras, Categorias, Faturas…) não tinham um jeito consistente de voltar.

## Opções consideradas

- Menu flutuante em pílula com o "+" no centro, que some ao rolar
- Manter a barra fixa e só trocar os itens
- Menu com efeito de vidro (Liquid Glass) da Apple, pesquisado e descartado: é exclusivo das plataformas nativas, e na web teria de ser imitado

## Decisão

- **Menu** (`components/layout/bottom-nav.tsx`): pílula flutuante (`fixed inset-x-4`, `rounded-full`, `backdrop-blur`). Ordem: Home, Planejar, **+** (Registrar), Cartões, Todos. Reservas saiu do menu e continua acessível por "Todos". No modo somente leitura, o "+" não aparece.
- **Sumir ao rolar** (`hooks/use-visible-on-scroll-up.ts`): o menu e o botão "+" ouvem a mesma rolagem, somem ao descer e voltam juntos ao subir ou perto do topo.
- **Voltar** (`components/layout/back-link.tsx`): o `AppLayout` anota as telas visitadas na aba (`useNavTrail`). O `BackLink` volta para a tela de onde a pessoa veio. Se a tela foi aberta direto, por link ou recarregando, vai para a tela-mãe (`fallback`). Regra: toda tela derivada de outra tem "Voltar".

### Consequências positivas

- Mais área útil na hora de ler, e registrar um gasto fica a um toque, no centro.
- O "Voltar" nunca leva para fora do app.

### Consequências negativas

- Elementos fixos (barras dos grupos do plano, botão de nova categoria) precisam de deslocamento manual (`bottom-[calc(5.5rem+env(safe-area-inset-bottom))]`) para não ficar atrás do menu.
- Reservas ficou um toque mais longe.

## Links

- [ADR-013](013-pagina-corrida-sem-cartoes.md)
