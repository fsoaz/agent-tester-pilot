# Produto

## Plano aprovado
TestPilot demonstra num seminário o ciclo requisito → código → aprovação humana → Playwright → evidências → proposta de reparo → nova aprovação. Público: estudantes e profissionais interessados em testes assistidos por IA.

## Critérios de sucesso
- Gerar e executar login, painel e formulário da demo sem custo com o simulador.
- Demonstrar seletor alterado e recuperação sem mudar ações ou assertions.
- Preservar falhas funcionais, decisões humanas e histórico após reinícios.
- Consultar resultados e evidências na dashboard local e num relatório compartilhável.

## Limites
Uso local individual; sem banco, publicação, CI, sessões externas, CAPTCHA ou MFA. O simulador tem cenários fixos e informa requisitos não suportados. Geração livre usa OpenRouter com chave e modelo configurados. Testes aceitam um subconjunto deliberadamente restrito de TypeScript/Playwright e passam por revisão humana por padrão.

O estado realizado e evidências ficam em `execution/`; este documento registra objetivos, não prova execução.
