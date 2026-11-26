# ADR-035: Checagem de débito técnico em toda mudança

- **Data**: 2026-11-26
- **Status**: Aceito
- **Decisores**: Guilherme Ramos Nepomuceno
- **Tags**: front, qualidade, CI, manutenção
- **Repositórios**: Dominio

## Contexto e problema

Cada redesenho deixava sobras. Uma revisão em 26/11/2026 encontrou:

- telas e componentes que nada abria nem importava: `/onboarding` (só redirecionava), `CategorySelector`, `PlanTower`, `LockedList`, `ThemeProvider`, `useIsMobile`;
- funções de API e hooks de leitura que nenhuma tela chamava: `deleteTransaction`, `getAccountBalance`, sete hooks de `hooks/queries.ts`, dois endpoints de estatística da família, `toggleTheme` (duplicado do `useTheme`);
- regras em `lib/` que só os testes usavam (`barSegments`, `wishFitState`, `paceMessage`, `adherenceTone`...). Os testes passavam e davam a impressão de que a regra estava em uso;
- uma dependência sem uso (`next-themes`), uma usada sem estar no `package.json` (`sharp`, que só vinha por tabela do Next) e 22 avisos de variável ou import sem uso;
- README e documentação de módulo descrevendo o app de antes, com persistência local, porta 3000 e 13 módulos.

O CI checava tipos, testes, build e E2E. Nada disso falha por código morto: um arquivo que ninguém importa compila, e uma função testada mas sem uso passa nos testes. A limpeza dependia de alguém lembrar, e o lint deixava os avisos acumularem sem limite.

## Opções consideradas

1. **Checklist no PR** ("removi o que ficou sem uso?"): não custa nada, mas depende de memória e não pega o que a pessoa não viu.
2. **Script próprio que busca pelo nome**: foi a primeira versão. Funcionou, mas um export com o mesmo nome de algo em outro arquivo, ou citado num comentário, passava como usado. O knip achou seis desses casos que o script tinha deixado passar.
3. **knip**: resolve os imports como o TypeScript (alias `@/`, re-export, `import * as`), conhece o Next e os testes, acha dependências sem uso e também as que faltam no `package.json`, e corrige sozinho com `--fix`. Não cobre o teto do lint nem os marcadores de pendência.

## Decisão

**knip para o que é sem uso, e um script curto para o resto.** Tudo roda com `npm run check:debt`, no CI (job "Tipos, testes de regra e débito técnico") e localmente:

```
knip && knip --production --exports && node scripts/check-debt.mjs
```

Uma mudança só entra se não deixar débito novo.

### O que falha

| Regra | Quem checa |
| --- | --- |
| Arquivo que ninguém importa | `knip` |
| Export ou tipo sem uso | `knip` |
| Export que só os testes usam | `knip --production --exports` (sem os testes, ele fica sem uso) |
| Dependência sem uso, ou usada sem estar no `package.json` | `knip` |
| Aviso de lint acima do teto, ou abaixo sem baixar o teto | `scripts/check-debt.mjs` |
| Erro de lint | `scripts/check-debt.mjs` |
| `TODO`, `FIXME`, `HACK` ou `XXX` no código | `scripts/check-debt.mjs` |

Um export usado só dentro do próprio arquivo passa (`ignoreExportsUsedInFile`): o código está vivo, o export é que sobra.

Uma regra que só os testes usam sai junto com o teste. Se a tela vier depois, a regra volta com ela, e o git guarda a versão antiga.

### Teto do lint

Cada regra tem um teto em `scripts/debt-baseline.json`. Passar do teto falha. Ficar abaixo também falha, com o pedido de baixar o teto no mesmo commit. Assim o número só desce. Regra fora da lista tem teto zero.

| Regra | Teto inicial | Por quê |
| --- | --- | --- |
| `react-hooks/set-state-in-effect` | 38 | Hooks MVVM que carregam em efeito, já marcados como dívida no `eslint.config.mjs`. Descem conforme as telas passam para o cache (ADR-034) |
| `react-hooks/exhaustive-deps` | 3 | Corrigir muda quando o efeito roda; cada caso precisa de teste próprio |
| `@next/next/no-img-element` | 1 | Foto do perfil vinda de URL externa |
| `@next/next/no-location-assign-relative-destination` | 1 | `lib/api.ts` manda para `/login` quando a sessão expira. O recarregamento completo é de propósito: limpa da memória o cache com os dados da sessão que acabou, e ali, fora de componente, não há `useRouter` |

### Exceções

Toda exceção fica escrita com o motivo, no mesmo PR que a cria:

- **Export mantido de propósito**: tag JSDoc `@public` no próprio símbolo, com o motivo. Hoje só `BRAND_CALL`, a fonte do texto que a API repete (ADR-030).
- **Kit shadcn** (`components/ui`): em `knip.jsonc`, os exports desses arquivos não são cobrados. As peças de cada componente vêm juntas, mas o arquivo em si precisa estar em uso.
- **Entradas sem import**: `scripts/*.mjs`, rodados à mão, e `public/sw.js`, que o navegador carrega por URL.

### Além da checagem

Nem o knip nem o script leem documentação. Quem muda uma tela também atualiza o README dela e o `README.md` da raiz, quando a rota, o nome ou o papel da tela mudam.

## Consequências

### Positivas

- Remover uma tela ou trocar uma função obriga a tirar o que ficou para trás no mesmo PR, enquanto o contexto ainda está fresco.
- O lint deixa de acumular aviso: cada correção baixa o teto, e o teto não volta a subir.
- Teste verde volta a significar regra em uso.
- `knip --fix` remove sozinho exports e dependências sem uso quando a lista for grande.
- A checagem toda leva cerca de 40 segundos.

### Negativas

- **Uma dependência de desenvolvimento a mais** (`knip`), que precisa acompanhar as versões do Next e do TypeScript.
- **Import dinâmico por string montada** não é visto. O projeto não usa esse padrão hoje.
- **Mudança pequena pode exigir limpeza alheia**: se o lint melhorar sem querer, o PR precisa baixar o teto.
- **Funcionalidade adiada some do código.** Exemplo: `deleteTransaction` saiu porque nenhuma tela usa a exclusão definitiva. A Bússola desfaz uma transação com `cancelTransaction`. Se a exclusão definitiva for necessária, a função volta com a tela que a usa.
