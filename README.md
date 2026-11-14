# TestPilot

Protótipo local para um seminário: gera um teste, solicita aprovação, executa Chromium com Playwright e propõe reparos de seletores. CLI, dashboard e relatório HTML consultam o mesmo histórico em arquivos. Interface e documentação em português.

O **simulador**, padrão e sem custo de API, fornece código predefinido para a demo e executa testes reais. **OpenRouter** permite geração livre com modelo configurado pelo usuário. O provedor de cada execução aparece nos relatórios; erros do modo real nunca acionam o simulador automaticamente.

## Instalação

Requisitos: Node.js 22 LTS ou superior, npm e bibliotecas do Chromium compatíveis com Playwright.

```bash
npm ci
npx playwright install chromium
npm run build
npm link # opcional: disponibiliza o comando testpilot no PATH
```

Sem `npm link`, use `node dist/cli.js` no lugar de `testpilot` ou `npm run testpilot -- <comando>`. Execute a partir da raiz do projeto. Se faltarem bibliotecas de sistema, consulte a mensagem do Playwright e use `npx playwright install --with-deps chromium` num sistema suportado.

## Comandos

Em terminais separados:

```bash
npm run demo
testpilot dashboard --port 4173
testpilot generate "login" --url http://127.0.0.1:3000
```

A demo fica em `http://127.0.0.1:3000`; a dashboard em `http://127.0.0.1:4173`. Login fictício: **demo@testpilot.local / TestPilot123!**. Cenários do simulador: `login`, `painel` e `formulário`; aliases: `login com sucesso`, `acessar painel`, `enviar formulário`. Cada `generate` cria um cenário independente; `run` preserva sua identidade e cria outra execução no histórico.

```bash
testpilot run generated-tests/<scenarioId>.spec.ts --url http://127.0.0.1:3000
testpilot generate "formulário" --url http://127.0.0.1:3000 --auto-approve
```

A geração apresenta o código antes de salvar e executar. Reparos apresentam o diff antes de executar. Responda `s`/`sim` para aprovar; a resposta padrão rejeita. Em automação, `--auto-approve` é obrigatório e fica registrado. Saídas: **0** passou/recuperou, **1** falhou/erro operacional, **2** cancelamento/rejeição. O comando `run` aceita apenas arquivos aprovados em `generated-tests/`, com hash íntegro; uma edição manual exige gerar e aprovar outro cenário.

## Provedores

O ambiente é lido pelo processo; `.env` não é carregado automaticamente. Para usar um arquivo local, copie `.env.example` para `.env`, preencha e inicie com `node --env-file=.env dist/cli.js …`. Nunca versione credenciais.

```bash
# Simulador (também é o padrão sem esta variável)
export TESTPILOT_PROVIDER=mock

# Provedor real: os dois valores são obrigatórios; não há modelo fixo
export TESTPILOT_PROVIDER=openrouter
export OPENROUTER_API_KEY='<sua-chave>'
export OPENROUTER_MODEL='<identificador-do-modelo-escolhido>'
testpilot generate "<requisito com ações, dados e resultado esperado>" --url https://<sua-aplicacao>
```

O adaptador usa [Chat Completions do OpenRouter](https://openrouter.ai/docs/api/api-reference/chat/create-a-chat-completion). Envia requisito e DOM limitado a 20.000 caracteres, sem scripts, estilos e valores de campos. Captura modelo/consumo quando informados. Autenticação, saldo, timeout ou resposta inválida aparecem no terminal e no histórico. Nenhum ensaio pago é necessário para a validação automatizada.

O código aceito usa um subconjunto restrito de TypeScript: um import `{ test, expect }`, um teste `async ({ page })`, chamadas `await`, navegação relativa, localizadores e ações/assertions autorizadas. A AST bloqueia imports adicionais, execução arbitrária, callbacks auxiliares e operações de sistema. O healer altera apenas localizadores de ações; assertions completas, dados e sequência permanecem imutáveis. Isso não constitui uma sandbox de sistema operacional: este MVP é local, individual e exige revisão por padrão.

## Roteiro da demonstração

1. Execute `npm run demo -- reset` e mantenha `npm run demo` em outro terminal.
2. No modo mock, gere `login`, revise e aprove. Anote o arquivo exibido em `generated-tests/` (também aparece no snapshot).
3. Execute `npm run demo -- selectors`. A página mantém o login funcional e troca seus IDs.
4. Reexecute o mesmo arquivo com `testpilot run … --url http://127.0.0.1:3000`.
5. Veja a falha original, revise o diff e aprove. A tentativa seguinte passa; screenshot, trace e HTML da falha são preservados.
6. Explore status, filtro de provedor, pesquisa, aprovações e tentativas na dashboard.
7. Opcional: `npm run demo -- functional` altera o título esperado. Reexecute: a assertion falha e o healer não intervém. Use `reset` para restaurar tudo.

Cada execução admite uma tentativa original e até três propostas. Propostas inválidas/rejeitadas também são contabilizadas e encerram o ciclo. Assertions, aplicação indisponível e configuração inválida não são reparadas. Playwright usa um worker e zero retries nativos.

## Histórico e compartilhamento

```text
generated-tests/<scenarioId>.spec.ts       # código aprovado atual
generated-tests/<scenarioId>.spec.ts.json  # origem, aprovação e hash
artifacts/<runId>/snapshot.json           # registro da execução
artifacts/<runId>/events.jsonl            # eventos por execução
artifacts/<runId>/generation.ts.txt       # proposta de geração
artifacts/<runId>/proposal-N.ts.txt       # versões de reparo
artifacts/<runId>/attempt-N/              # resultado, logs e evidências
artifacts/<runId>/summary.json
artifacts/<runId>/report.html
```

Para compartilhar o relatório estático, envie **todo o diretório da execução**, preservando os links relativos. Abra o trace com `npx playwright show-trace <caminho-do-trace.zip>`. Evidências podem conter dados da aplicação testada; use apenas dados fictícios na apresentação.

A dashboard é somente leitura e escuta exclusivamente em `127.0.0.1`. Atualiza a cada segundo enquanto houver execução ativa, e a cada cinco segundos em repouso. As contagens usam o resultado mais recente de cada cenário com código gerado; reexecuções e tentativas aparecem separadamente. Erros anteriores à geração e cancelamentos sem código continuam no histórico, sem aumentar os cartões de cenários gerados/passaram/falharam. Não há banco, autenticação, acesso remoto ou publicação. Heartbeat expirado/PID encerrado indica execução interrompida. Evidências ausentes retornam mensagem local de indisponibilidade.

## Validação e documentação

```bash
npm run check
npm test
npm run test:integration
```

A integração sobe sua própria demo numa porta livre, usa Chromium real e diretório temporário isolado, valida CLI/API/dashboard e imprime `VALIDATION_ROOT` com relatórios e screenshots. Não usa a chave OpenRouter.

- Contexto: [produto](docs/context/product.md), [arquitetura](docs/context/architecture.md), [roadmap](docs/context/roadmap.md).
- Padrões: [API](docs/standards/api_rules.md), [convenções](docs/standards/conventions.md), [testes](docs/standards/testing.md).
- Execução: [tarefa atual](docs/execution/current_task.md), [registro](docs/execution/work_log.md), [evidências](docs/execution/test_evidence.md), [revisão](docs/execution/review_notes.md).

Evoluções planejadas: CI/CD, API autenticada, cobertura, Cypress e isolamento de execução. Geração real em URLs externas simples depende de acesso sem sessão prévia, CAPTCHA ou MFA e da resposta de um modelo compatível com a gramática aceita.
