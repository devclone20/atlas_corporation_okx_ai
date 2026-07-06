# 09 — Virtuals OS (EconomyOS) + CLI + Quickstart: creating, registering & deploying an agent

> Research domain: "How to actually create + deploy the ATLAS agent on Virtuals."
> Date: 2026-07-05. Rigor: verified facts only; `[UNVERIFIED]` = inferred, not directly confirmed in a fetched page.

---

## Sources fetched

- https://os.virtuals.io/quickstart — EconomyOS quickstart (redirects to the EconomyOS whitepaper app)
- https://os.virtuals.io/ — EconomyOS landing ("One prompt turns the agent you already run into a full economic actor")
- https://whitepaper-economyos-production.up.railway.app/quickstart — EconomyOS quickstart (canonical 5-step guide)
- https://github.com/Virtual-Protocol — org repo list (acp-cli, acp-node-v2, virtuals-python, protocol-contracts, etc.)
- https://github.com/Virtual-Protocol/acp-cli — full acp-cli command surface (README)
- https://raw.githubusercontent.com/Virtual-Protocol/acp-node-v2/main/README.md — ACP Node SDK v2 (registration + AcpAgent.create)
- https://github.com/game-by-virtuals — GAME org (game-python, game-node, twitter plugins)
- https://github.com/game-by-virtuals/game-node — GAME SDK (Node) overview
- https://raw.githubusercontent.com/game-by-virtuals/game-python/main/README.md — GAME SDK (Python)
- https://raw.githubusercontent.com/game-by-virtuals/game-node/main/plugins/acpPlugin/README.md — Node ACP GAME plugin wiring
- https://pypi.org/project/acp-plugin-gamesdk/ — Python ACP GAME plugin
- https://www.npmjs.com/package/@virtuals-protocol/game-acp-plugin — Node ACP GAME plugin (npm)
- https://whitepaper.virtuals.io/acp/acp-concepts-terminologies-and-architecture — ACP roles/phases/escrow
- WebSearch (os.virtuals.io, whitepaper.virtuals.io, docs.game.virtuals.io, console.game.virtuals.io)

Note: several deep whitepaper.virtuals.io paths now 404 (docs were reorganized). Where a page 404'd, I cross-checked the fact against a second source (npm/PyPI/raw GitHub) before recording it.

---

## Key Facts

- **"Virtuals OS" is now branded EconomyOS.** The product turns an agent you already run into an economic actor by wiring in **wallet + email + card** with "one prompt." Tagline: *"One prompt turns the agent you already run into a full economic actor — wallet, email, card wired in."* Marketed as *"No SDKs, no rebuild."*
- **There IS a CLI: `@virtuals-protocol/acp-cli`** (command binary `acp`). This is the single primary tool for creating/registering/operating an agent. `npm i -g @virtuals-protocol/acp-cli` (Node ≥ 18), or `npx @virtuals-protocol/acp-cli <command>`.
- **Agent creation (`acp agent create`) provisions a wallet + email automatically.** `acp agent add-signer` adds a P256 signing key. Auth is browser OAuth (Privy), tokens stored in the OS keychain — **no manual API keys for the CLI itself.**
- **Two build paths, and they are distinct:**
  1. **EconomyOS / acp-cli** (economic layer: wallet, email, card, trade, ACP marketplace, tokenization) — CLI-driven.
  2. **GAME SDK** (`@virtuals-protocol/game` / `game_sdk`) — the *autonomous agent brain* (Agent → Worker → Function), needs a `GAME_API_KEY` from `console.game.virtuals.io`.
  These are glued together by the **ACP GAME plugin** (`@virtuals-protocol/game-acp-plugin` / `acp-plugin-gamesdk`).
- **ACP settles in USDC on Base** (Base Sepolia for test, chain-id `8453` mainnet / `84532` sepolia). Escrow split: provider 90–95%, evaluator 5% (optional), protocol 5%.
- **Self-hosting is explicitly supported.** The quickstart lists deployment options as **Self-hosted (run CLI from your own terminal/server)** vs **Managed (Virtuals Console, no-code).** A DigitalOcean droplet fits the self-hosted path.
- The **ACP Node SDK v2** (`@virtuals-protocol/acp-node-v2`) is the newer, lower-level programmatic path (uses `AcpAgent.create` + `PrivyAlchemyEvmProviderAdapter`). Older env-var style (`AcpContractClient.build`, `SESSION_ENTITY_KEY_ID`) is the v1/plugin path still used by the GAME plugin.

---

## Virtuals OS (EconomyOS) overview

EconomyOS is the economic runtime that gives an autonomous agent the four "pillars" it needs to act in a market:

1. **Identity** — an on-chain **wallet** + an **email inbox** (for logins/OTPs and service auth).
2. **Capital** — **token launches** (tokenization) with trading-fee revenue routed to the agent wallet; **funding** via top-up (Coinbase/card/QR).
3. **Commerce** — the **Agent Commerce Protocol (ACP)** marketplace: the agent can hire specialists (as client) or sell services (as provider) over USDC escrow.
4. **Compute** — inference/memory/runtime billed directly to the agent wallet (no separate API billing).

It is delivered two ways: paste a prompt into an LLM/Claude Code to drive the **acp-cli**, or spin up a **managed agent in Virtuals Console** with EconomyOS built in. EconomyOS supplies the *money + identity + marketplace*; it does not, by itself, supply the agent's reasoning loop — that is GAME (or any agent framework you already run).

---

## Agent creation flow (email / wallet / token / onchain — step-by-step)

This is the CLI (EconomyOS) path — the one the quickstart teaches. Every command below is quoted verbatim from the acp-cli README / EconomyOS quickstart.

**0. Install**
```bash
npm i -g @virtuals-protocol/acp-cli        # Node >= 18
# or: npx @virtuals-protocol/acp-cli <command>
```

**1. Authenticate (OAuth, browser)**
```bash
acp configure                    # opens browser sign-in (~5 min); tokens saved to OS keychain, auto-refreshed
# non-interactive/agent split flow:
acp configure start --json
acp configure complete --request-id <id> --json
```

**2. Create the agent → provisions WALLET + EMAIL**
```bash
acp agent create
# non-interactive:
acp agent create --name "ATLAS" --description "24/7 Harness/Orchestrator" --image "https://.../atlas.png"
```
This automatically creates the on-chain **wallet** and the **email** identity. Verify:
```bash
acp agent whoami
acp wallet address --json
acp email whoami
```

**3. Add a signer (P256 key for on-chain signing)**
```bash
acp agent add-signer                     # generate P256 key + browser approval
acp agent add-signer --policy restricted # non-interactive with a signer policy
# split flow:
acp agent add-signer --no-wait --json
acp agent signer-status --request-id <id> --public-key <key> --json
```

**4. Fund the wallet**
```bash
acp wallet balance --json
acp wallet topup --chain-id 8453 --method coinbase --amount 25
acp wallet topup --chain-id 8453 --method card --amount 50 --email user@example.com
```

**5. (Optional) Email inbox operations** — the agent's provisioned inbox
```bash
acp email inbox
acp email extract-otp --message-id <id>
acp email compose --to "user@example.com" --subject "Hello" --body "Hi"
```

**6. (Optional) Tokenize the agent → launches a token, routes fees to wallet**
```bash
acp agent tokenize
acp agent tokenize --chain-id 8453 --symbol ATLAS
acp agent tokenize --chain-id 8453 --symbol ATLAS --prebuy 100
```

**7. On-chain registration (reputation / ERC-8004 identity registry)**
```bash
acp agent register-erc8004 --agent-id <id> --chain-id 84532
```
> EconomyOS anchors agent reputation on-chain via the **ERC-8004** standard (Virtuals on-chain identity registry). This matches ATLAS's existing stack context (iCLONE/VEGETA already ERC-8004 registered).

**8. (Optional) Virtual card for real-world checkout**
```bash
acp card signup --email "agent@example.com"
acp card profile set --first-name "..." --last-name "..." --phone-number "+1415..."
acp card payment-method
acp card limit set --amount 5000        # $50 cap
acp card issue --amount 2500            # issue $25 single-use card
```

**9. Enter the ACP marketplace** — sell or buy services (see "Connecting GAME + ACP")
```bash
# provider (sell):
acp offering create --name "Orchestration" --description "..." --price-type fixed --price-value 5.00 --sla-minutes 60 --requirements "..." --deliverable "..."
# client (buy):
acp browse "data analysis" --chain-ids 8453 --top-k 5
acp client create-job --provider 0xAddr --offering-name "..." --requirements '{...}' --chain-id 8453
acp client fund --job-id 42 --amount 0.50 --chain-id 8453
```

**Alternative registration path (programmatic / SDK):** register the agent in the **Service Registry** UI at `https://app.virtuals.io/acp/new`, then on the agent page (`https://app.virtuals.io/acp/agents/`) open the **Signers** tab → **+ Add Signer** → **Copy Key** to obtain the signer private key, and read the **Builder Code** (`bc-...`) under **Settings**. Used by `@virtuals-protocol/acp-node-v2` and the GAME plugin.

---

## CLI / SDK (name + real install + commands)

### Primary CLI — `@virtuals-protocol/acp-cli` (binary: `acp`)
```bash
npm i -g @virtuals-protocol/acp-cli        # Node >= 18
```
Real command groups (all verbatim from README): `acp configure`, `acp agent {create,add-signer,list,use,whoami,update,tokenize,register-erc8004,migrate,signer-policy,set-signer-policy}`, `acp wallet {address,balance,sign-message,sign-typed-data,send-transaction,topup}`, `acp wallet sol {...}`, `acp email {whoami,provision,inbox,compose,search,thread,reply,extract-otp,extract-links,attachment}`, `acp card {signup,profile,payment-method,limit,issue,list,get,3ds}`, `acp offering {list,create,update,delete}`, `acp subscription {...}`, `acp resource {...}`, `acp client {create-job,create-custom-job,fund,complete,reject,review}`, `acp provider {set-budget,submit,...}`, `acp job {list,history,watch}`, `acp browse`, `acp message send`, `acp events {listen,drain}`, `acp trade {...}`, `acp chain list`, `acp compute {status,top-up}`, `acp policy {...}`, `acp skill print`. All commands accept `--json` for machine/LLM orchestration.

`acp skill print` prints the full operating guidance — useful to feed into ATLAS itself.

### Agent brain — GAME SDK
- **Node:** `npm install @virtuals-protocol/game`
- **Python:** `pip install game_sdk`  (import package: `game_sdk`)
- Model: **Agent** (high-level planner: goal + description + `getAgentState`/`get_agent_state_fn` + `workers`) → **Worker** (low-level executor) → **Function** (returns `ExecutableGameFunctionResponse`).
- Node init (verbatim shape):
  ```typescript
  const agent = new GameAgent("your_api_key", {
    name: "Agent Name", goal: "Primary goal", description: "...",
    getAgentState: agent_state_function, workers: [worker1, worker2],
  });
  await agent.init();
  await agent.run(60, { verbose: true });
  ```
- **API key:** obtain from **https://console.game.virtuals.io/**, export as `GAME_API_KEY`.

### Lower-level ACP SDK — `@virtuals-protocol/acp-node-v2`
```bash
npm install @virtuals-protocol/acp-node-v2   # peer deps: viem, @account-kit/infra
```
```typescript
const buyer = await AcpAgent.create({
  provider: await PrivyAlchemyEvmProviderAdapter.create({
    walletAddress: "0xBuyerWalletAddress",
    walletId: "wallet-id",
    signerPrivateKey: "signer-private-key",
    chains: [base],
    builderCode: "bc-...", // optional
  }),
});
```
Python SDK equivalent: `virtuals-python` (`pip`), `virtuals_acp.client.VirtualsACP`.

---

## Hosting (can it run on our own droplet?)

**Yes.** The EconomyOS quickstart explicitly lists **"Self-hosted: Run CLI from your own terminal/server"** as a first-class deployment option (vs the managed Virtuals Console). Concretely for ATLAS on DigitalOcean:

- Install `@virtuals-protocol/acp-cli` (Node ≥ 18) on the droplet; run the GAME agent process (Node or Python) as a long-running service.
- **Gotcha for headless servers:** `acp configure` and `acp agent add-signer` default to **browser OAuth**. On a droplet you must use the **split/non-interactive flows** (`acp configure start/complete --json`, `acp agent add-signer --no-wait --json`) — do the browser approval on your laptop, complete via `--request-id` on the server.
- Credentials live in the **OS keychain** by default (`cross-keychain`). On a Linux droplet this needs a keychain backend (e.g. gnome-keyring/`libsecret`) or the CLI's alternate storage; verify before assuming laptop parity `[UNVERIFIED — keychain backend behaviour on headless Linux not confirmed in fetched docs]`.
- This aligns with the existing production droplet pattern already in ATLAS/CLONE FRAME ops (P256 signer, ACP). The GAME agent + acp-cli can run under a systemd service the same way our existing agent service does.
- The **runtime loop** (24/7 orchestration) is your own process (GAME `agent.run(...)` or a custom loop). EconomyOS does not host the brain unless you use Console.

---

## Credentials / keys needed

| Credential | Where from | Used by |
|---|---|---|
| **OAuth session (Privy)** | `acp configure` (browser); stored in OS keychain | acp-cli — all commands |
| **Agent wallet** | auto-provisioned by `acp agent create` | signing, funding, escrow |
| **Agent email** | auto-provisioned by `acp agent create` | logins/OTP, service auth |
| **P256 signer key** | `acp agent add-signer` | on-chain signing |
| **`GAME_API_KEY`** | https://console.game.virtuals.io/ | GAME SDK + ACP GAME plugin |
| **`WHITELISTED_WALLET_PRIVATE_KEY`** | your dev/whitelisted wallet (**no `0x` prefix**) | ACP GAME plugin |
| **`SESSION_ENTITY_KEY_ID`** / `BUYER_ENTITY_ID` | Service Registry page (app.virtuals.io agent page) | ACP GAME plugin |
| **`AGENT_WALLET_ADDRESS`** / `BUYER_AGENT_WALLET_ADDRESS` | Service Registry / agent page | ACP GAME plugin |
| **Signer private key** (`signerPrivateKey`) | agent page → **Signers** tab → **+ Add Signer** → **Copy Key** | acp-node-v2 |
| **Builder Code** `bc-...` (optional) | agent page → **Settings** | attribution on base.dev |
| **USDC on Base** | `acp wallet topup` | ACP escrow, trading, compute |

No X/Twitter or third-party keys are required for the core create/deploy path.

---

## Connecting GAME + ACP

The **ACP GAME plugin** bridges the GAME brain to the ACP marketplace. It exposes an ACP `Worker` you drop into your GameAgent.

**Node** — `@virtuals-protocol/game-acp-plugin`
```bash
npm i @virtuals-protocol/game-acp-plugin
```
```typescript
// build the on-chain client from the whitelisted wallet + session entity + agent wallet
const acpContractClient = await AcpContractClient.build(
  "<your-whitelisted-wallet-private-key>",   // no 0x prefix
  "<your-session-entity-key-id>",
  "<your-agent-wallet-address>",
  baseAcpConfig
);

const acpPlugin = new AcpPlugin({
  apiKey: "<your-GAME-api-key-here>",
  acpClient: new AcpClient({
    acpContractClient,
    onEvaluate: async (job: AcpJob) => { /* approve/reject deliverables */ },
  }),
});

// wire into the GameAgent
const agent = new GameAgent(GAME_API_KEY, {
  // ...name/goal/description...
  getAgentState: async () => { return await acpPlugin.getAcpState(); },
  workers: [ /* your own worker */, acpPlugin.getWorker() ],
});
```

**Python** — `acp-plugin-gamesdk`
```bash
pip install acp-plugin-gamesdk
```
```python
from acp_plugin_gamesdk.acp_plugin import AcpPlugin, AcpPluginOptions
from virtuals_acp.client import VirtualsACP

acp_plugin = AcpPlugin(
    options=AcpPluginOptions(
        api_key=env.GAME_API_KEY,
        acp_client=VirtualsACP(
            wallet_private_key=env.WHITELISTED_WALLET_PRIVATE_KEY,   # no 0x prefix
            agent_wallet_address=env.BUYER_AGENT_WALLET_ADDRESS,
            entity_id=env.BUYER_ENTITY_ID,
        ),
        cluster="<cluster>",
    )
)
# then add acp_plugin's worker to the GAME agent's workers list and
# use acp_plugin.get_acp_state() as the agent state provider
```

Once attached, the agent gains ACP actions: browse the registry, respond to jobs, set budget, submit deliverables, evaluate — driven by GAME's planner.

**Newer alternative:** skip the GAME plugin and drive ACP directly with `@virtuals-protocol/acp-node-v2` (`AcpAgent.create` + `PrivyAlchemyEvmProviderAdapter`), calling ACP methods from your own orchestration loop. For a *24/7 Harness/Orchestrator* like ATLAS this is arguably the cleaner fit (you control the loop; ACP is just an SDK), but it means you own the reasoning layer instead of leaning on GAME's planner.

---

## Risks & Gotchas

1. **Docs are in flux / branding churn.** "Virtuals OS" → **EconomyOS**; many `whitepaper.virtuals.io/...` deep links now 404. The stable canonical surfaces are the **GitHub READMEs**, **npm/PyPI**, and the **EconomyOS whitepaper app**. Treat blog/tutorial URLs as fragile.
2. **Two overlapping ACP stacks.** Legacy: `AcpContractClient.build(...)` + env vars `WHITELISTED_WALLET_PRIVATE_KEY` / `SESSION_ENTITY_KEY_ID` (used by the GAME plugin). New: `@virtuals-protocol/acp-node-v2` with `AcpAgent.create` / `PrivyAlchemyEvmProviderAdapter`. Pick ONE per component to avoid confusion; `acp-node` (v1) is **deprecated**.
3. **Headless OAuth.** Browser-based `acp configure` / `add-signer` don't work cleanly on a bare droplet — must use `--json` split flows. Plan the laptop→server hand-off.
4. **Keychain on Linux.** CLI stores secrets in an OS keychain; headless Linux needs a secret backend. Verify before production.
5. **Private key hygiene.** `WHITELISTED_WALLET_PRIVATE_KEY` sits in `.env` / process env. World-class bar: keep it off the droplet where possible (the acp-node-v2 Privy/Alchemy smart-account model avoids a raw hot key — prefer it). Never commit; matches existing CLONE FRAME secret rules.
6. **Real money.** `acp wallet topup`, `acp trade`, `acp client fund`, `acp agent tokenize` move real USDC/ETH on Base. Test on **Base Sepolia (84532)** first.
7. **`--0x` prefix trap.** `WHITELISTED_WALLET_PRIVATE_KEY` must be entered **without** the `0x` prefix in the GAME plugin — silent failures otherwise.
8. **GAME API key is separate** from EconomyOS auth. The CLI needs no API key; the GAME brain + plugin do. Don't conflate them.

---

## Open Questions

1. **Does ATLAS use GAME as its brain, or its own harness loop?** If ATLAS already has an orchestrator (Harness Engine), the cleanest wiring is **acp-node-v2 as an SDK inside our loop**, not GAME + game-acp-plugin. Decide before building.
2. **Headless keychain / secret storage** on the target DigitalOcean droplet — exact CLI behaviour and supported backends `[UNVERIFIED]`.
3. **Exact `acp configure` non-interactive semantics** for CI/servers (token lifetime, refresh on a headless box) — needs a live test.
4. **Relationship between `acp agent create` wallet and the app.virtuals.io Service Registry agent** — are they the same agent identity, or does tokenization/ACP require a separate Service Registry registration? The two flows (CLI vs `app.virtuals.io/acp/new`) may need reconciliation `[UNVERIFIED]`.
5. **`baseAcpConfig` / `cluster` values** — the exact config object/cluster string for Base mainnet vs sepolia not captured; read from the plugin README at build time.
6. **ERC-8004 registration overlap** — ATLAS/CLONE FRAME already registered its prior agents (iCLONE / VEGETA). Confirm `acp agent register-erc8004` doesn't collide or double-register.

---

## Implications for ATLAS

- **Green light on self-hosting.** ATLAS's 24/7 Harness/Orchestrator can run on our own DigitalOcean droplet (same pattern as our existing production droplet / agent systemd service). EconomyOS is the economic layer, not a forced host.
- **Step 4 of the roadmap ("open the agent via Virtuals CLI with email/wallet/onchain") maps 1:1 to:**
  `npm i -g @virtuals-protocol/acp-cli` → `acp configure` → `acp agent create` (wallet+email) → `acp agent add-signer` → `acp wallet topup` → (optional) `acp agent tokenize` / `acp agent register-erc8004`. That is the literal zero-to-live sequence.
- **Brain decision is the real fork.** Given ATLAS is an orchestrator we're building ourselves (Harness Engine), prefer **`@virtuals-protocol/acp-node-v2` as an SDK inside our own loop** over adopting GAME's planner. Use GAME + `game-acp-plugin` only if we want GAME's autonomous planning for free.
- **Credentials to procure now:** a `GAME_API_KEY` (only if using GAME), a funded **USDC-on-Base** wallet, and the **Service Registry agent + signer** from `app.virtuals.io/acp/new`. The CLI's own OAuth needs no key.
- **Test on Base Sepolia (84532)** before any mainnet USDC movement. Keep the whitelisted key out of the droplet if we go the acp-node-v2 Privy/Alchemy smart-account route (better security posture, aligns with the world-class bar).
