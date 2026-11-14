# Convenções

`src/` contém módulos TypeScript estritos; `demo/` a aplicação de demonstração; `tests/` validação automatizada. Funções e variáveis em camelCase, tipos em PascalCase. Interface e documentação em português.

Não versionar `.env`, chaves, testes gerados, evidências nem `node_modules`. Configuração por ambiente; `.env.example` usa valores vazios. Node 22 LTS ou superior; dependências travadas pelo package-lock.

Testes gerados: apenas import nomeado de `test` e `expect` de `@playwright/test`, um teste assíncrono com fixture `page`, sequências de chamadas `await`, navegação relativa, localizadores, ações e assertions autorizados. Sem acesso a sistema, processos, imports dinâmicos, JavaScript avaliado ou código auxiliar arbitrário. Revisão humana é a regra; automação precisa `--auto-approve` explícito. A validação reduz a superfície de execução e não substitui isolamento de sistema operacional.

## Organização e manutenção

| Diretório/arquivo | Convenção |
| --- | --- |
| `src/providers/` | Adaptações externas devem respeitar os tipos de `src/types.ts`; nenhum fallback implícito. |
| `src/runner-support/` | Fixtures/reporter internos, copiados no build com os assets da dashboard. |
| `generated-tests/` | Somente código aprovado atual e metadados; não editar para contornar a aprovação por hash. |
| `artifacts/<runId>/` | Histórico por execução, propostas e tentativas preservados. |
| `docs/context/` | Produto, arquitetura entregue e evolução planejada. |
| `docs/standards/` | Contratos e regras atuais, conferidos contra o código. |
| `docs/execution/` | Trabalho e verificações realmente executados. |

Executar comandos na raiz do repositório: o store usa o diretório de trabalho como base para resultados. Rodar `npm run build` antes de iniciar a dashboard; mesmo pelo CLI em TypeScript, o cliente servido é o JavaScript compilado. Alterações em código-fonte exigem novo build antes de usar `dist/`.

## Gramática aceita para testes

A fonte de verdade é [validation.ts](../../src/validation.ts). Limite atual: 50.000 caracteres, não uma medição em bytes. Há exatamente um import e um `test('nome', async ({ page }) => { … })`, com navegação e ao menos uma assertion.

| Categoria | Formas autorizadas |
| --- | --- |
| Navegação | `await page.goto('/caminho')`, sem URL absoluta, `//` ou barra invertida. |
| Localizadores | `locator`, `getByRole`, `getByLabel`, `getByText`, `getByPlaceholder`, `getByTestId`, `getByTitle`, `getByAltText`, `nth`, `first`, `last`. |
| Ações | `click`, `fill`, `press`, `check`, `uncheck`, `selectOption`, `hover`, `focus`, `clear`. |
| Assertions | `toBeVisible`, `toBeHidden`, `toHaveText`, `toContainText`, `toHaveValue`, `toHaveCount`, `toBeChecked`, `toBeEnabled`, `toBeDisabled`, `toHaveURL`, `toHaveTitle`; `.not` permitido. |

Argumentos devem ser literais suportados: strings, números, booleanos, arrays e objetos de valores literais. Não usar variáveis auxiliares, hooks, loops, callbacks adicionais, regex, aliases de import ou funções avaliadas no navegador. Aceitação sintática não garante que uma chamada ou seletor seja válido para a aplicação: o teste ainda pode falhar no runner.

No healer, a AST deve preservar nome do teste, navegação, ordem, ações, dados e assertions completas, inclusive seus localizadores. Alterar somente comentários/formatação ou não modificar localizador não produz um reparo válido.

## Dados e documentação

A sanitização usada como contexto remove valores de campos, elementos e atributos excluídos e certos padrões textuais; não anonimiza qualquer informação arbitrária. Requisito, URL, código aprovado, logs, screenshot, trace e HTML bruto podem conter dados. Usar dados fictícios na demo e conferir o diretório antes de compartilhá-lo.

Manter Markdown com links relativos entre documentos/código e linhas em branco antes de listas/tabelas. Links absolutos de evidência são exceção local, devem informar sua natureza temporária. Uma revisão documental não deve registrar novamente testes que não foram executados. Consulte o [índice](../README.md).
