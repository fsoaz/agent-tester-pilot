# Arquitetura

## Decisão aprovada
TypeScript estrito, Node.js LTS, npm, Commander e Chromium/Playwright. Fluxo: CLI → captura de DOM sanitizado → provedor → validação AST → aprovação → runner → healer → artefatos → relatório/dashboard.

Módulos: `generator` contextualiza; `providers` implementa mock/OpenRouter; `validation` restringe código; `runner` executa em processo Playwright com um worker e zero retries; `healer` compara ASTs; `store` persiste snapshots atômicos e eventos JSONL; `report` deriva contagens e HTML; `dashboard` oferece API somente leitura em 127.0.0.1; `cli` coordena aprovações.

Cada comando cria `artifacts/<runId>/`, mantém versões e tentativas. Cenários têm identidade estável nas reexecuções. `generated-tests/` contém apenas arquivos aprovados com metadados/hash. Não há fallback silencioso entre provedores. JSON é a fonte única do CLI, relatórios e dashboard. Um heartbeat e PID permitem identificar execução interrompida.

## Realizado no MVP
Componentes implementados e integrados em 2026-11-14. O runner cria configuração isolada por tentativa e troca o import autorizado por uma fixture interna de captura de evidências. O healer normaliza apenas localizadores de ações na AST, preservando assertions inteiras. A dashboard entrega HTML/CSS e cliente TypeScript compilado; não possui endpoints de escrita. A suíte integrada verificou o fluxo com Chromium real; OpenRouter tem testes do contrato, sem chamada paga. Evidências em `../execution/test_evidence.md`.

## Evolução planejada
Isolamento de execução por contêiner antes de uso multiusuário; suporte a fluxos mais complexos mediante expansão explícita da gramática validada.
