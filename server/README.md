# Servidor – Torre de Controle

API Python (FastAPI) com MongoDB.

## Segurança

- **Variáveis de ambiente**: URI do MongoDB e `SECRET_KEY` em `.env` (nunca no código).
- **Senhas**: armazenadas apenas em hash (bcrypt).
- **JWT**: login retorna token; use no header `Authorization: Bearer <token>` em rotas protegidas.
- **CORS**: apenas origens listadas em `CORS_ORIGINS`.
- **Headers**: `X-Content-Type-Options`, `X-Frame-Options`, `X-XSS-Protection`, `Referrer-Policy`.
- **Rate limiting**: login 10/min, criar-conta 5/min (SlowAPI).
- **Validação**: Pydantic em todos os payloads.

## Pré-requisitos

- Python 3.11+
- MongoDB em execução (local ou URI em `.env`)

## Instalação

```bash
cd server
python -m venv .venv
.venv\Scripts\activate   # Windows
# source .venv/bin/activate   # Linux/macOS
pip install -r requirements.txt
cp .env.example .env
# Editar .env: MONGO_URI, SECRET_KEY, CORS_ORIGINS
```

## Executar

```bash
python main.py
# ou
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

API: `http://localhost:8000`  
Docs: `http://localhost:8000/docs`

## Endpoints

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/health` | Health check + status MongoDB |
| POST | `/api/auth/login` | Login (nome, senha) → JWT |
| POST | `/api/auth/criar-conta` | Criar conta (nome, nome_base, senha) |

## Exemplo de uso

**Criar conta:**
```json
POST /api/auth/criar-conta
{ "nome": "João", "nome_base": "Minha Base", "senha": "senha123" }
```

**Login:**
```json
POST /api/auth/login
{ "nome": "João", "senha": "senha123" }
→ { "access_token": "...", "token_type": "bearer" }
```
