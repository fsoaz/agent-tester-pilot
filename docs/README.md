# Documentação do TestPilot

Atualizada em 2026-11-14 para refletir o MVP implementado. A documentação permanece em português; resultados executados ficam separados das decisões e evoluções planejadas.

| Documento | Conteúdo |
| --- | --- |
| [Produto](context/product.md) | Problema, público, fluxo entregue, critérios de aceite e limites. |
| [Arquitetura](context/architecture.md) | Módulos, execução, arquivos, identidade dos cenários e interrupções. |
| [Roadmap](context/roadmap.md) | Entrega concluída, ensaio OpenRouter pendente e evoluções futuras. |
| [Contratos de API](standards/api_rules.md) | Provedores, configuração, CLI, estados e endpoints somente leitura. |
| [Convenções](standards/conventions.md) | Organização, gramática dos testes, aprovações e dados gerados. |
| [Estratégia de testes](standards/testing.md) | Comandos, cobertura, critérios de aceite e roteiro manual. |
| [Tarefa atual](execution/current_task.md) | Situação da entrega e da revisão documental. |
| [Registro de trabalho](execution/work_log.md) | Histórico do que foi realizado. |
| [Evidências de testes](execution/test_evidence.md) | Resultados executados, artefatos locais e limites da verificação. |
| [Notas de revisão](execution/review_notes.md) | Decisões, cuidados para manutenção e limitações conhecidas. |

## Começar a usar

Consulte o [README do projeto](../README.md) para instalação e configuração. Com dependências, Chromium e build disponíveis, execute na raiz do repositório, em terminais separados:

```bash
npm run demo
npm run dashboard
npm run testpilot -- generate "login" --url http://127.0.0.1:3000
```

A demo usa `http://127.0.0.1:3000` e a dashboard `http://127.0.0.1:4173`. O último comando apresenta o código e espera aprovação humana. Em processo não interativo, acrescentar `--auto-approve` explicitamente.

## Situação da entrega

O MVP e a validação sem custo estão concluídos. A execução real com OpenRouter depende de chave e modelo configurados; os testes existentes verificam seu contrato com transporte controlado. CI/CD, API autenticada, cobertura e Cypress continuam no roadmap.

Resultados em `execution/test_evidence.md` referem-se às execuções registradas, não a uma nova execução a cada alteração documental. Artefatos em `/tmp` e `artifacts/` não são versionados e podem estar ausentes em outra máquina. As instruções de reprodução ficam em [testing.md](standards/testing.md).
