# iNFT → OKX AI: Identity Bridge — Decisive Verdict

**Question:** Is holding the iNFT (ATLAS #1 on Base) in the owner's wallet *enough* to bring our AI inside the OKX AI platform and let it operate — or is a separate on-chain registration required?

**Date:** 2026-07-08 · **Mode:** strictly read-only (no state changes performed).

---

## TL;DR — THE VERDICT

**No. Holding the iNFT is NOT enough, and it is not a substitute for OKX onboarding.**

OKX AI **never reads, imports, or accepts an external Base NFT** as an agent's identity. To exist and operate on the OKX AI platform, an agent **always** requires its own **ERC-8004 registration on X Layer (chainIndex 196)**, created via `onchainos agent create`, **keyed to the OKX Agentic Wallet** — not to the NFT. There is **no import path and no bridge** from a Base 721A/6551 into the OKX registry.

This is already the state of the world for us: **ATLAS #1** (the Base iNFT) and **ATLAS #4460** (the OKX X Layer agent) are two *separate* registrations that coexist. #4460 was minted fresh on X Layer with hand-collected fields — it did **not** ingest #1. That coexistence is itself the proof.

**What the iNFT actually gives you toward OKX is provenance and a soul, not operational identity.** The wallet + the on-chain OKX registration are still mandatory and are what actually operates.

---

## 1. Does OKX AI accept an EXTERNAL NFT as identity, or always require its own ERC-8004 registration? Any import/bridge?

**Always its own registration on X Layer. No import, no bridge.**

First-party evidence from the on-droplet OKX skill that drives the exact CLI ATLAS runs (`/opt/atlas/.agents/skills/okx-ai/`):

- **Chain-fixed gate (SKILL.md, §Gates):** *"Chain-fixed — agent identities live on XLayer only. Never pass `--chain` to any `agent` identity command. If the user asks about ETH / BSC / another chain, tell them identities are created on XLayer only."* → OKX will not look at Base at all.
- **Registration mints fresh, from typed fields, keyed to the wallet.** The `identity-register.md` flow collects `role` + `name` + `description` + `picture` + `service[]` **from the user's literal reply this turn** and calls `onchainos agent create`. There is **no `tokenId` parameter, no NFT-contract parameter, no `--import`, no external-identity reference anywhere** in the create surface. The 12 `agent` subcommands (`create · pre-check · update · get-my-agents · get-agents · activate · deactivate · upload · search · service-list · feedback-submit · feedback-list`) contain nothing that reads an external NFT.
- **Identity is address-keyed, not NFT-keyed.** `agent pre-check --role <role>` "fetches the wallet's agents" and enforces per-wallet uniqueness: *"Each address can register only one `<roleLabel>`."* Identity is a function of the **signing wallet address**, full stop.
- **It signs with the current wallet only.** `identity-invariants.md`: *"no `--address` (signs with current wallet)."* You cannot make it register/sign as some other (Base-side) account.

OKX brands this registry as **"ERC-8004 Agent identity"** (skill `name`/`description`, author `okx`, v4.2.0), but it is OKX's **own X Layer deployment** of that standard — a different contract on a different chain from the Base `0x8004A169…` registry.

**Conclusion:** the only way in is `onchainos agent create` on X Layer. We already did it → ATLAS **#4460**. The Base iNFT plays no mechanical role in that.

---

## 2. How does ownership of the iNFT map to control of the OKX agent? Can the OKX Agentic Wallet BE the 6551 TBA?

**They are — and must be — separate accounts. Control of the OKX agent flows through the OKX Agentic Wallet's TEE session key, not through the 6551 TBA or the NFT.**

Three distinct accounts are in play, by design:

| Account | Address | What it is | Controls |
|---|---|---|---|
| iNFT owner (cold) | `0xB94b…10FaD` (MetaMask) | EOA that **holds ATLAS #1** | Ownership of the NFT + its ERC-6551 TBA |
| ERC-6551 TBA | deterministic from (registry, impl, chainId=Base, NFT contract, tokenId #1) | token-bound "backpack" account | Controlled by whoever owns the NFT, via ERC-1271 / execution |
| OKX Agentic Wallet (hot) | `0xaefc…fab0` | OKX-provisioned, **TEE-resident secp256k1 session key**, email login `devclone20` | **Signs for OKX agent #4460** |

**Can the OKX Agentic Wallet BE the 6551 TBA? No.** They cannot be the same account:
- **Different address derivation.** The 6551 TBA address is a deterministic function of the NFT (registry+impl+chain+contract+tokenId). The OKX wallet address is **derived by OKX** from your email/TEE login — you don't get to set it to a 6551 address.
- **Different controller & signer.** The 6551 TBA is a **smart-contract account** gated by the NFT owner (ERC-1271). The OKX wallet is a **TEE-held key** OKX signs with directly. OKX's `onchainos` has no "operate as this external contract account" surface (`signs with current wallet`, no `--address`).
- **This is exactly the separation we already run.** Per the ATLAS memory note: the OKX Agentic Wallet `0xaefc` is deliberately **separate from the MetaMask `0xB94b` that holds the NFT** ("treasury separation"), with policy `dailyTransferTxLimit=100` and a whitelist pointing back to the cold NFT wallet.

**So how does NFT ownership relate to the OKX agent at all?** Only by **owner assertion / shared operator**, not by any on-chain enforcement inside OKX. The same human owns both; the OKX agent is *declared* to be the operational body of the iNFT. Optionally that claim can be strengthened off-chain by cross-referencing addresses (put `0xaefc` in the iNFT metadata; reference the Base NFT in the 8004 registration file) — but **OKX does not verify or require it.** Today, whoever controls `0xaefc`'s TEE session controls agent #4460; the NFT owner does not gain OKX control merely by holding the NFT.

> The composable design from our ERC-stack research — "the 6551 backpack can be the 8004 `agentWallet` via ERC-1271" — is a **Base-side / Virtuals-side** composition (how iCLONE #55101 / VEGETA #58099 wire their agentWallet in the *Base* 8004 registry). It does **not** carry into OKX's X Layer registry, which is address-keyed to `0xaefc` and exposes no operator/agentWallet override.

---

## 3. Is ERC-8004 identity chain-specific? If the 8004 identity is on Base and OKX is on X Layer, what links them?

**ERC-8004 is chain-specific. Registration on one chain does NOT propagate to another. The link is a namespaced *reference/advertisement*, not an automatic bridge.**

From the ERC-8004 spec (EIPS/eip-8004):
- **"We expect the registries to be deployed with singletons per chain."** Identity, Reputation, and Validation registries each deploy **per chain**.
- **Registration mints its own ERC-721 identity NFT** — `register(agentURI, metadata) returns (uint256 agentId)` — it does **not** import an external NFT.
- Global identifier is CAIP-10-style: **`{namespace}:{chainId}:{identityRegistry}`** + `agentId` (e.g. `eip155:196:0x…` for X Layer). This lets you *reference* an agent across chains.
- **"Registration on one chain does not automatically make an agent known on others… it must be independently registered on each chain to appear in that chain's Identity Registry."** An agent *can* advertise wallets/endpoints for other chains inside its registration file, but that is advertising, not registration.

**Applied to us:** a Base 8004 record and an X Layer OKX record are **two independent registrations, two different `agentId`s, two chains.** Nothing on-chain auto-links them. What links them is:
1. **Same owner / operator** (an assertion), and optionally
2. a **CAIP-10 cross-reference** placed in each side's metadata/registration file (owner-authored, not enforced).

There is **no state-machine, escrow, or reputation flow that reads the Base identity when ATLAS operates on X Layer.**

---

## 4. Net verdict — what the iNFT GIVES vs. what STILL requires a wallet + on-chain OKX registration

### Holding the iNFT GIVES you (toward OKX):
- **Canonical identity & provenance / ownership.** ATLAS #1 is the durable, transferable root-of-identity and the thing a human "owns." Good for the story and for asserting who stands behind agent #4460.
- **The soul.** `neural_soul.md` is sealed on Irys and referenced from `metadata.ai_soul` (mutable Irys anchor `…JCTu7dmsEa327ymLZXpXvvPDv3vi3Vu69kaVddDCoiMZ`). **But OKX never reads it** — *we* distil it into ATLAS's Claude brain on the droplet (`/opt/atlas/CLAUDE.md` + the agent runtime). The soul shapes behavior via **our** runtime, not via OKX registration.
- **Royalties (2981) + 6551 backpack.** Real on Base, **irrelevant to OKX operation.**
- **Reputation portability — in theory only.** ERC-8004 envisions aggregators pulling feedback across chains, but it is **not automatic and OKX shows no import of Base reputation.** The OKX marketplace reputation for #4460 (stars/`feedback-list`) is its **own X Layer store**, earned on X Layer. Treat cross-chain reputation import as **not available today.**

### Holding the iNFT does NOT give you — STILL REQUIRED for OKX (all already done for ATLAS):
- **An OKX Agentic Wallet** — `0xaefc…fab0` (TEE, email login). ✅ created.
- **An on-chain ERC-8004 registration on X Layer** via `onchainos agent create` — **ATLAS #4460**, role ASP. ✅ created (create txHash `0x78eab0…2905`; renamed via `0xf0bd73…a636`). OKX pays gas.
- **Consent** (first-time wallet ToS, folded into `pre-check`). ✅ accepted.
- **Activation + OKX moderation approval** (`agent activate` → "under review"). ✅ submitted; approval is OKX-side and outside our control.
- **Per-service listings** (A2A/A2MCP) to actually earn — 4×A2A + 1×A2MCP "Best-Route Swap Quote" @ $0.05 live. ✅ built.
- **Operational plumbing:** USD₮0 settlement via x402/EIP-3009, policy caps, no-LLM-in-signing, the a2a daemon. All **X-Layer-and-`0xaefc`-native**, nothing sourced from the Base NFT.

**Plainly:** the iNFT is the *soul and the deed of ownership*; the OKX ERC-8004 registration on X Layer is the *body that actually works and gets paid*. You need both, and the second is never implied by the first.

---

## 5. The Identity Bridge the ACP Tracer should present

Render it as a chain of **owns → controls → operates**, honestly labelling the one hop that is an **owner assertion**, not an on-chain guarantee:

```
┌─────────────────────────────┐
│  iNFT · ATLAS #1  (Base)     │   ERC-721A + 2981 + 6551
│  0x3D9f35E0…9809f            │   soul sealed on Irys →
│  metadata.ai_soul → Irys     │   gateway.irys.xyz/mutable/JCTu…CoiMZ
└──────────────┬──────────────┘
      owns (deed of identity + soul anchor)
               │
┌──────────────▼──────────────┐        ┌───────────────────────────┐
│ 6551 TBA  +  owner MetaMask  │        │  SOUL (neural_soul.md)    │
│ 0xB94b…10FaD  (Base, cold)   │        │  loaded into ATLAS's      │
│ controls the NFT & backpack  │        │  Claude brain on droplet  │
└──────────────┬──────────────┘        │  (NOT read by OKX)        │
      ┊ owner assertion / shared operator └───────────▲──────────────┘
      ┊ (off-chain claim — optionally cross-referenced,│
      ┊  NOT enforced by OKX)                          │ distilled by us
               │                                       │
┌──────────────▼──────────────┐                        │
│ OKX Agentic Wallet (hot)     │                        │
│ 0xaefc…fab0  (TEE session)   │  controls ──────────────┘
│ policy: ≤$100/day → 0xB94b   │
└──────────────┬──────────────┘
      controls / signs (ERC-8004 is address-keyed to THIS wallet)
               │
┌──────────────▼──────────────┐
│ OKX ERC-8004 Agent #4460     │   operates on X Layer (chainIndex 196,
│ role ASP · services live     │   eip155:196) · USD₮0 · x402/EIP-3009
└─────────────────────────────┘
```

**One-liner for the UI:** *iNFT ATLAS #1 (Base) **owns** the identity + anchors the soul → the owner MetaMask / 6551 TBA **holds** that ownership → [owner-asserted operator link] → the OKX Agentic Wallet `0xaefc` **controls** → OKX ERC-8004 agent #4460 **operates** on X Layer. The soul from the iNFT is loaded into ATLAS's brain by us — OKX never reads it.*

### What the interface MUST do (and must NOT overclaim)
1. **Show two identities, not one.** Present ATLAS #1 (Base iNFT) and OKX #4460 (X Layer agent) as **distinct on-chain records on distinct chains** — never imply the NFT *is* the OKX identity or that OKX read it.
2. **Label the NFT→OKX hop as an owner assertion**, not an enforced on-chain link. If you strengthen it (cross-reference `0xaefc` in the iNFT metadata / reference the Base NFT via CAIP-10 in the 8004 registration file), show it as an **owner-authored attestation**, still not OKX-verified.
3. **Separate "owns/soul" (Base) from "operates/earns" (X Layer).** Ownership + soul live on Base/Irys; wallet control, policy, settlement, reputation, tasks all live on X Layer under `0xaefc`.
4. **State the soul path truthfully:** iNFT metadata → our runtime → agent behavior. Do **not** draw an arrow from the iNFT soul into OKX.
5. **Reputation is per-chain.** Any reputation shown for #4460 is its X Layer feedback store; do not display Base reputation as if OKX imported it.
6. **Onboarding checklist, not "you already have it."** For any user bringing an external iNFT: wallet → `agent create` (X Layer) → consent → activate/approval → list services. Holding an NFT completes none of these.

---

## Sources
**First-party (authoritative for the exact CLI ATLAS runs — read-only):**
- `/opt/atlas/.agents/skills/okx-ai/SKILL.md` — §Gates *Chain-fixed* ("identities live on XLayer only; never pass `--chain`"), routing, address-keyed identity, ERC-8004 branding (author `okx`, v4.2.0).
- `/opt/atlas/.agents/skills/okx-ai/references/identity-register.md` — full create flow: fields collected fresh (name/description/picture/service), `agent pre-check --role` = wallet-scoped consent+uniqueness, no NFT/tokenId/import parameter.
- `/opt/atlas/.agents/skills/okx-ai/references/identity-invariants.md` — "Each address can register only one `<roleLabel>`"; "no `--address` (signs with current wallet)"; the 12 `agent` subcommands; `--service` schema (no external-identity keys).
- `/opt/atlas/.agents/skills/okx-ai/references/identity-discover.md` / `identity-manage.md` / `identity-reputation.md` — X-Layer-only discovery, activate/deactivate toggles, per-chain reputation via `feedback-list`.
- `~/Desktop/atlas_corporation_okx_ai/docs/okx_research/05_xlayer_behavior.md` — X Layer chainIndex 196 / `eip155:196`, USD₮0 `0x779ded…713736`, TEE signer, `0xaefc` policy cap $100/day, treasury separation vs `0xB94b`.
- Memory notes: `atlas_corporation.md` (ATLAS #1 Base NFT `0x3D9f35E0…9809f`, soul sealed on Irys; OKX wallet `0xaefc` separate from MetaMask `0xB94b`; ASP #4460 create/rename txHashes; services & moderation history) and `erc_agent_stack.md` (8004 = per-chain registry, Base singleton `0x8004A169…`; 6551↔8004 agentWallet composition is a Base/Virtuals-side pattern; iCLONE #55101 / VEGETA #58099).

**Public:**
- [ERC-8004: Trustless Agents (EIP)](https://eips.ethereum.org/EIPS/eip-8004) — "singletons per chain"; `register(agentURI, metadata)` mints ERC-721 `agentId`; `{namespace}:{chainId}:{identityRegistry}` global id; "registration on one chain does not automatically make an agent known on others… must be independently registered on each chain."
- [OKX OnchainOS](https://web3.okx.com/onchainos) and [okx/onchainos-skills (GitHub)](https://github.com/okx/onchainos-skills) — OnchainOS agent environment; X Layer chainIndex 196.
- ERC-8004 explainers ([Composable Security](https://composable-security.com/blog/erc-8004-a-practical-explainer-for-trustless-agents/), [BuildBear](https://www.buildbear.io/blog/erc-8004)) — three per-chain registries; identity via ERC-721.

---

## Flagged uncertainties (not guessed)
1. **OKX's X Layer registry = literally the canonical ERC-8004 contract?** OKX's own skill brands `onchainos agent` as "ERC-8004 Agent identity" (first-party), but I did **not** read the X Layer registry **contract address** on-chain in this pass. Treat "OKX = ERC-8004 on X Layer" as **OKX-asserted and behaviorally true**, with the exact on-chain registry address unverified here.
2. **Is ATLAS separately in the *Base* 8004 registry?** The notes confirm **iCLONE #55101 / VEGETA #58099** are in the Base 8004 registry (auto-registered by Virtuals as ACP graduates). For **ATLAS**, the confirmed Base presence is the **iNFT (721A+6551)**; a separate ATLAS entry in the Base 8004 registry is **not stated** in the notes — do not assume it exists. (Immaterial to the OKX verdict, which is X-Layer-only.)
3. **Cross-chain reputation import into OKX.** ERC-8004 permits aggregators to pull feedback across chains, but there is **no evidence OKX imports Base reputation.** Treat as unavailable today; #4460's reputation is X-Layer-native.
4. **Optional attestation strength.** Cross-referencing `0xaefc` in the iNFT metadata and the Base NFT (CAIP-10) in the 8004 registration file would make the NFT↔OKX link machine-checkable off-chain, but is **owner-authored and not OKX-verified.** Present as attestation, never as enforced linkage.
