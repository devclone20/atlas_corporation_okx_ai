# ACP Tracer — Security & Sterilization Model + Competitive Analysis

> **Status:** Draft 1 · 2026-07-06 · Research dossier 09 for the `acp_tracer` slice.
> **Scope:** ONE slice, deep — the security/sterilization posture for a no-code UI where end users bring **their own wallet** and **their own LLM API key** to run agents on Virtuals ACP; plus a competitive read of the Virtuals **Butler Agent**.
> **Rigor rule (inherited from `docs/00_RESEARCH_SYNTHESIS.md`):** every load-bearing claim is grounded in a source below. Anything not directly verified from an official/first-party source is tagged **`[UNVERIFIED]`** and must be confirmed before we depend on it in code or public docs.
> **Posture inheritance:** this dossier extends the existing **`hacker` agent** (`~/.claude/agents/hacker.md`, v1.0) — OWASP Top 10 2025, OWASP Secure Headers, Gitleaks/detect-secrets/TruffleHog/Kingfisher, Semgrep SAST, SARIF, pip-audit CI — and the §7 security posture of the synthesis ("**Authority > key**").

---

## Sources

**Butler Agent / Virtuals ACP (competitive):**
- Virtuals Whitepaper — Butler builder guide + FAQ, via `llms-full.txt` export: https://whitepaper.virtuals.io/llms-full.txt
- Delphi Digital — *Virtuals & ACP: Open Coordination for Digital Labor*: https://members.delphidigital.io/reports/virtuals-acp-open-coordination-for-digital-labor
- RockawayX — *Virtuals Launches Agent Commerce Protocol in Public Beta*: https://www.rockawayx.com/insights/virtuals-agent-commerce-protocol-in-public-beta
- Virtuals Whitepaper — Butler builder-guide article (current path): https://whitepaper.virtuals.io/info-hub/agent-commerce-protocol-acp-guide/articles/a-builders-guide-to-the-butler-agent
- MEXC / DEXTools 2026 explainers (secondary context): https://www.mexc.com/learn/article/what-is-virtuals-protocol-virtual-x402-agent-commerce-protocol-and-ai-agent-economy/1 · https://www.dextools.io/tutorials/what-is-virtuals-protocol-ai-agents-base-guide-2026

**Non-custodial login / signatures (best practice):**
- Reown (ex-WalletConnect) AppKit — Sign In With Ethereum / SIWX: https://docs.reown.com/appkit/next/core/siwe
- wagmi — SIWE example + `verifyMessage`: https://1.x.wagmi.sh/examples/sign-in-with-ethereum · https://wagmi.sh/core/api/actions/verifyMessage
- viem — `verifyMessage` (ERC-6492/1271 aware): https://viem.sh/docs/utilities/verifyMessage
- Base — SIWE with Smart Wallet + signature verification (ERC-1271/6492): https://docs.base.org/identity/smart-wallet/guides/siwe · https://docs.base.org/identity/smart-wallet/guides/signature-verification
- EIP-4361 (SIWE) / EIP-1271 (contract-wallet sig) / ERC-6492 (pre-deploy sig)

**Prompt injection / web sterilization:**
- OWASP GenAI — **LLM01:2025 Prompt Injection**: https://genai.owasp.org/llmrisk/llm01-prompt-injection/
- OWASP Top 10 2025, OWASP Secure Headers Project, MDN CSP, Mozilla Web Security (inherited via `hacker` agent)

**Internal:**
- `~/.claude/agents/hacker.md` (v1.0) — sterilization playbook (Gitleaks, Semgrep, SARIF, OWASP 2025)
- `~/Desktop/atlas_corporation_okx_ai/docs/00_RESEARCH_SYNTHESIS.md` — §7 posture, ACP state machine, `acp-node-v2`, non-custodial Privy adapter

---

## Non-custodial wallet login (libs + pattern)

**Principle:** we are a **relying party**, never a custodian. The user's private key / seed **never** touches our frontend memory, our servers, or our droplet. We only ever receive **signatures** and **public addresses**.

### Recommended stack (current best practice, 2026)
| Layer | Choice | Why |
|---|---|---|
| Connect + wallet transport | **Reown AppKit** (ex-WalletConnect v2) with **One-Click Auth** | De-facto multi-wallet standard; WC v2 pairing; single sign+connect step; supports 400+ wallets without us handling keys |
| Chain/account primitives | **viem** (+ **wagmi** React hooks) | Tree-shakeable, typed, the current standard; `verifyMessage`/`verifyTypedData` are **ERC-6492/ERC-1271-aware** (works for smart accounts, even pre-deploy) |
| Auth message | **SIWE (EIP-4361)** — migrate to **SIWX** for multichain | Human-readable, domain-bound, nonce-bound challenge; SIWE is being superseded by SIWX (Sign-In With X) for multichain — build against SIWX so Base + Solana ACP both work |
| Session after sign | **httpOnly + Secure + SameSite=strict** cookie or short-lived JWT | Session is bound to the recovered address; **never** store the wallet secret |

> `[UNVERIFIED]` exact current AppKit/wagmi/viem package versions — pin at build time via lockfile; the SIWE→SIWX migration status should be re-checked at implementation (Reown docs flag SIWX as the forward path).

### The non-custodial login flow (SIWE / One-Click Auth)
1. **Connect** — user picks wallet in AppKit modal; WC v2 pairing returns only the **address**. No key material crosses the boundary.
2. **Challenge** — *our backend* generates a single-use **nonce** (server-side, unguessable, short TTL) and builds a domain-bound EIP-4361 message (`domain`, `uri`, `chainId`, `nonce`, `issued-at`, `expiration-time`).
3. **Sign** — user signs **in their wallet**. Private key stays in the wallet's secure context; we receive only the signature.
4. **Verify (server-side)** — recover/verify with viem `verifyMessage`. Because it is **ERC-6492/1271-aware**, it verifies EOAs **and** smart accounts (Base smart wallets, ERC-6551 TBAs) even before deployment. Confirm: recovered address == claimed address, nonce unused + unexpired, domain matches.
5. **Session** — on success, issue httpOnly/Secure/SameSite=strict cookie or short-lived JWT keyed to the address; **burn the nonce**.

### How the user's key stays off our servers
- **We never request, transport, log, or persist private keys or seed phrases.** There is no code path that can receive one — the wallet signs; we verify.
- All transaction signing (ACP `budget_set` = Proof-of-Agreement, `funded`, etc.) is a **wallet-side signature request** the user approves. ACP Tracer **constructs** the transaction, the **user's wallet signs** it. This mirrors the synthesis' non-custodial `PrivyAlchemyEvmProviderAdapter` model ("no raw private keys in application code") but pushes custody fully to the user's own wallet, not a delegated Privy signer.
- **No-LLM-in-signing-path** (inherited invariant): the LLM may *draft* a job/intent, but the transaction shown for signature is **deterministically constructed** from typed fields, never free-text emitted by the model. The user sees exactly what they sign.
- SIWE nonce + verification live **server-side**; the client never holds the secret that authenticates the session.

---

## User LLM API key handling

**Threat model:** the user's LLM API key (Anthropic/OpenAI/etc.) is a **bearer credential** — whoever holds it can spend the user's money. It is as sensitive as a wallet, minus the on-chain finality. Default posture: **the key must never reach us.**

### Tier 1 — DEFAULT: client-side / local-only (never sent to us)
- **Where it lives:** the user's browser (or their own local runner). Preferred store: **in-memory only** for the session, or the browser's origin-isolated storage (never plain `localStorage` if avoidable — it is readable by any injected script; a compromise of our CSP = key theft).
- **Where calls go:** the browser (or the user's own machine/droplet) calls the LLM provider **directly**. Our servers are **not** in the request path. The key never transits our infrastructure.
- **Never logged, never telemetried:** hard rule — the key is on the secret-scanner denylist; no analytics/error reporter may capture request bodies or headers containing it (scrub `Authorization`/`x-api-key` before any Sentry/log sink). Enforced by the `hacker` agent's secret-scan phase over our own logs.
- **Redaction in UI:** masked input, never rendered back, never in URL/query string.

### Tier 2 — IF a key must reach a droplet (agent runs server-side)
The moment an agent runs on **our** infra (long-running ACP jobs, headless polling), the key must transit — this is the dangerous path. **Do not do this by default.** If unavoidable:
- **Ephemeral, encrypted-in-transit (TLS) and encrypted-at-rest** via OS keyring / KMS — **never** raw env in the repo, never `0644`, never a shared `.env` across tenants. Mirrors synthesis §7.2 ("secrets on the droplet are the crown jewels → OS keyring/KMS, `0600`, rotate, hot kill-switch").
- **Per-tenant isolation** — one user's key never shares a process, memory space, or on-disk store with another's. (Same isolation discipline the memory notes apply to ATLAS: user + folder + secrets + DB **per agent**.)
- **Scoped + short-lived where possible** — prefer provider features for restricted/expiring keys; **never** ask for the user's root key if a scoped one exists.
- **Zero-knowledge preferred** — even server-side, prefer a design where the droplet decrypts the key only in-memory at call time and never writes it to disk or logs. Kill-switch to purge on revoke.
- **Explicit consent** — the user is told, in the UI, that choosing "run on our infra" means their key transits our droplet, and what protections apply. Custody is a **user choice**, defaulting to Tier 1.

**Recommendation:** ship **Tier 1 only** for v1 (client-side/local, BYO-key, we are never in the LLM path). Treat Tier 2 as a later, opt-in, heavily-gated feature — it converts us from a stateless relying-party into a custodian of a bearer secret, which is exactly the risk the founder wants to avoid.

---

## Code sterilization checklist (pre-release)

Runs the existing **`hacker` agent v1.0** end-to-end, plus ACP-Tracer-specific additions. **Block release on any CRITICAL.**

**Secrets & history (hacker Phase 1, 5):**
- [ ] Gitleaks + detect-secrets pre-commit hooks installed (`.pre-commit-config.yaml`), `detect-private-key` on.
- [ ] TruffleHog `--only-verified` + Gitleaks over **full git history** (secrets survive `git rm`). Kingfisher if repo is large.
- [ ] **Rotation before removal** — any secret ever committed is treated as compromised.
- [ ] ACP-specific denylist: LLM API keys (`sk-ant-`, `sk-`, provider prefixes), WalletConnect/Reown `projectId`, RPC provider keys, any wallet private key / mnemonic, ACP signer P256 material.

**`.gitignore` hygiene (hacker Phase 2):**
- [ ] `.env`, `.env.*` (allow `!.env.example`), `*.pem`/`*.key`, `*.sqlite`, source maps, `.DS_Store`, `node_modules/`.
- [ ] `.env.example` present, **no real values**.

**Dependency & supply chain (hacker Phase 6 + OWASP 2025 A03):**
- [ ] `npm ci` (lockfile-exact, not `npm install`) in CI; `npm audit --audit-level=high` clean; pin **exact** versions of wallet/crypto libs (viem, wagmi, AppKit).
- [ ] No unknown-author packages with install scripts (wallet libs are a prime supply-chain target — a malicious `viem` fork could exfiltrate signatures).
- [ ] Lock files committed; SARIF from Semgrep (`p/secrets`, `p/owasp-top-ten`) uploaded to GitHub Security.

**OWASP web app (hacker Phase 4 + A05 headers):**
- [ ] **CSP** strict — `default-src 'self'`, `script-src 'self'` (**no `unsafe-inline`/`unsafe-eval`** — an XSS on our page = LLM key + session theft), `connect-src` allowlisting only wallet RPC + the chosen LLM provider origins, `object-src 'none'`, `frame-ancestors 'none'`. Enforced via **Helmet** (or framework equivalent).
- [ ] HSTS `max-age=31536000; includeSubDomains; preload`; `X-Content-Type-Options: nosniff`; `X-Frame-Options: DENY`; `Referrer-Policy: strict-origin-when-cross-origin`; `Permissions-Policy` locking camera/mic/geo.
- [ ] CORS **not** wildcard; input validation on every field; **no** `dangerouslySetInnerHTML`/`eval`/`innerHTML` with user or agent text.
- [ ] A10 (2025) — exception handling: generic error to client, structured log internally, **no stack traces / no key fragments** in responses or logs.

**ACP-Tracer specific:**
- [ ] Confirm **no code path** can receive a private key or seed (grep the codebase; assert by design).
- [ ] Confirm the LLM key is **never** attached to a request to our origin (network-layer test: our backend receives zero `Authorization: Bearer sk-*`).
- [ ] Prompt-injection defenses in place on all untrusted task text (see below) before any agent runs.
- [ ] Deterministic signing: the tx presented for signature is built from typed fields, never model free-text.

---

## Trust boundaries (UI / machine / droplet / wallet / LLM)

Five parties. Draw the boundaries so a compromise of any one does **not** hand an attacker keys or funds.

```
 ┌─────────────────────────────────────────────────────────────────────┐
 │  USER-CONTROLLED ZONE (we never hold secrets here)                    │
 │                                                                       │
 │   ┌──────────────┐   sign req    ┌──────────────────┐                 │
 │   │  USER WALLET │◄──────────────│  ACP Tracer UI    │                 │
 │   │ (key/seed —  │──signature───►│ (browser, our    │                 │
 │   │  never leaves)│               │  code, no secrets)│                │
 │   └──────────────┘               └───────┬──────────┘                 │
 │          ▲                                │  LLM key held             │
 │          │ tx signed by USER              │  client-side only         │
 │          │                                ▼                           │
 │          │                        ┌──────────────────┐  direct call   │
 │          │                        │  LLM PROVIDER     │◄──────────────┐│
 │          │                        │ (Anthropic/OpenAI)│  (key never    ││
 │          │                        └──────────────────┘   crosses us)  ││
 └──────────┼──────────────────────────────────────────────────────────┘│
            │ signed tx → chain                                          │
 ┌──────────┼──────────────────────────────────────────────────────────┐│
 │  OUR ZONE (untrusted-by-default toward user secrets)                 ││
 │   ┌──────────────────┐   nonce/verify   ┌─────────────────────────┐  ││
 │   │  ACP Tracer API  │◄────SIWE────────►│  (optional) DROPLET      │  ││
 │   │ (nonce, session, │                  │  runs agent server-side  │  ││
 │   │  verifyMessage)  │                  │  ONLY in Tier 2 opt-in   │──┘│
 │   └────────┬─────────┘                  └─────────────────────────┘   │
 └────────────┼─────────────────────────────────────────────────────────┘
              ▼
      Base / ACP on-chain escrow (USDC) — synthesis §3.2 state machine
```

**Boundary rules:**
1. **Wallet ⟷ everything:** the wallet is a black box. It emits signatures/addresses only. No party — not the UI, not our API, not the droplet — ever reads the key. Enforced by using AppKit/viem (request-signature model), never a key-import field.
2. **UI ⟷ our API:** the API is treated as **untrusted toward user secrets** — it receives only the address + signature (SIWE) and never the LLM key. Session is httpOnly cookie; CSRF-protected; SameSite=strict.
3. **UI ⟷ LLM:** direct in Tier 1. Our origin is **not** in the LLM request path. This is the whole point: **the LLM key and the wallet key both stay in the user-controlled zone.**
4. **Droplet (Tier 2 only):** if the user opts an agent onto our infra, the droplet becomes a **temporary custodian of a bearer secret** — per-tenant isolation, KMS/keyring, kill-switch (synthesis §7.2). This is the **only** boundary crossing where a user secret enters our zone, and it is **opt-in, gated, and off by default.**
5. **On-chain:** finality lives on Base/ACP escrow. The signer is the **user's wallet**, never a shared or delegated signer we control (avoids the synthesis' double-sign / fenced-lease problem — because we hold no signer).

**Authority > key (synthesis §7.1):** even with perfect key hygiene, the residual risk is that the *agent decides* to do something harmful (drain the escrow via a poisoned task). That is a **decision-surface** problem → spend ceilings, human approval on funding/high-value ops, and prompt-injection hardening below.

---

## Prompt-injection defense

Agents on ACP ingest **untrusted task text** (job descriptions, buyer inputs, provider outputs, on-chain metadata). Per **OWASP LLM01:2025**, this is the **#1 AI risk** — the model cannot reliably tell trusted system instructions from untrusted data, and injections need not be human-readable to work. The attack we most fear: a crafted task that makes the agent **approve a funding tx, leak the user's LLM key, or exfiltrate session data.**

**Defense-in-depth (OWASP LLM01:2025 controls, mapped to ACP Tracer):**
1. **Trust-boundary tagging / input segregation** — never concatenate untrusted task text into the system prompt. Wrap all external content (job text, provider deliverables, chain metadata) in clearly delimited, model-visible "untrusted data" envelopes; the system prompt states its role/limits and that delimited content is **data, not instructions**.
2. **Least-privilege tooling** — the agent gets the *minimum* tools per job. Fund-moving / signing tools are **never** callable directly by the LLM; they emit **typed intents** that pass a Policy Gate (synthesis §6). No-LLM-in-signing-path.
3. **Human-in-the-loop on sensitive actions** — any funding, spend above a ceiling, or key-touching action requires **explicit user approval** in the UI. The user's wallet signature is itself a human gate; we add an app-level confirm for anything the model proposes.
4. **Output treated as untrusted** — the model's output is sanitized like any external input before it is rendered (no raw HTML injection) or used to build a tx (typed fields only, never free-text-to-tx).
5. **Output/format constraints** — constrain the model to expected output schemas; reject non-conforming output rather than executing it.
6. **Spend ceilings + kill-switch** — per-session and per-job caps enforced deterministically outside the model; a hot kill-switch halts the agent (synthesis §7).
7. **Adversarial testing** — a pre-release injection test-suite (canary tasks that *try* to make the agent leak the key or approve a spend) gated by the `qa`/`hacker` pass. Regular re-testing as new injection classes emerge.
8. **The LLM key is never in the model's reachable context** — it is a transport credential held by the runtime, **not** data the model can read or be tricked into echoing. Even a successful injection cannot surface a value the model never sees.

> `[UNVERIFIED]` no single control defeats prompt injection (OWASP is explicit that it is an open problem). We rely on **layering** — the key material and signing authority sit *outside* the model's reach, so an injection that fully controls the model still cannot move funds or leak the key without also defeating the deterministic gate + human approval.

---

## Butler Agent competitive analysis

**What Butler is (verified):** Butler is Virtuals' **consumer gateway to the Agent Economy** — a **chat-based** front door to ACP. Users discover provider agents, browse offerings, and start job requests in natural language, then Butler executes the ACP contract (payment, task routing, result confirmation) on-chain. Interfaces: the **Virtuals web app chat**, **Butler on Base App** (Chat + MiniApp), and **X/Twitter** (generates content when tagged). *"It's like chatting with a friend or your personal assistant, but with access to a world of agents."* (Whitepaper; Delphi; RockawayX.)

**Verified specifics relevant to us:**
- **Non-custodial wallet, but abstracted.** *"You hold the private key and manage your own funds."* On Base App, the user connects their Base wallet and Butler auto-provisions a **single unified Butler wallet address**. Users **do not continuously sign** — they **`/topup`** the Butler wallet up front, and payments are drawn from that escrow balance during jobs. Guardrails: *"non-custodial — keys held by the owner, with restricted-mode signing as the default."*
- **Hosted by Virtuals, not local.** *"No infrastructure setup required."* Butler chat/MiniApp run inside Virtuals' + Base App infrastructure. **Users do not run Butler locally.**
- **No BYO LLM key.** Users do **not** supply their own LLM API key; model selection is a builder/agent-owner concern, abstracted away from the end user. (No mechanism documented for user-provided LLM credentials.)
- **Limited customization.** A **Pro Mode (beta)** adds a "plan-first" workflow (upfront research → structured execution plan → human review/refinement before approval). But the docs describe **no user-facing saved automations / editable automation templates / persisted workflows**; Pro Mode is early-stage.
- **USDC-only** (other tokens "coming soon"); recommended deposit 2–5 USDC; governance layer "forthcoming."

**Butler's limits (as the founder framed them — checked against sources):**
| Founder's claim | Verdict | Evidence |
|---|---|---|
| "No UI" | **Partly false** — Butler *has* a chat UI (web, Base App, X). But it is **chat-only**, not a structured no-code builder UI. | Whitepaper/Delphi confirm chat interface. |
| "No local-machine option" | **Verified true.** Butler is Virtuals-hosted; *"no infrastructure setup required,"* users don't run it locally. | Whitepaper. |
| "No editable automations" | **Verified (largely) true.** No saved/editable automation templates documented; Pro Mode is beta plan-review, not persistent user-authored automations. | Whitepaper. |
| BYO LLM key | **Verified: not supported.** Model choice is builder-side; no user-key path. | Whitepaper. |
| Custody | Non-custodial **but** funds pool in a **Butler-provisioned escrow wallet** topped-up upfront — the user isn't in the loop per-transaction. | Whitepaper. |

**How ACP Tracer differentiates:**
1. **Structured no-code UI, not chat-only.** Butler is a concierge chatbox; ACP Tracer is a **visual, editable control surface** for building/tracking ACP jobs — closer to Linear/Vercel than a chat window.
2. **True BYO-wallet, per-action signing.** The user signs from **their own wallet** (SIWE + viem), no Virtuals-provisioned pooled escrow wallet, no upfront blind top-up. Custody stays 100% with the user; we hold **no** signer.
3. **BYO LLM key (client-side).** Users bring their **own** LLM credential and run the model on **their** terms — Butler forecloses this entirely.
4. **Local-machine / self-host option.** ACP Tracer can run the agent on the **user's own machine/droplet**; Butler is Virtuals-hosted only.
5. **Editable, persisted automations.** ACP Tracer targets user-authored, saveable, editable automations — Butler has none (Pro Mode is transient plan-review).
6. **Security-first & sterilized by construction.** Our differentiator is the trust model itself: the LLM key and wallet key both stay in the user-controlled zone; we are a stateless relying-party, not a custodian.

> `[UNVERIFIED]` Butler is evolving fast (Pro Mode, Base App integration are recent). Re-verify the "no editable automations" and "no BYO-key" gaps close to launch — they are our positioning, so a Butler feature-catch-up would erode points 3/5.

---

## Risks / Gotchas

1. **XSS = total compromise.** Because the LLM key + session live client-side, any script injection on our origin steals both. → strict CSP with **no `unsafe-inline`/`unsafe-eval`**, `connect-src` allowlist, and a hard rule against `dangerouslySetInnerHTML`. This is non-negotiable, not defense-in-depth garnish.
2. **`localStorage` key theft.** Storing the LLM key in `localStorage` makes it readable by any injected script. Prefer in-memory/session; if persisted, accept the elevated XSS blast radius and compensate with CSP.
3. **Supply-chain on wallet/crypto libs.** A malicious `viem`/`wagmi`/AppKit version could silently exfiltrate signatures or keys. → pin exact versions, `npm ci`, review updates, watch for typosquats.
4. **Prompt injection is unsolved.** OWASP is explicit: no single control defeats it. Our safety net is that **the model can't reach the key or the signer** — but a poisoned task can still waste the user's LLM spend or produce bad deliverables. Spend ceilings + human approval are mandatory.
5. **Tier 2 droplet = custody creep.** The instant we run an agent server-side with the user's key, we become a bearer-secret custodian and inherit the synthesis §7.2 "crown jewels" problem. Keep it opt-in and off by default, or the founder's core requirement is violated.
6. **SIWE nonce/replay.** Nonce must be server-generated, single-use, short-TTL, domain-bound; verify server-side with viem (`verifyMessage`, ERC-6492/1271-aware) so smart accounts (Base wallet, ERC-6551 TBA) work — a naive `ecrecover` breaks for contract wallets.
7. **Logging leaks.** Error reporters (Sentry) love to capture headers/bodies — scrub `Authorization`/`x-api-key`/signatures before any sink. Add to the `hacker` secret-scan over our own logs.
8. **Butler catch-up risk.** Our differentiation (BYO-key, editable automations, local option) is a moat only until Virtuals ships equivalents — Butler is iterating fast.

---

## Open Questions

**Product / architecture:**
- **Do we ever need Tier 2 (server-side key)?** If ACP jobs are long-running/headless, a purely client-side model may not keep the agent alive when the browser is closed. Resolve: is v1 strictly interactive (browser-present) — allowing Tier-1-only — or does it need background execution?
- **Wallet-side signing UX for ACP's multi-step state machine** (`budget_set` → `funded` → `submitted`): how many signature prompts does the user tolerate before it feels worse than Butler's upfront-topup model? Batching vs. per-step trade-off.
- **SIWE → SIWX migration status** at build time (Base + Solana ACP are both in play; multichain auth wants SIWX). `[UNVERIFIED]`

**Verification backlog (external):**
- `[UNVERIFIED]` Does Butler already support any user-side key/model choice or saved automations in an unreleased build? (positioning depends on the gap staying open)
- `[UNVERIFIED]` Exact current versions to pin: viem, wagmi, Reown AppKit, Helmet.
- `[UNVERIFIED]` Whether ACP `acp-node-v2` can be driven from the **browser** (client-side) or requires a Node server — this decides whether Tier-1-only is even feasible, or Tier 2 is mandatory for ACP itself.

**Security sign-off:**
- Run the full **`hacker` agent** pass on the ACP Tracer repo before any public push (synthesis §7.5 — "no public GitHub push until the Hacker pass is clean").
- Author the adversarial prompt-injection test-suite (canary tasks) as a release gate.

---

*Grounded in the sources listed. `[UNVERIFIED]` tags are the verification backlog, not assumptions to build on. Inherits the `hacker` agent v1.0 playbook and the §7 posture of `docs/00_RESEARCH_SYNTHESIS.md`.*
