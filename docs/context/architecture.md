# Arquitetura

## Decisão aprovada

TypeScript estrito, Node.js LTS, npm, Commander e Chromium/Playwright. Fluxo: CLI → captura de DOM sanitizado → provedor → validação AST → aprovação → runner → healer → artefatos → relatório/dashboard.

Módulos: `generator` contextualiza; `providers` implementa mock/OpenRouter; `validation` restringe código; `runner` executa em processo Playwright com um worker e zero retries; `healer` compara ASTs; `store` persiste snapshots atômicos e eventos JSONL; `report` deriva contagens e HTML; `dashboard` oferece API somente leitura em 127.0.0.1; `cli` coordena aprovações.

Cada comando `generate` ou `run` cria `artifacts/<runId>/`, mantém versões e tentativas. Um novo `generate` inicia um cenário; `run` recupera seu `scenarioId` ao carregar o arquivo aprovado. `generated-tests/` contém o código aprovado atual e seus metadados/hash. Não há fallback silencioso entre provedores. JSON é a fonte única do CLI, relatórios e dashboard. Um heartbeat e PID permitem identificar execução interrompida.

## Realizado no MVP

Componentes implementados e integrados em 2026-11-14. O runner cria configuração própria por tentativa e troca o import autorizado por uma fixture interna de captura de evidências. O healer normaliza apenas localizadores de ações na AST, preservando assertions inteiras. A dashboard entrega HTML/CSS e cliente TypeScript compilado; não possui endpoints de escrita. A suíte integrada verificou o fluxo com Chromium real; OpenRouter tem testes do contrato, sem chamada paga. Consulte as [evidências](../execution/test_evidence.md).

## Componentes e responsabilidades

| Código | Responsabilidade |
| --- | --- |
| [cli.ts](../../src/cli.ts) e [workflow.ts](../../src/workflow.ts) | Comandos, aprovação, tentativas, propostas e encerramento. |
| [generator.ts](../../src/generator.ts), [dom.ts](../../src/dom.ts) e [providers/](../../src/providers/) | Contexto sanitizado, geração e provedores intercambiáveis. |
| [validation.ts](../../src/validation.ts) e [healer.ts](../../src/healer.ts) | Gramática autorizada e preservação de comportamento. |
| [runner.ts](../../src/runner.ts) e [runner-support/](../../src/runner-support/) | Processo Playwright, captura de evidências e classificação da falha. |
| [store.ts](../../src/store.ts) e [report.ts](../../src/report.ts) | Persistência, contagens, resumo JSON e HTML estático. |
| [server.ts](../../src/dashboard/server.ts) e [client.ts](../../src/dashboard/client.ts) | API local somente leitura e interface da dashboard. |

## Arquivos e consistência

```text
generated-tests/<scenarioId>.spec.ts       código aprovado atual
generated-tests/<scenarioId>.spec.ts.json  hash, origem e aprovação
artifacts/<runId>/snapshot.json           registro completo, versão 1
artifacts/<runId>/events.jsonl            eventos incrementais
artifacts/<runId>/generation.ts.txt       proposta de geração
artifacts/<runId>/proposal-N.ts.txt       proposta de reparo
artifacts/<runId>/attempt-N/              cópias, configuração, logs e evidências
artifacts/<runId>/summary.json            resumo final
artifacts/<runId>/report.html             relatório estático
```

Snapshots, resumos e metadados JSON usam arquivo temporário seguido de rename. As gravações do store são serializadas por instância. Snapshot e JSONL são arquivos separados, sem transação conjunta; código aprovado e metadados também são atualizados separadamente. Hash divergente impede reexecutar código alterado ou uma aprovação incompleta.

## Execução, dashboard e interrupções

`generate` obtém e aprova código novo; `run` verifica localização/hash e reutiliza código aprovado, solicitando revisão de eventuais reparos. O runner usa um worker e zero retries nativos. HTML e screenshot de falha são capturados antes de fechar a página, e o trace é retido pelo Playwright. Evidências podem faltar se o navegador não iniciar ou a página encerrar inesperadamente.

O workflow mantém heartbeat a cada dois segundos. Na leitura de uma execução ativa, processo indisponível ou mais de 15 segundos sem heartbeat resultam em `operational_error`/`error`. Essa interpretação não regrava o snapshot nem recria relatórios da execução interrompida. Não há retomada automática. Reiniciar a dashboard apenas relê os arquivos.

O cliente consulta a API a cada segundo enquanto há execução ativa e a cada cinco segundos em repouso. Filtros e pesquisa são aplicados no cliente. Contratos e regras de contagem estão em [api_rules.md](../standards/api_rules.md).

## Evolução planejada

Isolamento de execução por contêiner antes de uso multiusuário; suporte a fluxos mais complexos mediante expansão explícita da gramática validada.
