# Contratos de API

Provedores recebem operação (`generate`/`heal`), requisito, URL, DOM sanitizado e, no reparo, código e erro. Retornam código TypeScript, identificação do provedor/modelo e consumo disponível. O mock só cobre `login`, `painel` e `formulário` da demo. OpenRouter usa POST `https://openrouter.ai/api/v1/chat/completions` com Bearer e modelo vindo do ambiente. Sem SDK Anthropic nem modelo fixo.

`TESTPILOT_PROVIDER=mock|openrouter`, padrão mock. Modo real exige `OPENROUTER_API_KEY` e `OPENROUTER_MODEL`; timeout, autenticação, saldo e resposta inválida são erros operacionais, sem fallback. Segredos não entram nos snapshots.

Dashboard em `127.0.0.1`: GET `/api/runs`, GET `/api/runs/:id`, GET `/api/runs/:id/evidence/<caminho>`. GET/HEAD apenas; mutações retornam 405, caminho inválido 400, ausente 404, falha interna 500. Artefatos não escapam do diretório por traversal ou symlinks. HTML de evidência baixa como anexo. Polling de um segundo durante execução ativa. Nada gera, aprova ou reexecuta pelo navegador.

`/api/runs` retorna `{ runs, counts, active }`; a listagem omite código e logs completos para limitar o payload. Detalhes incluem o registro completo. Propostas guardam código, diff, status, erro e metadados. `counts` usa o último resultado por `scenarioId`, separando número de execuções/tentativas; erros antes de gerar código ficam no histórico sem entrar nos cartões de cenários gerados/passaram/falharam. Host HTTP deve ser `localhost` ou `127.0.0.1`.
