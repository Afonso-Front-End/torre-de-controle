# Aviso de atualização via GitHub

Quando você publica uma nova versão no GitHub, os usuários que estiverem com uma versão antiga veem um aviso na tela com link para baixar a nova versão.

## Como funciona

1. O aplicativo (frontend) tem uma **versão** definida em `frontend/package.json` (`"version": "1.0.0"`).
2. Ao abrir o app, é feita uma chamada à API **sem autenticação** para `GET /api/check-update`.
3. O servidor consulta a **API do GitHub** (última release do repositório configurado).
4. Se a versão da release no GitHub for **maior** que a versão do app, é exibido um **banner** no topo da tela: *"Nova versão disponível: vX.Y.Z"* com link *"Ver e baixar"*.
5. O usuário pode fechar o aviso; ele só volta a aparecer quando houver uma **nova** release (versão diferente).

## Configuração no servidor

No `.env` do servidor (ou variáveis de ambiente), defina o repositório GitHub:

```env
GITHUB_REPO_OWNER=seu-usuario-github
GITHUB_REPO_NAME=torre-de-controle
```

- **GITHUB_REPO_OWNER**: usuário ou organização do GitHub (ex.: `carla-ribeiro`).
- **GITHUB_REPO_NAME**: nome do repositório (ex.: `torre-de-controle`).

Se não estiver configurado, a verificação de atualização não é feita e nenhum aviso aparece.

## Publicar uma nova versão no GitHub

1. **Atualize a versão** no projeto (para a próxima release):
   - Edite `frontend/package.json` e altere `"version"` (ex.: `"1.0.0"` → `"1.1.0"`).

2. **Gere o executável**:
   ```bash
   cd build
   build.bat
   ```

3. **No GitHub**, crie uma **Release**:
   - Repositório → **Releases** → **Create a new release**.
   - **Tag**: use o mesmo número da versão com `v` na frente (ex.: `v1.1.0`).
   - **Title**: pode ser igual à tag ou um texto (ex.: "Versão 1.1.0").
   - **Description**: descreva as mudanças.
   - Em **Assets**, anexe o arquivo `TorreDeControle.exe` (pode arrastar de `build/dist/`).
   - Clique em **Publish release**.

4. Os usuários que ainda estiverem com a versão anterior (ex.: 1.0.0) verão o aviso ao abrir o app e poderão clicar em *"Ver e baixar"* para ir à página da release e baixar o novo `.exe`.

## Resumo do fluxo

| Você (desenvolvedor) | Usuário |
|----------------------|--------|
| Atualiza `version` em `package.json` | — |
| Roda `build.bat` e gera o novo `.exe` | — |
| Cria Release no GitHub (tag vX.Y.Z) e anexa o `.exe` | — |
| — | Abre o app (versão antiga) |
| — | Vê o banner: "Nova versão disponível: vX.Y.Z" |
| — | Clica em "Ver e baixar" e baixa o novo executável |

## Observações

- A comparação de versões segue **semver** (ex.: 1.0.0 < 1.1.0 < 2.0.0).
- O aviso pode ser **fechado**; ele fica oculto até existir uma release com versão **nova** (diferente da que foi fechada).
- A verificação usa a API pública do GitHub; não é necessário token para leitura de releases públicas.
