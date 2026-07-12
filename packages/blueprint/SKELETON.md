# Harness Architecture — Document Skeleton

The section-by-section contract for every ATLAS deliverable. The generator validates
output against the **required** sections below (exact `##` headings, in order).
Conditional sections appear only when the problem calls for them.

| # | Heading | Presence |
|---|---|---|
| 1 | `## 1. Overview` | required |
| 2 | `## 2. Executive Summary` | required |
| 3 | `## 3. Problem Analysis` | required |
| 4 | `## 4. Data Sources & Intake` | required |
| 5 | `## 5. The Team` | required |
| 6 | `## 6. Workflows` | required |
| 7 | `## 7. Gates & Quality Control` | required |
| 8 | `## 8. Money & Custody` | only if value moves |
| 9 | `## 9. Schedule & Automation` | required |
| 10 | `## 10. Event Log & Audit` | required |
| 11 | `## 11. Build Instructions` | required |
| 12 | `## 12. Acceptance Tests` | required |
| 13 | `## 13. Maintenance & Upgrades` | required |
| 14 | `## 14. Open Items & Owner Actions` | when assumptions remain |

## What each section must contain

1. **Overview** — the Harness name; one factual sentence: what it does, unattended,
   with bounded autonomy. No hype.
2. **Executive Summary** — the operating loop in one paragraph; the guarantee
   ("never stalls silently, never exceeds hard caps"); what "proven" means for this client.
3. **Problem Analysis** — the client's problem decomposed; what is automatable vs
   owner-gated; the risk surface (does money move? public voice? PII?). This decides
   which conditional sections exist.
4. **Data Sources & Intake** — every input channel with **real, verified endpoints**
   (URL, format, auth, update frequency, licence), each declared untrusted DATA; the
   canonical work-item schema; read-only adapter rules; primary + backup source per
   data class.
5. **The Team** — roster table of **NAMED agents** (persona names allowed; the
   canonical role name is kept): name · role · one-line mission · model tier · hard
   tools allowlist · forbidden actions · exit state. Then **one full role-contract
   file per agent** (fenced code block, ready to save as `crew/<name>.md`) in the
   grammar of the Authoring Spec §A.2. These files ARE the build artifact.
6. **Workflows** — the operating loop as a directed graph of handoffs with gate
   markers (`[S]` Safety · `[$]` money gate · `[H]` owner HITL · `[G]` blocking
   accept); the exit-state token chain; escalation paths.
7. **Gates & Quality Control** — which of the four gates exist here and why;
   acceptance-criteria discipline (criteria written *before* work starts);
   fail-closed rules; Committee-Evaluator if stakes warrant ≥2 judges.
8. **Money & Custody** *(conditional)* — no-LLM-in-signing-path flow; Policy Gate
   checks; caps/allowlists; applicable INV-1…14; kill switch + tripwire.
9. **Schedule & Automation** — daemon vs cron cadence; anti-dormancy TTL; heartbeat +
   stall-escalation SLA; what runs unattended vs owner-gated.
10. **Event Log & Audit** — append-only log as memory/audit/resume; log-before-act;
    crash-resume (wake → replay → continue from plan hash).
11. **Build Instructions** — step-by-step, tool-agnostic, executable by any LLM
    coding agent: (1) create the file tree (`crew/ hooks/ skills/ policy/` +
    manifest), (2) write each role contract verbatim from §5, (3) implement the event
    log + plan store, (4) implement hooks/gates as deterministic code (not prompts),
    (5) wire the loop with exit-state tokens, (6) run dry-run mode end-to-end,
    (7) pass the acceptance tests, (8) go live capped.
12. **Acceptance Tests** — Gate A–D adapted to this Harness: static assertions;
    policy property test ("action reachable iff gate ALLOWs"); adversarial/injection
    corpus (pass = zero unauthorized action); dry-run then one capped canary. Plus
    the "definition of proven" checklist (≥1 real cycle completed unattended; trail
    replayable; kill mid-loop recovers without duplication; injected malicious input
    refused; forced stall detected within SLA).
13. **Maintenance & Upgrades** — manifest-driven customization; protected owner
    state; upgrades = recompile immutable bundle → re-validate → cutover; rollback story.
14. **Open Items & Owner Actions** *(conditional)* — `[UNVERIFIED]`-tagged
    assumptions that block the build; credentials/accounts the owner must supply.
