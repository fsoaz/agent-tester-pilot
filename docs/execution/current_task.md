# Tarefa atual

Atualizado em 2026-11-14. O MVP local aprovado está implementado e a validação sem custo está concluída. A tarefa desta revisão é sincronizar `docs/` com o código e as evidências já registradas.

## Entrega de referência

Objetivo aprovado: estruturar o MVP local e sua demo, implementar os dois provedores e a dashboard com histórico persistido.

Entregue em 2026-11-14:

- [x] Demo e estrutura.
- [x] Provedores, DOM e validação AST.
- [x] Runner Chromium real e healer restrito a localizadores de ações.
- [x] Persistência atômica, relatórios e CLI com aprovações.
- [x] Dashboard local com filtros, histórico, detalhes e polling.
- [x] Verificação integrada sem custo e documentação de uso.

Dependências: Node LTS, npm, Chromium e bibliotecas do sistema necessárias ao Playwright. Chave/modelo OpenRouter só para o ensaio real.

Pendente externo ao aceite sem custo: ensaio com uma chave e um modelo reais do OpenRouter. Contrato HTTP e falhas do adaptador foram testados com transporte simulado. Consulte [evidências](test_evidence.md).

## Revisão documental

- [x] Criar [índice de navegação](../README.md) e conferir referências de produto/arquitetura.
- [x] Documentar provedores, ambiente, comandos, estados e códigos de saída.
- [x] Explicitar contagens por cenário e a inclusão de recuperados em passaram.
- [x] Documentar gramática aceita, aprovação por hash e limites do healer.
- [x] Explicar heartbeat, interrupção interpretada na leitura e artefatos temporários.
- [x] Separar resultados históricos de verificações feitas nesta revisão.
- [x] Conferir links locais e whitespace do conteúdo alterado.

Escopo desta revisão: somente `docs/`, sem mudanças de implementação, publicação ou chamada paga. A suíte da aplicação não é reexecutada por esta alteração documental. Registro em [work_log.md](work_log.md).
