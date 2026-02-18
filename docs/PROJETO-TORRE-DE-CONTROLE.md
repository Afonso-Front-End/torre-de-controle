# Torre de Controle – Documentação do projeto

Documento único do projeto para continuidade: se o chat sumir, outro dev ou chat pode retomar a partir daqui.

---

## 1. Visão geral

**Torre de Controle** é uma aplicação web para gestão interna que inclui:

- **Autenticação** (login, criar conta, perfil, configurações)
- **Lista de telefones** – importar Excel, listar, editar HUB, apagar (com confirmação por senha)
- **Importe tabela de pedidos** – importar planilha de **pedidos**, importar **pedidos consultados**, processar e exibir **pedidos com status** (Base/Motorista) e “dias parado”
- **Importe tabela Consulta das bipagems em tempo real** – tabela de **pedidos_com_status** com seleção (checkbox), envio para **Motorista** (Base desativada no front com "Em breve"). **Botão Config** abre modal com critério para envio ao Motorista (prefixos do Correio, ex.: TAC, MEI, ETC) e opção "Enviar automaticamente para motorista após importar planilha" (mesma config do utilizador, antes no Perfil)
- **Resultados da consulta** – visão agrupada por entregador: **Correio de coleta ou entrega** + **Base de entrega** + **Total** + **Evolução**; select “Coleção” (Motorista — Pronto; Base — Em breve). Filtro por **data do envio** (persistido em localStorage). Clique na coluna **Correio** abre modal "Pedidos do entregador" (tabs Entregues/Não entregues, coluna de marcação para copiar números JMS); coluna **Base de entrega** abre a página **Evolução** (performance da base); coluna **Evolução** abre a página **Evolução** (evolução do motorista). Cabeçalho da coluna **Total** mostra badge com o total geral

Stack: **React (Vite)** no frontend, **FastAPI** no backend, **MongoDB** como base de dados. Projeto pensado para rodar **localmente** (sem Docker).

---

## 2. Estrutura e como rodar

### Estrutura de pastas

| Pasta        | Conteúdo |
|-------------|----------|
| `frontend/`  | React + Vite. Por página: `PageName.css`, `PageName.jsx` (componente), `PageName.js` (constantes/lógica), `index.js` (reexport). Serviços em `src/services/api.js`; contexto em `src/context/`; loading global no layout. |
| `server/`    | FastAPI: `main.py`, `config.py`, `database.py`, `security.py`, `limiter.py`, `table_ids.py`. **`schemas/`** – Pydantic (auth, resultados_consulta). **`services/`** – lógica de negócio (ex.: `services/resultados_consulta.py`). **`routers/`** – apenas HTTP. **`models/`** – reexporta `schemas` (compatibilidade). |
| `docs/`      | Esta documentação |

### Como rodar (local)

1. **MongoDB** em execução (ex.: `mongodb://localhost:27017`).
2. **Backend** – em `server/`: criar `.env` (ver variáveis abaixo), depois `pip install -r requirements.txt` e `python main.py`. API em http://localhost:8000 (ou porta em `PORT`).
3. **Frontend** – em `frontend/`: criar `.env` com `VITE_API_URL` apontando para a API, depois `npm install` e `npm run dev`. App em http://localhost:5173.

Ver **README.md** na raiz para mais detalhes.

### Variáveis de ambiente

- **Backend** (`server/.env`): `MONGO_URI`, `MONGO_DB_NAME`, `CORS_ORIGINS`, `SECRET_KEY`, `PORT`, `GITHUB_REPO_OWNER`, `GITHUB_REPO_NAME` (para aviso de atualização).
- **Frontend** (`frontend/.env`): `VITE_API_URL` (URL da API, ex.: `http://localhost:8000`).

---

## 3. Backend (API)

### Tecnologias

- **FastAPI**, Python 3.11+
- **MongoDB** (PyMongo)
- **JWT** para autenticação; **bcrypt** para hashes de senha
- **SlowAPI** para rate limiting (login 10/min, criar-conta 5/min)
- CORS, headers de segurança, validação com Pydantic

### Organização do backend

- **`schemas/`** – Modelos Pydantic para request/response (`auth.py`, `resultados_consulta.py`). O router **auth** importa de `schemas`.
- **`services/`** – Lógica de negócio fora dos routers. Ex.: **`services/resultados_consulta.py`** com constantes (coleções, colunas, prefixos), helpers (Excel, índices, critério motorista) e **`processar_e_gravar()`**. O router `resultados_consulta` só orquestra HTTP e chama o service.
- **`models/`** – Mantido apenas como reexport de `schemas` para compatibilidade.
- **IDs de tabela (1–20):** Em **`table_ids.py`**; rotas “por tabela” exigem header **`X-Table-Id`** (dependência `require_table_id`). Ao criar conta e em `/me`, o utilizador tem **`tabelas`** (slots 1–20).
- **Isolamento por utilizador:** Todas as coleções de dados usam o campo **`userId`** (`USER_ID_FIELD` em `database.py`); leituras/updates/deletes filtrados por `userId`.

### Rotas registradas em `main.py`

Os routers são registados centralmente em **`server/routers/__init__.py`** na lista **`ROUTERS`**. Para adicionar uma nova tabela/rota: importar o router e acrescentar uma entrada `(router, prefix)` à lista. O `main.py` percorre `ROUTERS` e faz `app.include_router(router, prefix=prefix)`.

| Prefixo | Router              | Ficheiro                     |
|---------|---------------------|------------------------------|
| `/api`  | auth                | `routers/auth.py`            |
| `/api`  | lista_telefones     | `routers/lista_telefones.py`  |
| `/api`  | importe-tabela-pedidos   | `routers/importe_tabela_pedidos.py` |
| `/api`  | importe-tabela-consulta-bipagems  | `routers/importe_tabela_consulta_bipagems.py` |
| `/api`  | pedidos_status      | `routers/pedidos_status.py`  |
| `/api`  | resultados_consulta | `routers/resultados_consulta.py` |

Endpoint global: **GET `/health`** – health check + status do MongoDB.

### Resumo dos routers

- **auth:** `POST /api/auth/login`, `POST /api/auth/criar-conta`, `PATCH /api/auth/perfil`, `GET /api/auth/me`, `PATCH /api/auth/config`
- **lista_telefones:** `POST /api/lista-telefones` (upload Excel, modo incremental; primeira vez grava cabeçalho), `GET` (opcional `?datas=YYYY-MM-DD,...`), `GET /api/lista-telefones/datas` (datas de importação), `DELETE` (todos, com senha), `DELETE /{doc_id}`, `PATCH` (HUB)
- **importe-tabela-pedidos:** `POST /api/importe-tabela-pedidos` (upload Excel → **incremental**, não apaga dados anteriores; grava `importDate`; ignora "Número de pedido JMS" já existente), `GET` (paginação, opcional `?datas=YYYY-MM-DD,...`), `GET /api/importe-tabela-pedidos/datas`, `DELETE` (todos), `DELETE /{doc_id}`
- **importe-tabela-consulta-bipagems:** `POST /api/importe-tabela-consulta-bipagems` (upload Excel → **incremental**, grava `importDate`; ignora JMS duplicado; **não grava** linhas com "Tipo de bipagem" = "assinatura de encomenda"), `GET` (total, opcional `?datas=...`), `GET /api/importe-tabela-consulta-bipagems/datas`, `DELETE` (todos)
- **pedidos_status:** `POST /api/pedidos-status/processar` (no-op; dados vêm do import), `GET /api/pedidos-status` (listagem paginada, opcional `?datas=...`), `DELETE /api/pedidos-status`
- **resultados_consulta:** `POST /api/resultados-consulta/processar` (body: `numeros_jms`, `colecao`), `POST /api/resultados-consulta/auto-enviar-motorista` (envio automático para motorista conforme config: `auto_enviar_motorista_apos_import` e **prefixos** em `motorista_prefixos_correio`, ex.: TAC, MEI, ETC), `GET /api/resultados-consulta/motorista`, `GET /api/resultados-consulta/motorista/numeros-jms`, `POST /api/resultados-consulta/motorista/atualizar` (upload Excel – atualiza docs cuja "Marca de assinatura" é entregue), `DELETE /api/resultados-consulta/motorista`. Lógica de negócio em **`services/resultados_consulta.py`**.

### Importação incremental e filtro por data

- **Modo incremental:** Em **importe-tabela-pedidos**, **importe-tabela-consulta-bipagems** e **lista_telefones**, cada upload **acrescenta** dados (não substitui). Cada documento de dados tem o campo **`importDate`** (YYYY-MM-DD) com a data do envio.
- **Deduplicação por "Número de pedido JMS":** Nos imports de pedidos e pedidos_consultados, se o número JMS já existir na coleção, a linha **não é gravada** (evita duplicados).
- **Filtro no import importe-tabela-consulta-bipagems:** Linhas com **"Tipo de bipagem" = "assinatura de encomenda"** não são gravadas na coleção `pedidos_com_status`. Constante `TIPO_BIPAGEM_EXCLUIR` e função `_tipo_bipagem_deve_excluir()` em `importe_tabela_consulta_bipagems.py`.
- **Filtro por datas:** As listagens aceitam o parâmetro **`datas`** (vírgulas, ex: `2026-02-08,2026-02-09`). O frontend usa o componente **DateFilterSelect** (select múltiplo) para escolher uma ou várias datas e exibir apenas os dados importados nessas datas.
- **Endpoints `GET .../datas`:** Devolvem a lista de datas de importação existentes na coleção (para popular o select de datas no frontend).

---

## 4. Frontend

### Organização das páginas

Cada página segue a convenção **CSS + JSX + JS** para facilitar manutenção:

- **`PageName.js`** – Constantes, funções puras e lógica reutilizável (ex.: `performLogin`, `getConsultarCacheKey`, `groupByCorreioAndBase`).
- **`PageName.jsx`** – Apenas o componente React (estado, efeitos, JSX); importa do `.js` e, quando existir, do hook.
- **`PageName.css`** – Estilos da página.
- **`index.js`** – Reexporta o componente (`export { default } from './PageName.jsx'`) para que o import seja pela pasta (ex.: `from './Login'`).
- **`hook/usePageName.js`** – Quando a página tem lógica em hook (ex.: ListaTelefones, VerificarPedidos).

Exemplos: **Login** (Login.js com `performLogin`), **ConsultarPedidos** (ConsultarPedidos.js com `getConsultarCacheKey`, `consultarCache`; modal **ConsultarPedidosConfigModal** com prefixos e envio automático), **ResultadosConsulta** (ResultadosConsulta.js com constantes e `groupByCorreioAndBase`, `groupedToTable`), **Profile** (Profile.js com `getAvatarUrl`, `getFullConfig`, opções de tema/linhas).

### Loading global

O overlay de loading é **global**: estado `globalLoading` e `setGlobalLoading` no **AppContext**; renderizado uma vez no **MainLayout**. Ao **mudar de rota** (`location.pathname`), o layout chama `setGlobalLoading(false)`, para o loading não ficar preso noutra página. As páginas (Consultar pedidos, Resultados da consulta, Verificar pedidos) usam `setGlobalLoading(true, '…')` / `setGlobalLoading(false)` em vez de Loader local para ações pesadas.

### Cache e atualização sem recarregar

- **Resultados da consulta:** Módulo **`utils/resultadosCache.js`** (`getResultadosCache`, `setResultadosCache`, `invalidateResultadosCache`). Após “Enviar para motorista” ou envio automático em Consultar pedidos chama-se `invalidateResultadosCache()` e **`refetchUser()`**; ao navegar para Resultados da consulta a tabela refaz o fetch se o cache foi invalidado.
- **AppContext** expõe **`refetchUser()`** (chama `getMe` e atualiza user com nome, foto, config, tabelas). Assim o Perfil e outras vistas atualizam sem sair da conta.

### Rotas (App.jsx)

- `/login` – Login  
- `/criar-conta` – Criar conta  
- `/` – Home (privada)  
- `/lista-telefones` – Lista de telefones  
- `/verificar-pedidos-parados` – Importe tabela de pedidos  
- `/consultar-pedidos` – Importe tabela Consulta das bipagems em tempo real (tabela com seleção, envio para Base/Motorista)  
- `/resultados-consulta` – Resultados da consulta (tabela agrupada por Correio de coleta ou entrega + Base de entrega + Total + Evolução)  
- `/resultados-consulta/evolucao` – **Evolução** (performance da base ou do motorista: cards, gráficos e tabela de pedidos)  
- `/perfil` – Perfil do usuário  

Rotas privadas usam `PrivateRoute` e layout `MainLayout` (Header + Sidebar).

### Serviços (api.js)

Todas as chamadas à API estão em `frontend/src/services/api.js`. Incluem: login, criarConta, getMe, updatePerfil, updateConfig; lista de telefones (CRUD, upload, PATCH HUB, getListaTelefonesDatas, getListaTelefones com `datas`); verificar pedidos (getPedidosDatas, getPedidos com `datas`); pedidos consultados (getPedidosConsultadosDatas, getPedidosConsultadosTotal com `datas`); pedidos com status (getPedidosComStatus com `datas`); resultados da consulta (processarResultadosConsulta, autoEnviarMotorista, getResultadosConsultaMotorista, getResultadosConsultaMotoristaNumerosJms, updateResultadosConsultaMotorista, deleteResultadosConsultaMotorista). Todas as chamadas “por tabela” enviam o header **`X-Table-Id`** com o ID da tabela. Em 401 é chamado `onUnauthorized` (logout/redirect para login).

### Filtro por data no frontend

Em **Lista de telefones**, **Verificar pedidos** e **Consultar pedidos**, a barra de ferramentas inclui o componente **DateFilterSelect** (select múltiplo “Data do envio”). O utilizador pode escolher uma ou várias datas; apenas os dados importados nessas datas são exibidos. Sem seleção, são exibidos todos os dados (comportamento “Todas as datas”).

### Perfil e configurações

Na página **Perfil** (`Profile/`), o utilizador pode editar **Configurações**: **tema** (claro/escuro/sistema) e **linhas por página** (tabelas). A config de critério para envio ao Motorista (prefixos e envio automático) está na página **Consultar pedidos** (botão **Config** → modal **ConsultarPedidosConfigModal**); alterações gravam em `user.config` (API `PATCH /api/auth/config`). Config definida em **`schemas/auth.py`**.

### Melhorias de UX e comportamento

- **Loading local no botão Enviar (Consultar pedidos):** Ao clicar em **Enviar** na página Consultar pedidos, **não** se ativa o loading global (overlay); apenas o estado local do botão (`loadingEnviar`), que desativa o botão e mostra "A enviar…", evitando overlay em toda a página.
- **Botão de cópia em lotes (Resultados da consulta):** O botão de copiar números JMS na página Resultados da consulta foi substituído pelo mesmo padrão da página Verificar pedidos: ícone **CiFilter**, dropdown com **lotes de 1000** números. Os números listados são **apenas** os com **Marca de assinatura = "Não entregue"** (derivados do estado `data` no frontend). Mensagem quando vazio: "Nenhum número JMS com Marca de assinatura «Não entregue»."
- **Ícones de filtro:** Nos botões que abrem o menu de cópia em lotes (Verificar pedidos e Resultados da consulta) usa-se o ícone **CiFilter** (`react-icons/ci`) em vez de MdFilterList.
- **Atualização por ficheiro (Resultados da consulta):** O fluxo de **Atualizar** (upload .xlsx) está preparado para múltiplos envios seguidos: o botão fica desativado durante o upload (`updating`), e existe guard `if (updating) return` no handler do ficheiro para evitar envio duplo. Após cada upload bem-sucedido chama-se `fetchData()` e `invalidateResultadosCache()`. O filtro "não entregues" e atualizações com poucos dados (apenas os que passam a "entregue") funcionam corretamente.
- **Fechar dropdown ao clicar fora:** Em todo o projeto, os dropdowns de filtro (e de configuração no Perfil) **fecham ao clicar fora**. Implementação padronizada: evento **`pointerdown`** no `document`, listener registado **apenas quando o dropdown está aberto** (ex.: `openFilterIndex !== null`), e verificação com `ref.contains(e.target)` e `e.target.closest('.…__filter-dropdown')` para não fechar ao clicar na tabela ou no próprio dropdown. Aplicado em: **Verificar pedidos** (dropdown de filtro por coluna + dropdown de cópia em lotes), **Resultados da consulta** (filtro por coluna + dropdown de cópia), **Consultar pedidos** (filtro por coluna), **Lista de telefones** (dropdown de filtro por pill), **Perfil** (dropdowns de configuração: tema, linhas). O **DateFilterSelect** já tinha este comportamento.

---

## 5. Coleções MongoDB

| Coleção               | Uso |
|-----------------------|-----|
| **usuários**          | Contas (nome, nome_base, hash senha, foto, **config**, **tabelas**). Gerida pelo auth. **config** inclui: `linhas_por_pagina`, `tema`, `motorista_prefixos_correio` (ex.: TAC, MEI, ETC), `auto_enviar_motorista_apos_import`. **tabelas**: slots 1–20 por ID de tabela. |
| **lista_telefones**   | Dados da planilha de telefones. Um doc = cabeçalho (`isHeader`); restantes = linhas com `values` e **`importDate`**. |
| **pedidos**           | Planilha de pedidos. Um doc = cabeçalho (`isHeader`); restantes = linhas com `values`, **`importDate`** e `createdAt`. |
| **pedidos_consultados** | Planilha consultada (grava em `pedidos_com_status`). Cabeçalho + linhas com **`importDate`**. Colunas: Número de pedido JMS, Digitalizador, Correio de coleta ou entrega, Tipo de bipagem, Tempo de digitalização. |
| **pedidos_com_status** | Dados do import pedidos_consultados: cabeçalho + linhas com **`importDate`**, Status, dias_parado. |
| **base**               | Documentos gravados ao “Enviar para Base” na página Consultar pedidos (cruzamento pedidos + pedidos_com_status por número JMS). |
| **motorista**          | Documentos gravados ao “Enviar para Motorista” na página Consultar pedidos. Mesma origem que `base`; ordem de campos em `ORDEM_CAMPOS_MOTORISTA` em `services/resultados_consulta.py`. Sem `createdAt`. |

---

## 6. Regras de negócio – Pedidos com status (Base/Motorista)

Implementado em **`server/routers/pedidos_status.py`**.

### Colunas usadas em `pedidos_consultados`

- **Número de pedido JMS** – chave para cruzar com `pedidos`
- **Digitalizador** – preenchido ou vazio
- **Correio de coleta ou entrega** – preenchido ou vazio
- **Tipo de bipagem** – se for **"Entrada no galpão de pacote não expedido"** → conta como **Base**
- **Tempo de digitalização** – usado para calcular “Dias parado”

### Definição de status

- **Base** se:
  - (Digitalizador preenchido **e** Correio vazio), **ou**
  - **Tipo de bipagem** = **"Entrada no galpão de pacote não expedido"** (comparação sem diferenciar maiúsculas/minúsculas)
- **Motorista** se Digitalizador e Correio preenchidos (e não entrou como Base pela regra do Tipo de bipagem)
- Caso contrário: status vazio

Constante no código: **`TIPO_BIPAGEM_BASE = "Entrada no galpão de pacote não expedido"`**.  
Função: **`_calcular_status(tem_digitalizador, tem_correio, tipo_bipagem_base=False)`**.  
Processamento: **`_executar_processamento(db)`** em `pedidos_status.py`.

---

## 7. Resultados da consulta (Base / Motorista)

Implementado no **service** **`server/services/resultados_consulta.py`** (constantes, helpers, `processar_e_gravar`) e no **router** **`server/routers/resultados_consulta.py`** (HTTP). Frontend: **Resultados da consulta** (`frontend/src/pages/VerificarPedidosParados/ResultadosConsulta/`).

### Backend

- **POST `/api/resultados-consulta/processar`** – Body: `numeros_jms` (lista de números JMS), `colecao` (`"base"` ou `"motorista"`). Para cada número JMS: busca linha em **pedidos** (excluindo o primeiro doc = cabeçalho), busca linha em **pedidos_com_status**; monta um documento com colunas de pedido + colunas de status e grava na coleção indicada.
- **Colunas gravadas (ordem fixa – `ORDEM_CAMPOS_MOTORISTA`):** Número de pedido JMS, Correio de coleta ou entrega, Base de entrega, Tipo de bipagem, Tempo de digitalização, Marca de assinatura, Dias sem movimentação, CEP destino, Complemento, Destinatário, Cidade Destino, Distrito destinatário, PDD de Entrega, Status. **Sem** `createdAt`.
- **Colunas vindas de `pedidos`:** definidas em **`COLUNAS_PEDIDO`** (Base de entrega, CEP destino, Complemento, Destinatário, Cidade Destino, 3 Segmentos, Distrito destinatário, Marca de assinatura, Horário da entrega, PDD de Entrega).
- **Colunas vindas de `pedidos_com_status`:** Número de pedido JMS, Tipo de bipagem, Tempo de digitalização, **Correio de coleta ou entrega** (nome do motorista – coluna **exata** com esse nome; **não** usar "Número de correio de coleta ou entrega"), Status; **Dias sem movimentação** é calculado (dias desde Tempo de digitalização até hoje).
- **POST `/api/resultados-consulta/auto-enviar-motorista`** – Envio automático para a coleção motorista. Usa **config do utilizador:** `auto_enviar_motorista_apos_import` (boolean) e **`motorista_prefixos_correio`** (lista de prefixos, ex.: TAC, MEI, ETC). Envia apenas os JMS em que **Digitalizador** e/ou **Correio de coleta ou entrega** atendem ao critério dos prefixos (apenas docs com `importDate` em pedidos_com_status). Retorna `saved`, `skipped`, `rejected_tipo_bipagem`, `message`. Configurável na página **Consultar pedidos** (botão Config → modal Configuração).
- **GET `/api/resultados-consulta/motorista`** – Listagem paginada (`page`, `per_page`, máx. 500). Parâmetros opcionais: **`datas`** (YYYY-MM-DD,…) e **`incluir_nao_entregues_outras_datas`** (true = devolve docs das datas selecionadas + docs de outras datas com Marca = "Não entregue"). Retorna `{ data, total }`.
- **GET `/api/resultados-consulta/motorista/numeros-jms`** – Retorna todos os valores de "Número de pedido JMS" da coleção motorista (`{ numeros: string[] }`). Usado pelo frontend para copiar para a área de transferência.
- **POST `/api/resultados-consulta/motorista/atualizar`** – Upload de Excel (.xlsx). Para cada linha com "Número de pedido JMS" existente na coleção motorista e **"Marca de assinatura"** igual a **"Recebimento com assinatura normal"**, atualiza o documento com os dados da linha e define **`importDate`** para a data de hoje (UTC), para o pedido contar na data atual na Evolução. Constante **`MARCA_ENTREGUE`** em `services/resultados_consulta.py` (apenas "Recebimento com assinatura normal").
- **DELETE `/api/resultados-consulta/motorista`** – Remove todos os documentos da coleção motorista.

### Frontend

- **Consultar pedidos** (`ConsultarPedidos/`): tabela de `pedidos_com_status` com seleção (checkbox), select **Coleção de destino** (opção **Base** desativada com “Base (Em breve)”; apenas **Motorista** ativa) e botão Enviar que chama **processarResultadosConsulta**. **Botão Config** (toolbar quando há dados; cabeçalho quando não há) abre o modal **ConsultarPedidosConfigModal** com: critério para envio ao Motorista (adicionar/remover prefixos do Correio, ex.: TAC, MEI, ETC) e checkbox "Enviar automaticamente para motorista após importar planilha"; alterações gravam em `user.config` (API `PATCH /api/auth/config`). Após import com sucesso chama **processarPedidosComStatus** e depois **autoEnviarMotorista**; invalida cache de Resultados e **refetchUser** para o Perfil e a tabela Resultados atualizarem sem recarregar.
- **Resultados da consulta** (`ResultadosConsulta/`):
  - **Select “Coleção”** na toolbar: **Motorista — Pronto** (ativo); **Base — Em breve** (desativado).
  - Busca todos os documentos motorista (páginas de 500 em 500) e guarda em estado; **cache** em `utils/resultadosCache.js` (invalidado ao enviar para motorista noutra página).
  - Agrupa no frontend por "Correio de coleta ou entrega" + "Base de entrega", total por grupo, ordenação por total decrescente.
  - **Marcas “entregues”:** "Recebimento com assinatura normal" e "Assinatura de devolução" (`MARCA_ENTREGUE`; case-insensitive).
  - Barra de evolução por grupo (“X entregues / Y não entregues”; barra com fundo transparente).
  - Botões: **Copiar números JMS** (dropdown em lotes de 1000, apenas "Não entregue" – derivado de `data` no frontend; mesmo padrão que Verificar pedidos), **Atualizar** (upload .xlsx → updateResultadosConsultaMotorista; botão desativado durante upload; suporta múltiplos envios seguidos), **Limpar** (com confirmação).
  - Tabela com 4 colunas (Correio, Base, Total, Evolução); paginação sobre linhas agrupadas (`user.config.linhas_por_pagina`). **Colunas clicáveis:** coluna 0 (Correio) abre o modal; coluna 1 (Base de entrega) navega para a página Evolução em modo **performance da base**; coluna 3 (Evolução) navega para a página Evolução em modo **evolução do motorista**.
  - **Modal “Pedidos do entregador”:** ao clicar na coluna **Correio** (primeira coluna), o modal abre com **loading** (“A carregar…”) durante pelo menos 1 s antes de mostrar a tabela (`modalPending` → `modalEntregador`). No topo: **tabs “Entregues” e “Não entregues”** (preferência em localStorage `resultados-consulta-modal-filter`); total de pedidos ao lado do nome do entregador; totais (entregues / não entregues) em cada tab. **Coluna de marcação** (checkboxes) fixa à esquerda: marcar uma linha copia imediatamente o Número de pedido JMS; checkbox no thead copia todos os números JMS da lista filtrada (sem botão separado). Tabela filtrada por correio + base.
  - **Persistência de datas:** Datas selecionadas no modal de configuração são guardadas em **localStorage** (`resultados-consulta-selected-datas`); ao recarregar mantém a seleção.
  - **Badge na coluna Total:** No cabeçalho da coluna “Total” da tabela principal, uma bolinha (badge) com o total geral de pedidos da consulta.

### Página Evolução (`Evolucao/`)

- **Rota:** `/resultados-consulta/evolucao`. Estado de navegação via `location.state`: `{ base }` e opcionalmente `{ view: 'base' }` para performance da base, ou `{ correio, base }` para evolução do motorista.
- **Dados e datas:** A Evolução usa sempre **data do envio** (por defeito a data atual) e **incluir não entregues de outras datas** (parâmetros da API). O **botão Config** abre o modal de configuração com **seleção de data** (DateFilterSelect) e tipos de gráfico; preferência de datas em **localStorage** (`evolucao-selected-datas`); se não houver datas válidas guardadas, usa a data atual.
- **Organização do código:** Pasta **`Evolucao/components/`** com um componente por subpasta (EvolucaoHeader, EvolucaoCards, EvolucaoConfigModal, EvolucaoChartStylesModal, EvolucaoChartSection, EvolucaoTable), cada um com seu `.jsx`, `.css` e `index.js`. Hook **`Evolucao/hooks/useEvolucao.js`** centraliza fetch, filtros por base/correio, estatísticas e dados para gráficos; a página passa `selectedDatas` e compõe o layout.
- **Modos:**  
  - **Performance da base:** ao clicar na coluna **Base de entrega** em Resultados da consulta, navega com `state: { base, view: 'base' }`. Título “Performance da base”, subtítulo com o nome da base. Dados agregados de todos os pedidos dessa base (todos os motoristas).  
  - **Evolução do motorista:** ao clicar na coluna **Evolução**, navega com `state: { correio, base }`. Título “Evolução do motorista”, subtítulo “correio — base”. Dados filtrados por esse par correio + base.
- **Conteúdo:**  
  - **Header fixo:** título, subtítulo, três botões (ícones apenas, estilo alinhado à ResultadosConsulta): Configurar (engrenagem), Gráficos, Voltar.  
  - **Cards de resumo:** Total, Entregues, Não entregues, Outros (min-height 120px; rótulos com quebra de linha).  
  - **Grid 2×2 de gráficos:** quatro secções com tipo configurável: Comparativo (quantidade), Distribuição por status, Performance por motorista, Entregues vs Não entregues. Cada secção usa o tipo escolhido na Config (padrões: Linhas, Área polar, Barras, Linhas).  
  - **Tabela** "Pedidos da base" ou "Pedidos do motorista" (design igual à DataTable em Resultados da consulta, pills de Marca de assinatura).  
  - Cores: **CHART_COLORS** (verde, vermelho, cinza); config de barras e amostras do modal usam as mesmas cores.  
- **Configuração:** Modal "Configuração" (botão Configurar) — **Data do envio** (DateFilterSelect) + tipo de gráfico por secção (Linhas, Barras, Radar, Rosca, Pizza, Área polar, Bolhas, Dispersão); preferência de datas em `evolucao-selected-datas`, tipos em **localStorage** (`evolucao-chart-config`); botão "Restaurar padrão"; animação ao abrir/fechar (estado `isClosing` + ref `wasOpenRef` para não mostrar o modal ao carregar a página). Modal "Estilos de gráficos" (botão Gráficos) — 8 tipos com amostras; tamanho **60vw × 70vh**; grid de cards com **auto-fill**; animações com **Framer Motion**.  
- **Lógica de dados:** `evolucaoChartTheme.js` (CHART_COLORS, DEFAULT_CHART_CONFIG, loadChartConfig, getModalChartSamples); `evolucaoChartOptions.js` (getChartDataForSectionType, getOptionsForSectionType). Secções com 2 datasets (Performance por motorista, Entregues vs Não entregues): pie/doughnut/polarArea usam agregação (totais Entregues/Não entregues); bubble/scatter usam todos os datasets; tooltip "Motorista: X" em **todos** os tipos. Performance por motorista com tipo bar usa **indexAxis: 'y'**. Componentes: EvolucaoHeader, EvolucaoConfigModal, EvolucaoChartStylesModal, EvolucaoChartSection.  
- **Dias sem movimentação:** calculado no backend (`server/services/resultados_consulta.py`) com base no **Tempo de digitalização** (última bipagem) para todos os estados, incluindo "Não entregue".  
- **Redirecionamento:** “Performance por motorista”**.  “Pedidos da base” ou “Pedidos do motorista”  Sem `base` no state a página redireciona para `/resultados-consulta`.

---

## 8. Resumo para outro chat

- **Projeto:** Torre de Controle – React + FastAPI + MongoDB; rodar localmente (MongoDB + servidor em `server/` + frontend em `frontend/`). Ver README.md.
- **Funcionalidades:** Auth, Lista de telefones, Verificar pedidos parados, Consultar pedidos, Resultados da consulta. **Importação incremental:** uploads não apagam dados anteriores; cada registo tem `importDate`; duplicados por "Número de pedido JMS" são ignorados. **Filtro por data:** em cada página (Lista telefones, Verificar pedidos, Consultar pedidos) há um select múltiplo "Data do envio" (componente DateFilterSelect); endpoints `GET .../datas` e parâmetro `?datas=YYYY-MM-DD,...`.
- **Regra de status já implementada:** Base = (Digitalizador preenchido e Correio vazio) **ou** Tipo de bipagem = "Entrada no galpão de pacote não expedido"; Motorista = Digitalizador e Correio preenchidos.
- **Onde alterar a lógica de status:** `server/routers/pedidos_status.py` (constante `TIPO_BIPAGEM_BASE`, `_calcular_status`, e o loop em `_executar_processamento` que lê a coluna “Tipo de bipagem” e chama `_calcular_status`).
- **Resultados da consulta:** Backend: **service** `services/resultados_consulta.py` (lógica) e **router** `routers/resultados_consulta.py` (HTTP). POST processar, POST auto-enviar-motorista (config `auto_enviar_motorista_apos_import` e **`motorista_prefixos_correio`**), GET/DELETE motorista, GET motorista/numeros-jms, POST motorista/atualizar. Marcas entregues: `MARCA_ENTREGUE` (apenas "Recebimento com assinatura normal"); ao marcar entregue, `importDate` = hoje (UTC). Frontend: select Coleção (Motorista pronto, Base em breve); filtro por data (persistido em `resultados-consulta-selected-datas`); cache em `resultadosCache.js`; colunas clicáveis: Correio → modal “Pedidos do entregador” (loading, tabs Entregues/Não entregues, coluna de marcação para copiar JMS), Base de entrega → página **Evolução** (performance da base), Evolução → página **Evolução** (evolução do motorista); badge no cabeçalho da coluna Total com total geral; refetchUser e invalidateResultadosCache após enviar para motorista.
- **Evolução:** Página única (`frontend/src/pages/VerificarPedidosParados/Evolucao/`) que exibe **performance da base** ou **evolução do motorista**. **Dados:** data do envio (por defeito data atual) + incluir não entregues de outras datas; datas em localStorage (`evolucao-selected-datas`). **Código:** `Evolucao/components/` (EvolucaoHeader, EvolucaoCards, EvolucaoConfigModal, EvolucaoChartStylesModal, EvolucaoChartSection, EvolucaoTable), hook `useEvolucao.js`. Modal "Configuração" (botão Config): DateFilterSelect (data do envio) + tipo de gráfico por secção; preferência tipos em `evolucao-chart-config`. Modal "Estilos de gráficos" 60vw×70vh com Framer Motion. Dados: `evolucaoChartTheme.js`, `evolucaoChartOptions.js`; secções com 2 datasets usam agregação em pie/doughnut/polarArea; tooltip "Motorista: X" em todos os tipos. Rota: `/resultados-consulta/evolucao`.
- **Import importe-tabela-consulta-bipagems:** em `importe_tabela_consulta_bipagems.py` não gravar linhas com "Tipo de bipagem" = "assinatura de encomenda". Após import no frontend: processarPedidosComStatus antes de autoEnviarMotorista.

---

---

## 9. Changelog da documentação

- **Fev 2026:** Importação incremental (append), campo `importDate`, deduplicação por "Número de pedido JMS", filtro por datas (parâmetro `datas` e endpoints `GET .../datas`), componente DateFilterSelect no frontend, registro centralizado de routers em `routers/__init__.py`.
- **Fev 2026 (melhorias):** Import pedidos_consultados (exclusão por "Tipo de bipagem" = "assinatura de encomenda"); Consultar pedidos (processarPedidosComStatus antes de autoEnviarMotorista); Resultados da consulta (MARCA_ENTREGUE, barra de evolução, Copiar números JMS, Atualizar por Excel, Limpar).
- **Fev 2026 (envio automático e config):** auto-enviar-motorista e config em Perfil; critério por **prefixos** do Correio/Digitalizador (`motorista_prefixos_correio`: TAC, MEI, ETC).
- **Fev 2026 (organização e UX):**
  - **Backend:** `schemas/` (Pydantic: auth, resultados_consulta), `services/` (lógica em `services/resultados_consulta.py`), routers só HTTP; `models/` reexporta schemas. **Table IDs** 1–20 e header `X-Table-Id`; isolamento por **userId** em todas as coleções de dados.
  - **Frontend:** Cada página com **CSS + JSX + JS** (constantes/lógica no .js, componente no .jsx); **loading global** no AppContext + MainLayout, limpo ao mudar de rota; **resultadosCache.js** e **refetchUser()** para atualizar Perfil e tabela Resultados sem recarregar.
  - **Consultar pedidos:** opção Base desativada (“Base (Em breve)”); apenas Motorista ativa.
  - **Resultados da consulta:** select Coleção (Motorista — Pronto; Base — Em breve); **modal “Pedidos do entregador”** com **loading** ao clicar na linha (modalPending → modalEntregador) para evitar impressão de travamento.

- **Fev 2026 (melhorias de UX – loading, cópia, filtros, clique fora):** Consultar pedidos: botão Enviar com loading local (sem overlay global). Resultados da consulta: cópia em lotes de 1000 (CiFilter), apenas "Não entregue"; Atualizar com proteção contra envio duplo. Ícones CiFilter nos botões de cópia em lotes. Fechar dropdown ao clicar fora (pointerdown, listener só quando aberto) em Verificar pedidos, Resultados da consulta, Consultar pedidos, Lista de telefones, Perfil.
- **Fev 2026 (Evolução – base e motorista):** Página **EvolucaoMotorista** renomeada para **Evolucao** (`Evolucao/`), passando a servir tanto **performance da base** como **evolução do motorista**. Em Resultados da consulta: clique na coluna **Base de entrega** abre Evolução em modo base (`state: { base, view: 'base' }`); clique na coluna **Evolução** abre Evolução em modo motorista (`state: { correio, base }`). Colunas clicáveis: 0 (Correio → modal), 1 (Base de entrega → Evolução base), 3 (Evolução → Evolução motorista). Página Evolução: cards, gráficos (comparativo, pizza, **performance por motorista** em largura total com barras horizontais empilhadas por motorista), tabela de pedidos; design alinhado (cores verde/vermelho/cinza, tabela igual à DataTable de Resultados).
- **Fev 2026 (Evolução – gráficos configuráveis e modais):** Tipos de gráfico configuráveis por secção (8 tipos: Linhas, Barras, Radar, Rosca, Pizza, Área polar, Bolhas, Dispersão); preferência em localStorage; padrões: Comparativo → Linhas, Distribuição → Área polar, Performance por motorista → Barras, Entregues vs Não entregues → Linhas. Modal "Configurar" com animação ao abrir/fechar (CSS + estado isClosing); **ref `wasOpenRef`** para só entrar em "fechando" quando o modal já foi aberto (evita abrir/fechar ao carregar a página). Modal "Estilos de gráficos" (60vw×70vh) com Framer Motion (AnimatePresence, overlayVariants, modalContentVariants); grid de cards com auto-fill (quebra quando não há espaço). Header da Evolução com três botões (ícones apenas), estilo alinhado à ResultadosConsulta. Lógica de dados: `evolucaoChartOptions.js` com agregação para pie/doughnut/polarArea quando 2 datasets; bubble/scatter usam todos os datasets; tooltip "Motorista: X" em todos os tipos. Dias sem movimentação calculado no backend com base no Tempo de digitalização (última bipagem).
- **Fev 2026 (Config motorista em Consultar pedidos):** Config de envio ao Motorista (prefixos `motorista_prefixos_correio` e `auto_enviar_motorista_apos_import`) **removida do Perfil** e disponível apenas na página **Consultar pedidos** (botão **Config** → modal **ConsultarPedidosConfigModal**). Perfil passa a ter só **tema** e **linhas por página**.
- **Fev 2026 (Resultados e Evolução – melhorias finais):** **Resultados:** Modal "Pedidos do entregador" com tabs Entregues/Não entregues (localStorage `resultados-consulta-modal-filter`), coluna de marcação (checkboxes) para copiar números JMS (linha ou todos), total ao lado do nome do entregador e por tab; persistência de datas em localStorage (`resultados-consulta-selected-datas`); badge no cabeçalho da coluna Total com total geral. **Backend:** POST motorista/atualizar define `importDate` = hoje (UTC) ao marcar entregue; `MARCA_ENTREGUE` apenas "Recebimento com assinatura normal"; GET motorista com parâmetros opcionais `datas` e `incluir_nao_entregues_outras_datas`. **Evolução:** Dados por data do envio (data atual por defeito) e incluir não entregues de outras datas; organização em `Evolucao/components/` (EvolucaoHeader, EvolucaoCards, EvolucaoConfigModal, EvolucaoChartStylesModal, EvolucaoChartSection, EvolucaoTable) e hook `useEvolucao.js`; modal Configuração com DateFilterSelect (data do envio) e tipos de gráfico; localStorage `evolucao-selected-datas`. Redirecionamento: sem `base` no state → `/resultados-consulta`.

*Documentação criada em fevereiro de 2026. Atualizada com organização backend (schemas, services), frontend (CSS/JSX/JS por página, loading global, cache e refetch), table IDs, userId, opções Base/Motorista na UI, loading do modal Resultados da consulta, melhorias de UX (loading local Enviar, cópia em lotes não entregues, CiFilter, clique fora nos dropdowns) e página Evolução (performance da base / evolução do motorista).*

### Verificação (documento vs. código)

- **Backend:** `schemas/` (auth, resultados_consulta), `services/resultados_consulta.py`, `routers/` só HTTP, `models/` reexporta schemas. `MARCA_ENTREGUE` e constantes em `services/resultados_consulta.py`. Table IDs e `userId` conforme descrito.
- **Frontend:** Páginas com .css, .jsx, .js e index.js; loading global no AppContext/MainLayout (limpo ao mudar de rota); `resultadosCache.js` e `refetchUser()`. Consultar pedidos: Base desativada; botão Config (modal **ConsultarPedidosConfigModal** com prefixos e envio automático para motorista); Enviar usa apenas loading local no botão (sem overlay global). **Não há nova página:** o Config é um modal na mesma página `/consultar-pedidos`. **Não há nova rota no server:** o modal usa a rota existente **PATCH /api/auth/config**. Resultados da consulta: select Coleção (Motorista/Base); filtro por data (persistido); modal com loading, tabs Entregues/Não entregues, coluna de marcação para copiar JMS; badge na coluna Total; cópia em lotes (CiFilter, apenas "Não entregue").
- **Melhorias documentadas:** Organização (CSS/JSX/JS, schemas, services), loading global e modal, cache e refetch, Base/Motorista na UI, prefixos em Consultar pedidos (Config), isolamento por userId.
- **Evolução:** Página em `VerificarPedidosParados/Evolucao/`; rota `/resultados-consulta/evolucao`; dados por data do envio (data atual + não entregues outras datas); `Evolucao/components/` (EvolucaoHeader, EvolucaoCards, EvolucaoConfigModal, EvolucaoChartStylesModal, EvolucaoChartSection, EvolucaoTable) e hook `useEvolucao.js`; modal Configuração com data (DateFilterSelect) e tipos de gráfico (ref `wasOpenRef` evita modal abrir/fechar ao carregar); colunas clicáveis em Resultados (Correio → modal, Base de entrega → Evolução base, Evolução → Evolução motorista); header com Configurar, Gráficos, Voltar; cards, gráficos, tabela.

### Análise – melhorias e consistência

- **Visão geral (§1):** Resultados da consulta atualizado com filtro por data (persistido), modal com tabs Entregues/Não entregues e coluna de marcação para copiar JMS, badge na coluna Total.
- **Rotas e secção 7:** Rota `/resultados-consulta/evolucao`; Página Evolução com dados/datas (data atual, `evolucao-selected-datas`), organização em `components/` e hook `useEvolucao.js`, modal Configuração com DateFilterSelect e tipos de gráfico; Redirecionamento corrigido (sem texto duplicado).
- **Changelog (§9):** Nova entrada "Fev 2026 (Resultados e Evolução – melhorias finais)" com modal tabs, coluna de marcação, persistência de datas, badge Total, backend importDate/MARCA_ENTREGUE, Evolução components/hook e config com data.
- **Resumo (§8):** Bullets Resultados e Evolução atualizados com as melhorias (modal tabs, marcação JMS, datas, badge; Evolução components, useEvolucao, config com data).
