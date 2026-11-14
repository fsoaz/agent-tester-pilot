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
