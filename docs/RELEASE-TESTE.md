# Publicar uma atualização de teste

Use este fluxo para testar se o aviso de "Nova versão disponível" aparece para quem está com a versão antiga.

## Passo a passo

### 1. Criar a release no GitHub (versão maior que a atual)

A versão do app está em **1.0.0** (`frontend/package.json`). Para o aviso aparecer, a release no GitHub precisa ter uma versão **maior**, por exemplo **v1.0.1**.

1. Abra o repositório no GitHub:  
   **https://github.com/Afonso-Front-End/torre-de-controle**
2. Clique em **Releases** → **Create a new release** (ou **Draft a new release**).
3. Preencha:
   - **Choose a tag**: crie uma nova tag, ex.: `v1.0.1` (não use uma tag que já exista).
   - **Release title**: ex. `v1.0.1 - Atualização de teste`.
   - **Description**: ex. "Release de teste para verificar o aviso de atualização."
4. (Opcional) Em **Assets**, anexe um `.exe` se quiser que o usuário possa baixar algo — para só testar o aviso, pode publicar sem anexos.
5. Clique em **Publish release**.

### 2. Quem vai testar (simular o “usuário”)

- A pessoa precisa estar com o app na versão **1.0.0** (a que está no `package.json` agora).
- O servidor precisa estar rodando com o `.env` que já tem `GITHUB_REPO_OWNER` e `GITHUB_REPO_NAME` (já está configurado).
- Se essa pessoa já fechou o aviso antes, pode ser que o navegador tenha guardado isso. Para ver o aviso de novo:
  - Abra as Ferramentas do desenvolvedor (F12) → **Application** (ou **Aplicativo**) → **Local Storage** → selecione o site do app.
  - Apague a chave **`torre_update_dismissed`** (ou o valor dela).
  - Recarregue a página.

### 3. O que deve acontecer

- Ao abrir o app (versão 1.0.0), o front chama a API de check-update.
- A API lê a última release do GitHub (v1.0.1).
- Como 1.0.1 > 1.0.0, o **banner** aparece: *"Nova versão disponível: v1.0.1"* com o link *"Ver e baixar"*.
- Quem clicar em *"Ver e baixar"* vai para a página da release no GitHub.

---

**Resumo:** crie uma release no GitHub com tag **v1.0.1** (ou qualquer versão maior que 1.0.0). Quem estiver com o app em 1.0.0 e com o servidor configurado verá a notificação. Se não aparecer, confira o `.env` e remova `torre_update_dismissed` do Local Storage.
