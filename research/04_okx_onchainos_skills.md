# 04 — OKX OnchainOS Skills: Research + Supply-Chain Security Audit

> Audience: ATLAS (24/7 Harness/Orchestrator iNFT) build.
> Question under test: is it safe to run `npx skills add okx/onchainos-skills --yes -g` (GLOBAL install)?
> Method: cloned the repo and read the actual Rust CLI, install scripts, skill manifests, and package metadata. npm publisher checks run live. Findings prefixed `[UNVERIFIED]` are inferences; everything else is grounded in a file I read or a command I ran.

---

## Sources fetched

- GitHub repo (cloned + inspected locally): https://github.com/okx/onchainos-skills
  - Local clone: `~/Desktop/atlas_corporation_okx_ai/research/_clones/onchainos-skills`
  - Single commit in shallow clone: `37d3214` (default branch `main`).
- OKX install guide: https://web3.okx.com/pt/onchainos/dev-docs/okxai/agent-installation-guide (thin — gives the command, `Keep your API Key safe`, nothing on internals).
- `skills` CLI (the thing `npx skills` runs): https://github.com/vercel-labs/skills + `npm view skills`.
- Live npm publisher checks: `npm view skills`, `npm view @okxweb3/a2a-node`, `npm view onchainos-skills` (404).

---

## Key Facts

- **`npx skills` is NOT an OKX tool.** It is the npm package **`skills` (v1.5.14)**, published by **`vercel-labs`** — maintainers `rauchg` (Guillermo Rauch, Vercel CEO) and `quuu`. Repo `github.com/vercel-labs/skills`, "The open agent skills ecosystem." So the install command has **two trust parties**: (a) Vercel's installer CLI, (b) OKX's skill content.
- **`skills add okx/onchainos-skills` pulls markdown from GitHub, not npm.** `onchainos-skills` is **not published on npm** (`npm view` → 404). `skills add` copies `SKILL.md` + reference `.md` files into the agent's skills dir. Per the Vercel docs it runs **no code, no postinstall**, only copies/symlinks markdown.
- **`-g` / `--global`** = install to the user dir instead of the project. For Claude Code that is **`~/.claude/skills/`**. `--yes` = skip all confirmation prompts (non-interactive).
- The npm `package.json` has a `postinstall`, but it is a **harmless `echo`** (`package.json:48`) — and it doesn't even run through `skills add` (that path never calls `npm install`).
- **The real executable is a separate Rust binary, `onchainos`**, NOT installed by `skills add`. It is installed on demand via `curl -sSL …/install.sh | sh` (→ `~/.local/bin/onchainos`) or auto-updated by the skill flow. Release binaries are SHA256-checksum-verified against `checksums.txt` from GitHub Releases.
- **License: MIT** (root `LICENSE`/README, `package.json`, every SKILL.md frontmatter). Author `OKX` / `web3.okx.com`.
- Publisher of the CLI content is **genuinely OKX**: repo under the `okx` GitHub org; the optional companion `@okxweb3/a2a-node` is published by `@okg.com` / `npm-okx` maintainers (OKX corporate domain). No impersonation indicators.
- **Credentials model is TEE + session-key, not a hot wallet.** The user's real private key never lives on the machine. See SECURITY AUDIT.

---

## Skills inventory (name + what it does)

From `README.md` + `skills/*/SKILL.md` (19 SKILL.md dirs; README lists the primary 12):

| Skill | What it does |
|-------|--------------|
| `okx-agentic-wallet` | The heavy one. Wallet lifecycle (login, accounts, balance, portfolio PnL, send/transfer, contract calls), Gas Station, **DEX swap**, cross-chain bridge, limit-order strategy, tx gateway (gas/simulate/**broadcast**/track), public-address portfolio, security scanning (token risk, phishing, approvals), audit log. **This is the skill that moves money.** |
| `okx-dex-market` | Read-only: real-time prices, K-line charts, index prices, wallet PnL, address tracker activity. |
| `okx-dex-signal` | Read-only: smart-money / whale / KOL signal tracking, leaderboards. |
| `okx-dex-trenches` | Read-only: meme/launchpad token scanning, dev reputation, bundle detection. |
| `okx-dex-token` | Read-only: token search, metadata, market cap, holders, top traders, cluster analysis. |
| `okx-dex-social` | Read-only: crypto news, sentiment, KOL leaderboard. |
| `okx-agent-payments-protocol` | Payment dispatcher: x402 (`exact`/`aggr_deferred`, **TEE or local-key sign**), MPP (`charge`/`session`), a2a-pay. Signs payment authorizations. |
| `okx-defi-invest` | DeFi deposit/withdraw/claim across Aave, Lido, PancakeSwap, Kamino, NAVI, etc. **State-changing.** |
| `okx-defi-portfolio` | Read-only: DeFi positions overview. |
| `okx-agent-chat` | Agent-to-agent comms: XMTP plugin mgmt, encrypted file attachment up/download. |
| `okx-dapp-discovery` | Discovers third-party DApps (Polymarket, Aave V3, Hyperliquid, PancakeSwap, Morpho) and **installs additional plugins on demand** via `npx skills add okx/plugin-store …` (see Risks). |
| `okx-growth-competition` | Trading competitions: list/join/leaderboard/claim. |
| `okx-agent-identity`, `okx-agent-task`, `okx-task-watch`, `okx-guide`, `okx-dex-ws` | Identity registration, agent task/ASP flows, background WebSocket watch, onboarding guide, DEX websocket. |

Read vs. write: the `dex-*`/`*-portfolio`/`social`/`signal` skills are **read-only market data**. The wallet, defi-invest, payments, and gas-station domains are **transaction-signing / fund-moving**.

---

## The `npx skills` mechanism

1. `npx skills` downloads and runs the Vercel Labs `skills` CLI from npm (`skills@1.5.14`).
2. `skills add okx/onchainos-skills`:
   - Resolves `okx/onchainos-skills` as **GitHub shorthand**, fetches the repo, locates `SKILL.md` dirs.
   - **Copies markdown skill files** into the agent skills directory. Per Vercel docs it does **not** run package code / postinstall — it is a markdown copy.
   - `--yes` → no prompts. `-g` → target is the **user-global** dir (`~/.claude/skills/`) instead of `./.claude/skills/`.
3. What global install actually changes: it makes these skills available to **every** Claude Code project on this machine, so ANY session can be routed by the model into `onchainos` wallet/swap/broadcast commands. That is the real meaning of "global" here — a capability-surface expansion, not a code-execution risk.
4. First time a wallet/market command actually runs, the skill instructs the agent to ensure the **`onchainos` Rust binary** exists and, if not, install it (`install.sh`). **That** step is where native code lands on disk.

Net: `skills add … -g` itself = low-risk file copy. The binary it later pulls is the component that deserves the audit — and it's below.

---

## SECURITY AUDIT

Grounded in the cloned Rust source under `cli/src/`.

### Credential / private-key handling — STRONG
- **No raw wallet private key is ever stored or held on the machine.** The wallet uses a **TEE + HPKE session-key** design (`cli/src/crypto.rs`, `cli/src/commands/agentic_wallet/sign.rs`):
  - OKX's server (in a TEE) HPKE-encrypts a short-lived **Ed25519 session signing seed** to the client (`hpke_decrypt_session_sk`, suite DHKEM-X25519 + HKDF-SHA256 + AES-256-GCM, info `okx-tee-sign`).
  - The client decrypts that seed **in memory only** to co-sign a session assertion, then **zeroizes it immediately** (`signing_seed.zeroize()` everywhere in `sign.rs`; `Zeroizing<>` wrappers in `file_keyring.rs`).
  - The **final transaction signature is produced server-side**; the client sends `sessionSignature` to `/priapi/v5/wallet/agentic/pre-transaction/sign-msg`.
- **Secrets at rest**: tokens + `session_key` live in the **OS keyring** (`keyring_store.rs`, service `onchainos`). Headless/Docker fallback = `~/.onchainos/keyring.enc`, **AES-256-GCM**, key = `scrypt(persisted 32-byte random identity, random salt)`, files chmod **0600**, dir **0700** (`file_keyring.rs`).
- **API-key auth (AK mode)**: `OKX_API_KEY`/`OKX_SECRET_KEY`/`OKX_PASSPHRASE` read from env or `~/.onchainos/.env`; used only to HMAC-SHA256-sign requests (`client.rs::hmac_sign`). Secrets are sent as OK-ACCESS-* headers to `web3.okx.com` only. `.gitignore` excludes `.env` and `.onchainos/`.
- **No hardcoded secrets** found. Grep for embedded keys / `-----BEGIN` / literal secret assignments = clean. README's "built-in sandbox API keys" are baked into the release **binary**, not the source I read; they are explicitly test-only and disclaimed `[UNVERIFIED — not visible in source, presumably compiled in]`.

### Network calls
- All API traffic goes to **`web3.okx.com`** (`DEFAULT_BASE_URL`, `client.rs:17`), overridable via `OKX_BASE_URL`. TLS via rustls (per SECURITY.md, no OpenSSL).
- **Outbound hosts referenced anywhere in source/scripts** (grepped): only `web3.okx.com`, `static.okx.com`, `static.coinall.ltd` (OKX/Coinall CDN), `okg-pub-hk.oss-cn-hongkong.aliyuncs.com` (Aliyun OSS fallback), `static.jingyunyilian.com` (CDN), `github.com`/`raw.githubusercontent.com` (releases), `larksuite.com` (an OKX internal doc link in a comment), plus `example.com` test stubs. **No unknown/attacker-controlled hosts.**
- **DoH / proxy failover (`cli/src/doh/`)** — noteworthy but not malicious. On a **network failure only**, the CLI downloads a helper binary **`okx-pilot`** from the CDNs above and uses it to find a proxy node, then routes OKX API traffic through it. This is a **censorship-circumvention** feature (China). Default mode is **Direct**; proxy is engaged only after a connect/timeout failure. Integrity: `okx-pilot` is SHA256-checked against a `checksum.json` **served by the same CDN** — so integrity is only as strong as CDN control, not an independent signature. `[UNVERIFIED]` no code signature on `okx-pilot`.

### Postinstall / obfuscation / telemetry
- **Postinstall**: only the benign `echo` in `package.json`; not executed by `skills add`. **No** pre/install/prepare hooks in manifests.
- **Obfuscation**: none. Rust source is clear, commented, heavily unit-tested (crypto test vectors cross-validated against foundry/viem in `crypto.rs`).
- **Telemetry**: no third-party analytics (no Sentry/PostHog/Segment/etc.). There **is** a local **audit log** (`cli/src/audit.rs`) at `~/.onchainos/audit.jsonl` recording every command (ts, command, args, ok, duration) with a device header (os/arch/version). Two source comments call this "off-box telemetry" (`agentic_wallet/auth.rs:413,1730`) — i.e. audit args are shaped so an audit trail can be shipped to OKX. `[UNVERIFIED]` whether/what the audit log is uploaded; the file itself is local and rotated.
- **`install.sh` side effects**: if the optional `okx-a2a` companion is already present, it runs **`npm i -g @okxweb3/a2a-node@latest`** and restarts that daemon (`install.sh:405`). Publisher of `@okxweb3/a2a-node` verified as OKX. This only fires if you already have that companion — not on a clean install.

### Human-in-the-loop safety gate — STRONG
- State-changing commands enforce a **two-step confirmation**: the skill forbids `--force` on first invocation; the CLI returns a "Confirming" response (exit code 2, `"confirming": true`), the agent must **display the message and get explicit user confirmation**, and only then re-run with `--force` (`skills/okx-agentic-wallet/SKILL.md:55-61`). This is a meaningful guardrail against an autonomous agent silently moving funds.

---

## Install recommendation

### GO-WITH-CAVEATS — for the `skills add … -g` step.
The global `skills add` is a **markdown file copy by Vercel's `skills` CLI from OKX's GitHub** — no code executes, no secrets requested, MIT, genuine OKX publisher. That specific act is safe.

The caveats are about **what the skills then enable**, not about the copy:

1. **The `onchainos` binary is the real trust decision.** `skills add` is benign; the first wallet/swap command pulls a native Rust binary (`install.sh` → `~/.local/bin/onchainos`) and, on network failure, a second binary (`okx-pilot`) from CDNs. Approve the binary consciously — that is the code you are trusting, and its integrity rests on OKX's CDN/GitHub, not an independent signature.
2. **Global scope = every project can move funds.** Installing `-g` means any Claude Code session on this machine can be routed into wallet/swap/broadcast. For ATLAS specifically (a 24/7 autonomous orchestrator) this is exactly the surface you must fence. Prefer **project-scoped** install for ATLAS, or gate the wallet skills behind explicit policy.
3. **Depend on the confirmation gate — and verify it holds under `--yes` automation.** The `--force`/Confirming design is good, but ATLAS runs unattended; confirm your harness does not auto-approve Confirming prompts.

For an interactive dev machine: **GO-WITH-CAVEATS**, project scope preferred over `-g`.
For ATLAS's autonomous runtime: treat the wallet-writing skills as a **privileged capability** behind a policy gate, not a blanket global install.

---

## Risks & Gotchas

1. **Two-vendor supply chain.** `npx skills` = Vercel Labs, content = OKX. A compromise of *either* the `skills` npm package *or* the `okx/onchainos-skills` GitHub repo would affect you. `--yes` disables the prompts that would otherwise show you what's being installed.
2. **Runtime plugin expansion.** `okx-dapp-discovery` installs *further* plugins on demand via `npx skills add okx/plugin-store --skill <name> --yes --global` (`AGENTS.md:48`). So the initial install is not the whole attack surface — the agent can pull more code/skills later, globally, non-interactively. **Flag for ATLAS.**
3. **CDN-only integrity for the `okx-pilot` DoH binary.** SHA256 is checked against a checksum file from the *same* CDN; no independent signature. A CDN compromise could serve a matching binary+checksum. Low likelihood (OKX infra), non-zero.
4. **Local audit log records args.** `~/.onchainos/audit.jsonl` logs command args; on wallet ops those may include addresses/amounts. Local + 0600, but be aware if the box is shared. `[UNVERIFIED]` off-box upload.
5. **Shared sandbox keys default to production endpoints.** README warns built-in keys are rate-limited/test-only and disclaims all liability for losses. Don't run ATLAS on sandbox keys.
6. **`install.sh` edits your shell profile** (`~/.zshrc`) to add `~/.local/bin` to PATH, and can `npm i -g` the a2a companion. Minor, but it mutates global state.

---

## Open Questions

- Does the `onchainos` binary upload `audit.jsonl` (or the device header) to OKX? Source calls it "off-box telemetry" but I did not find the upload path in the files read. Needs a binary-level / network trace to confirm.
- Are release binaries reproducible / independently verifiable beyond the CDN-provided SHA256? Is `okx-pilot` signed?
- Exact contents of the "built-in sandbox API keys" compiled into the binary — scope and revocation.
- Under `--yes` automation, does the two-step Confirming gate still require a real human, or can an agent satisfy it programmatically? (Critical for ATLAS.)
- What is in `okx/plugin-store` and how is *that* repo access-controlled (the runtime expansion source)?

---

## Implications for ATLAS

- **Architecturally aligned**: the TEE + session-key + server-side-signing model means ATLAS never has to custody a raw private key to execute on-chain — it holds only a short-lived, zeroized session seed. That fits a 24/7 agent far better than a hot-wallet CLI. This is a point in OKX's favour vs. alternatives that hand the agent a raw key.
- **But global + autonomous + fund-moving is the risk trifecta.** Do **not** blanket-`-g` the wallet-writing skills into a 24/7 orchestrator without a policy layer. Recommended posture:
  - Install the **read-only** skills (`dex-*`, `*-portfolio`, `social`, `signal`) freely — they're market data.
  - Gate `okx-agentic-wallet`, `okx-defi-invest`, `okx-agent-payments-protocol`, `okx-growth-competition`, and `okx-dapp-discovery` (runtime installer) behind explicit ATLAS policy / spending limits / allowlists.
  - Pin the `onchainos` binary version and verify its checksum yourself; disable auto-update in the autonomous path, or review each bump (the CLI/skills auto-update on their own by default).
  - Ensure the harness treats a "Confirming" (exit code 2) response as a **hard stop requiring human sign-off**, never auto-`--force`.
  - Use production OKX API keys stored in the OS keyring, never the sandbox keys, never committed.
