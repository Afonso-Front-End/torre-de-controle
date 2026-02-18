# Torre de Controle

Aplicação web (React + FastAPI + MongoDB) pensada para rodar e ser atualizada **apenas com Docker**. O utilizador final não precisa de instalar Node, Python nem aceder ao código.

---

## Como rodar (primeira vez ou após alterações no código)

Requisitos: [Docker](https://docs.docker.com/get-docker/) e [Docker Compose](https://docs.docker.com/compose/install/) instalados.

Na **pasta raiz do projeto** (onde está o `docker-compose.yml`):

```bash
docker compose up -d --build
```

- **Frontend:** http://localhost:8080  
- **Backend (API):** http://localhost:8000  
- **MongoDB:** porta 27017 (apenas entre containers; não é necessário aceder diretamente)

Para ver os logs:

```bash
docker compose logs -f
```

Para parar:

```bash
docker compose down
```

---

## Como atualizar (quando existirem novas imagens)

Se as imagens forem distribuídas por um registry (ex.: Docker Hub), o utilizador atualiza assim, **sem reinstalar**:

```bash
docker compose pull
docker compose up -d
```

Isto baixa as novas imagens e recria os containers. Os dados do MongoDB ficam no volume `mongodb_data` e são mantidos.

Se a distribuição for por código (build local), após receber a nova versão do projeto:

```bash
docker compose build --pull
docker compose up -d
```

---

## Estrutura

| Componente   | Pasta / Imagem | Porta (host) |
|-------------|-----------------|--------------|
| Frontend    | `front-end/`    | 8080 → 80    |
| Backend API | `server/`       | 8000 → 8000  |
| MongoDB     | imagem `mongo:7`| 27017        |

Configurações sensíveis (ex.: `SECRET_KEY`) podem ser definidas em ficheiro `.env` na raiz ou em variáveis de ambiente. O frontend usa `VITE_API_URL` no **build** (definido no `docker-compose.yml` como `http://localhost:8000`); se a API for noutro endereço, altere esse valor e faça rebuild da imagem do frontend.

---

## Resumo para o utilizador final

1. Ter Docker e Docker Compose instalados.  
2. **Rodar:** `docker compose up -d --build` (primeira vez) ou `docker compose up -d` (já construído).  
3. Abrir o browser em http://localhost:8080.  
4. **Atualizar:** `docker compose pull` e `docker compose up -d` (ou, em cenário de build local, `docker compose build --pull` e `docker compose up -d`).

Não é necessário clonar repositórios nem instalar Node ou Python na máquina.
