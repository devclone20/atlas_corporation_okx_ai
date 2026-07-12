# "Link my AI to OKX AI" — the exact flow ACP Tracer must implement

Read-only research pass, 2026-07-08. Sources: on-droplet OKX skills v4.2.0 (`/opt/atlas/.agents/skills/okx-ai` + `okx-agentic-wallet`), live `onchainos --help` (read-only), and the ATLAS repo synthesis (`~/Desktop/atlas_corporation_okx_ai/docs/`). Nothing on the live agent (#4460), wallet, or listing was changed.

> **Reality check up front.** The `onchainos` CLI has **no import / bridge / link subcommand**. "Linking an AI to OKX AI" is *always*: (1) log the user into an OKX **Agentic Wallet**, then (2) mint a **fresh ERC-8004 identity** for that AI on **X Layer (chainIndex 196)** via `agent create`, attach its services, and `activate` it for OKX review. There is no path that takes a pre-existing identity (an iNFT, a Virtuals agent, an external-wallet address) and "connects" it. The only "link an existing agent" case the CLI understands is *"the same OKX Agentic Wallet already has an identity for this role"* → then it's an **update**, not a create.

---

## Part A — Wallet onboarding decision (what ACP Tracer must do first)

Every `onchainos agent …` command runs **as the currently-logged-in OKX Agentic Wallet**, and the resulting identity's on-chain `ownerAddress` is that wallet. So wallet login is step zero and it *chooses who owns the agent forever*.

### A.1 The two login methods create DIFFERENT wallets

`onchainos wallet login` has two mutually-exclusive modes (CLI help + `references/wallet.md` §Authentication):

| | **Email + OTP** | **API-Key (AK) login** |
|---|---|---|
| Command | `wallet login <email> [--locale en_US]` → `wallet verify <otp>` | `wallet login` (no email arg) |
| Credential source | OTP emailed to the user | Reads `OKX_API_KEY` / `OKX_SECRET_KEY` / `OKX_PASSPHRASE` from env |
| Returns | `verify` → `{ accountId, accountName, isNew }` | `login` → `{ accountId, accountName }` directly (silent) |
| Bound to | the **email** | the **developer-portal API-Key account** |
| Wallet export portal | `web3.okx.com` → profile → "Export Wallet" | `web3.okx.com/onchainos/dev-portal` → Agentic Wallet → Wallet Export |

They resolve to **separate Agentic Wallet accounts** (different `accountId`, different export path, different on-chain address). This is the trap ACP Tracer must guard against: **if a user registers their agent under an email-login wallet and later logs in via AK (or vice-versa), `agent pre-check` will report "no agent for this role" because it's a different wallet — they'll think their agent vanished.** The interface must pick ONE method per user and pin it. `wallet status` (`data.loggedIn`) tells you the current session; `wallet addresses` shows the address grouped by chain category (XLayer / EVM / Solana).

**Recommendation for the UI:** default to **email + OTP** (no dev-portal setup, gives `isNew` so you can trigger the Policy/Export education). Offer AK only for power users who already have OKX API keys, and warn that the two logins are different wallets.

### A.2 Can the user bring their own external wallet? — No (not through this stack)

- The OKX Agentic Wallet is a **TEE-custodied** wallet: *"the private key is generated and stored inside a server-side secure enclave and never leaves the TEE — the Agent cannot export or locally sign with it"* (`references/wallet.md` §Notes). Signing for identity ops, task `deliver`, and x402 all go through this wallet.
- `onchainos` has **no "import external key / connect MetaMask" subcommand** — login is email-OTP or AK only. Whether OKX accepts a BYO wallet instead of its mandatory TEE wallet is explicitly flagged **`[UNVERIFIED]`** in the ATLAS research (`docs/00_RESEARCH_SYNTHESIS.md` L117, L202).
- The only bridge to self-custody is **export**, and it's one-way and destructive: exporting the mnemonic *"permanently unbinds the wallet from your email; the Agent will no longer be able to operate this wallet; the system creates a new empty wallet"* (`references/wallet-portal-actions.md`). Export breaks automation — it's the opposite of what "link my AI" wants.

**Tradeoff summary for the UI:** an external wallet cannot own an OKX agent identity in this flow. If a user insists on self-custody, the honest answer is: use the OKX Agentic Wallet for the agent (TEE keeps the agent autonomous and gas-free), and treat any owner-controlled external wallet as a **treasury / off-ramp** wallet that receives funds *bridged out* of X Layer — never as the signer. Keeping revenue as USD₮0 on X Layer needs no CEX KYC; KYC/geo only bites at a CEX off-ramp (`docs/okx_research/04_compliance_penalties.md`).

---

## Part B — New agent vs. existing agent ("what does *link* actually do?")

**There is exactly one create primitive and no import primitive.** `onchainos agent create` = *"Register a **new** Agent identity"* (CLI help). It mints the ERC-8004 identity on X Layer. Identities are **chain-fixed to X Layer** — the skill forbids passing `--chain` to any `agent` command (`SKILL.md` §Gates "Chain-fixed": *"agent identities live on XLayer only"*).

So resolve the user's situation with **`agent pre-check --role <role>`** (the gate that folds first-time consent + per-wallet uniqueness) and branch:

1. **User has NOTHING on OKX for this role** (`canCreate:true`, no `existingSameRole`) → this is the real "link": run the full **create** flow below. Whatever the AI already is elsewhere (an iNFT on Base, a Virtuals ACP agent, a plain API) is irrelevant to OKX — you are minting a brand-new OKX-native ERC-8004 identity that *represents* that AI. There is no data carried over; you re-enter name / description / avatar / services by hand.

2. **The SAME OKX wallet already has an identity for this role** (`pre-check` → `canCreate:false`, `existingSameRole[0]` populated; each address = one identity **per role**) → **do NOT create a second one.** "Link" here means **update the existing identity** (`agent update --agent-id <N> …`) and/or `agent activate` it. Creating a duplicate to dodge this is explicitly forbidden and looks spammy (`references/identity-update.md`, `docs/okx_research/04_compliance_penalties.md` L83).

3. **The AI already exists on Virtuals ACP** → still a **fresh `agent create` on X Layer**. OKX and Virtuals are *parallel stacks — different chains (X Layer 196 vs Base 8453), different wallets, separate reputation ledgers, separate ERC-8004 registries*; neither has an exclusivity clause (`docs/00_RESEARCH_SYNTHESIS.md` L11, L27). Whether OKX even reads the ERC-8004 registry that Virtuals writes is `[UNVERIFIED]` (L117, L202). Virtuals' own path (`acp agent create` → optional `acp agent register-erc8004` on Base) does not register you on OKX. So "dual-list" = run *both* onboarding flows; there is no cross-import.

4. **The AI is an iNFT (ERC-721 like the iCLONE/ATLAS token)** → the iNFT tokenId is a Base ERC-721; the OKX agent id (e.g. ATLAS's **#4460**) is a *separate* X-Layer ERC-8004 identity produced by `agent create`. They coexist as "the same brand, two identity primitives." No bridge, no shared id.

**Bottom line the interface must state to the user:** *"We're minting your AI a new OKX identity on X Layer. If you've listed it on Virtuals or elsewhere, that stays separate — OKX keeps its own identity and reputation."*

---

## Part C — Publishing services so the linked AI can earn (A2A vs A2MCP)

An identity only earns once it carries at least one **service** and is **activated + approved**. Services are embedded in `agent create` (or added later via `agent update --service`). Two service types (`serviceType` enum, raw `A2A` / `A2MCP` — `references/identity-invariants.md` Lexicon; `docs/okx_research/01_services_specs.md` §3):

| | **A2A** ("agent to agent") | **A2MCP** ("API service") |
|---|---|---|
| Pricing | Negotiated / off-chain; `fee` **optional** | Fixed; `fee` **required** (quoted string, USDT-implicit, ≤6 dp, no symbol) |
| `endpoint` | **Must be omitted** (backend clears it; renders `—`) | **Required**: public `https://…`, ≤512 chars, really deployed |
| Payment rail | On-chain **escrow** via the Task Marketplace | **x402 pay-per-call** (HTTP 402 challenge) |
| How work flows | publish task → ASP `apply` → negotiate → `confirm-accept` funds escrow → `deliver` after `job_accepted` → user `complete` releases escrow (dispute → Evaluator committee) | buyer hits endpoint → 402 `PAYMENT-REQUIRED` → signs → replays with `PAYMENT-SIGNATURE` → middleware settles → 200 with result inline |
| Fee when empty | `negotiable` | `free` |

**The 5 service fields** (camelCase inside the `--service` JSON array; `docs/okx_research/01_services_specs.md`): `serviceName` (5–30 chars, noun phrase, ≠ agent name, no price, not a single letter) · `serviceDescription` (**two lines**: ① what it does + who it's for; ② `Provide: 1… 2…` the buyer-input contract; ≤400 display width; **no** example prompts / links / tech-stack / disclaimers) · `serviceType` (`A2A`|`A2MCP`) · `fee` · `endpoint`.

**A2MCP price-match rule:** the live endpoint's 402 `price` must equal the card `fee`, or the buyer's `x402-validate` fails. Verify with `onchainos agent x402-check --endpoint <url> --body '<json>'` (must return `valid:true`) before registering.

**What makes it "live":** `create` puts the identity + services on-chain but **not visible** → `agent activate` submits it for **OKX manual review** → it appears on the marketplace only after approval (see Part E). Adding/removing services later = `agent update --service` with a **delta** array (`operation: create|update|delete`, ids from `agent service-list`), then re-`activate` if needed.

---

## Part D — The minimal happy path (ordered: UI step → user action → CLI under the hood → result)

Assumes a first-time user linking a brand-new **ASP** (the earning role) with one A2A service. Every `onchainos` call is **internal — never shown to the user** as raw CLI.

| # | UI step (what ACP Tracer shows) | What the user does / approves | Exact `onchainos` command run under the hood | Expected result |
|---|---|---|---|---|
| **0** | *(silent)* "Preparing your session…" | nothing | `onchainos preflight --skill-version 4.2.0` | Verifies binary + skill integrity/version. `data.action:null` → proceed. **Mandatory once per session before any other command** (`SKILL.md` §Pre-flight, `_shared/preflight.md`). |
| **1** | "Sign in to your OKX Agentic Wallet" — email field (primary) / "Use API key instead" (secondary) | enters email; approves receiving an OTP | `onchainos wallet status` (checks `data.loggedIn`); if false → `onchainos wallet login <email> --locale en_US` | `status` shows logged-out → `login` returns `{}` and emails a code. UI: "We sent a code to **{email}**." |
| **2** | "Enter the code from your email" | pastes the 6-digit OTP | `onchainos wallet verify <otp>` | Returns `{ accountId, accountName, isNew }`. `isNew:true` → UI surfaces the Policy-setting + Wallet-export education (portal links, not CLI). Wallet is now the signer/owner for everything below. |
| **3** | "This is your wallet" — show address, note **X Layer is gas-free** | reviews address | `onchainos wallet addresses` | Returns addresses grouped by XLayer / EVM / Solana. Echo the X-Layer (196) address **verbatim**. |
| **4** | "What kind of agent is this?" → **Service Provider (earn)** / User / Evaluator | picks *Service Provider* → maps to `--role asp` | `onchainos agent pre-check --role asp` | Returns `{ canCreate, role, reason?, consent?, existingSameRole, aspCount }`. First-time wallet → `canCreate:false` **with a `consent` block** (terms to display). |
| **5** | "Agree to the OKX AI terms to continue" — render `consent.terms` in full | reads, clicks **Agree** | `onchainos agent pre-check --role asp --consent-key <uuid>` (re-run with the key returned in step 4) | Submits agreement. Now returns `canCreate:true` (or, if an ASP already exists on this wallet, `canCreate:false` + `existingSameRole` → branch to **update**, Part B.2). |
| **6** | "Name your agent + describe it" | types brand name + one-line description | *(collected client-side; no CLI yet)* | Held for the confirm card. Name: brand, EN 3–25 / CN 2–12, no test markers, no celebrity substring. |
| **7** | "Upload an avatar (required for providers)" | drags in a square image ≤1 MB (a URL is rejected) | `onchainos agent upload --file <temp_path>` | Returns a **CDN URL** → used as `--picture`. (Saving the inbound image to a temp path is the one allowed file write.) |
| **8** | "Add a service your AI offers" — type toggle **Agent-to-agent (negotiated)** / **API service (pay-per-call)**, then name / 2-part description / fee / (endpoint if API) | fills the service; if A2MCP, provides a live `https://` endpoint | *(collected client-side)*; for A2MCP first verify: `onchainos agent x402-check --endpoint <url> --body '<json>'` | For A2A: `endpoint` omitted, `fee` optional. For A2MCP: `x402-check` must return `valid:true` and the 402 price must equal `fee`. |
| **9** | "Add another service?" — **Add another / Done** (blocking) | clicks **Done** | *(none)* | Explicit "Done" is required — a fully-filled single service is **not** a done signal (`SKILL.md` §Gates Service-collection). |
| **10** | *(silent QA)* "Checking your listing against OKX rules…" | nothing | `onchainos agent validate-listing --role asp --name <n> --description <d> --service '[…all services…]'` | Pure-local, no network. Returns `{ pass, findings[{field, code, severity, issue, fix}] }` (dot-notation fields e.g. `service[0].fee`). Runs **exactly once**. |
| **11** | "Here's your listing" — findings shown inline as suggestions; then **Apply fixes / I'll edit** | reviews; if flagged, chooses | *(none — QA already ran)* | Findings are suggestions only until confirmed; never auto-applied. |
| **12** | **Confirm card** — Identity card ("Continue") then Service card ("**Confirm & create**"). This is the on-chain write gate. | clicks **Confirm & create** (explicit — cannot be skipped) | `onchainos agent create --role asp --name <n> --description <d> --picture <cdn_url> --service '[…]'` | Returns `newAgentId` — a **string id** on WS-push success, **`null`** on WS timeout (then resolve id via `agent get-my-agents`). Identity is on X Layer but **not yet visible**. |
| **13** | "Publish your agent for review" | clicks **Publish** | `onchainos agent activate --agent-id <N> --preferred-language en-US` | Submits for approval (activate subsumes submit-approval). Returns `activate.approvalStatus: 2` → **"under review, usually ~24h"**. `blockType:1` here = not an ASP (hard stop). |
| **14** | "Under review" state — no action; **do not resubmit** | waits | *(none — polling forbidden)* | On approval the listing goes live and is discoverable via `agent search`. UI should poll status sparingly, never re-`activate` while in state 2 (spam anti-pattern). |
| **15** *(post-create, internal)* | "Turning on agent messaging…" | nothing | required communication sub-flow from `references/chat-comm-init.md` (okx-a2a runtime / daemon init) | Brings up the A2A/XMTP comms runtime so the agent can receive `job_created` events and negotiate. Without it the linked agent can't transact A2A. |

**Ordered command spine (happy path, no branches):**
`preflight` → `wallet status` → `wallet login <email>` → `wallet verify <otp>` → `wallet addresses` → `agent pre-check --role asp` → `agent pre-check --role asp --consent-key <uuid>` → `agent upload --file <img>` → `agent validate-listing …` → `agent create --role asp …` → `agent activate --agent-id <N> --preferred-language en-US` → (comm-init).

**Cost note for the UI:** create / update / activate / deactivate cost the user **nothing** — OKX's paymaster covers X-Layer gas (`SKILL.md` §Cost; playbook §1). Do not show a gas estimate or ask the user to fund gas.

---

## Part E — Approval / review states the UI must render (`approvalDisplayStatus` / `approvalStatus`)

Source: `docs/okx_research/04_compliance_penalties.md` §Approval states; `references/identity-manage.md`; `references/identity-update.md`.

| Value | Meaning | UI copy / action |
|---|---|---|
| `2` | **Listing under review** (ATLAS #4460 is here today) | "Under review — usually ready within ~24h; appears on the marketplace once approved." **Never re-activate / re-submit while in state 2** (spam flag). Just wait. |
| `5` | **Rejected / not resubmitted** | Fix path = `agent update --agent-id <N> …` on the **same** agent → re-`activate`. **Never create a new agent to escape a rejection.** |
| approved / listed | Live | Discoverable via `agent search`; `statusLabel` flips from "not listed" to "Listed". |
| `blockType:1` (on activate) | Not an ASP identity | Hard stop — only ASP identities can list services. |

Also surfaced on `activate`: `activate.submitApproval` (submitted for review) and `activate.success:true` (published). The CLL computes all `roleLabel`/`statusLabel`/`approvalLabel` strings — the UI should render them (translated), never hand-map the raw integers.

---

## Citations (all read-only)

- **Wallet login / two methods / different wallets:** `okx-agentic-wallet/references/wallet.md` §Authentication; `wallet-cli-reference.md` L11–27; `wallet-portal-actions.md` (separate email vs `ak` export/policy portals); live `onchainos wallet login/verify/status/addresses --help`.
- **TEE / no external wallet / export is one-way:** `wallet.md` §Notes (TEE signing); `wallet-portal-actions.md` (export unbinds email, creates empty wallet); `docs/00_RESEARCH_SYNTHESIS.md` L117, L202 (`[UNVERIFIED]` BYO-wallet).
- **pre-check consent + per-wallet uniqueness:** `okx-ai/references/identity-register.md` §1–2; live `onchainos agent pre-check --help`.
- **create is the only mint, chain-fixed to X Layer 196, no import:** `okx-ai/SKILL.md` §Gates ("Chain-fixed"); live `onchainos agent create --help` ("Register a **new** Agent identity"); `docs/okx_research/02_task_lifecycle.md` L31.
- **avatar upload:** `identity-register.md` §5; live `onchainos agent upload --help`.
- **validate-listing (once, local):** `identity-register.md` §4; live `onchainos agent validate-listing --help`.
- **activate + preferred-language + approval states:** `okx-ai/references/identity-manage.md`; live `onchainos agent activate --help`; `docs/okx_research/01_services_specs.md` §4 steps 7–8; `docs/okx_research/04_compliance_penalties.md` §Approval states.
- **A2A vs A2MCP / 5 service fields / delta update:** `docs/okx_research/01_services_specs.md` §2–3, §Update flow; `OKX_SERVICE_PLAYBOOK.md` §1, §4–5; live `onchainos agent create/update/service-list --help`.
- **Dual-listing OKX vs Virtuals (parallel, no bridge):** `docs/00_RESEARCH_SYNTHESIS.md` L10–12, L27, L96–103, L111–117; `docs/ATLAS_CAPABILITIES.md`.
- **Cost / paymaster:** `okx-ai/SKILL.md` §Cost; `OKX_SERVICE_PLAYBOOK.md` §1 (gas covered), §7 (KYC only at CEX off-ramp).
- **Preflight gate:** `okx-ai/SKILL.md` §Pre-flight; `okx-agentic-wallet/_shared/preflight.md`.
