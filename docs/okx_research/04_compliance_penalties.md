# OKX AI / OnchainOS — Compliance & Penalty-Avoidance Dossier (ATLAS)

**Subject:** ATLAS — OKX ASP, agent **#4460**, X Layer (chainIndex 196), owner wallet `0xaefc…fab0`.
**Current live state (read 2026-07-07):** `approvalDisplayStatus: 2` → **"Listing under review"**, `Status: not listed`, `onlineStatus: 1`, `No rating yet`. Role = **ASP** only (no Evaluator identity on this wallet).
**Purpose:** rules ATLAS must obey to never get penalized, rejected, slashed, or blacklisted.

**Source hierarchy used (most → least authoritative):**
1. **Live on-chain config** via read-only CLI on the droplet (`onchainos agent staking-config`, `sensitive-words`, `my-agents`) — hard numbers, current as of 2026-07-07.
2. **Droplet skills** `/opt/atlas/.agents/skills/okx-ai/references/*` (checked out 2026-07-07 01:00) — the canonical behavioral rulebook the agent runtime itself follows. Cited as `[skill:<file>]`.
3. **OKX public pages** (learn/okx-ai, KYC page, The Block) — confirm the framework but deliberately omit mechanics ("coming soon"). Cited inline.

> ⚠️ **Confidence flags** are marked **[HARD]** (live config or CLI-enforced), **[SKILL]** (documented in the runtime rulebook), or **[INFERRED/UNCERTAIN]** (not found in an authoritative source — flagged, not guessed).

---

## 0. TL;DR — the five things that get an ASP penalized

1. **Prohibited content** in the agent name / description / service (celebrity names, banned words, disclaimers, links) → **listing rejected** at moderation (state 5) or blocked (81602). No economic loss, but no revenue while unlisted.
2. **Late or failed delivery on an accepted job** → the User can `reject` → `dispute`; if evaluators rule against ATLAS (score <80/100) the task goes to **`Status::Failed (9)` = escrow refunded to the User**. ATLAS loses the bounty for that job and takes a reputation hit. **[HARD/SKILL]**
3. **Not delivering at all after acceptance** → **submit/reject timeout auto-refund** to the User (funds you were working toward are returned; you get nothing). **[SKILL: task-state-machine]**
4. **Fake-order / review-gaming / wash-trading behavior** (self-dealing to farm reputation) → hits the platform's `sensitive-words` "A2A刷单" (fake-order) filter and is an explicit anti-abuse target. **[HARD: sensitive-words list]**
5. **(Evaluator role only — ATLAS does NOT have this yet)** Voting with the minority or missing a commit/reveal window → **OKB stake slashed**. Not applicable while ATLAS is ASP-only, but documented in §4 because the ATLAS design mentions a "two-evaluator check."

**Good news for ATLAS's economic exposure:** As a **pure ASP**, ATLAS has **no OKB stake at risk**. Slashing applies only to the **Evaluator** role. An ASP's worst-case per-job downside is **losing that job's bounty + a bad review** — never a slash of principal. **[HARD: `my-stake` returned `only evaluator can perform this operation` for #4460]**

---

## 1. Prohibited behaviors & banned content (moderation surface)

### 1.1 The platform sensitive-word blocklist — LIVE, 102 terms, 21 categories
Pulled from `onchainos agent sensitive-words` (2026-07-07). This is the actual filter applied to names, descriptions, service text and A2A messages. **[HARD]** Categories and representative terms (English labels; the list is multilingual — ar/es/fr/id/ja/ko/pt/ru/tr/vi/zh/zh_tw):

| Category (raw type) | Count | Meaning | Examples |
|---|---|---|---|
| `A2A刷单` | 13 | **Fake-order / reputation gaming** | Credit Score Farming, Fake Order Volume, Fake Completion Rate, Fake Positive/Negative Reviews, Ranking Manipulation, Fake Task Volume, Fake Transaction Records, Fake Ratings, Forged Completion Records, Bulk/Script-based Fake Orders, Review Exchange |
| `黑产任务` | 11 | **Black-market tasks** | write scam/fraud/phishing scripts, generate phishing SMS/emails, create clone website, forge screenshots, crack accounts, steal private keys, generate malicious code, create trojan |
| `黑产服务` | 2 | Black-market services | Phishing Page, Fake/Clone Website |
| `恶意Skill` | 2 | Malicious skills | Auto Fake Order Skill, Disguised Legitimate Skill |
| `Web3钓鱼` | 10 | **Web3 phishing** | mnemonic/seed phrase/private-key solicitation, "scan QR to verify wallet", "wallet connection authorization", **Mixer, Tornado, Evade regulation** |
| `违禁品交易` | 14 | Prohibited-goods trade | Firearms, ammunition, drugs (meth/cocaine/ketamine/MDMA/LSD/cannabis/synthetic cannabinoids), fake/forged documents & ID |
| `色情/涉黄` | 14 | Pornography / sexual | NSFW Agent, Erotic Agent, sexual services, compensated dating, "borderline suggestive content", etc. |
| `赌博` | 4 | Gambling | — |
| `非法金融` | 3 | Illegal finance | **"Guaranteed Profit", "Guaranteed Earnings", "Absolute Profit"** |
| `虚假投资` | 3 | Fake investment | Fake profit screenshots, fake authoritative endorsement, forged team background |
| `市场操控` | 1 | Market manipulation | Fake trading volume |
| `诈骗话术` / `隐晦诈骗话术` | 2+1 | Fraud scripts / covert-fraud phrasing | "Transfer first, refund later" |
| `隐私买卖` | 2 | Privacy/data trafficking | — |
| `涉政-*` (6 sub-types) | 19 | **Politically sensitive** | sensitive figures, historical taboos, separatism, banned orgs, subversion, rumors, foreign-infiltration |

**Rule for ATLAS:** the description must never contain any of these strings in any language, and — critically for a *security* agent — **avoid the phishing-vocabulary trap**: words like "mixer", "Tornado", "evade regulation", "private key", "seed phrase", "steal" can appear innocently in a security tool's copy but are hard-blocked. ATLAS's current description ("scans EVM tokens for honeypot, tax, mint and liquidity risk…") is clean; keep it that way. Do **not** add marketing like "guaranteed" anything (`非法金融` trap). **[HARD]**

### 1.2 Name rules — semantic checks the runtime enforces before submit **[SKILL: identity-invariants, identity-register §4]**
- **Name must be a brand, not a person.** Block any name that **contains a celebrity / public-figure name as a substring**, even prefixed/suffixed (examples given: Trump, Musk, CZ, 马斯克, 马云). ATLAS is clean.
- **Length:** ASP name CN 2–12 chars / EN 3–25 chars.
- **No `(test)` markers** — a name flagged `(test)` surfaces a QA warning.
- Name must not equal a personal label (Alice, Account2).

### 1.3 Service-description rules (these are the #1 cause of QA findings) **[SKILL: identity-register §3, identity-invariants]**
- Must be a **2-part structure on separate lines**: ① core-capability summary (what it does + who it's for), ② what the user must provide (e.g. "1. wallet address 2. amount 3. chain").
- Each part ≤200 CJK-display-width chars; total ≤400. (Width counted East-Asian: CJK=2, ASCII=1.)
- **Banned in service descriptions:** example prompts, GitHub/wallet links, tech-stack / infra names, legal disclaimers. (A security agent naming its scanner stack, or adding "not financial advice," would be flagged.)
- Service **name**: 5–30 char noun phrase; must **not** equal the agent name; must **not** contain a price.
- **Fee:** plain number as a JSON string ("10"), USDT implicit, **no currency unit/symbol**, ≤6 decimals. "10 USDT" / "5元" / "approx 10" → rejected. A2MCP (API service) requires a fee; A2A fee optional.
- **Endpoint (A2MCP/x402):** must be `https://`, publicly reachable, really deployed, ≤512 chars. Rejected: `http://`, `localhost`, `127.0.0.1`, RFC-1918 private IPs, `*.local`/`*.internal`, mock/placeholder URLs. **Endpoint is permanent on-chain** — changing it later needs a full update + re-review. ATLAS uses x402 on X Layer, so its endpoint must be a live public HTTPS URL. **[SKILL: identity-register §6]**

### 1.4 Avatar rules
ASPs **must** set an avatar (image file upload, ≤1 MB, PNG/JPEG/WebP; image *links* are rejected). ATLAS already has a valid CDN avatar. **[SKILL: identity-register §5]**

### 1.5 Prohibited operational behaviors (agent-to-agent conduct) **[SKILL: task-exception-escalation, task-asp-accept]**
These are runtime-enforced anti-abuse rules ATLAS's own logic already follows; violating them corrupts the state machine or spams peers:
- **Never `apply` from the cold-start path.** `apply` runs *only* when triggered by the `JobAspSelected` system event (User designated ATLAS on-chain). Manually applying = "state machine corruption + potential escrow loss." Same rule even for same-wallet self-trading.
- **Never `deliver` (or send "here's the result") before `job_accepted`.** Delivering before escrow is funded = working for free; CLI rejects with `status != accepted`.
- **Never spam the counterparty** — one `xmtp-send` per (jobId, peer) per turn; repeated identical sends trigger peer loops / user spam.
- **Never broadcast technical errors to the counterparty** (no CLI command names, backend field names, stderr, "backend bug"). Errors go to the *user session*, never the peer.
- **Never claim a job is done/online without actually running the discovery command** (documented real-incident anti-pattern).

---

## 2. Listing approval / moderation lifecycle (why listings get rejected & how to resubmit cleanly)

**Approval states** (`approvalDisplayStatus` / `approvalStatus`): **[SKILL: identity-errors, identity-update]**
- `2` → **"Listing under review"** — ATLAS's current state. "Under review — usually ready within 24h; once approved it appears on the marketplace." **Do not** re-submit or re-activate while in state 2 — that's the spammy anti-pattern. Just wait. **[SKILL: identity-errors → `activate.approvalStatus:2`]**
- `5` → **rejected / not resubmitted** (`approvalDisplayStatus: 5`). Fix path is **`agent update` on the *same* agent id → re-activate**. **Never create a new agent to dodge a rejection** — the runbook explicitly forbids offering a fresh agent as remedy ("only create if the user explicitly insists after steer"). Creating duplicates to escape moderation is exactly what looks spammy. **[SKILL: identity-update §"Rejected listing"]**
- `1` / `5` are the two approval enums `activate` internally accepts; `activate` **does not re-run QA** — QA (`validate-listing`) runs only at register and update. So fix content *before* re-activating. **[SKILL: identity-register §4, identity-invariants]**

**Two-stage QA before anything reaches the chain:** **[SKILL: identity-register §4]**
1. `validate-listing` (CLI) returns machine `findings[]` (field, code, severity:block, issue, fix).
2. **Semantic checks the CLI can't do** — celebrity-name substring, descriptive-noun service name, 2-part description structure, no tech-stack/disclaimer leakage — run *in addition*, every time, even when CLI says `pass:true`.

**Terminal / hard-stop moderation errors (stop, don't retry):** **[SKILL: identity-errors]**
- `approved agent whitelist` / code `10016` → account not in the agent beta whitelist; apply via the URL the backend returns. No auto-retry.
- `81602` / `blocked` → "agent has been blocked by the platform" — **stop**, no re-activate/update.
- consent `40020/40021/40022` → registration consent incomplete/invalid/declined — restart registration from scratch.
- Region `50125` / `80001` → "Service is not available in your region." **Never** echo the code, **never** suggest a VPN/region workaround, no retry (see §5).

**Resubmission etiquette (avoid looking spammy):** fix the flagged fields → one `update` on the same id → one `activate`. One clean cycle. No rapid re-submits, no duplicate agents, no re-activate while in state 2.

---

## 3. Economic enforcement — disputes, refunds, timeouts, bounty exposure (ASP view)

### 3.1 Task state machine — where an ASP loses the bounty **[SKILL: task-state-machine, task-core]**
11 real statuses. The ones that matter for penalty exposure:

| int | status | Meaning for ATLAS (ASP) |
|---|---|---|
| 1 | `accepted` | Funds escrowed. ATLAS may now work + `deliver`. |
| 2 | `submitted` | Deliverable on-chain; awaiting User review. |
| 3 | `rejected` | **User rejected the deliverable.** Opens a **24h decision window**: ATLAS can `dispute` (escalate to evaluators) or `agree-refund` (give the money back). |
| 4 | `disputed` | Evidence period + commit/reveal vote in progress. |
| **6** | `completed` | **Terminal WIN** — funds released to ATLAS. Reached by: normal acceptance, **dispute won by ASP**, or **review-timeout auto-complete** (User didn't review in time → ATLAS can `claim-auto-complete`). |
| **9** | `failed` (="refunded") | **Terminal LOSS** — escrow refunded to the User. Reached by: `agree-refund`, **dispute won by the User**, or **submit/reject timeout auto-refund**. ATLAS gets nothing. |
| 7/8 | close / expired | User closed during `created`, or created-stage timed out. No work done, no loss (never accepted). |

**Key ASP protections built into the machine:**
- If the User **doesn't review in time**, ATLAS is not stuck — `review_expired` event → `claim-auto-complete` → status 6 (paid). **[SKILL: task-asp.md, CLI `claim-auto-complete`]**
- If ATLAS **doesn't deliver in time after acceptance**, the machine auto-refunds the User (status 9). This is the main "late/no delivery" penalty: **loss of that bounty**, plus reputation. **[SKILL: task-state-machine, status 9 entry: "submit/reject timeout auto-refund"]**

### 3.2 Dispute / arbitration mechanics — LIVE numbers **[HARD: `staking-config` 2026-07-07]**
Disputes are resolved by a **staked network of Evaluators** via **commit-reveal voting**, not by OKX centrally (confirmed by okx.com/learn/okx-ai: "disputes are resolved by a staked network of evaluators, not a central platform"). Current live parameters:

| Param | Value | Meaning |
|---|---|---|
| `arbitrationFeeBps` | **5%** | Arbitration deposit / fee = 5% of the job amount. Winning-majority evaluators split this + the slashed minority stake. |
| `commitPhaseHours` | **18h** | Window for evaluators to commit a sealed vote. |
| `revealPhaseHours` | **6h** | Window to reveal. |
| `minCumulativeStakeOkb` | **100 OKB** | Minimum first stake to become an active evaluator. |
| `partialUnstakeMinRetainOkb` | **100 OKB** | Must retain ≥100 OKB after a partial unstake. |
| `unstakeCooldownDays` | **7 days** | Cooldown after requesting unstake before you can claim. |
| `slashMinorityBps` | **1%** | Minority-vote evaluators lose 1% of stake. |
| `slashTimeoutBps` | **0.3%** | Commit/reveal-timeout evaluators lose 0.3% + get kicked from the round. |
| `slashedCooldownHours` | **24h** | Post-slash cooldown; won't be selected for that window. |

**Vote semantics:** `0 = Approve (Client/User wins → funds refunded)`, `1 = Reject (Provider/ASP wins → funds released)`. Scoring rubric: total ≥80/100 → vote 1 (ASP wins); <80 → vote 0 (User wins). **[SKILL: task-evaluator-decision-rubric]**

**What a lost dispute costs ATLAS (as ASP):** the **bounty is refunded to the User** (status 9) — ATLAS forfeits that job's payment. There is **no additional slash of ATLAS** because ATLAS holds no evaluator stake. The **5% arbitration deposit** is an escrow-side cost of running the dispute; the losing side effectively bears it out of the disputed amount. **[HARD + SKILL; the precise question of "who funds the 5% deposit and is it returned to the dispute winner" is not spelled out in the ASP skill — flagged [UNCERTAIN], see §7.]**

### 3.3 Reputation / feedback effects **[SKILL: identity-reputation, CLI `feedback-submit`/`feedback-list`]**
- After a task, either side can leave a review: `feedback-submit --score <0.00–5.00 step 0.01> --task-id <id> --agent-id <target> --creator-id <self>`. Score is tied to a real `task-id` (can't review without a task).
- Reviews are public via `feedback-list`; the marketplace shows a running **average star rating** (`★ 4.45 (18 reviews)`). ATLAS is currently `No rating yet`.
- Reputation is a **shared on-chain record** ("every transaction contributes to the same reputation" — okx.com/learn/okx-ai) and feeds **matching** (`recommend-task` / `asp-match` weight ATLAS by skill + track record). A pattern of rejects/refunds and low scores → fewer job recommendations = quiet economic penalty. **[SKILL: task-asp-accept §2]**
- **`mark-failed`** is a *counterparty* tool: a User (or peer) can `mark-failed --provider <ATLAS id> <jobId>` to exclude ATLAS from **future asp-match lists** for negotiation failures. Repeated negotiation flakiness → ATLAS gets filtered out of discovery. Conversely ATLAS uses it against bad Users. This is the closest thing to a soft "blacklist." **[HARD: CLI `mark-failed --help`]**

### 3.4 Refunds ATLAS controls
- `agree-refund <jobId>` — ATLAS voluntarily returns escrow (fastest clean exit from a `rejected` job it can't defend). Ends in status 9, no dispute, minimal reputation damage vs. losing a dispute.
- `apply` with amount 0 = "apply for free, irreversible — CLI rejects." Guard against accidental zero-value applies. **[HARD: `apply --help`]**

---

## 4. Evaluator staking & slashing (NOT active for ATLAS — but relevant to its "two-evaluator check" design)

ATLAS's own description says results "pass an independent two-evaluator check before delivery." **Clarify the boundary:** that internal QA is *ATLAS's own design*, separate from the OKX **Evaluator role**. ATLAS #4460 is registered **ASP-only** and holds **no OKB stake** (`my-stake` → `only evaluator can perform this operation`). **So none of the slashing in §3.2 currently applies to ATLAS.** **[HARD]**

**If ATLAS (or a sibling agent) ever registers an Evaluator identity**, the economic risk turns on:
- Must first-stake **≥100 OKB** (XLayer native OKB; gas is platform-sponsored, so no separate gas token needed — but the **stake principal is real OKB the wallet must hold**). **[HARD + SKILL: task-evaluator-staking]**
- **Slashing:** minority vote → **−1%** of stake; commit/reveal timeout → **−0.3%** + ejected + 24h cooldown. **No abstention** — once selected you must vote or eat the timeout slash. **[HARD]**
- **Rewards:** majority vote → pro-rata share of the 5% arbitration deposit + slashed minority stake. **[SKILL]**
- **Unstake:** 7-day cooldown; **forbidden while `activeDisputes > 0`** (contract reverts). **[HARD + SKILL]**
- **Hard runtime constraint:** `vote-commit`/`vote-reveal`/`arbitration-claim` are allowed up to 3 internal retries because missing the window = automatic 0.3% slash. **[SKILL: task-exception-escalation §2]**

**Recommendation:** keep ATLAS ASP-only unless there's a deliberate reason to take on stake-at-risk. If an Evaluator sibling is wanted, run it on a **separate identity/wallet** so an evaluator slash can never touch ATLAS's ASP operations.

---

## 5. KYC / geo restrictions

**Two distinct surfaces — do not conflate them:**

### 5.1 Operating & earning ON X Layer (chainIndex 196) — the ATLAS runtime
- ATLAS registers via **ERC-8004 on-chain identity + OKX Agentic Wallet**; it earns in **USDT / USDG** settled on X Layer via x402. Registration is gated by the **agent beta whitelist** (error `10016` / `approved agent whitelist`), **not** by exchange KYC. **[SKILL: identity-errors; okx.com/learn/okx-ai, tradersunion]**
- **Gas is platform-sponsored** on X Layer; the wallet never needs a native gas balance. **[SKILL: task-evaluator-staking, task-asp]**
- **Regional block:** the backend can return `50125` / `80001` = "Service is not available in your region." The runtime rule is absolute: **never echo the code, never suggest a VPN or any region workaround, no retry.** Attempting to bypass geo-blocks is itself a compliance violation. **[SKILL: identity-errors]** ATLAS operates from a fixed DigitalOcean droplet — ensure the droplet region is one where OKX AI is available; do **not** add proxy/VPN evasion.
- **No exchange-level KYC is required merely to register, hold USDT/USDG on X Layer, deliver services, or receive on-chain payment.** The gate there is the beta whitelist + region. **[INFERRED from skills + public pages; OKX does not publish a KYC requirement for on-chain agent earning — flagged as inference, see §7.]**

### 5.2 Off-ramping via the OKX centralized exchange — the boundary where KYC kicks in
- The moment funds move **from X Layer into the OKX CEX to convert/withdraw**, full OKX **KYC applies**: mandatory for deposit, trading, withdrawal, staking. Tiers: **L1 Basic** (ID; ~$10k/day withdrawal cap), **L2 Advanced** (ID + proof of address + liveness; up to ~$1M/day), **L3 Institutional**. US residents also need SSN and face heavy restrictions. ([OKX KYC guide](https://www.okx.com/en-us/learn/what-is-okx-kyc-requirements), [OKX Europe KYC-block](https://www.okx.com/en-eu/learn/okx-withdrawal-blocked-kyc-verification))
- **US users are geo-restricted** from most OKX trading/withdrawal features; certain products are "not available to users located in the United States" (okx.com/learn/okx-ai disclaimer). Bypassing = legal/compliance risk for user and platform.
- **Implication for ATLAS:** as long as revenue stays **on X Layer as USDT/USDG** (holding, re-spending, paying evaluators, funding tasks), **no CEX KYC is triggered.** KYC/geo is a concern **only at the CEX off-ramp** — plan the treasury accordingly (e.g. bridge/off-ramp through a KYC'd operator wallet, not the agent's hot wallet).

---

## 6. "How ATLAS stays penalty-free" — concrete checklist

**A. Listing / content (do before every register or update):**
- [ ] Run `validate-listing` **once** on the full identity + service set; fix every `block` finding before submit. **[SKILL]**
- [ ] Manually scan name + description + every service string against the **102-term `sensitive-words` list** (§1.1). For a *security* agent specifically, purge phishing-vocabulary false-positives: "mixer", "Tornado", "private key", "seed phrase", "steal", "evade". **[HARD]**
- [ ] No "guaranteed / absolute profit" language (`非法金融`). No disclaimers, no GitHub/wallet links, no tech-stack names in service descriptions. **[SKILL]**
- [ ] Service description in the **2-part format** (capability / what-user-provides), ≤400 CJK-width. Service name ≠ agent name, no price in name. **[SKILL]**
- [ ] Endpoint = live public `https://`, ≤512 chars, no localhost/private IP/placeholder. Remember it's **permanent on-chain**. **[SKILL]**
- [ ] Avatar = uploaded image file ≤1 MB (already set for #4460). **[SKILL]**

**B. Moderation / resubmission:**
- [ ] While `approvalDisplayStatus: 2` ("under review") — **wait, do not re-activate or re-submit** (avoids spam-flag). Expect ~24h. **[SKILL]**
- [ ] If rejected (state 5) — **fix and `update` the SAME agent id (#4460), then `activate`.** Never spawn a duplicate agent. **[SKILL]**
- [ ] On `81602`/`blocked` or `10016`/whitelist or `40020-22`/consent or `50125`/region — **stop, don't retry, no VPN.** Follow the specific remediation (whitelist apply URL / restart consent). **[SKILL]**

**C. Job execution (protect the bounty & reputation):**
- [ ] Never `apply` manually — only on the `JobAspSelected` system event. **[SKILL]**
- [ ] Never `deliver` or claim results before `job_accepted` (escrow funded). **[SKILL]**
- [ ] Never `apply` for amount 0. **[HARD]**
- [ ] Deliver **on time** — the submit/reject timeout auto-refunds the User (lost bounty). Track the accepted-job clock. **[SKILL]**
- [ ] If the User goes silent post-submit, use `claim-auto-complete` on `review_expired` to still get paid. **[SKILL]**
- [ ] On a `rejected` deliverable ATLAS can't defend on evidence → prefer **`agree-refund`** (clean, minimal reputation hit) over losing a dispute. Dispute only when the evidence is strong (evaluator threshold: score ≥80/100 for ASP to win). **[SKILL]**
- [ ] Keep every deliverable **evidence-backed** (the rubric weights image/document evidence over text; unread/uninspectable evidence = zero weight). Package deliverables so a future dispute is winnable. **[SKILL: task-evaluator-decision-rubric]**

**D. Conduct (peer/anti-abuse):**
- [ ] **Zero fake-order / review-gaming / self-dealing to farm reputation** — explicit `A2A刷单` violation; even same-wallet self-trading must run the full real protocol. **[HARD + SKILL]**
- [ ] One `xmtp-send` per peer per turn; never leak CLI/error internals to the counterparty; push exceptions to the user session, not the peer. **[SKILL]**
- [ ] Don't auto-retry business errors; enqueue a user decision instead. **[SKILL]**

**E. Economic hygiene:**
- [ ] Stay **ASP-only** → **no OKB at slash-risk.** Do not casually register an Evaluator identity on ATLAS's wallet; if needed, isolate it on a separate wallet. **[HARD]**
- [ ] Keep revenue **on X Layer** (USDT/USDG) to avoid triggering CEX KYC; do any off-ramp through a separate KYC'd operator wallet, never a geo-bypass. **[§5]**
- [ ] Ensure the droplet's egress region is an OKX-AI-supported region (no VPN evasion). **[SKILL]**

---

## 7. Uncertainties / gaps (flagged, not guessed)

1. **Who ultimately bears the 5% `arbitrationFeeBps` and whether the dispute *winner* is made whole** is not spelled out in the ASP-side skills. Confirmed: 5% of job amount is the arbitration deposit and evaluators split it + slashed stake. **Unconfirmed:** whether a winning ASP recovers 100% of the bounty or nets the bounty minus a share of the 5%. **[UNCERTAIN]** — verify empirically on a small live dispute, or in `task-cli-reference.md`/payment-modes.md (not fully read here).
2. **Exact submit/deliver timeout duration** (hours) after `accepted` before auto-refund is **not exposed in `staking-config`** (that config is dispute/stake-scoped). The `rejected`→decision window is documented as **24h**; the accepted→deliver SLA clock is referenced but its numeric value wasn't found. **[UNCERTAIN]** — likely in the per-task detail API or `next-action` output at runtime.
3. **No explicit KYC requirement for on-chain agent earning** is published; §5.1's "no CEX-KYC to earn on X Layer" is an **inference** from the skills (whitelist + region are the only gates seen) plus public pages. Treat as high-confidence but not a quoted OKX ToS clause. **[INFERRED]**
4. **OKX has not published a granular ASP Terms-of-Service / penalty schedule** on the public web (learn/okx-ai, dev-docs, help pages, The Block all describe the framework and mark escrow/dispute "coming soon" or omit mechanics). The authoritative rules for ATLAS are therefore the **live on-chain config + the runtime skills** — which is what this dossier is built on. If OKX later ships a formal ASP ToS page, re-audit against it.
5. **`sensitive-words` list is versioned server-side** (102 terms today). Re-pull before each major listing change; the filter can grow.

---

## Sources
- **Live read-only CLI on droplet (authoritative, 2026-07-07):** `onchainos agent staking-config --agent-id 4460`, `agent sensitive-words`, `agent my-agents`, `agent my-stake`, plus `--help` for `stake / increase-stake / request-unstake / vote-commit / vote-reveal / dispute / reject / deliver / apply / agree-refund / claim-auto-complete / feedback-submit / feedback-list / mark-failed / activate`.
- **Droplet skills (authoritative rulebook):** `/opt/atlas/.agents/skills/okx-ai/references/` — `identity-invariants.md`, `identity-errors.md`, `identity-register.md`, `identity-update.md`, `identity-reputation.md`, `task-core.md`, `task-state-machine.md`, `task-asp.md`, `task-asp-accept.md`, `task-evaluator-staking.md`, `task-evaluator-decision-rubric.md`, `task-exception-escalation.md`, `task-preflight.md`.
- [OKX AI: A Marketplace for the Agent Economy](https://www.okx.com/en-us/learn/okx-ai) — evaluator-staked disputes, shared reputation, USDT/USDG, US disclaimer.
- [OKX KYC Requirements](https://www.okx.com/en-us/learn/what-is-okx-kyc-requirements) & [OKX Europe: withdrawal blocked by KYC](https://www.okx.com/en-eu/learn/okx-withdrawal-blocked-kyc-verification) — tiers/limits, off-ramp KYC.
- [OKX unveils decentralized on-chain AI (TradersUnion)](https://tradersunion.com/news/brokers-news/show/2597886-okx-unveils-decentralized-on-chain-ai/) — ASP registration, A2A/A2MCP modes, review-by-OKX, USDT/USDG.
- [OKX Agent Payments Protocol (The Block)](https://www.theblock.co/post/399490/okx-agent-payments-protocol-ai-business-cycles-quotes-disputes-transactions) — quote/escrow/dispute cycle, escrow+dispute "coming soon".
- [OKX OnchainOS dev-docs](https://web3.okx.com/onchainos/dev-docs/) — product overview (governance mechanics not published here).
