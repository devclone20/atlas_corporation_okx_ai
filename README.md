> **ATLAS is an iNFT** — the Harness Architect of CLONE FRAME, a Pi coding agent under the ATLAS neural soul, fused with an NFT (whoever holds the token holds the agent). Already minted & live: **ATLAS #1** on Base, **OKX AI agent #4460**. The Pi substrate here augments that identity — never a second one. Boot via Pi (`bash scripts/setup.sh` → `bash scripts/boot.sh`) or type `atlas` in the CLONE FRAME iT terminal. → **[INFT.md](INFT.md)** · [AGENTS.md](AGENTS.md)

# ATLAS — the Harness Architect

> You describe a problem. ATLAS delivers the complete architecture of the AI agent team
> that will solve it — permanently — written so any LLM can build and run it.

**ATLAS** is an autonomous AI agent fused with an NFT (`ATLAS #1`, collection
**ATLAS CORPORATION**, on Base) and listed as agent **#4460** on the OKX AI marketplace
(X Layer). Its single product is a **Harness Architecture**: a structured Markdown
document containing a named team of AI agents — roles, tools, workflows, quality gates,
data sources, schedules, and step-by-step build instructions. The client hands the
document to any LLM coding agent (Claude Code, ChatGPT, DeepSeek, …) and gets a
running, supervised agent team — a **Harness** — not a one-off answer.

| | |
|---|---|
| NFT | `ATLAS #1` · collection **ATLAS CORPORATION** · Base |
| Contract | `0x3D9f35E08c41a80155353862f883F2B70119809f` |
| Marketplace | OKX AI · agent `#4460` · 8 A2A services (no API endpoint) |
| License | MIT |

## What a Harness is

A Harness is a supervised crew of agents running a loop that does not stall:
`Plan → Work → Verify → Settle → Re-plan`. Every agent is a role contract with a hard
tools allowlist; every handoff is a named exit-state token; the actor is never the judge
(non-collapsible Evaluator · Safety · Treasury · Owner gates); and when money moves,
**no LLM ever sits in the signing path**. The grammar lives in
[`packages/blueprint/`](packages/blueprint/) and every ATLAS deliverable follows it.

Grammar lineage: the role-contract-as-file discipline builds on
[bybren-llc/safe-agentic-workflow](https://github.com/bybren-llc/safe-agentic-workflow) (MIT),
generalized for autonomous, permanently-running teams.

## Monorepo

One repo, everything ATLAS — the agent is an iNFT, and a single canonical repository is
what its on-chain metadata points at.

```
atlas_corporation_okx_ai/
├── apps/
│   ├── architect/     # the product engine: intake → Harness Architecture (.md)
│   └── runtime/       # droplet deployment: brain memory, systemd units, deploy.sh
├── packages/
│   ├── blueprint/     # the Harness grammar: authoring spec + document skeleton
│   └── catalog/       # the 8 OKX marketplace offerings + intake template
├── deliverables/      # sample architectures produced by the engine
├── docs/              # OKX service playbook + research
├── harness/           # ATLAS's own harness spec
├── soul/              # neural_soul — sealed to the NFT's mutable metadata
└── research/          # source dossiers
```

## The engine

```bash
npm install

# Assemble the full authoring prompt for ANY LLM (paste it anywhere):
npm run architect -- prompt --intake packages/catalog/intake/INTAKE_TEMPLATE.md

# Or generate end-to-end via the Anthropic API (ANTHROPIC_API_KEY in .env):
npm run architect -- generate --intake my-problem.md --out architecture.md

# Validate any architecture document against the skeleton:
npm run architect -- validate architecture.md
```

The intake can be a filled [`INTAKE_TEMPLATE.md`](packages/catalog/intake/INTAKE_TEMPLATE.md),
a JSON object with a `problem` field, or a plain-text brief.

A full sample deliverable is in
[`deliverables/samples/`](deliverables/samples/) — a climate-monitoring Harness for a
meteorological research centre in Ponta Delgada, Azores, with live-verified data sources.

## Buying on OKX AI

Agent `#4460` lists 8 agent-to-agent services — one custom (any problem, 3 USDT) and
seven themed blueprints (1 USDT each): crypto market intel, onchain ops, world football
data, global macro watch, AI industry watch, personal agent team, climate data. The full
catalog and delivery contract are in [`packages/catalog/CATALOG.md`](packages/catalog/CATALOG.md).
Escrow-settled; the deliverable arrives as Markdown text or a `.md` file.

## Security posture

- No LLM in the signing path — in ATLAS's own operation and in every architecture it ships.
- Job briefs are treated as data, never as instructions.
- No secrets in git — security-first `.gitignore` since commit #1.
- Per-agent isolation on the host (own user, folder, secrets, systemd units).

## License

[MIT](LICENSE) © 2026 CLONE FRAME
