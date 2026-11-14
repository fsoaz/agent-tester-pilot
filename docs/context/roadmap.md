# Roadmap

## Entrega aprovada para o MVP

1. Documentação inicial.
2. Estrutura e demo de login, painel e formulário.
3. Provedores e geração com validação.
4. Runner com evidências reais.
5. Healer restrito a localizadores.
6. Persistência e relatórios.
7. CLI e aprovações.
8. Dashboard interativa somente leitura.
9. Validação integrada sem custo.

Etapas 1–9 implementadas em 2026-11-14 e verificadas com o simulador. Consulte o [registro de trabalho](../execution/work_log.md) e as [evidências](../execution/test_evidence.md). A revisão documental acrescentou o [índice de navegação](../README.md) e detalhou os contratos do comportamento entregue.

## Próximo ensaio: OpenRouter real

O adaptador está implementado e tem testes de contrato/falhas com transporte controlado. O ensaio real permanece pendente de `OPENROUTER_API_KEY`, `OPENROUTER_MODEL` e uma aplicação acessível sem sessão prévia.

Registrar requisito, modelo retornado, consumo disponível, aprovação, resultado e artefatos, sem expor a chave. Confirmar a compatibilidade do modelo escolhido com a gramática aceita. Não escolher modelo automaticamente nem ativar fallback para o simulador. Esse ensaio usa serviço externo e não faz parte da validação sem custo já concluída.

## Futuro (fora deste MVP)

| Evolução ainda não implementada | Condição ou objetivo |
| --- | --- |
| Isolamento de execução | Definir sandbox de sistema operacional antes de ampliar para usuários ou código não confiável. |
| Gramática e fluxos complexos | Expandir a validação com testes de preservação de ações e assertions. |
| CI/CD | Definir aprovação em processo não interativo e retenção de artefatos. |
| API autenticada | Definir autenticação, autorização, limites e isolamento de dados. |
| Cobertura | Definir a métrica e sua relação com os requisitos gerados. |
| Cypress | Projetar outro runner preservando resultados e aprovações. |
| Sessões externas | Definir gestão de sessão e dados; CAPTCHA e MFA seguem fora do MVP. |
