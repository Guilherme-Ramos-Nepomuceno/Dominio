# ADR-013: Página corrida sem cartões, com cor só onde há significado

- **Data**: 2026-11-05
- **Status**: Aceito
- **Decisores**: Guilherme Ramos Nepomuceno
- **Tags**: ui, design-system

## Contexto e problema

As telas foram construídas em épocas diferentes: cada bloco de informação vivia num cartão com borda e sombra, e cada cartão usava sua própria cor (verde, vermelho, azul, cores por categoria). Na Home, três componentes disputavam atenção ao mesmo tempo e a troca de cor confundia a leitura. A tela Planejar, refeita antes, sem caixas, foi a que funcionou melhor.

## Fatores de decisão

- A pessoa precisa achar primeiro a informação mais importante da tela.
- A cor tem de dizer algo (estourou, conquistou), não decorar.
- Um desenho único reduz o custo de criar e manter telas novas.

## Opções consideradas

- Página corrida no desenho do Planejar, aplicada a todas as telas
- Manter os cartões e só padronizar cores e espaçamentos
- Biblioteca visual nova (ex.: efeito de vidro da Apple)

## Decisão

Escolhida: **página corrida**. Cada tela tem um herói (um número grande e neutro com uma frase), seções com título discreto em caixa alta (`SectionTitle`), listas com divisória (`divide-y`) em vez de cartões e uma ação principal em pílula (`rounded-full`).

Regras de cor:
- Vermelho (`text-expense`) só para excesso: limite passado, grupo estourado.
- Verde (`text-positive-ink`) só para conquista: meta alcançada, vitória ([ADR-010](010-vitorias-e-sequencia-no-azul.md)).
- As barras de progresso são neutras (`bg-foreground/45`, `--plan-track`) e só ganham cor quando há excesso ou conquista.
- Os ícones seguem a cor do grupo do plano, não uma cor própria.

### Consequências positivas

- A hierarquia fica clara: o herói, depois as seções, depois os detalhes.
- Telas novas saem rápido, porque reaproveitam o mesmo vocabulário visual.

### Consequências negativas

- Foi preciso refazer quase todas as telas: Home, Semana, Fechamento, Bússola, Categorias, Regras, Pendentes, Cartões, Reservas, A classificar, Recorrentes, Faturas, Configurações, Sincronização, Transferir, Login, Onboarding e Convite.
- Menos cor deixa a tela menos chamativa em capturas de tela de divulgação.
- Nenhuma tela foi validada com usuários. A decisão vem da avaliação do dono do produto.

## Links

- [ADR-014](014-navegacao-flutuante-e-voltar.md), [ADR-015](015-hierarquia-da-home.md), [ADR-016](016-componentes-de-formulario-unicos.md)
