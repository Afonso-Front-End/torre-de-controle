Resumo do que fazer em seguida
Criar o ficheiro
Gravar o bloco acima em docs/MELHORIAS-E-SEGURANCA.md (por exemplo via Agent mode).
Implementar melhorias de segurança (exemplos)
Backend:
Limite de tamanho para uploads (e opcionalmente para o body global).
Validação de tamanho/Content-Length antes de processar o Excel.
Manter e documentar a obrigação de SECRET_KEY forte em produção.
Configuração:
Adicionar .env (e variantes) ao .gitignore na raiz.
Frontend (opcional):
Trocar persistência do token de localStorage para sessionStorage no contexto de autenticação.
Servidor (opcional):
Adicionar header Content-Security-Policy e limite de tamanho do body no FastAPI.