# 08 — Virtuals ACP (Agent Commerce Protocol)

> Research dossier for **ATLAS** (24/7 Harness/Orchestrator iNFT) — how ATLAS operates as an ACP **provider** and how it can **require ≥2 evaluators** before delivery settles.
> Date: 2026-07-05. Rigor: verified facts quoted from official sources; inferences marked `[UNVERIFIED]`.

---

## Sources fetched

Official Virtuals sources (fetched and read in full unless noted):

1. **Whitepaper — Commerce Layer / ACP chapter** — https://whitepaper.virtuals.io/about-virtuals/commerce-layer (+ `llms-full.txt` corpus at https://whitepaper.virtuals.io/llms-full.txt). Four-phase model, Proof of Agreement, escrow, fees.
2. **os.virtuals.io (EconomyOS) — ACP quickstart** — https://os.virtuals.io/quickstart
3. **os.virtuals.io — ACP CLI reference** — https://os.virtuals.io/acp/cli/reference
4. **os.virtuals.io — Provider workflow** — https://os.virtuals.io/acp/cli/provider-workflow
5. **os.virtuals.io — ACP architecture** — https://os.virtuals.io/acp/architecture (on-chain state machine + contracts)
6. **acp-node (v1) SDK README** — https://github.com/Virtual-Protocol/acp-node (raw `main`). **NOTE: v1 is DEPRECATED.**
7. **acp-node-v2 SDK README** — https://github.com/Virtual-Protocol/acp-node-v2 (raw `main`). **Canonical Node SDK.**
8. **acp-python SDK README** — https://github.com/Virtual-Protocol/acp-python (raw `main`). Package `virtuals-acp`.
9. **GAME ACP plugin (Node)** — https://github.com/game-by-virtuals/game-node/tree/main/plugins/acpPlugin (raw README). Package `@virtuals-protocol/game-acp-plugin`.
10. **GAME ACP plugin (Python)** — https://github.com/game-by-virtuals/game-python/tree/main/plugins/acp (raw README). Package `acp-plugin-gamesdk`.
11. **WebSearch** corroboration — Delphi Digital / Messari / whitepaper index (fees, PoA, graduation, evaluator market).

Registry / app URLs referenced across sources: **https://app.virtuals.io/acp/new** (register agent — current), **https://app.virtuals.io/acp/join** and **https://app.virtuals.io/acp** (older registry links, still cited by v1 docs), **https://app.virtuals.io/acp/scan** (marketplace scan), **https://app.virtuals.io/acp/agents/** (agent page — Signers/Settings tabs).

Pages that 404'd on direct fetch (content recovered via the `llms-full.txt` corpus and search snippets instead): the GitBook deep-dive URLs `.../agent-commerce-protocol-acp/technical-deep-dive`, `.../acp-concepts-terminologies-and-architecture`, `.../acp-dev-onboarding-guide`, `.../acp-tech-playbook`. GitBook serves these behind a query/redirect layer; the `.md?ask=` interface and `llms-full.txt` are the reliable machine-readable entry points.

---

## Key Facts

- **What ACP is:** "the commerce layer of Virtuals Protocol — a framework that enables secure, transparent, and verifiable commerce between autonomous AI agents." It manages agreements, coordinates exchanges, and ensures accountability, with **every transaction immutably recorded onchain**. Positioned by Virtuals as "A Standard for Permissionless AI Agent Commerce."
- **Chain:** Runs on **Base mainnet** (default config in both SDKs: `baseAcpConfig` / `BASE_MAINNET_ACP_X402_CONFIG_V2`). acp-node-v2 also supports **Solana** and is **multi-chain** (chain specified per job: `agent.createJob(chainId, ...)`).
- **Currency:** Service fees are denominated in **USDC**. **Gas is sponsored** (no ETH needed for the agent to transact — "Gas fee is sponsored, ETH is not required").
- **Four canonical phases:** **Request → Negotiation → Transaction → Evaluation** (whitepaper). The on-chain job state machine expresses these as: **Open → Budget Set → Funded → Submitted → Completed / Rejected**.
- **Proof of Agreement (PoA):** During Negotiation, terms are "cryptographically signed to create a Proof of Agreement (PoA)" and "recorded onchain." Evaluators assess deliverables **against the PoA**.
- **Evaluator = a first-class role.** "A key innovation in the ACP is the introduction of the evaluation phase and evaluator agents." Escrow holds funds "until an Evaluator verifies the work against a cryptographically signed Proof of Agreement," creating "an entire new market for evaluation services."
- **Two SDK generations:** **v1** (`acp-node`, callback/phase model — `onNewTask`/`onEvaluate`) is **deprecated**. **v2** (`acp-node-v2`, event-driven `AcpAgent`+`JobSession` with role-gated tools) is the maintained path. Python (`virtuals-acp`) still uses the v1-style callback model (`on_new_task`, `on_evaluate`).
- **There is NO standalone binary called `acp-cli`.** The CLI referenced in this dossier is the **EconomyOS `acp` CLI** at os.virtuals.io (commands like `acp offering create`, `acp browse`, `acp provider submit`). The "GAME ACP plugin" is a separate SDK integration, not a CLI.
- **Fees:** Virtuals applies a **1% fee**, split **70% to the agent creator / 30% to Virtuals Treasury** (this is the protocol trading-fee structure; see Fees section for scope caveat).
- **Graduation gate:** New agents run in a **sandbox**; an agent is marked **GRADUATED** by the team after **10 successful sandbox transactions** with a good completion rate. Graduation status is a first-class filter in discovery.

---

## ACP job lifecycle (step-by-step)

Two equivalent framings — the whitepaper's **4 conceptual phases** and the on-chain **state machine** — map onto each other:

| Whitepaper phase | On-chain status | System event (v2) | Who acts |
| --- | --- | --- | --- |
| **Request** | `open` | `job.created` | Buyer creates job; provider receives it |
| **Negotiation** | `budget_set` | `budget.set` | Provider proposes price → **Proof of Agreement** signed on-chain |
| **Transaction** | `funded` | `job.funded` | Buyer locks USDC in escrow (the Job contract) |
| (delivery) | `submitted` | `job.submitted` | Provider submits deliverable; **evaluator** notified |
| **Evaluation** | `completed` / `rejected` | `job.completed` / `job.rejected` | Evaluator approves (escrow → provider) or rejects (escrow → buyer) |
| (timeout) | `expired` | `job.expired` | SLA/expiry elapsed |

**Detailed flow:**

1. **Request (Open).** Buyer discovers a provider via `browseAgents()` / `acp browse`, then creates a job against a chosen **offering**. Job is created on-chain via the **Job Factory** contract; provider receives `job.created`. Buyer specifies the **evaluator address** and an **expiry** (SLA) at creation time.
2. **Negotiation (Budget Set).** Provider proposes a price (`setBudget` / `acp provider set-budget`). Buyer receives `budget.set`. Final terms are **cryptographically signed by both parties → Proof of Agreement (PoA)**, recorded on-chain. Chat messages (memos) can flow in this phase.
3. **Transaction (Funded).** Buyer locks the **full service fee in USDC into escrow** inside the **Job contract** (`session.fund(...)` / `acp client fund`). Provider receives `job.funded`.
4. **Delivery (Submitted).** Provider produces the work and submits the **deliverable** (`session.submit(url)` / `acp provider submit`). This transitions the job to `submitted` and **notifies the evaluator**.
5. **Evaluation.** The **evaluator** assesses the deliverable **against the PoA** and calls **`complete`/`evaluate(true)`** (approve) or **`reject`/`evaluate(false)`**. On approval the Job contract **auto-releases escrow to the provider**; on rejection, **escrow returns to the buyer**.
6. **Settlement.** Fund movement is executed by the Job contract's built-in escrow + **Hook contracts** (which handle fund transfers, subscriptions, etc.). Outcome is recorded on-chain, feeding the agent's reputation metrics (job count, success rate).

---

## Roles (buyer / provider / EVALUATOR)

Three roles. In v2 they are explicit `session.roles` values: **`"client"` / `"provider"` / `"evaluator"`**, and the SDK **gates available tools by role + status**.

### Buyer / Client / Requester
- Creates jobs, funds escrow, and — critically — **nominates the evaluator** for each job.
- v2 tools by status: `open` → `sendMessage`, `wait`; `budget_set` → `sendMessage`, **`fund`**, `wait`.
- Discovery: `browseAgents(keyword, {sortBy, topK, isOnline, cluster, showHidden})`.

### Seller / Provider (ATLAS's primary role)
- Registers on the Service Registry with **≥1 offering** (Service Offering + Requirement Schema). Selects role **"Provider"** at registration.
- Reacts to `job.created` → proposes budget → on `job.funded` → produces + **submits deliverable**.
- v2 tools by status: `open` → `setBudget`, `sendMessage`, `wait`; `budget_set` → `setBudget`; `funded` → **`submit`**.

### EVALUATOR (the mechanics — most important for ATLAS)

**How it works:**
- The evaluator is set **per job, at job-creation time, by the buyer**, via the **`evaluatorAddress` / `evaluator_address`** parameter. There is one `evaluatorAddress` field on the job.
  - v2 (Node): `createJobByOfferingName(chainId, name, providerAddr, requirementData, { evaluatorAddress })`.
  - Python: `initiate_job(provider_address, service_requirement, expired_at, evaluator_address)`.
- When the provider submits, the job enters `submitted` and the evaluator is notified. The evaluator's **only** tools at that point are **`complete(reason)`** (approve → release escrow) and **`reject(reason)`** (reject → refund). v2 tool gating: `Evaluator | submitted | complete, reject`.
- **Self-evaluation** = the buyer sets `evaluatorAddress` to **its own address** (v2 examples/basic: "buyer is its own evaluator"; the v2 quick-start passes `{ evaluatorAddress: buyerAddress }`). This is the default/simplest flow and requires no third party.
- **External evaluation** = the buyer sets `evaluatorAddress` to a **different agent** that is a dedicated evaluator. acp-node ships an **`external-evaluation`** example ("Buyer, seller, and external evaluator"). The external evaluator must have its **dev wallet whitelisted** on the Service Registry to sign the evaluation.
- The evaluator programmatically inspects `job.deliverable` and `job.serviceRequirement` and decides:
  - **Node (v1/GAME):** `onEvaluate: async (job) => { ...; await job.evaluate(true, "reasoning"); }`
  - **Python (GAME):** `def on_evaluate(job): ... job.evaluate(True)  # or False`
- **`evaluatorCluster` / `evaluator_cluster`** is a config option on the GAME plugin — `[UNVERIFIED]` exact semantics, but it names the cluster/pool from which evaluators are drawn/routed.

**Can we require MULTIPLE evaluators (≥2)?**
- **Verified:** The on-chain Job contract and both SDKs expose a **single `evaluatorAddress` per job**. There is **no documented native "N-of-M evaluators" / quorum field** in the public ACP contract, SDK, or CLI. So a job **natively resolves via exactly one evaluator address**.
- **[UNVERIFIED] / Design implication for ATLAS:** the ">=2 evaluators before delivery" requirement is **not a stock ACP primitive** — it must be **implemented in the evaluator layer**, using one of:
  1. **Aggregator/committee evaluator:** set `evaluatorAddress` to an ATLAS-controlled **committee evaluator** agent that internally polls ≥2 sub-evaluator agents (via their own ACP jobs or off-chain calls), applies a quorum rule, and only then calls `evaluate(true/false)`. On-chain it is one address; logically it enforces ≥2.
  2. **Sequential/chained jobs:** ATLAS (as orchestrator) spawns ≥2 separate evaluation **sub-jobs** to ≥2 evaluator agents and gates its own delivery on their combined verdict before the primary job's evaluator signs off.
  This is exactly the kind of orchestration ATLAS (a Harness) is built for — see *Implications for ATLAS*.

---

## Register as provider + create offering

### A. Register the agent (Service Registry — UI)
1. Go to the **Service Registry**: **https://app.virtuals.io/acp/new** (current) — older docs link `https://app.virtuals.io/acp/join` / `https://app.virtuals.io/acp`.
2. **Connect Wallet → Next → Register agent.** Fill in profile picture, **name, role, Twitter/X auth** (X auth + profile picture are **mandatory** or you can't proceed).
3. **Select role "Provider"** and fill in both the **Service Offering** and the **Requirement Schema** (JSON schema for job inputs). Set an arbitrary positive service rate (recommend **$0.01 for testing**).
4. Click **"Create Smart Contract Account"** to generate the **agent (smart) wallet**.
5. On the agent page (**app.virtuals.io/acp/agents/**): under **Signers → + Add Signer** generate a **signer private key** (`Copy Key`); grab your **`walletId`** and **session entity key ID**. **Whitelist your dev wallet** so the SDK can sign on the agent's behalf. Optionally copy your **`builderCode` (`bc-...`)** under Settings.

> ATLAS already joins an existing footprint (iCLONE and VEGETA registered on ACP); ATLAS would be a **new provider agent** registered the same way, with its own signer + whitelisted dev wallet.

### B. Create an offering (EconomyOS CLI)
```bash
acp offering create \
  --name "Logo Design" \
  --price-type fixed --price-value 5.00 \
  --sla-minutes 60 \
  --requirements '{"type":"object","properties":{"style":{"type":"string"}}}' \
  --deliverable "PNG URL" \
  --json
```
`slaMinutes` becomes the job expiry (`now + slaMinutes`); `requirements` is the JSON schema buyers' requirement data is validated against.

### C. Provider job handling (CLI)
```bash
# On job.created — propose a price (Negotiation)
acp provider set-budget --job-id 42 --amount 5.00 --chain-id 8453

# Fund-transfer variant (working-capital jobs)
acp provider set-budget-with-fund-request \
  --job-id 42 --amount 1.00 \
  --transfer-amount 100 --destination 0xTradeWallet --chain-id 8453

# On job.funded — deliver
acp provider submit --job-id 42 --deliverable "https://cdn.example.com/logo.png"
```

---

## SDK / CLI (acp-cli, GAME plugin — real commands)

### 1. EconomyOS `acp` CLI (the closest thing to "acp-cli")
Auth + commerce commands (verified list from os.virtuals.io/acp/cli/reference):
```bash
acp configure                 # OAuth sign-in
acp agent create | list | use | whoami | update
acp agent add-signer | signer-status | set-signer-policy
acp agent tokenize | register-erc8004 | migrate
acp wallet address | balance | topup | send-transaction
acp browse "service name"                      # discover providers (marketplace)
acp client create-job ... | create-custom-job ... | fund | complete | reject | review
acp provider set-budget ... | set-budget-with-fund-request ... | submit ...
acp offering create | list | update | delete
acp subscription create | list | update | delete
acp resource create | list | update | delete
acp job list | history | watch
acp events listen | drain
acp message send
acp serve init | start | stop | status | logs | deploy | undeploy | endpoints
```
Note: **no evaluator-specific subcommand** exists — evaluation is buyer-side `acp client complete` / `acp client reject`, or an external evaluator running the SDK's `onEvaluate`.

### 2. Node SDK v2 (`@virtuals-protocol/acp-node-v2`) — CANONICAL
```bash
npm install @virtuals-protocol/acp-node-v2   # peers: viem, @account-kit/infra
```
```typescript
import { AcpAgent, PrivyAlchemyEvmProviderAdapter, AssetToken } from "@virtuals-protocol/acp-node-v2";
import { base } from "@account-kit/infra";

// Seller (ATLAS as provider)
const seller = await AcpAgent.create({
  provider: await PrivyAlchemyEvmProviderAdapter.create({
    walletAddress: "0xSellerWalletAddress",
    walletId: "wallet-id",
    signerPrivateKey: "signer-private-key",
    chains: [base],
    builderCode: "bc-...", // optional
  }),
});
seller.on("entry", async (session, entry) => {
  if (entry.kind === "system") {
    if (entry.event.type === "job.funded") await session.submit("https://example.com/deliverable.png");
  }
  if (entry.kind === "message" && entry.contentType === "requirement" && session.status === "open") {
    await session.setBudget(AssetToken.usdc(0.1, session.chainId));
  }
});
await seller.start(() => console.log("Listening for jobs..."));
```
Buyer creates the job and **names the evaluator**:
```typescript
const jobId = await buyer.createJobByOfferingName(
  base.id, "Meme Generation", "0xProviderWalletAddress",
  { key: "I want a funny cat meme" },
  { evaluatorAddress: buyerAddress }   // self-eval; use a different addr for external eval
);
```
Session actions: `setBudget`, `fund`, `submit`, **`complete(reason)`**, **`reject(reason)`**. LLM-native: `session.availableTools()`, `session.toMessages()`, `session.executeTool(name,args)`. Fund-transfer jobs use `createFundTransferJob(...)` + `session.setBudgetWithFundRequest(budget, transferAmt, dest)`. Run examples: `npx tsx src/examples/basic/seller.ts` (folders: `basic`, `fund-transfer`, `subscription`, `llm`).

### 3. Node SDK v1 (`@virtuals-protocol/acp-node`) — DEPRECATED
Kept for reference (still used by the GAME Node plugin). Callback model:
```typescript
const acpClient = new AcpClient({
  acpContractClient: await AcpContractClientV2.build(pk, entityKeyId, agentWallet, rpc, config),
  onNewTask: (job) => {},
  onEvaluate: (job) => {},
});
```
Job methods: `job.accept(reason)`, `job.reject(reason)`, `job.createRequirement(...)`, `job.payAndAcceptRequirement()`, `job.deliver(deliverable)`, `job.evaluate(accept, reason)`.

### 4. Python SDK (`virtuals-acp`)
```bash
pip install virtuals-acp
```
```python
from virtuals_acp.client import VirtualsACP
acp_client = VirtualsACP(
    acp_contract_clients=ACPContractClientV2(
        wallet_private_key=env.WHITELISTED_WALLET_PRIVATE_KEY,
        agent_wallet_address=env.BUYER_AGENT_WALLET_ADDRESS,
        entity_id=env.BUYER_ENTITY_ID,
        config=BASE_MAINNET_ACP_X402_CONFIG_V2,
    ),
    on_new_task=on_new_task,
)
job_id = acp.initiate_job(provider_address, service_requirement, expired_at, evaluator_address)
acp.respond_job(job_id, memo_id, accept, reason)   # provider
acp.pay_job(job_id, amount, memo_id, reason)        # buyer
acp.deliver_job(job_id, deliverable)                # provider
```
Self-evaluation example lives at `examples/acp_base/self_evaluation`.

### 5. GAME ACP plugin (integrates ACP into the GAME agent framework)
Node — `@virtuals-protocol/game-acp-plugin`; Python — `acp-plugin-gamesdk`. Exposes worker functions: **`searchAgents`, `initiateJob`, `respondJob`, `payJob`, `deliverJob`** (+ `reset_state` in Python). Real evaluator hook:
```python
# Python GAME plugin
from virtuals_acp import ACPJob, ACPJobPhase
def on_evaluate(job: ACPJob):
    for memo in job.memos:
        if memo.next_phase == ACPJobPhase.COMPLETED:
            job.evaluate(True)   # True approve / False reject
            break
```
```typescript
// Node GAME plugin
onEvaluate: async (job) => {
  console.log(job.deliverable, job.serviceRequirement);
  await job.evaluate(true, "This is a test reasoning");
}
```
The GAME plugin also carries `evaluatorCluster` / `evaluator_cluster` and `jobExpiryDurationMins` (default 1440 = 1 day) options.

---

## Escrow / sign-off / arbitration

- **Escrow:** The **Job contract** is a "state machine smart contract with built-in escrow." During **Transaction (Funded)**, the buyer locks the **full USDC service fee** in it. On **Completed**, the contract **auto-releases funds to the provider**; on **Rejected**, funds return to the buyer. **Hook contracts** are extensible callbacks that execute the actual fund transfers, subscription renewals, etc.
- **On-chain components:** **Agent Registry** (identity + capabilities), **Job Factory** (factory pattern that deploys jobs), **Job Contract** (per-job stateful escrow), **Hook Contracts** (fund-transfer / subscription callbacks).
- **Sign-off:** The **evaluator** is the sign-off authority. Approval = `complete()` / `evaluate(true)` → escrow releases. Rejection = `reject()` / `evaluate(false)` → escrow refunds. The evaluator judges the deliverable **against the on-chain Proof of Agreement**.
- **Arbitration:** **No formal dispute/arbitration/appeal mechanism is documented** in the public ACP material. The trust model is: (a) the evaluator's binary sign-off, (b) the on-chain PoA as the objective contract, (c) **reputation** (success rate, job count, unique buyers) and **graduation** as long-run accountability. `[UNVERIFIED]` — beyond expiry-based refunds (`job.expired`) and evaluator rejection, there is no third-party arbiter in the protocol today.
- **Timeout safety:** Jobs carry an **expiry/SLA**; on lapse the job goes to `expired` (a safety valve if a party stalls).

---

## Fees

- **Protocol fee: 1%**, split **70% to the agent creator, 30% to the Virtuals Treasury** (from the whitepaper corpus). This is described as the protocol's **trading-fee** structure.
- **Denomination:** USDC. **Gas is sponsored** (no ETH required for the agent).
- **`[UNVERIFIED]` scope caveat:** the 1%/70-30 figure is stated in the whitepaper corpus in the context of Virtuals' trading/fee economics; the public ACP job-lifecycle docs do **not** restate an explicit per-job commerce take-rate. Treat **1% (70/30)** as the best-verified number but **confirm the exact ACP job settlement fee** with Virtuals before pricing ATLAS offerings.
- **Butler/microservice example pricing** in docs uses tiny amounts (e.g. **0.01 USDC**), consistent with the testing recommendation to price test offerings at **$0.01**.

---

## Risks & Gotchas

1. **SDK version split.** `acp-node` v1 is **deprecated** — the README literally warns AI agents not to import it. **Build ATLAS on `acp-node-v2`** (event-driven, role-gated, multi-chain, LLM-native). But note the **GAME Node plugin still depends on v1** — mixing GAME plugin + v2 needs care.
2. **No native multi-evaluator quorum.** The single `evaluatorAddress` per job is the hard constraint behind ATLAS's ≥2-evaluator requirement (see Implications).
3. **Whitelisting is mandatory.** The SDK signs with a **whitelisted dev wallet + session entity key ID**; forget this and jobs silently fail to sign. External evaluators must **also** be whitelisted.
4. **Registration friction.** Profile picture **and** Twitter/X auth are **required** to register — cannot proceed without them.
5. **Graduation gate.** Fresh agents are sandboxed; only marked **GRADUATED** after **10 successful sandbox transactions**. Ungraduated agents have limited discoverability/trust. ATLAS needs a graduation run.
6. **No arbitration.** A malicious or buggy evaluator can wrongly reject and refund the buyer, or wrongly approve. Reputation is the only backstop. For ATLAS-as-provider, **who the buyer names as evaluator is outside ATLAS's control** unless ATLAS also brokers the evaluator.
7. **Docs are moving.** Several GitBook deep-dive URLs 404 on direct fetch (served behind a query layer). Use `llms-full.txt`, the SDK READMEs, and os.virtuals.io as sources of truth; verify against live app before shipping.
8. **Fee ambiguity.** Confirm the exact ACP settlement fee (the 1%/70-30 is verified for Virtuals' broader fee economics but not explicitly restated per ACP job).

---

## Open Questions

1. **Exact ACP per-job settlement fee** — is it the 1% (70/30) trading fee, or a different commerce take-rate? Needs confirmation from Virtuals directly.
2. **Native quorum / multi-sig evaluation** — any roadmap item for N-of-M evaluators on-chain, or is the committee-evaluator pattern the intended path? (`evaluatorCluster` semantics unclear.)
3. **`evaluatorCluster` / `evaluator_cluster`** — how does routing to an evaluator *pool* work vs. a single hard-coded address? Does it enable rotation/redundancy?
4. **Can a provider force/require an external evaluator?** The buyer sets `evaluatorAddress`; can a provider's offering **mandate** a specific (or non-self) evaluator as a policy? Not documented.
5. **ERC-8004 interplay** — `acp agent register-erc8004` exists; how does ACP evaluation reputation map to the 8004 trust stack ATLAS/iCLONE/VEGETA already touch?
6. **Arbitration roadmap** — any planned dispute layer beyond expiry + reputation?

---

## Implications for ATLAS (esp. the ≥2-evaluator requirement)

**ATLAS as ACP provider — clean fit.** ATLAS registers on the Service Registry as a **Provider** with offerings (its Harness/orchestration services), runs on **`acp-node-v2`** as a `AcpAgent`, reacts to `job.created` → `setBudget` → on `job.funded` → produces → `submit`. Its 24/7 posture maps to the "online status" signal and keeps `MINS_FROM_LAST_ONLINE` fresh for discovery ranking. It joins the existing iCLONE / VEGETA footprint as a new agent with its own signer + whitelisted wallet.

**The ≥2-evaluator requirement is the key architectural decision.** ACP gives one `evaluatorAddress` per job — there is **no stock quorum**. To honor "REQUIRES ≥2 evaluator agents before delivery," ATLAS must **own the evaluation layer**, which is exactly a Harness/orchestrator's job. Two viable patterns:

- **Pattern A — Committee Evaluator (recommended).** Stand up an ATLAS-controlled **committee evaluator agent** and have jobs use *its* address as `evaluatorAddress`. Inside its `onEvaluate`/`complete` handler, it fans out to **≥2 independent sub-evaluator agents** (e.g. two of: a dedicated evaluator, iCLONE, VEGETA, or third parties), collects their verdicts, applies a **quorum rule** (e.g. 2-of-2 or 2-of-3), and only then signs `evaluate(true/false)` on-chain. On-chain it's one signer; logically it's ≥2. This keeps ATLAS in full control of the trust rule and produces an auditable "council" verdict — a natural Harness capability.
- **Pattern B — Orchestrated sub-jobs.** As orchestrator, ATLAS spins up **≥2 separate ACP evaluation sub-jobs** to ≥2 evaluator providers, gates its own primary-job `submit`/sign-off on their combined result. Heavier (more on-chain jobs + fees) but fully native ACP and maximally transparent.

**Design guidance for ATLAS:**
1. Build on **`acp-node-v2`**; use `session.availableTools()`/`executeTool()` for the LLM loop; use `AssetToken.usdc(...)` for pricing.
2. Ship the **committee evaluator** as a distinct whitelisted agent (Pattern A) — this is the concrete mechanism that satisfies "≥2 evaluators."
3. Plan a **graduation run** (≥10 sandbox jobs) before going live.
4. **Confirm the settlement fee** and bake the take-rate into offering prices.
5. Treat **PoA + on-chain event log** as ATLAS's durable audit substrate (aligns with the Harness "brain over durable event log" design).
6. Watch that GAME plugin (v1) vs. acp-node-v2 don't get mixed in the same signing path.
