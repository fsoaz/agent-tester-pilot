# Contratos de API e configuração

## Ambiente

| Variável | Padrão | Uso |
| --- | --- | --- |
| `TESTPILOT_PROVIDER` | `mock` | Aceita somente `mock` ou `openrouter`. |
| `OPENROUTER_API_KEY` | Nenhum | Obrigatória no modo real; enviada como Bearer ao provedor. |
| `OPENROUTER_MODEL` | Nenhum | Obrigatória no modo real; não há modelo fixo. |
| `DEMO_PORT` | `3000` | Porta da aplicação de demonstração. |
| `DEMO_STATE_FILE` | `artifacts/demo-state.json` na raiz do projeto | Arquivo de controle da demo; permite isolamento nos testes. |

O processo lê seu ambiente e não carrega `.env` automaticamente. Para um arquivo local, usar `node --env-file=.env dist/cli.js …` após o build. A porta da dashboard vem de `--port`, com padrão `4173`. URLs testadas devem usar HTTP(S), sem usuário/senha embutidos.

## Provedores

O contrato canônico está em [types.ts](../../src/types.ts): `Provider.request(input)` retorna `Promise<ProviderOutput>`.

| Entrada | Conteúdo |
| --- | --- |
| `operation` | `generate` ou `heal`. |
| `requirement`, `url`, `dom` | Requisito, URL e contexto sanitizado limitado a 20.000 caracteres. |
| `code`, `error` | Código e erro da tentativa, usados no reparo. |

A saída contém `code`, `provider` e, quando disponíveis, `model` e `usage` com valores numéricos. O workflow valida código e restrição de reparo antes de aprovar sua execução.

O mock atende `login`, `painel`, `formulário` e os aliases `login com sucesso`, `acessar painel`, `enviar formulário`. A comparação ignora acentos e caixa. Geração e reparos usam código predefinido para a demo.

OpenRouter usa POST `https://openrouter.ai/api/v1/chat/completions`, JSON com `model`/`messages` e timeout de 45 segundos. Resposta vazia, JSON inválido, erro na resposta ou `finish_reason` informado diferente de `stop` são recusados. O adaptador informa autenticação, saldo, limite, timeout e falhas HTTP; não há troca automática de provedor. Não usa SDK Anthropic.

A chave de configuração não é incluída nos registros pelo adaptador. Requisitos, URLs, código, logs e evidências podem conter dados fornecidos pela aplicação ou pelo usuário; a sanitização de DOM não garante remoção de todos os segredos.

## CLI e resultados

```bash
testpilot generate "<requisito>" --url <url> [--auto-approve]
testpilot run <arquivo-aprovado> --url <url> [--auto-approve]
testpilot dashboard [--port 4173]
```

Sem instalação do binário, substituir `testpilot` por `node dist/cli.js`. A aprovação interativa exige stdin e stdout em TTY. São aceitos `s`, `sim`, `y` ou `yes`; outras respostas rejeitam. Em processo não interativo, `--auto-approve` é obrigatório, inclusive para `run`.

| Código de saída | Resultado |
| --- | --- |
| `0` | `passed` ou `recovered`. |
| `1` | `failed`, erro operacional ou configuração. Erros de parsing/inicialização do CLI também usam `1`. |
| `2` | Cancelamento ou rejeição no workflow, incluindo ausência da flag em processo não interativo. |

## Estados persistidos

`RunRecord.version` é `1`. O `state` descreve a etapa e `outcome`, quando presente, descreve o resultado.

| `state` | Significado |
| --- | --- |
| `generating` | Capturando contexto ou solicitando geração. |
| `awaiting_approval` | Aguardando decisão sobre geração ou reparo. |
| `running` | Executando tentativa. |
| `healing` | Solicitando/validando proposta. |
| `completed` | Encerrado com `passed`, `recovered` ou `failed`. |
| `cancelled` | Encerrado com `cancelled`. |
| `operational_error` | Encerrado, ou interpretado como interrompido na leitura, com `error`. |

Tentativas usam `running|passed|failed` e números de `0` a `3`. Propostas usam `requesting|invalid|rejected|approved|error` e números de `1` a `3`. Aprovações registram tipo, proposta, decisão, horário e se foram automáticas.

## Dashboard somente leitura

Servidor em `127.0.0.1`, sem autenticação, com Host restrito a `127.0.0.1` ou `localhost`. Sem endpoints de geração, aprovação ou reexecução. Respostas usam `Cache-Control: no-store`.

| Endpoint | Resposta |
| --- | --- |
| GET `/api/runs` | `{ runs, counts, active }`, ordenado do registro mais recente ao mais antigo. Omite código no nível da execução, código/logs de tentativas e código/diff de propostas. |
| GET `/api/runs/:id` | Registro completo, incluindo código, aprovações, tentativas e propostas. |
| GET `/api/runs/:id/evidence/<caminho>` | Evidência registrada ou `report.html`, `summary.json`, `events.jsonl`. |

HEAD também é aceito. Outros métodos retornam `405` com `Allow: GET, HEAD`. Host recusado retorna `403`; caminho de evidência detectado como inválido, `400`; rota ou arquivo ausente, `404`; erro de leitura ou snapshot inválido, `500`. Erros JSON têm formato `{ "error": "mensagem" }`.

Arquivos são limitados por lista de evidências e caminhos resolvidos, bloqueando saída do diretório por traversal ou symlinks. HTML e ZIP são baixados como anexos; HTML recebe CSP restritiva. O cliente atualiza a cada segundo quando há execução ativa e a cada cinco segundos em repouso.

## Contagens

Os cartões usam o registro com `createdAt` mais recente de cada `scenarioId`; filtros da lista não alteram os cartões globais.

| Campo | Regra |
| --- | --- |
| `generated` | Cenários cujo registro mais recente contém código. Inclui código gerado e depois rejeitado. |
| `approved` | Cenários com arquivo aprovado ou aprovação de geração registrada no registro mais recente. |
| `passed` | Cenários com código e resultado `passed` ou `recovered`. |
| `failed` | Cenários com código e resultado `failed` ou `error`. |
| `recovered` | Cenários com código e resultado `recovered`; subconjunto de `passed`. |
| `attempts`, `runs` | Total de tentativas de todas as execuções e total de registros, respectivamente. |

Erros anteriores à geração e cancelamentos sem código permanecem no histórico sem aumentar `generated`, `passed` ou `failed`. Cenários ativos/cancelados podem fazer a soma de passaram/falharam ser menor que a quantidade gerada.
