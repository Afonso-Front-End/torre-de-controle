# Torre de Controle

Aplicação web (React + FastAPI + MongoDB) para gestão de pedidos, SLA e lista de telefones. Projeto pensado para **rodar localmente** em cada máquina (sem Docker). Quem recebe o projeto (por clone ou download do GitHub) instala as dependências e executa o servidor e o frontend no próprio PC.

---

## Requisitos

- **Node.js** (para o frontend — desenvolvimento e build)
- **Python 3.x** (para o servidor API)
- **MongoDB** (instalado e a correr localmente, ex.: porta 27017)

---

## Como rodar (desenvolvimento)

1. **MongoDB** deve estar em execução (ex.: `mongodb://localhost:27017`).

2. **Servidor (API)** — na pasta `server/`:
   - Crie um ficheiro `.env` com as variáveis necessárias (veja `server/.env.example` ou a secção [Configuração](#configuração)).
   - Instale dependências e inicie:
   ```bash
   cd server
   pip install -r requirements.txt
   python main.py
   ```
   Por defeito a API fica em **http://localhost:8000** (ou na porta definida em `PORT` no `.env`).

3. **Frontend** — na pasta `frontend/`:
   - Crie um `.env` com `VITE_API_URL` apontando para a API (ex.: `http://localhost:8000` ou `http://localhost:8001` se o servidor usar outra porta).
   - Instale dependências e inicie:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
   A aplicação abre em **http://localhost:5173** e comunica com a API configurada em `VITE_API_URL`.

---

## Como rodar (app servido pelo próprio backend)

É possível construir o frontend e ser o **próprio servidor** a servir os ficheiros estáticos na porta 8000. Nesse caso o utilizador abre apenas **http://localhost:8000** no browser. A pasta `build/` pode conter scripts para gerar o executável (ex.: `TorreDeControle.exe`) que inicia o servidor e abre a aplicação — consulte a pasta `build/` e a documentação em `docs/ATUALIZACOES-GITHUB.md` para publicar releases.

---

## Configuração

| Ficheiro        | Variáveis principais |
|-----------------|----------------------|
| `server/.env`   | `MONGO_URI`, `MONGO_DB_NAME`, `SECRET_KEY`, `PORT`, `CORS_ORIGINS`, `GITHUB_REPO_OWNER`, `GITHUB_REPO_NAME` (para aviso de atualização) |
| `frontend/.env` | `VITE_API_URL` (URL da API, ex.: `http://localhost:8000`) |

O `server/.env` **não** deve ser commitado (está no `.gitignore`). Copie `server/.env.example` para `server/.env` e preencha; use uma **SECRET_KEY** forte (ex.: `openssl rand -hex 32`). Pode configurar `MAX_UPLOAD_MB` (limite de tamanho de uploads, default 25) e `HOST=127.0.0.1` para uso apenas local.

---

## Segurança

O projeto inclui limite de tamanho de uploads, validação antes de processar ficheiros Excel, token de sessão no frontend (`sessionStorage`), servidor por defeito em `127.0.0.1` e headers de segurança (CSP, X-Frame-Options, etc.). Detalhes em **`docs/MELHORIAS-E-SEGURANCA.md`**.

---

## Estrutura do projeto

| Componente    | Pasta      | Descrição |
|---------------|------------|-----------|
| Frontend      | `frontend/`| React + Vite; versão em `frontend/package.json` |
| Backend API   | `server/`  | FastAPI + MongoDB |
| Documentação  | `docs/`    | Instruções de releases, atualizações via GitHub, etc. |
| Build / .exe  | `build/`   | Scripts para gerar o executável (se aplicável) |

---

## Resumo para quem usa o projeto

1. Ter **MongoDB**, **Python** e **Node.js** instalados.
2. Clonar ou transferir o projeto (ex.: download do GitHub).
3. Configurar os `.env` no `server/` e no `frontend/` (pelo menos a URL da API no frontend).
4. Iniciar o MongoDB, depois o servidor (`server/`) e o frontend (`frontend/` com `npm run dev`) ou, se existir, o executável que junta servidor + interface.

Para **avisos de nova versão** quando há uma release no GitHub, ver `docs/ATUALIZACOES-GITHUB.md`.
