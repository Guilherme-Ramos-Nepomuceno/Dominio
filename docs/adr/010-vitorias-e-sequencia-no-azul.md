# ADR-010: Vitórias e sequência no azul como recompensa, sem punição visual

- **Data**: 2026-11-02
- **Status**: Aceito
- **Decisores**: Guilherme Ramos Nepomuceno
- **Tags**: produto, retenção, cálculo

## Contexto e problema

Minha semana e Planejar mês só falavam de limite, de quanto faltava e de estouro. Avisavam quando algo dava errado, mas nunca mostravam o que tinha dado certo. Sem recompensa, o ciclo gatilho → ação → recompensa (ADR-008) fica sem a última etapa, e o app vira uma cobrança.

## Opções consideradas

- Vitórias calculadas a partir de dados reais, com limiares explícitos
- Gamificação com pontos, níveis ou ranking (fora de escopo no PRD)
- Apenas mensagens motivacionais genéricas

## Decisão

- **Vitórias** puras e determinísticas (`dominio-api/src/utils/wins.ts` e `lib/wins.ts`, com testes). Cada vitória vem de um dado real com limiar explícito. Exemplos:
  - semana passada no azul;
  - sequência de semanas;
  - dias dentro do ideal;
  - categoria com economia (mínimo de R$ 20 e 15%);
  - desejo realizado;
  - mês organizado.
- No máximo 3 por tela (`MAX_WINS_PER_SCOPE`), escolhidas por prioridade (`WIN_PRIORITY`). Sem dado, não há vitória, e a tela mostra um incentivo neutro.
- **Sequência no azul:** conta semanas seguidas dentro do limite. Estourar zera a sequência, mas sem destaque negativo.
- Os dados vêm de `GET /plans/:ano/:mes/wins`, e a "semana passada" vem com `hasPlan`.
- No visual, verde (`text-positive-ink`) é reservado às vitórias (ADR-013).

### Consequências positivas

- A pessoa vê que fez algo certo, e não só onde errou.
- Como cada vitória é verificável, não vira um elogio vazio.

### Consequências negativas

- A regra existe nos dois lados (API e `lib/`), e as duas versões precisam ser mantidas em sincronia.
- Os limiares foram escolhidos por julgamento e ainda não foram validados com dados de uso.

## Links

- [ADR-008 (dominio-api)](../../../dominio-api/docs/adr/008-rituais-pwa-e-web-push.md), [ADR-013](013-pagina-corrida-sem-cartoes.md), [ADR-015](015-hierarquia-da-home.md)
