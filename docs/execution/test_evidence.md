# Evidências de testes

## Ambiente e resultado final — 2026-11-14

Linux local, Node.js v22.23.1, npm 10.9.8, Playwright 1.65.1, Chromium headless 159.0.8154.6. O instalador usou seu build de compatibilidade Ubuntu 24.04; execução real concluída neste ambiente. No sandbox do agente, Chromium e bind de sockets foram bloqueados; a validação integrada foi executada fora dele com aprovação nativa. Isso foi uma restrição do ambiente de execução do agente, sem alteração no aplicativo para contorná-la.

| Comando | Resultado | Saída |
| --- | --- | --- |
| `npm install` | dependências e lockfile criados | 0 |
| `npx playwright install chromium` | navegador instalado | 0 |
| `npm run build` | TypeScript e assets compilados | 0 |
| `npm run check` | aplicação, demo e testes passaram na checagem estrita | 0 |
| `npm test` | 13 testes unitários passaram, zero falhas | 0 |
| `npm run test:integration` | 12 cenários integrados e teste principal passaram; cerca de 53 s no total | 0 |
| `npm audit` | zero vulnerabilidades em todas as dependências | 0 |
| `git diff --check` | sem erros de whitespace no diff rastreado | 0 |

Primeira geração manual validada com `node dist/cli.js generate login --url http://127.0.0.1:3000 --auto-approve`: código 0, uma tentativa e nenhuma proposta. Relatório em `artifacts/862cf8e8-adf1-4935-9d83-46f8011db3e7/report.html`.

## Integração final e artefatos reais

Diretório isolado emitido pela última execução: `/tmp/testpilot-integration-6ol451`. A suíte não usa credenciais OpenRouter e encerra seus servidores/navegadores. Os caminhos abaixo são locais, temporários e não versionados.

- [Dashboard desktop](/tmp/testpilot-integration-6ol451/dashboard-desktop.png)
- [Dashboard mobile](/tmp/testpilot-integration-6ol451/dashboard-mobile.png)
- [Dashboard vazia](/tmp/testpilot-integration-6ol451/dashboard-empty.png)
- [Relatório de recuperação](/tmp/testpilot-integration-6ol451/artifacts/082a19f3-da48-4f6d-97e4-ba484d21264e/report.html)
- [Snapshot de recuperação](/tmp/testpilot-integration-6ol451/artifacts/082a19f3-da48-4f6d-97e4-ba484d21264e/snapshot.json)
- [Regressão funcional preservada](/tmp/testpilot-integration-6ol451/artifacts/b9d4c0e2-992e-4844-9358-fd0e5dfdbbb8/report.html)
- [Erro de configuração OpenRouter](/tmp/testpilot-integration-6ol451/artifacts/15dd208f-a72f-4c4a-a95b-faf26f03b2e6/summary.json)

O cenário login `a35e94fd-b741-4008-95e7-9b3836673579` passou originalmente. Após troca dos IDs, a reexecução `082a19f3-da48-4f6d-97e4-ba484d21264e` registrou duas tentativas e uma proposta aprovada, terminando `recovered`. A primeira tentativa preservou `failure.png`, `failure.html`, `trace.zip`, `context.html`, logs e resultado estruturado; caminhos completos estão no snapshot. Após regressão funcional, `b9d4c0e2-992e-4844-9358-fd0e5dfdbbb8` terminou `failed`, uma tentativa, zero propostas.

## Cobertura executada

- Geração e execução reais de login, painel e formulário.
- AST: bloqueio de código/imports arbitrários, sintaxe inválida, alterações de ações/dados/assertions e ausência de teste/assertion.
- Simulador: cenários fixos e requisito não suportado.
- Provedor real com transporte controlado: endpoint, modelo, autenticação, consumo, HTTP 401/402/429/503, timeout, JSON inválido e resposta truncada; nenhuma troca para mock.
- Aprovação/rejeição e flag explícita na execução não interativa; limite de três propostas e registro das inválidas/rejeitadas em testes do workflow.
- Códigos CLI reais: sucesso/recuperação 0, regressão/configuração/indisponibilidade 1, ausência de aprovação automática no processo não interativo 2.
- Sanitização do DOM: scripts, estilos, atributos sensíveis, valores de campos, bearer e e-mails removidos, limite de tamanho.
- Persistência: snapshots atômicos, eventos JSONL, hash do arquivo aprovado, snapshots corrompidos ignorados e contagens por cenário.
- Dashboard: dados reais CLI → API → DOM, pesquisa, filtros, detalhes, links de evidência, polling durante aprovação, transição de resultado, reinício, PID interrompido, escape de conteúdo, falha de atualização e estado vazio.
- Segurança local da API: escrita recusada (405), evidência ausente (404), traversal/symlink bloqueados, HTML baixado como anexo.
- Layout desktop/mobile sem overflow horizontal e sem erros JavaScript de página; screenshots inspecionadas visualmente.

## Limitações e próximos ensaios

Não houve chamada real/paga ao OpenRouter. Falta executar um requisito com chave e modelo configurados pelo usuário; o contrato e as falhas foram verificados usando respostas controladas. A validação de código é uma gramática restrita, não uma sandbox de sistema operacional. Os testes de rejeição humana usam o callback de aprovação do workflow; a suíte CLI usa a flag explícita porque seu stdin é não interativo. Funcionalidades futuras de CI/API/Cypress não foram implementadas nem alegadas como verificadas.

Ao repetir, usar o novo caminho `VALIDATION_ROOT` impresso pelo comando. Para compartilhar um relatório, copiar sua pasta inteira, preservando evidências relativas.
