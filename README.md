# BomBomBa no seu site (Vercel + Firebase ou Supabase)

O site fica na **Vercel**. As salas online passam por um serviço de tempo real, porque a Vercel não mantém as conexões abertas que uma sala de jogo precisa. Qualquer pessoa com o link do site e o código da sala consegue jogar online, sem criar conta.

O jogo funciona com dois serviços. A variável `NET_PROVIDER` na Vercel escolhe qual usar:

| `NET_PROVIDER` | Serviço | Arquivo do adaptador |
|---|---|---|
| `firebase` (padrão) | Firebase Realtime Database | `net-firebase.js` |
| `supabase` | Supabase Realtime | `net-supabase.js` |

`NET_PROVIDER` é só o padrão do site. Se você configurar **os dois** serviços (as variáveis das duas opções abaixo), cada jogador escolhe em **Opções → Servidor online**: Automático (padrão, mede os dois e usa o que responder mais rápido), Firebase ou Supabase. A tela mostra o tempo de resposta de cada um. Para entrar numa sala, o jogo procura o código nos dois servidores ao mesmo tempo, então cada pessoa pode estar usando um diferente. Com só um serviço configurado, a escolha não aparece. Os dois adaptadores ficam sempre na pasta.

## O que tem na pasta

| Arquivo | Para que serve |
|---|---|
| `index.html` | O jogo completo |
| `intro.mp3` | Música da tela inicial (o jogo baixa quando o som é liberado) |
| `net-loader.js` | Lista os serviços configurados, mede o tempo de resposta de cada um e carrega, quando preciso, a biblioteca (versão fixa) e o adaptador do serviço escolhido |
| `net-firebase.js` | Liga as salas do jogo ao Firebase Realtime Database |
| `net-supabase.js` | Liga as salas do jogo ao Supabase Realtime |
| `database.rules.json` | Regras de segurança do banco do Firebase (cole no console) |
| `api/config.js` | Função da Vercel que entrega ao navegador o serviço escolhido e as chaves públicas dele, lidos das variáveis de ambiente |
| `vercel.json` | Cabeçalhos de segurança (CSP e outros) |

## Opção 1: Firebase (padrão)

### 1. Criar o projeto (uns 10 minutos)
1. Em console.firebase.google.com, clique em **Adicionar projeto**. O Google Analytics não é necessário.
2. **Build → Authentication → Começar**. Na aba **Método de login**, ative **Anônimo**.
3. **Build → Realtime Database → Criar banco de dados**. Escolha a região e comece no **modo bloqueado**.
4. Na aba **Regras** do Realtime Database, apague o conteúdo, cole o de `database.rules.json` e clique em **Publicar**.
5. Em **Configurações do projeto → Geral → Seus apps**, clique no ícone **</>** para registrar um app da Web. Você não precisa ativar o Hosting. Copie do objeto `firebaseConfig` os campos `apiKey`, `authDomain`, `databaseURL`, `projectId` e `appId`.
6. Em **Authentication → Configurações → Domínios autorizados**, adicione o domínio do site (por exemplo, `bombomba.vercel.app`).

> **Região:** o Realtime Database não tem servidor no Brasil. As opções são EUA (us-central1), Bélgica (europe-west1) e Singapura (asia-southeast1). Para jogadores no Brasil, escolha **us-central1**. Cada mensagem entre dois jogadores no Brasil faz ida e volta aos EUA. O Supabase tem região em São Paulo e costuma ter menos atraso para o Brasil (ver Opção 2).

### 2. Variáveis na Vercel
Em **Settings → Environment Variables**, crie:

| Nome | Valor |
|---|---|
| `NET_PROVIDER` | `firebase` |
| `FIREBASE_API_KEY` | `apiKey` |
| `FIREBASE_AUTH_DOMAIN` | `authDomain` (ex.: `seu-projeto.firebaseapp.com`) |
| `FIREBASE_DATABASE_URL` | `databaseURL` (ex.: `https://seu-projeto-default-rtdb.firebaseio.com`) |
| `FIREBASE_PROJECT_ID` | `projectId` |
| `FIREBASE_APP_ID` | `appId` |

Depois faça um novo deploy (**Deployments → ⋯ → Redeploy**).

### Como as salas funcionam no Firebase
- Cada jogador entra com **login anônimo**. Nada fica salvo no aparelho, então cada abertura do jogo é um participante novo.
- O estado de cada um fica em `rooms/<sala>/peers/<id>`. As regras deixam cada pessoa escrever **só no próprio nó**, com até 8 KiB, e só em salas com nome `bombomba-` + 5 letras ou números. Ler exige estar logado. Todo o resto do banco fica fechado.
- Quem fecha o jogo ou perde a conexão tem o nó apagado pelo servidor. Salas vazias somem sozinhas.

### Limites e custos (plano Spark, gratuito)
- O plano gratuito permite 100 conexões simultâneas (cerca de 25 partidas de 4 pessoas ao mesmo tempo), 1 GB armazenado e 10 GB de download por mês.
- Uma partida de 4 pessoas baixa cerca de 5 MB por minuto, porque o anfitrião envia o estado ~15 vezes por segundo para 3 pessoas. Isso dá perto de 2.000 minutos de partida por mês no gratuito.
- Acompanhe em **Realtime Database → Uso** e confira os limites atuais do plano.

## Opção 2: Supabase

1. Em supabase.com, crie um projeto na região **South America (São Paulo)**.
2. Em **Project Settings → API**, copie o **Project URL** e a chave **anon public** (ou a `sb_publishable_...` em projetos novos).
3. Em **Project Settings → Realtime**, deixe **desligada** a opção de aceitar só canais privados. Não precisa criar tabelas: as salas usam só Broadcast e Presence.
4. Na Vercel, crie as variáveis `NET_PROVIDER` = `supabase`, `SUPABASE_URL` e `SUPABASE_ANON_KEY`, e faça um novo deploy.

> Nunca use a chave **service_role** (ou **secret**) no site. Ela dá acesso total ao projeto.

O plano gratuito tem uma cota mensal de mensagens do Realtime. Uma partida de 4 pessoas usa alguns milhares de mensagens por minuto.

## Subir na Vercel

**Pelo GitHub (recomendado):** crie um repositório com o conteúdo desta pasta. Na Vercel, vá em **Add New → Project** e importe o repositório. Use o preset **Other**, com o comando de build vazio.

**Pelo terminal:**
```bash
npm i -g vercel
cd bombomba-vercel
vercel          # primeira vez: cria o projeto
vercel --prod   # publica
```

## Testar
1. Abra o site e vá em **JOGAR → ONLINE**. A nota do botão deve dizer "Crie uma sala, passe o código…".
2. Crie uma sala. Em outro aparelho, abra o site, digite o código e entre.

Se aparecer **"Servidor de salas indisponível"**:
- Confira as variáveis e faça o redeploy.
- Abra `https://seu-site.vercel.app/api/config`. Os campos do serviço escolhido devem vir preenchidos. Campo vazio indica valor fora do formato esperado.
- Firebase: confira se o login **Anônimo** está ativo, se as regras foram publicadas e se o domínio do site está em **Domínios autorizados**.

## Segurança
- As chaves enviadas ao navegador são públicas por natureza: a `apiKey` do Firebase e a anon do Supabase só identificam o projeto. Quem protege os dados são as regras do banco (Firebase) e as configurações do Realtime (Supabase).
- O `api/config.js` só aceita valores no formato esperado: URL `*.firebaseio.com` ou `*.firebasedatabase.app`, ou `*.supabase.co`, e chaves com caracteres válidos.
- O `vercel.json` aplica uma Content-Security-Policy:
  - scripts só do site, do jsDelivr (Supabase 2.45.4) e do gstatic (Firebase 10.12.2), mais o fallback de conexão do Firebase;
  - conexões só com o site, o Supabase, o Firebase e o login do Google;
  - sem `<object>`;
  - sem envio de formulários;
  - o site não pode ser embutido em outros domínios.
- Todo dado que chega da sala é validado antes de usar, e nomes vão para a tela só como texto.
- **Limites desta versão:**
  - Qualquer pessoa que tenha o código entra na sala. O código é sorteado, com cerca de 28 milhões de combinações.
  - O anfitrião roda a partida, então pode trapacear na própria sala.
  - Moedas e compras ficam no navegador do jogador.
  - Para ranking ou venda real de moedas, é preciso um servidor que valide as partidas e um banco de dados com as compras.
- **Vercel Hobby (gratuito)** é só para uso não comercial. Com venda real de moedas, o site precisa do plano Pro.
