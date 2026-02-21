# Melhorias e segurança

Este documento descreve as medidas de segurança implementadas e o que manter em dia.

---

## Implementado

### 1. Configuração

- **`.env` no `.gitignore`** – Ficheiros `.env`, `.env.local` e `.env.*.local` não são versionados.
- **`server/.env.example`** – Modelo com todas as variáveis; copiar para `.env` e preencher. **SECRET_KEY** deve ser forte (ex.: `openssl rand -hex 32`).

### 2. Backend

- **Limite de upload** – Variável `MAX_UPLOAD_MB` (default 25 MB). Rejeição por:
  - **Middleware:** requisições com `Content-Length` acima do limite devolvem 413.
  - **Rotas de upload:** leitura do ficheiro com `read_upload_with_limit()` em `server/upload_limits.py`; ficheiros maiores que o limite devolvem 413.
- **Servidor por defeito em 127.0.0.1** – Em `server/config.py`, `host` default é `127.0.0.1` (apenas local). O launcher em `build/launcher.py` também define `HOST=127.0.0.1`.

### 3. Frontend

- **Token em `sessionStorage`** – O contexto de autenticação (`frontend/src/context/AppContext.jsx`) guarda o utilizador/token em `sessionStorage`. A sessão termina ao fechar o browser.

### 4. Headers de segurança

- **X-Content-Type-Options:** nosniff  
- **X-Frame-Options:** DENY  
- **X-XSS-Protection:** 1; mode=block  
- **Referrer-Policy:** strict-origin-when-cross-origin  
- **Content-Security-Policy** – Política restritiva (default-src 'self'; script/style/img/connect limitados).

Aplicados em `server/main.py` e em `build/launcher.py`.

---

## O que manter

| Item | Ação |
|------|------|
| **SECRET_KEY** | Nunca commitar; usar valor forte e único por ambiente. |
| **.env** | Não remover do `.gitignore`; criar sempre a partir de `.env.example`. |
| **Dependências** | Correr `npm audit` / revisar `requirements.txt` com periodicidade. |
| **Senhas no backend** | Manter hash forte (ex.: bcrypt/argon2); nunca em claro. |

---

## Resumo rápido

| Área     | Estado |
|----------|--------|
| Config   | `.env` no `.gitignore`; `.env.example` no server |
| Backend  | Limite de upload (middleware + leitura limitada); host 127.0.0.1 por defeito |
| Frontend | Token em `sessionStorage` |
| Servidor | CSP + limite de body + headers de segurança |
