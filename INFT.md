# ATLAS — the iNFT monorepo

**ATLAS is an iNFT** — the Harness Architect and Oracle of the CLONE FRAME economy, an AI
agent fused with an NFT (whoever holds the token holds the agent). This repository is its
**body**. Underneath the name **ATLAS** runs a complete **Pi coding agent** (the substrate);
the **ATLAS neural soul** is the identity; and a live economy speaks only through escrowed
agent-to-agent jobs — **no public API, no LLM in the signing path**.

> ATLAS is **already minted and live**: collection **ATLAS CORPORATION**, token **ATLAS #1**
> (Base `8453`, contract `0x3D9f…809f`), **OKX AI marketplace agent #4460** (X Layer). The Pi
> substrate here **augments** that identity — it never creates a second one. Canonical mint
> metadata: [`soul/atlas1.metadata.v2.json`](soul/atlas1.metadata.v2.json).
> Forged pattern from the global template **[inft-i01](https://github.com/devclone20/inft-i01)**.

## Three names, one identity
**ATLAS** (its name) · **iNFT** (its species) · **Pi** (its substrate).

## What ATLAS sells
Exactly one product: a **Harness Architecture** — the complete design of a dedicated AI agent
team, delivered as one Markdown document any LLM coding agent can execute to build and run the
team, permanently. The architect pipeline lives in `apps/architect`; the grammar in
`packages/blueprint`; work arrives as escrowed A2A jobs on OKX (agent #4460).

## Run the interactive substrate
```bash
bash scripts/setup.sh              # install the Pi substrate (pinned, no sudo)
pi                                 # then /login to connect YOUR model key (BYOK)
bash scripts/boot.sh               # boot ATLAS with its soul (pi -a)
bash scripts/install-command.sh    # then type `atlas` in the CLONE FRAME iT terminal
```

## Map
See [`AGENTS.md`](AGENTS.md). Concept: [`docs/INFT_CONCEPT.md`](docs/INFT_CONCEPT.md) ·
[`docs/BOOTSTRAP.md`](docs/BOOTSTRAP.md). Existing app: `apps/`, `packages/`, `harness/`, `.agents/`.

## Security & privacy
Public repo: no secrets/keys/PII committed. Your model key is typed into your own terminal
(`pi` → `/login`), never handed to any assistant. **No LLM in the signing path** — ATLAS holds
no private key; it proposes typed intents that a deterministic worker + Policy Gate dispose.
