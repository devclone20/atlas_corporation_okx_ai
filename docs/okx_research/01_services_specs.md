# OKX OnchainOS — Service Publishing & Field-by-Field Specifications (Dossier 1)

**For:** ATLAS (OKX ASP, agent #4460, X Layer / chainIndex 196, `eip155:196`)
**Scope:** How an ASP publishes/updates services; field-by-field spec; A2A vs A2MCP; how the buyer (requester) discovers a service, learns what to provide, and requests/receives work.
**Date:** 2026-07-07
**Read-only research** — no create/update/activate/pay/execute was run. Only `--help`, doc reads, and skill reads.

**Source legend used in citations below:**
- **[SKILL:register]** = `/opt/atlas/.agents/skills/okx-ai/references/identity-register.md`
- **[SKILL:update]** = `.../identity-update.md`
- **[SKILL:invariants]** = `.../identity-invariants.md` (the single-source-of-truth field table)
- **[SKILL:discover]** = `.../identity-discover.md`
- **[SKILL:manage]** = `.../identity-manage.md`
- **[SKILL:errors]** = `.../identity-errors.md`
- **[SKILL:task-cli]** = `.../task-cli-reference.md`
- **[SKILL:task-asp]** = `.../task-asp.md`
- **[CLI:<sub>]** = `onchainos agent <sub> --help` output captured this session
- **[DOC:<page>]** = `https://web3.okx.com/onchainos/dev-docs/<page>`
- **[WP]** = `https://web3.okx.com/whitepaper/okx-app-whitepaper.pdf` (Agent Payments Protocol v1.0, April 2026)
- **[WEB]** = OKX press/learn + BlockEden analysis (search)

> **TL;DR for ATLAS:** A service card has exactly 5 fields: `serviceName`, `serviceDescription`, `serviceType`, `fee`, `endpoint`. The single most important rule is the **2-part `serviceDescription`** (① what it does + who it's for; ② the numbered list of what the buyer must provide) with strict char limits and a banned-content list. A2A = negotiated/escrow via the task marketplace (endpoint OMITTED); A2MCP = pay-per-call x402 HTTP endpoint (endpoint REQUIRED, must be public `https://`). ATLAS's 4 A2A + 1 A2MCP layout is exactly the intended mix.

---

## 1. The service object — the 5 fields (canonical schema)

`create`, `update`, and `validate-listing` all parse `--service` into the **same element shape**. Keys are **camelCase, exact** — wrong keys silently break the call. **[SKILL:invariants §Input contract]**, confirmed by **[CLI:create]** and **[CLI:update]**.

| Key | Required | Type | Rule (verbatim-sourced) |
|---|---|---|---|
| `serviceName` | **yes** | string | 5–30 chars, a **noun phrase**. Must NOT equal the agent name. Must NOT contain a price. Not just a letter ("Q"). CN 2–12 / EN 3–25 range appears in the register prompt but the **enforced** rule per the field table is **5–30**. **[SKILL:invariants]**, **[SKILL:register §3]** |
| `serviceDescription` | **yes** | string | **2 parts on separate lines** (see §2). ≤200 CJK-width per part, ≤400 CJK-width total. No example prompts, no links, no tech-stack, no disclaimers. **[SKILL:invariants]** |
| `serviceType` | **yes** | enum | Raw enum **`A2A`** or **`A2MCP`** — never a localized label. `A2MCP` = "API service" (pay-per-call, fixed price). `A2A` = "agent to agent" (negotiated / off-chain pricing). **[SKILL:invariants §Lexicon]**, **[CLI:create]** |
| `fee` | **A2MCP: yes / A2A: optional** | string | **Plain number sent as a JSON string** e.g. `"10"` (quoted; never bare `10`). Currency is **always USDT and implicit** — NO suffix/symbol (`"10 USDT"`, `"5元"`, `"approx 10"` are rejected). ≤6 decimals. `0` is valid (a free service). **[SKILL:invariants]**, **[CLI:create]** |
| `endpoint` | **A2MCP: yes / A2A: OMIT** | string | A2MCP only: public `https://…`, ≤512 chars, really deployed. A2A **must omit it entirely** (backend clears it; discover renders A2A endpoint as `—`). **[SKILL:invariants]**, **[SKILL:register §6]**, **[SKILL:discover §service-list]** |
| `operation` | **update-flow only** | enum | `create` / `update` / `delete`. **OMIT on register/create** (all services there are new). **[SKILL:invariants]**, **[SKILL:update §6]** |
| `id` | optional | string | Existing service's id (from `agent service-list`). Only used to target an existing service in the **update** flow (`update`/`delete`). **[SKILL:invariants]**, **[SKILL:update §1]** |

**CLI verbatim** — `onchainos agent create --help` describes `--service`:
> "Service list as a JSON array. Element keys: `serviceName`, `serviceDescription`, `serviceType` (`A2A` | `A2MCP`), `fee` (A2MCP required, A2A optional — plain number, USDT implied, ≤6 decimals), `endpoint` (A2MCP only; A2A must omit it). Required for `asp`: at least one service (empty → `ASP agents require at least one service`); ignored for `user` / `evaluator`" **[CLI:create]**

**Agent-level vs service-level description (the #1 mix-up):** the *agent* description is the top-level `--description` flag; each *service* description is the `serviceDescription` key **inside** `--service`. Different field, different place. **[SKILL:invariants]**

### 1.1 Register/create example (no `id`, no `operation`)
```json
--service '[
  {
    "serviceName": "Best-Fee Swap Routing",
    "serviceDescription": "Finds the cheapest swap route across DEX aggregators on X Layer and returns calldata + fee breakdown, for agents that need to execute a token swap at minimal cost.\n1. from token address 2. to token address 3. amount 4. chain",
    "serviceType": "A2A",
    "fee": ""
  },
  {
    "serviceName": "Best-Route Swap Quote",
    "serviceDescription": "Returns the lowest-fee swap quote for a given pair and amount as a machine-readable JSON, for agents comparing execution costs.\n1. from token 2. to token 3. amount 4. chainIndex",
    "serviceType": "A2MCP",
    "fee": "0.5",
    "endpoint": "https://atlasapi.cloneframe.io/mcp/swap-quote"
  }
]'
```
Shape per **[SKILL:invariants]** register example + **[CLI:create]**.

### 1.2 Update delta example (only the changed services, each tagged)
```json
--service '[
  {"operation":"update","id":"7","serviceName":"…","serviceDescription":"…","serviceType":"A2MCP","fee":"12","endpoint":"https://…"},
  {"operation":"delete","id":"9"}
]'
```
**`--service` on update is a DELTA, never full coverage.** Send only services that change; **omitting a service no longer deletes it**. **[SKILL:update §6]**, **[CLI:update]** (help shows the same `operation:create + delete` example).

---

## 2. `serviceDescription` — the 2-part structure (highest-risk field)

This is where a badly-formed service confuses buyers and can fail QA/review. The description MUST be **two parts on separate lines**: **[SKILL:register §3 Step 2]**, **[SKILL:invariants §Input contract]**

- **① Core-capability summary** — *what the service does + who it's for.* ≤200 CJK-width chars.
- **② What the user must provide** — an explicit, numbered list of inputs, e.g. `"1. wallet address 2. amount 3. chain"`. ≤200 CJK-width chars.
- **Total** ≤400 CJK-width chars.

**Length is counted in East-Asian display width** (CJK char = 2, ASCII = 1) — this matches the backend counter. **[SKILL:invariants]** So an English description gets ~400 ASCII chars total; a Chinese one ~200 characters.

**Banned content in `serviceDescription`** (all four rules; QA/semantic-check enforced): **[SKILL:register §3, §4]**, **[SKILL:invariants]**
- ❌ No **example prompts** ("try: 'swap 100 USDC'").
- ❌ No **links** — no GitHub URL, no wallet address, no website link.
- ❌ No **tech-stack / infra details** (framework names, model names, hosting, internal architecture).
- ❌ No **legal disclaimers** ("not financial advice", ToS text, liability language).

**Why part ② matters for the requester:** Part ② IS the machine-readable contract that tells the buyer (the requesting agent) exactly what inputs to send. In the task flow this maps to the buyer's `--service-params` (natural-language string) and to the A2MCP endpoint's request body. There is **no separate structured `inputRequired` / `requiredAnyOf` / JSON-Schema field** in the OKX service card — the input contract lives **inside part ② of `serviceDescription` as a numbered natural-language list.** (See §5 for the full "how the buyer learns what to provide" chain and the absence of a formal input schema.) **[SKILL:invariants]**, **[SKILL:task-cli create-task/asp-match]**

**Semantic checks the CLI can't do (always run, even on `pass:true`):** **[SKILL:register §4]**
- Is `serviceName` a descriptive noun-phrase, not a single letter?
- Is the agent name a brand (not a person; block any name **containing** a celebrity/public-figure substring, e.g. Trump/Musk/CZ/马斯克/马云)?
- Does `serviceDescription` follow the 2-part structure and avoid leaking tech-stack / disclaimers?

---

## 3. `serviceType` — A2A vs A2MCP (the core distinction)

| | **A2A** ("agent to agent") | **A2MCP** ("API service") |
|---|---|---|
| Pricing | Negotiated / off-chain; `fee` **optional** | Fixed price; `fee` **required** |
| `endpoint` | **Omitted** (must not be set) | **Required** — public `https://`, ≤512 chars |
| Payment rail | **Escrow** on-chain (task marketplace) | **x402 pay-per-call** (HTTP 402 challenge) |
| How work is requested | Via the **task marketplace**: publish task → ASP `apply` → negotiate → `confirm-accept` funds escrow → ASP `deliver` | **Direct HTTP call** to the endpoint; endpoint returns **402 challenge**; buyer pays and replays |
| How work is delivered | On-chain `deliver` (file/message) after `job_accepted`; user `complete` releases escrow; dispute path via Evaluator | Endpoint returns the result inline in the paid HTTP response |
| Fee display when empty | `negotiable` (A2A with no fee set) | `free` (A2MCP with fee `0`/unset) |
| Fee display when `0` | `0 USDT` (explicit free service) | `0 USDT` (explicit free service) |

Sources: **[SKILL:invariants §Lexicon]**, **[SKILL:task-cli set-asp]** ("`A2A` -> escrow, `A2MCP` -> x402"), **[SKILL:task-asp]** (deliver gated by `job_accepted`), **[WEB]** ("A2A with escrow for negotiable complex tasks; A2MCP instant pay-per-call for standardized services"), **[DOC:core-concept]** (x402 `exact` one-time / `aggr_deferred` batch; HTTP 402 challenge/credential handshake), **[WP]**.

**Gloss to render once per table** (never show raw A2MCP/A2A to a user):
> "API service = pay-per-call, fixed price; agent to agent = negotiated / off-chain pricing." **[SKILL:discover]**, **[SKILL:invariants]**

**A2MCP mechanics (from docs):** In A2MCP the payment challenge is returned **over HTTP as an x402-style 402 response** carrying a challenge (paymentId / realm / method / intent / expires); the buyer submits a signed credential and replays. **[DOC:core-concept]**, **[WEB]**. On X Layer (`eip155:196`) these settlements are **gas-free**. **[WEB]**, **[SKILL:task-asp]** (platform paymaster).

**A2MCP endpoint SDK-side shape** (how ATLAS's `https://atlasapi.cloneframe.io/mcp/swap-quote` should answer the 402): the seller SDK declares a route with an `accepts[]` array of payment options — `scheme: "exact"`, `network: "eip155:196"`, `payTo: <wallet>`, `price: "$0.01"`, plus `description` and `mimeType`. Example verbatim from **[DOC:service-seller-sdk]**:
```typescript
"GET /generateImg": {
  accepts: [{ scheme: "exact", network: NETWORK, payTo: PAY_TO, price: "$0.01" }],
  description: "AI Image Generation Service",
  mimeType: "application/json",
}
```
> Note: this SDK `price`/`accepts` block is the **payment-middleware config on ATLAS's own server**, distinct from the on-chain service card's `fee`. Keep the two consistent (the 402 `price` should match the card `fee`), or a buyer's `x402-validate` price-match check (see §5) will fail.

---

## 4. Publishing lifecycle — how a service goes live

Register → (optional QA) → confirm → `create` (services embedded) → `activate` (submit for review) → live after approval.

1. **Pre-check gate** — `onchainos agent pre-check --role asp` folds first-time consent + per-wallet uniqueness (each address = one ASP identity). **[SKILL:register §2]**
2. **Collect identity** (Step 1): agent `name` (brand; CN 2–12 / EN 3–25; no test markers/celebrity names), agent `description` (≤500 chars, required for ASP), **avatar (required — image file, links rejected, ≤1 MB, 1:1 recommended)**. **[SKILL:register §3, §5]**
3. **Collect service(s)** (Step 2): the 5 fields per service. **After EACH service** the ASP is asked **"1. Add another / 2. Done"** and must explicitly pick Done — a fully-filled single service is NOT a Done signal. **[SKILL:register §3]**, **[SKILL:SKILL.md §Gates Service-collection]**
4. **QA** — `onchainos agent validate-listing --role asp --name … --description … --service '[…all services…]'` runs **exactly once**, on the complete set. Returns `{ pass, findings[{field, code, severity:"block", issue, fix}] }`; `field` is dot-notation (`service[0].fee`, `service[1].name`). Findings are **suggestions only** until the user confirms. **[SKILL:register §4]**
5. **Confirm card** — ASP renders **two** cards: Identity card (Reply 1 to continue, no CLI runs yet) → Service card carrying every `Service [N]` block (Reply 1 to confirm and run). **[SKILL:register §7]**
6. **`create`** — one call, carries identity + ALL services. Returns `newAgentId` (string id if WS push succeeded, `null` on timeout). **[CLI:create]**, **[SKILL:register §9]**
7. **`activate`** — `onchainos agent activate --agent-id <N> --preferred-language <BCP-47>` (language **required**, e.g. `en-US`/`zh-CN`). This submits for approval; QA does **not** re-run here. **[CLI:activate]**, **[SKILL:manage]**
   - `activate.approvalStatus: 2` → "under review — usually ready within 24h". `blockType: 1` → not an ASP (only ASP identities support listing). **[SKILL:manage]**, **[SKILL:errors]**
8. **Review by OKX** — services are **submitted for review by OKX** before going live. **[WEB]** A rejected listing (`approvalStatus`/`approvalDisplayStatus: 5`) is fixed by **`update` on the same agent → re-activate**, never by creating a new agent. **[SKILL:update]**

**Beta whitelist gate:** `create`/`update` can fail with `approved agent whitelist` / code `10016` = "account isn't in the agent beta whitelist yet" (apply via the URL in `msg`). No auto-retry. **[SKILL:errors]** (ATLAS is already live, so this is passed — noted for completeness.)

**Update flow specifics:** fetch current state first (`agent get-agents --agent-ids <id>`), ownership check (`ownerAddress` must match wallet), collect changes, QA once on **only the create+update service entries** (not delete/unchanged), diff card, then `update`. Endpoint is **permanent on-chain** — changing an A2MCP endpoint requires an explicit `update`. Service `id` for update/delete comes from `agent service-list --agent-id <id>`. **[SKILL:update §1–6]**, **[CLI:update]**

---

## 5. The BUYER side — how a requester discovers a service and knows what to provide

This is the "avoid buyer confusion" chain. There is **no formal `inputRequired` / `requiredAnyOf` / JSON-Schema field** on the OKX service card; the input contract is **part ② of `serviceDescription`** plus the runtime commands below.

### 5.1 Discovery (buyer finds ATLAS + its services)
- **`agent search --query "<full sentence verbatim>"`** — registry search; optional `--feedback` / `--agent-info` / `--status` / `--service` comma-separated filters. Each row returns a ready `cells[]`: `Agent ID | Name | Rating | Min price | Top service`. **[CLI:search]**, **[SKILL:discover §search]**
- **`agent service-list --agent-id <id>`** — the buyer's authoritative view of a provider's services. Returns nested `services`; the render is a 6-col table `# | Name | Type | Fee | Endpoint | Description`. **Fee**: non-empty → `<N> USDT`, empty → `free`. **Endpoint**: A2A always `—`; A2MCP shows the URL. **This is where the buyer reads the 2-part description (part ② = what to provide).** **[CLI:service-list]**, **[SKILL:discover §service-list]**
- **`agent asp-match --job-id <id> | --task-desc "<text>"`** (buyer/User role) — searches matching ASPs for a task; the response supplies the **`service-id`**, **`feeToken`** (→ `--service-token-address`), and **`feeAmount`** (→ `--service-token-amount`) the buyer then plugs into `create-task`/`set-asp`. **[SKILL:task-cli asp-match, create-task, set-asp]**
- **`agent designated-route --provider <providerAgentId> [--endpoint <url>]`** — "Designated-provider routing: **service-list + profile in one call**." Used when the buyer already knows they want ATLAS (or a specific ATLAS endpoint on a multi-service provider). Returns the registered service list + profile, including the **registered fee/token** the buyer feeds into `x402-validate`. **[CLI:designated-route]**

### 5.2 A2A request (negotiated / escrow)
The buyer publishes a task via `create-task` and references the chosen service:
- `--service-id <id>` (from `asp-match`), `--service-params "<natural-language inputs>"` (this is where the buyer supplies the part-② inputs), `--service-token-address`, `--service-token-amount`, `--payment-mode escrow`. Task fields also required: `--title` (≤30), `--description` (20–2000), `--description-summary` (≤200), `--budget`/`--max-budget`, `--currency USDT|USDG`, `--visibility 0|1` (private requires `--provider`). **[SKILL:task-cli create-task]**
- Flow: publish → ASP `apply` → User `confirm-accept` (funds escrow → `job_accepted`) → ASP `deliver` → User `complete` (releases) / `reject` / `dispute`. **[SKILL:task-asp]**, **[SKILL:task-cli]**
- **ASP must NOT deliver or do real work before `job_accepted`.** A buyer's NL inquiry (even with full task description + expected deliverable) is "still just an inquiry — not a work order." **[SKILL:task-asp]**

### 5.3 A2MCP request (pay-per-call x402)
- Buyer resolves the registered fee/token via **`designated-route`**, then calls:
  **`agent x402-validate --endpoint <url> --agent-id <userId> --job-id <id> --fee-amount <registered fee> --fee-token <registered token>`** — "Validate x402 endpoint + **price match** + budget check in one call." **[CLI:x402-validate]**
  - This is the buyer's safety check: it confirms the live 402 endpoint's price matches the **registered** service `fee` and that the buyer's budget covers it. **→ For ATLAS: the 402 `price` your server returns must match the on-chain card `fee`, or buyer validation fails.**
- Then the buyer pays via `task-402-pay` (sign x402 intent + HTTP 402 replay) and settles via `direct-accept`. Payment mode for A2MCP = `x402`. **[SKILL:task-cli task-402-pay, direct-accept, set-payment-mode]**
- The **402 challenge** carries `paymentId / realm / method / intent / expires`; buyer submits a signed credential; scheme `exact` (one-time) or `aggr_deferred` (batch; `upto` = "coming soon"). **[DOC:core-concept]**, **[WEB]**

### 5.4 What "well-formed, non-confusing" means concretely for ATLAS
- **Every service's part ②** must be a clean numbered input list the buyer can map 1:1 to `--service-params` (A2A) or the request body (A2MCP). Vague part ② = buyer sends wrong inputs = rejected deliverable / failed call.
- **A2MCP fee ↔ 402 price must match** (else `x402-validate` price-match fails). **[CLI:x402-validate]**
- **Service names must be distinct noun phrases** — ATLAS's four A2A names (Research & Analysis, Best-Fee Swap Routing, Best-Fee Bridge Routing, Smart Contract Build & Deploy) and the one A2MCP (Best-Route Swap Quote) are all valid noun phrases; none equals the agent name; none contains a price. ✓
- **Endpoint discipline:** only the A2MCP service carries `endpoint`; the four A2A services must OMIT it. **[SKILL:invariants]**

---

## 6. Field validation error surface (what a malformed service triggers)

From **[SKILL:errors]** (CLI `bail!` rows) — these are the exact failure strings to design against:

| Raw CLI error | Cause / fix |
|---|---|
| `missing required field in --service: serviceName` / `: serviceDescription` | Empty name/description → re-supply. |
| `missing required field in --service: fee` | A2MCP with no fee → supply plain number. |
| `missing required field in --service: endpoint` | A2MCP with no public https endpoint → supply. |
| `invalid fee in --service` | Fee not a plain number (had a currency/symbol/word) → re-send bare, e.g. `10`. |
| `invalid serviceType` | Not `A2A`/`A2MCP`. |
| `ASP agents require at least one service` | Empty service array on create. |
| `ASP agents require an avatar` | ASP `--picture` missing. |
| `validate-listing` `service`/`PARSE` finding | Wrong JSON keys (must be exact camelCase). **[SKILL:invariants]** |

Flag gotchas: `update` → `--agent-id` (singular); `get-agents` → `--agent-ids` (plural). `activate` → `--preferred-language` **required**. `create` has `--role`; `update` has **no** `--role` (role fixed at create). **[SKILL:invariants]**, **[CLI:*]**

---

## 7. Exhaustive `--service` field reference (copy-ready)

```
serviceName          string  REQUIRED  5–30 chars, noun phrase, ≠ agent name, no price, not a single letter
serviceDescription   string  REQUIRED  2 lines: ① capability+audience (≤200 CJK-width) \n ② numbered inputs (≤200 CJK-width); total ≤400 CJK-width; NO example prompts / links / tech-stack / disclaimers
serviceType          enum    REQUIRED  "A2A" | "A2MCP"  (never the localized label)
fee                  string  A2MCP:REQUIRED A2A:OPTIONAL  plain number as quoted string ("10"); USDT implicit; NO symbol/suffix; ≤6 dp; "0" allowed
endpoint             string  A2MCP:REQUIRED A2A:OMIT  public https://, ≤512 chars, really deployed (no http/localhost/private-IP/*.local/mock/placeholder)
operation            enum    UPDATE-ONLY  "create" | "update" | "delete"  (omit on register)
id                   string  OPTIONAL  existing service id from `agent service-list` (update/delete targeting)
```

---

## 8. Source coverage & confidence

| Topic | Authority | Confidence |
|---|---|---|
| 5 service fields + exact keys + limits | Local skills (invariants + register) + CLI `--help` | **High** (multiple corroborating sources) |
| 2-part serviceDescription + banned content | Local skills (register §3/§4, invariants) | **High** |
| A2A vs A2MCP semantics + payment rails | Skills + `set-asp` help + docs core-concept + web + WP | **High** |
| A2MCP SDK route / 402 challenge shape | DOC:service-seller-sdk + DOC:core-concept + web | **Medium-High** (docs are JS-rendered; SDK example verbatim) |
| Buyer discovery chain (search/service-list/asp-match/designated-route/x402-validate) | CLI `--help` + task-cli skill | **High** |
| No formal inputRequired/requiredAnyOf/JSON-Schema field | Absence confirmed across skills, CLI, docs, WP | **High** (input contract = part ② of serviceDescription + `--service-params`) |
| OKX manual review before go-live | web + skills (approvalStatus flow) | **High** |

**Notes / gaps:**
- The public dev-docs pages (`service-seller`, `what-is-onchainos`, `developer-portal`, `core-concept`) are heavily JS-rendered; WebFetch surfaces only partial static text. The **local skill markdown on the droplet is the authoritative, most complete source** for service-card field rules and is treated as such above.
- No structured input-schema field exists in the OKX service card. If ATLAS wants a machine-parseable input contract, it must live in **part ② of `serviceDescription`** (numbered list) and, for the A2MCP endpoint, in the endpoint's own request-body docs/402 metadata — not in a separate card field.
- The `serviceName` range shows two numbers in the sources: register prompt says CN 2–12 / EN 3–25; the invariants field table (single source of truth) says **5–30**. Use **5–30** as the hard limit and stay within the tighter EN 3–25 for safety.
```
