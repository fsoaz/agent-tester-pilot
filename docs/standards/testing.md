# Estratégia de testes

Testes unitários verificam validação AST, preservação de ações/assertions no healer, erros/configuração dos provedores, contagens, sanitização e persistência. Integração sem API paga executa Chromium real contra a demo: sucesso, seletor alterado/recuperação, falha funcional, rejeição e códigos de saída.

Critérios: original + até três propostas; propostas inválidas/rejeitadas registradas; sem retries nativos; relatório e histórico consistentes; arquivos aprovados íntegros; dashboard com filtros, detalhes, atualização, reinício e detecção de interrupção. Reparo apenas para timeout de ação associado a localizador, nunca assertion funcional, indisponibilidade ou configuração.

Comandos: `npm run check`, `npm test`, `npm run test:integration`. Instalar Chromium com `npx playwright install chromium`. Evidências reais, datas e limitações ficam em `docs/execution/test_evidence.md`. OpenRouter será ensaiado separadamente quando houver chave e modelo.

Implementado: 13 testes unitários em `tests/core.test.ts` e 12 cenários integrados dentro do teste principal em `tests/integration.test.ts`. A integração usa diretório temporário isolado, sua própria demo numa porta livre, Chromium real e dashboard com leitura dos resultados produzidos pelo CLI. Imprime `VALIDATION_ROOT` com os artefatos e screenshots. Os testes de aprovação/rejeição e limite usam dependências controladas; geração, reexecução, recuperação, regressão e códigos de saída também são verificados no processo CLI real.
