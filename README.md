# Estopim no seu site (Vercel + Supabase)

O site fica na **Vercel**. As salas online passam pelo **Supabase Realtime**, porque a Vercel não mantém as conexões abertas que uma sala de jogo precisa. Qualquer pessoa com o link do site e o código da sala consegue jogar online, sem precisar de conta.

## O que tem na pasta

| Arquivo | Para que serve |
|---|---|
| `index.html` | O jogo completo |
| `net-supabase.js` | Liga as salas do jogo ao Supabase Realtime |
| `api/config.js` | Função da Vercel que entrega ao navegador o endereço e a chave pública do Supabase, lidos das variáveis de ambiente |
| `vercel.json` | Cabeçalhos de segurança (CSP e outros) |

## 1. Criar o projeto no Supabase (uns 5 minutos)

1. Crie uma conta em supabase.com e clique em **New project**. Escolha um nome e uma região perto de você, por exemplo São Paulo, e espere o projeto ficar pronto.
2. Abra **Project Settings → API** (em projetos novos, **API Keys**) e copie dois valores:
   - **Project URL**, no formato `https://xxxxxxxx.supabase.co`;
   - a chave **anon public**, ou a **publishable key** (`sb_publishable_...`) em projetos novos.
3. Em **Project Settings → Realtime**, confira que o acesso público está permitido: a opção de aceitar só canais privados deve ficar **desligada**.

Não precisa criar tabela nenhuma: as salas usam só Broadcast e Presence.

> Nunca use a chave **service_role** (ou **secret**) no site. Ela dá acesso total ao projeto.

## 2. Subir na Vercel

**Opção A, pelo GitHub (recomendada):**
1. Crie um repositório e envie o conteúdo desta pasta.
2. Na Vercel, vá em **Add New → Project** e importe o repositório.
3. Em **Framework Preset**, escolha **Other**. Deixe o comando de build vazio e o diretório de saída como está.

**Opção B, pelo terminal:**
```bash
npm i -g vercel
cd estopim-vercel
vercel          # primeira vez: cria o projeto
vercel --prod   # publica
```

## 3. Configurar as chaves

1. Na Vercel, abra **Settings → Environment Variables** e crie:

   | Nome | Valor |
   |---|---|
   | `SUPABASE_URL` | o Project URL do passo 1 |
   | `SUPABASE_ANON_KEY` | a chave anon/publishable do passo 1 |

2. Faça um novo deploy (**Deployments → ⋯ → Redeploy**) para as variáveis passarem a valer.

## 4. Testar

1. Abra o site, toque em **JOGAR → ONLINE**. A nota do botão deve dizer "Crie uma sala, passe o código…".
2. Crie uma sala, abra o site em outro aparelho ou navegador, digite o código e entre.

Se aparecer **"Servidor de salas indisponível"**:
- Confira as duas variáveis na Vercel e faça o redeploy.
- Abra `https://seu-site.vercel.app/api/config`. Os dois campos devem vir preenchidos. Se vier vazio, o valor está fora do formato esperado: a URL precisa terminar em `.supabase.co`.

## Limites e custos

- **Supabase gratuito:** tem cota mensal de mensagens do Realtime. Uma partida de 4 pessoas usa até cerca de 3.000 mensagens por minuto, porque o anfitrião envia o estado da partida cerca de 15 vezes por segundo. Acompanhe em **Usage** no painel e confira os limites atuais do plano.
- **Vercel Hobby (gratuito):** serve para projetos pessoais e não comerciais. Quando o jogo passar a vender moedas com dinheiro de verdade, o site precisa do plano Pro.
- **Atualizar o jogo:** troque o `index.html`, ou envie o commit no GitHub, e a Vercel publica sozinha.

## Segurança

- A chave anon é pública por natureza: ela só permite entrar em salas. O `api/config.js` aceita só URLs `https://*.supabase.co` e chaves com caracteres válidos.
- O `vercel.json` aplica uma Content-Security-Policy:
  - scripts só do próprio site e do jsDelivr (biblioteca do Supabase na versão fixa 2.45.4);
  - conexões só com o próprio site e `*.supabase.co`;
  - sem `<object>`;
  - sem envio de formulários;
  - o site não pode ser embutido em outros domínios.
- Todo dado que chega da sala é validado antes de usar, e nomes vão para a tela só como texto.
- **Limites desta versão:**
  - Qualquer pessoa que tenha o código entra na sala. O código é sorteado, com cerca de 28 milhões de combinações.
  - O anfitrião roda a partida, então pode trapacear na própria sala.
  - Moedas e compras ficam no navegador do jogador.
  - Para ranking ou venda real de moedas, é preciso um servidor que valide as partidas e um banco de dados com as compras.
