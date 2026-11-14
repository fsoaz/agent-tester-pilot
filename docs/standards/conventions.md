# Convenções

`src/` contém módulos TypeScript estritos; `demo/` a aplicação de demonstração; `tests/` validação automatizada. Funções e variáveis em camelCase, tipos em PascalCase. Interface e documentação em português.

Não versionar `.env`, chaves, testes gerados, evidências nem `node_modules`. Configuração por ambiente; `.env.example` usa valores vazios. Node 22 LTS ou superior; dependências travadas pelo package-lock.

Testes gerados: apenas import nomeado de `test` e `expect` de `@playwright/test`, um teste assíncrono com fixture `page`, sequências de chamadas `await`, navegação relativa, localizadores, ações e assertions autorizados. Sem acesso a sistema, processos, imports dinâmicos, JavaScript avaliado ou código auxiliar arbitrário. Revisão humana é a regra; automação precisa `--auto-approve` explícito. A validação reduz a superfície de execução e não substitui isolamento de sistema operacional.
