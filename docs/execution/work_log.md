# Registro de trabalho

- 2026-11-14: plano aprovado lido. Repositório inicialmente com README provisório e dez documentos vazios. Documentação inicial preenchida antes da implementação. Escopo local; nenhuma publicação ou chamada paga autorizada/necessária para os testes do simulador.

- 2026-11-14: implementados módulos TypeScript estritos `generator`, `providers`, `validation`, `runner`, `healer`, `store`, `report`, `workflow`, `cli` e `dashboard`. Criada demo com login, painel e formulário, comandos de troca de seletores e regressão funcional.
- 2026-11-14: integração OpenRouter implementada diretamente por HTTP conforme plano, sem modelo fixo, SDK Anthropic ou fallback. O teste do contrato usa transporte simulado e não consome API paga.
- 2026-11-14: runner executado com Chromium real, um worker e zero retries. Evidências capturadas por fixture antes de encerrar a página; versões, propostas e aprovações preservadas. Arquivos aprovados são verificados por hash.
- 2026-11-14: durante os testes, identificada possibilidade de alterar texto esperado por um localizador dentro de `expect`. Corrigido: assertions completas, incluindo seu alvo, são imutáveis no healer. Corrigidos também concorrência de heartbeat/snapshot, contagens por cenário e carregamento do cliente da dashboard ao iniciar pelo código-fonte.
- 2026-11-14: concluídos testes unitários e integração CLI → Chromium → arquivos → API → navegador. Verificados recuperação, falha funcional preservada, rejeição, limite, segurança de caminhos, polling, reinício e estados de erro. Screenshots desktop/mobile inspecionadas. Detalhes reproduzíveis em [test_evidence.md](test_evidence.md).
- 2026-11-14: README substituído por instalação, configuração, comandos, roteiro do seminário e limites. Serviços temporários da validação encerrados; nenhum site publicado.
