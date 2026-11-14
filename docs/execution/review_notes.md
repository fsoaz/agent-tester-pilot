# Revisão

Decisões confirmadas: mock padrão; OpenRouter configurável sem modelo fixo; aprovação por padrão; healer só troca localizadores; dashboard local e somente leitura; arquivos como persistência; até três propostas por execução.

Checklist verificado:

- [x] Erros reais não viram mock (contrato HTTP/configuração cobertos sem chamada paga).
- [x] Assertions completas, ações, dados e navegação preservados por AST.
- [x] Rejeições e propostas inválidas registradas; limite de três propostas coberto.
- [x] Screenshot e HTML de falha capturados antes de fechar a página; trace retido pelo Playwright.
- [x] HTML/logs/código escapados e caminhos limitados, incluindo symlinks.
- [x] Execuções interrompidas deixam de aparecer ativas via PID/heartbeat.
- [x] Documentação distingue objetivos, entrega e evidências executadas.

Limitações mantidas: não é sandbox de sistema operacional; subconjunto restrito de testes; sem CAPTCHA/MFA. Assertions que falham não são reparadas, mesmo quando o alvo parece ter mudado: o MVP favorece preservar a expectativa funcional. Seletores de ações podem mudar.

O ensaio real OpenRouter depende de credenciais e modelo, ainda não realizado. Sem publicação, banco, autenticação ou acesso remoto. Snapshots interrompidos são interpretados na leitura; não se tenta retomar automaticamente nem executar pelo navegador. Cartões de resultado consideram cenários com código gerado; erros anteriores à geração ficam no histórico. Compartilhar HTML exige enviar a pasta da execução completa para manter os links de evidências.

## Pontos explicitados na revisão documental

| Tema | Comportamento atual e implicação |
| --- | --- |
| Contagens | Último registro por `scenarioId`; `recovered` também conta em `passed`. Não somar esses dois cartões como categorias exclusivas. Filtros afetam a lista, não os totais globais. |
| Código rejeitado | Uma geração válida que recebe rejeição já contém código e pode contar em `generated`, mas não em `approved`. |
| Interrupção | Heartbeat a cada 2 s; ausência por mais de 15 s ou PID indisponível muda o registro retornado pela leitura. O snapshot original e relatórios não são recriados automaticamente. |
| Persistência | Rename torna cada escrita JSON atômica; snapshot/JSONL e código/metadados de aprovação não formam transações entre arquivos. Hash divergente bloqueia `run`. |
| Provedor | Na reexecução, o modo selecionado no ambiente é usado para eventuais reparos. `originProvider` registra a origem carregada dos metadados do arquivo aprovado. |
| Evidências | Screenshot/HTML/trace são esperados para falhas de teste com página disponível, mas podem faltar em falhas de inicialização ou encerramento inesperado. |
| Dados sensíveis | A chave OpenRouter não é copiada para o registro pelo adaptador. Conteúdo de requisito, URL, código e evidências ainda pode conter dados; o DOM sanitizado não garante anonimização completa. |
| Cobertura | 13 unitários e 12 subcenários integrados; o TAP da integração conta também o teste principal. Prompt TTY real e OpenRouter real não foram ensaiados automaticamente. |
| Portabilidade | Links absolutos em `/tmp` e artefatos ignorados pelo Git são evidências locais, não entregáveis persistentes do repositório. |

Na manutenção, conferir contratos em [api_rules.md](../standards/api_rules.md), regras de código em [conventions.md](../standards/conventions.md) e cobertura em [testing.md](../standards/testing.md). A revisão desta documentação não altera o estado dos testes executados anteriormente.
