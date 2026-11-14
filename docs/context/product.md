# Produto

## Problema e público

Testes de interface exigem traduzir requisitos em código e manter localizadores quando a aplicação muda. TestPilot demonstra num seminário o ciclo requisito → código → aprovação humana → Playwright → evidências → proposta de reparo → nova aprovação. Público: estudantes e profissionais interessados em testes assistidos por IA.

## Fluxo entregue

O usuário informa requisito e URL pelo CLI. O sistema captura o DOM inicial sanitizado, obtém código do provedor selecionado e valida sua AST. Após aprovação, salva o teste e executa Chromium real. Falhas elegíveis de localizadores de ações podem gerar propostas com diff e nova aprovação. A dashboard consulta histórico, tentativas e evidências; geração, aprovação e reexecução permanecem no terminal.

| Modo | Capacidade entregue | Situação da validação |
| --- | --- | --- |
| `mock` | Código predefinido para login, painel e formulário da demo; execução real com Playwright, sem custo de API. | Verificado com Chromium real. |
| `openrouter` | Geração por modelo escolhido pelo usuário, sujeita à gramática aceita e revisão humana. | Contrato e falhas testados com transporte controlado; ensaio real pendente. |

## Critérios de sucesso

- Gerar e executar login, painel e formulário da demo sem custo com o simulador.
- Demonstrar seletor alterado e recuperação sem mudar ações ou assertions.
- Preservar falhas funcionais, decisões humanas e histórico após reinícios.
- Consultar resultados e evidências na dashboard local e num relatório compartilhável.

## Limites

Uso local individual; sem banco, publicação, CI, sessões externas, CAPTCHA ou MFA. O simulador tem cenários fixos e informa requisitos não suportados. Geração livre usa OpenRouter com chave e modelo configurados. Testes aceitam um subconjunto deliberadamente restrito de TypeScript/Playwright e passam por revisão humana por padrão.

Os critérios acima foram cobertos pela validação registrada em [test_evidence.md](../execution/test_evidence.md), com distinção entre testes controlados e integração real. As rejeições humanas são exercitadas pelo callback do workflow; a suíte CLI usa aprovação automática explícita por ter stdin não interativo.

O healer altera somente localizadores de ações e preserva assertions completas, inclusive seus alvos. Uma execução admite a tentativa original e até três propostas; rejeição ou proposta inválida encerra o ciclo. A validação AST não substitui isolamento de sistema operacional. Evoluções fora do MVP estão no [roadmap](roadmap.md).
