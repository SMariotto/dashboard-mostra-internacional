# Publicar no GitHub (passos manuais)

O `gh` (GitHub CLI) não está instalado, então tudo é feito à mão, pelo terminal (PowerShell) e pelo site do GitHub. **Nada aqui foi executado**: não existe remote e nenhum `git push` foi feito. Os marcadores entre `<` e `>` são para você trocar; **nunca escreva usuário, token ou senha neste arquivo nem em nenhum arquivo do projeto.**

## AVISO: antes do primeiro push, confira o e-mail dos commits

Todo commit leva o nome e o e-mail de quem o fez, e o GitHub mostra isso para quem abrir o repositório. Rode na pasta do projeto:

```powershell
git log --format=%ae | Sort-Object -Unique
```

**NÃO publique enquanto aparecer e-mail pessoal** (gmail, hotmail, e-mail da escola com nome completo etc.) que você não queira mostrar. **Peça ajuda para trocar antes**: trocar o e-mail de commits que já existem mexe no histórico e precisa ser feito com cuidado, de uma vez, por quem entende (ou começando um repositório novo com e-mail do GitHub, algo como `<ID>+<USUARIO>@users.noreply.github.com`). Para os próximos commits, configure antes: `git config user.email "<EMAIL_DO_GITHUB_OU_NOREPLY>"`.

Estado em 21/10/2026: **todos** os commits do projeto usam o mesmo e-mail pessoal (um gmail, configurado no git deste computador). **Não publicar ainda.**

## Conferências antes de publicar

Rode e confira o resultado:

```powershell
git status --short                                  # tem que vir vazio
git ls-files config                                 # só config/local.exemplo.json e config/padrao.json
git ls-files | Select-String -Pattern 'node\.exe|\.zip$|config/local\.json|^dados/|node_modules'   # tem que vir vazio
git count-objects -vH                               # tamanho do repositório
```

- **Não podem estar no git:** `node.exe`, o zip da entrega, `config/local.json` e a pasta `dados/` da raiz (o `.gitignore` já cobre os quatro). Atenção: `web/dados/` (código da interface) **é** do projeto e fica.
- Procure por senha, chave, telefone ou e-mail escritos nos arquivos. O `.gitignore` não protege arquivo que já foi commitado.
- Os sketches do ESP32 devem ter `WIFI_REDE = "NOME-DA-REDE"` e `WIFI_SENHA = "SENHA-DA-REDE"` (valores de exemplo). `npm test` confere isso.

## 1. Criar o repositório vazio no GitHub

1. Entre em github.com com a sua conta e clique em **New repository**.
2. Nome do repositório: `<NOME_DO_REPOSITORIO>`. Escolha **Private** (privado) ou **Public**. Para o professor baixar a Release sem conta, o repositório precisa ser **Public**; privado só abre para quem estiver logado e com acesso.
3. **Não** marque "Add a README", "Add .gitignore" nem "Choose a license" (o projeto já tem os arquivos).
4. Clique em **Create repository** e copie o endereço, algo como `https://github.com/<USUARIO>/<NOME_DO_REPOSITORIO>.git`. Chamamos de `<URL_DO_REPOSITORIO>`.

## 2. Enviar o código

Na pasta do projeto, no PowerShell:

```powershell
git remote add origin <URL_DO_REPOSITORIO>
git branch --show-current          # tem que dizer: main
git push -u origin main
```

O GitHub pede o login na primeira vez (janela do navegador do Git Credential Manager, ou um *personal access token* no lugar da senha). Use a sua conta. Nada disso fica gravado no projeto. Se o `git remote add` disser que o `origin` já existe, rode `git remote -v` e confira o endereço antes de mexer.

## 3. Publicar o zip numa Release

1. No computador do Samuel: `npm run build` e depois `npm run pacote`. Sai `entrega\smart-canada-dashboard.zip` (uns 35 MB). A pasta `entrega\` não vai para o git, de propósito.
2. Na página do repositório no GitHub, clique em **Releases** (coluna da direita) e em **Create a new release** (ou **Draft a new release**).
3. Em **Choose a tag**, digite uma versão, por exemplo `v0.1.0`, e confirme **Create new tag**. Dê um título (por exemplo "Painel Smart Canada 2050 v0.1.0") e uma descrição curta.
4. Arraste o `smart-canada-dashboard.zip` para a caixa **Attach binaries by dropping them here** e espere o envio terminar.
5. Clique em **Publish release**.
6. Copie o endereço da Release (a página que abriu) e **troque o marcador `<LINK_DA_RELEASE>` no `README.md`** por esse endereço. Faça commit e `git push`.

## 4. Depois de publicar

- Abra a página inicial do repositório e confira: a captura do painel aparece no `README.md`, e o `docs/REDE.md` mostra os esquemas (o GitHub desenha o Mermaid sozinho).
- Baixe o zip da Release **de outro computador**, extraia, crie o `config\local.json` e rode o `INICIAR.bat`. Esse caminho completo ainda não foi testado.
- Cada vez que mudar o código: `npm run build`, commit, `git push`, `npm run pacote` e uma nova Release com o zip novo.
