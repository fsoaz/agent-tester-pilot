# Estratégia de testes

Testes unitários verificam validação AST, preservação de ações/assertions no healer, erros/configuração dos provedores, contagens e persistência. Integração sem API paga verifica sanitização do DOM e executa Chromium real contra a demo: sucesso, seletor alterado/recuperação, falha funcional, rejeição via workflow e códigos de saída.

Critérios: original + até três propostas; propostas inválidas/rejeitadas registradas; sem retries nativos; relatório e histórico consistentes; arquivos aprovados íntegros; dashboard com filtros, detalhes, atualização, reinício e detecção de interrupção. Reparo apenas para timeout de ação associado a localizador, nunca assertion funcional, indisponibilidade ou configuração.

Comandos: `npm run check`, `npm test`, `npm run test:integration`. Instalar Chromium com `npx playwright install chromium`. Evidências reais, datas e limitações ficam em `docs/execution/test_evidence.md`. OpenRouter será ensaiado separadamente quando houver chave e modelo.

Implementado: 13 testes unitários em `tests/core.test.ts` e 12 cenários integrados dentro do teste principal em `tests/integration.test.ts`. A integração usa diretório temporário isolado, sua própria demo numa porta livre, Chromium real e dashboard com leitura dos resultados produzidos pelo CLI. Imprime `VALIDATION_ROOT` com os artefatos e screenshots. Os testes de aprovação/rejeição e limite usam dependências controladas; geração, reexecução, recuperação, regressão e códigos de saída também são verificados no processo CLI real.

## Reprodução automatizada

Na raiz do repositório:

```bash
npm ci
npx playwright install chromium
npm run check
npm test
npm run test:integration
```

`test:integration` executa o build antes da suíte. Precisa poder iniciar Chromium, subprocessos e servidores loopback. Não exige uma demo já em execução nem chave OpenRouter. O teste principal possui limite de 180 segundos; o tempo registrado de aproximadamente 53 segundos é uma observação do ambiente validado, não um compromisso de desempenho.

No relatório TAP da integração, o total de 13 testes inclui o teste principal e seus 12 subtestes. Não interpretar como 13 cenários integrados independentes. Não é preciso repetir a suíte de navegador por uma alteração exclusivamente documental; conferir links e consistência com a implementação.

## Camadas e limites da cobertura

| Comportamento | Verificação existente |
| --- | --- |
| Código permitido e preservação de comportamento | Unitários da AST/healer. |
| Provedor real, timeout e falhas de resposta | Unitários com transporte controlado; sem chamada paga. |
| Três propostas, proposta inválida e rejeitada | Testes do workflow com execução/provedor controlados. |
| Login, painel, formulário e recuperação | CLI em subprocesso e Chromium real. |
| Regressão funcional e aplicação indisponível | Runner real; assert de ausência de propostas. |
| Aprovação pendente e rejeição na dashboard | Workflow com callback controlado e navegador real. |
| Filtros, pesquisa, detalhes, reinício e interrupção | API local e navegador, com PID indisponível simulado. |
| DOM sanitizado, paths, escape e estados de erro | Casos integrados e testes unitários correspondentes. |

O prompt real de aprovação no TTY não é automatizado pela suíte. A detecção por heartbeat expirado tem teste unitário; a integração exercita interrupção por PID indisponível, sem matar uma execução de usuário. Os próximos ensaios estão no [roadmap](../context/roadmap.md).

## Roteiro manual do seminário

1. Execute `npm run build` e `npm run demo -- reset`; inicie `npm run demo` e `npm run dashboard` em terminais separados.
2. Execute `npm run testpilot -- generate "login" --url http://127.0.0.1:3000`, revise e aprove com `s`. Anote o caminho do arquivo aprovado exibido ao final.
3. Execute `npm run demo -- selectors`; depois `npm run testpilot -- run generated-tests/<scenarioId>.spec.ts --url http://127.0.0.1:3000`.
4. Confira a falha original e seu diff; aprove o reparo e veja o resultado `recovered`, com duas tentativas e uma proposta.
5. Execute `npm run demo -- functional` e reexecute o arquivo. A assertion deve falhar, sem entrar no healer.
6. Explore filtros/detalhes e reinicie a dashboard: o histórico deve permanecer. Use `npm run demo -- reset` ao terminar.

`selectors` e `functional` alternam seus respectivos estados; `reset` restaura ambos. Para verificar rejeição manual, repita a geração ou um reparo elegível e responda `n`; o workflow deve retornar `2` e registrar a decisão. A flag `--auto-approve` permite automação, mas não serve para demonstrar revisão humana.

## Registro de novas evidências

Acrescentar em [test_evidence.md](../execution/test_evidence.md) data, ambiente, comando, código de saída, número de casos, `VALIDATION_ROOT`, resultado e limitações. Não substituir uma execução histórica por resultados presumidos. Para compartilhar o relatório HTML, copiar a pasta inteira da execução para conservar os links relativos e abrir traces com `npx playwright show-trace <trace.zip>`.
