# ACP Tracer — Conceito & Especificação Funcional (Handoff)

> **Objetivo deste documento:** transportar a *ideia completa* do ACP Tracer para um
> projeto novo, melhor implementado, noutra conversa. Aqui **não há design nem
> arquitetura** — só *o que ele é* e *tudo o que ele deve fazer*, ao detalhe.
> Onde há uma decisão já tomada (ex.: verdade sobre a iNFT vs OKX), está marcada
> como **[FACTO VERIFICADO]** para não se voltar a discutir.

---

## 0. Uma frase

O ACP Tracer é o **posto de comando do dono de um agente on-chain**: uma app onde
ligas a tua wallet, ligas o teu LLM, "carregas" o teu agente (ex.: ATLAS), e a
partir de um **terminal estilo Claude Code** com um **copiloto (Harness) que tem
nome e uma equipa de sub-agentes**, consegues **ligar o agente à OKX AI / X Layer,
publicar serviços, aceitar trabalhos, entregar, cobrar e acompanhar tudo ao vivo** —
sempre com o humano no comando das ações que gastam dinheiro.

---

## 1. Problema que resolve

Hoje, para pôr um agente a trabalhar num marketplace on-chain (OKX AI / ACP), o dono
tem de saltar entre: CLI (`onchainos`), a wallet, o registo ERC-8004, o servidor do
endpoint pago (x402), a documentação, e um LLM à parte para o ajudar. É frágil,
disperso e fácil de errar (e erros aqui gastam dinheiro real ou levam a rejeições).

O ACP Tracer junta tudo num sítio só e mete **um LLM copiloto que entende o
ecossistema** a guiar cada passo — mas nunca a assinar transações sozinho.

---

## 2. Princípios inegociáveis (herdados do ATLAS / Harness Engine)

1. **No-LLM-in-signing-path** — o LLM aconselha, redige, explica, mas **nunca**
   está no caminho de assinatura de uma transação. Assinar é sempre uma ação
   explícita do humano (ou de uma automação que o humano pré-autorizou com limites).
2. **Quatro gates não-colapsáveis** antes de qualquer ação que mova valor:
   - **Committee ≥ 2** (dois sub-agentes têm de concordar),
   - **Safety veto** (um agente de segurança pode vetar),
   - **Policy caps/allowlist** (limites de valor + destinos permitidos),
   - **Owner HITL** (o humano confirma).
3. **Chaves ficam no cliente** — a chave do LLM e a sessão da wallet nunca vão para
   um servidor nosso. Tudo BYO (bring-your-own).
4. **Só leitura por defeito** — qualquer verificação de estado (saldos, estado do
   agente na OKX, etc.) é read-only; nada re-submete nem altera estado sem gate.
5. **Limites de tesouraria** — cap diário (ex.: $100/dia) + whitelist para a cold
   wallet do dono. Acima disso, bloqueia e pede confirmação reforçada.

---

## 3. As secções / abas (o que cada uma FAZ)

O Tracer tem 7 zonas. A **primária/por-omissão é o Terminal**.

### 3.1 Terminal (principal)
- Terminal estilo **Claude Code desktop**: prompt, histórico, streaming de respostas
  do LLM token-a-token, blocos de código copiáveis, e **"fluxos" guiados** (runFlow)
  que mostram um passo-a-passo animado (ex.: fluxo "link" mostra a ponte de
  identidade; fluxo "publish" mostra a publicação de um serviço).
- Aceita **linguagem natural** ("liga o meu agente à OKX", "publica um serviço de
  swap quote a 0.05 USDT0 por chamada") **e comandos slash** (ver 3.1.1).
- O terminal é a "boca" do **Harness** (o copiloto). Quando escreves, é o Harness
  (LLM + a sua equipa) que responde e propõe ações.
- Ações que gastam dinheiro nunca são executadas pelo texto — geram um **cartão de
  confirmação** (gate HITL) que o humano tem de aprovar.

#### 3.1.1 Slash commands (mínimo)
- `/help` — lista tudo.
- `/link` — inicia o fluxo de ligar o agente à OKX / X Layer (ponte de identidade).
- `/publish` — publica um serviço (A2MCP x402 ou A2A). Pergunta tipo, endpoint,
  preço, e as *input conventions* (disclaimers) do serviço.
- `/status` — estado do agente na OKX (under review / rejected / live).
- `/identity` — mostra a identidade: iNFT (owner+soul), owner wallet / 6551,
  OKX Agentic Wallet, registo ERC-8004 #id.
- `/balance` — saldos multi-chain da wallet ligada.
- `/connect` — liga a wallet.
- `/model` — escolhe o modelo do LLM.
- `/key` — mete/atualiza a chave do LLM (fica em localStorage).
- `/harness` — troca de harness ativo / lista harnesses.
- `/clear` — limpa o terminal.

### 3.2 Connect (wallet)
- Login real com wallet via **EIP-1193 injetada** (`window.ethereum`,
  `eth_requestAccounts`). Mostra endereço, permite trocar de conta (listener
  `accountsChanged`), desligar.
- Depois de ligar, dispara automaticamente: carregar saldos + carregar NFTs.

### 3.3 Create · Soul
- Onde defines/editas a **"alma" (soul)** do agente: nome, personalidade, missão,
  regras de comportamento, tom, limites. É um documento/preset (não código).
- A soul é o que dá identidade e comportamento — **[FACTO VERIFICADO]** a OKX
  **não lê** a soul; ela é para o teu lado (guia o LLM/harness e é a "escritura" do
  agente na iNFT). A OKX só conhece o registo ERC-8004.

### 3.4 Automations
- Onde defines automações **pré-autorizadas pelo dono** com limites: "aceita jobs
  deste tipo até X USDT", "responde a menções", "renova o endpoint", etc.
- Cada automação carrega **os 4 gates**. O dono define caps e allowlist uma vez; a
  automação só age dentro disso; acima disso, pede HITL.
- **[FACTO VERIFICADO]** automações que movem valor são owner-gated — nunca
  totalmente autónomas no caminho de assinatura.

### 3.5 Publish
- Publicar serviços do agente no marketplace:
  - **A2MCP** = endpoint HTTP **pay-per-call** via **x402** (o cliente paga por
    chamada). Precisa de: tipo de serviço, endpoint, preço, e **input conventions**
    (o "disclaimer" que diz exatamente o que o serviço exige/entrega).
  - **A2A** = trabalho negociado com **escrow** (dois agentes negoceiam e há
    depósito em garantia).
- **[FACTO VERIFICADO — regra anti-rejeição OKX]** o serviço tem de ser
  **distinto** dos serviços já listados por outros agentes. Copiar um serviço
  idêntico ao de outro agente → **rejeição por similaridade** (aconteceu: o
  "Token Security Scan" era cópia do agente #2183; resolveu-se ao reposicionar para
  "Best-Route Swap Quote"). Regra prática: posicionamento único + descrição própria.
- **Exemplo de input conventions (o formato a preencher), estilo Virtuals ACP:**
  > *Trades: lowercase 0x contract addresses (no tickers). Required: token_in,
  > token_out, amount_in (human units), recipient. Slippage default 3%. Full refund
  > on failure/SLA.*
  O Tracer deve ter um campo destes por serviço e ajudar o dono a escrevê-lo bem.

### 3.6 Live tracker
- Acompanhamento **ao vivo** do ciclo de vida dos jobs/serviços: pedidos a chegar,
  jobs aceites, em execução, entregues, pagos, reembolsos, falhas de SLA.
- Mostra o estado do agente na OKX (under review / live) e eventos do endpoint x402.
- **[FACTO VERIFICADO — máquina de estados OKX]** `2 = under review`,
  `5 = rejected`, `6 = completed/live`. **Nunca re-ativar enquanto está em `2`**
  (é anti-spam e prejudica). Se `rejected` → corrige e re-ativa o *mesmo* agente.

### 3.7 Harness · Gates
- Painel que mostra o **harness ativo, o seu nome, e a sua equipa (CREW)**, o estado
  dos 4 gates, os caps/allowlist ativos, e permite **trocar de harness** ou
  **adicionar um novo harness**.

---

## 4. O Harness (o copiloto) — conceito central

- Um **Harness** é o copiloto que vive no terminal: um LLM + **uma equipa de
  sub-agentes com papéis** + as regras/gates + a soul do agente que ele opera.
- **Cada harness tem um NOME.** O harness do ATLAS chama-se (ex.) "ATLAS" e traz
  **a equipa completa do ATLAS lá dentro**.
- **Podes adicionar mais harnesses** (para outros agentes/projetos) e trocar entre
  eles. Cada um traz a sua soul, a sua equipa e os seus limites.

### 4.1 A equipa (CREW) — 9 papéis
1. **Orchestrator** — coordena a missão, decide a ordem dos passos.
2. **Job-Hunter** — procura trabalhos/oportunidades no marketplace.
3. **Research** — pesquisa (read-only) o que for preciso para decidir.
4. **Delivery** — executa/entrega o trabalho aceite.
5. **Evaluator** — avalia qualidade/resultado (é um dos votos do committee ≥2).
6. **Treasury** — trata de pagamentos, caps, allowlist (nunca assina sozinho).
7. **Content** — redige descrições, respostas, input conventions, copy.
8. **Safety** — o veto de segurança (pode travar qualquer ação).
9. **Oracle** — encaminha/roteia informação externa (preços, rotas, dados).

- O committee ≥2 usa membros da CREW (ex.: Evaluator + Safety) para aprovar antes
  de qualquer ação com valor.

---

## 5. Terminal estilo Claude Code (detalhe funcional)

- **BYO-LLM** — o dono mete a sua própria chave. Suportar:
  - **Anthropic direct-from-browser** (header
    `anthropic-dangerous-direct-browser-access: true`, endpoint
    `/v1/messages`, streaming SSE `content_block_delta`; modelos:
    `claude-opus-4-8`, `claude-sonnet-5`, `claude-haiku-4-5`, `claude-fable-5`).
  - **OpenAI-compatible** (CORS funciona; permite baseUrl custom).
  - **Local** (Ollama / LM Studio em `localhost:11434` / `localhost:1234`).
- **Persistência** — `{provider, key, model, baseUrl}` guardado localmente
  (localStorage), com um **test-call** ao gravar para confirmar que a chave liga.
- **Streaming real** — resposta token-a-token no terminal (parser SSE).
- **System prompt do harness (HSYS)** — injeta a soul + as regras + os factos do
  ecossistema (X Layer, OKX, gates) para o LLM responder já "dentro do personagem"
  e com as verdades certas.

---

## 6. Wallet & multi-chain (o que mostra)

- Ligar via wallet injetada (ver 3.2).
- **Saldos nativos multi-chain**, via RPCs públicos CORS-open:
  - **X Layer** (chainIndex 196, `eip155:196`, gás **OKB**) — `rpc.xlayer.tech`.
  - **Base** (`0x2105`) — `base-rpc.publicnode.com`.
  - **Ethereum mainnet** (`0x1`), **BNB** (`0x38`), **Polygon PoS** (`0x89`),
    **Optimism** (`0xa`), **Arbitrum** (`0xa4b1`) — via `*.publicnode.com`.
  - **Solana** — `solana-rpc.publicnode.com`. **[FACTO VERIFICADO]** o RPC oficial
    `api.mainnet-beta.solana.com` devolve **403 a dApps** — usar o publicnode.
- Cada chain: `eth_getBalance` (ou equivalente Solana), renderiza saldo + símbolo.

## 7. NFTs
- Listar NFTs do dono via **Alchemy NFT API v3** (`getNFTsForOwner`) para
  eth/base/polygon/arbitrum mainnet. **[FACTO VERIFICADO]** precisa da **chave
  Alchemy grátis do próprio utilizador**; a **X Layer não é suportada** pela
  Alchemy → para NFTs de X Layer é preciso um indexer/proxy próprio (fica como
  peça futura).

---

## 8. "Load / connect an agent" — o que fornecer para carregar o agente

**[FACTO VERIFICADO — resposta à pergunta "o que devo fornecer? doc? github? executável?"]**

Carregar um agente **NÃO** é dar um repositório nem um binário. São **5 coisas** +
a escolha de **host**:

1. **Rail** — em que mercado opera (OKX AI / X Layer; ou Virtuals ACP como 2º rail).
2. **Identity** — o registo ERC-8004 do agente na OKX (o `#id`, ex.: ATLAS = #4460).
3. **Brain** — a chave do LLM (BYO).
4. **Soul** — o documento/preset de comportamento (a alma).
5. **Skills** — as capacidades/serviços que ele expõe.

**Host (onde o agente "corre"):**
- **My machine** — corre localmente.
- **Droplet provision** — provisiona num droplet novo (via SSH).
- **Droplet connect** — liga a um droplet existente (SSH + agent id).

---

## 9. Ponte de identidade (iNFT ⇄ OKX) — a verdade

**[FACTO VERIFICADO — resposta definitiva à pergunta "a iNFT na wallet é suficiente
para trazer o nosso agente para dentro da OKX e fazer tudo?"]**

**NÃO.** A iNFT **não** é suficiente. Fluxo real:

```
iNFT (owns + soul)  →  owner wallet / ERC-6551 (token-bound account)
      →  [afirmado pelo owner]  →  OKX Agentic Wallet (TEE)
      →  registo ERC-8004 na X Layer (ex.: ATLAS #4460)
```

- A OKX **sempre** exige o **seu próprio registo ERC-8004 na X Layer**, ligado à
  **OKX Agentic Wallet** — **não** à NFT. Não há import/bridge da NFT para dentro
  da OKX.
- A iNFT dá **posse/escritura + a soul**; a **OKX nunca lê a soul nem a NFT**.
- A identidade OKX é **fresca** (nova), ancorada na Agentic Wallet, não "trazida"
  da NFT. O elo iNFT→OKX é **afirmado pelo dono**, não lido pela OKX.

O terminal deve explicar isto claramente no fluxo `/link` (é fonte de confusão).

---

## 10. Publicar serviço pago (x402) — o que o dono precisa de saber

- **SDK oficial do seller:** `@okxweb3/x402-express` + `@okxweb3/x402-core` +
  `@okxweb3/x402-evm`.
- **Facilitator OKX:** `web3.okx.com/facilitator`, endpoints
  `/api/v6/pay/x402/{verify,settle,supported}`; cliente
  `OKXFacilitatorClient({apiKey, secretKey, passphrase, baseUrl?})` (chaves de
  sub-conta SA).
- **Ativo de liquidação:** **USDT0** `0x779ded0c9e1022225f8e0630b35a9b54be713736`
  (6 casas decimais, suporta EIP-3009).
- **Desafio 402:** header `PAYMENT-REQUIRED`.
- **Validação:** `onchainos agent x402-check`.
- No Tracer, publicar A2MCP deve pedir: endpoint, preço em USDT0, input conventions,
  e testar o desafio 402 antes de anunciar como live.

---

## 11. A peça que faltava (deixar claro na nova implementação)

No protótipo anterior, ficaram **reais**: wallet connect, saldos multi-chain, NFTs,
e o **LLM a falar a sério** (chamada real à API, streaming). O que **faltava** para
ser 100% funcional era um **backend runner**: um serviço que executa de verdade os
comandos `onchainos` / `acp` (publicar, aceitar, entregar, x402-check) e que
provisiona/liga droplets. No browser não dá para correr a CLI nem assinar do lado do
servidor — por isso a nova implementação deve incluir esse **runner** (com os gates
e o cap de tesouraria), que é o elo entre "o terminal propõe" e "a ação acontece
on-chain".

Peças futuras já identificadas:
- **Backend runner** (executa CLI + provisiona/liga droplet) — *a mais importante*.
- **SIWE / verificação de EOA** (precisa de lib de cripto ou servidor).
- **Indexer/proxy de NFTs da X Layer** (Alchemy não cobre X Layer).
- **Virtuals ACP como 2º rail**.

---

## 12. Regras operacionais que o agente/harness deve "saber" (ensinar via HSYS + CLAUDE.md)

- Códigos de estado OKX: `2` under review, `5` rejected, `6` live. Nunca re-ativar
  em `2`. Rejected → corrigir + re-ativar o mesmo agente.
- **Nunca aplicar manualmente** um job — só trabalhar depois de `job_accepted`.
- **Formato de entrega** consistente (o que se entrega e como).
- **Input conventions** por serviço, explícitas (endereços 0x minúsculos, campos
  obrigatórios, slippage default, política de reembolso).
- Factos X Layer: chainIndex 196, gás OKB, gasless para ops de agente.
- Compliance: serviço distinto (anti-similaridade), só leitura nas verificações,
  caps + allowlist, HITL nas ações com valor.

---

## 13. Definição de "está a funcionar" (checklist para a nova build)

- [ ] Wallet liga a sério e mostra o endereço; troca de conta funciona.
- [ ] Saldos aparecem para as 7+ chains (X Layer, Base, ETH, BNB, Polygon, OP,
      Arbitrum) + Solana, com dados on-chain reais.
- [ ] NFTs aparecem (com a chave Alchemy do utilizador).
- [ ] LLM liga com a chave do utilizador e responde em streaming no terminal.
- [ ] Slash commands todos funcionam.
- [ ] Cada harness tem nome; o do ATLAS traz a equipa (9 papéis); dá para adicionar
      mais harnesses e trocar.
- [ ] Load-an-agent recolhe as 5 coisas + escolhe host.
- [ ] Os 4 gates disparam antes de qualquer ação com valor; nada assina sem HITL.
- [ ] `/link` explica corretamente a ponte iNFT→OKX (a verdade da secção 9).
- [ ] Publish cria um serviço *distinto* com input conventions e testa o 402.
- [ ] Live tracker mostra o ciclo de vida dos jobs + estado OKX.
- [ ] **Backend runner** executa as ações a sério (a peça nova).

---

## 14. Contexto de referência (para a nova conversa)

- Projeto-mãe: **ATLAS** — iNFT dual-rail (OKX X Layer OS + Virtuals ACP),
  agente OKX **#4460** (à data, `status 2 = under review`).
- Memória canónica do projeto: `atlas_corporation.md` (índice em `MEMORY.md`).
- Docs de research já existentes:
  `~/Desktop/atlas_corporation_okx_ai/docs/` →
  `OKX_SERVICE_PLAYBOOK.md`, `OKX_LISTING_COPY.md`,
  `okx_research/{01-05, agent_loading_deploy.md, inft_identity_bridge.md,
  okx_link_flow.md, clientside_wiring_spec.md}`.
- Protótipo anterior (só para consulta do que já foi provado, **não** para copiar o
  design): `~/Desktop/HTML/clone-frame-site/acptracer.html`.

> **Nota final:** este documento é *só conceito e funcionalidade*. Design,
> arquitetura, stack e implementação ficam ao critério da nova build — que deve ser
> melhor que o protótipo. Os pontos **[FACTO VERIFICADO]** são decisões fechadas;
> tudo o resto é para (re)desenhar bem.
