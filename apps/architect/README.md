# @atlas/architect

The product engine: turns a client intake into a complete **Harness Architecture**
document that any LLM coding agent can execute.

```bash
# Assemble the authoring prompt for any LLM (stdout or --out):
atlas-architect prompt --intake intake.md

# Generate end-to-end via the Anthropic API (needs ANTHROPIC_API_KEY):
atlas-architect generate --intake intake.md --out architecture.md [--model claude-opus-4-8]

# Structurally validate any architecture document:
atlas-architect validate architecture.md
```

The intake is a plain-text brief, a filled
[`INTAKE_TEMPLATE.md`](../../packages/catalog/intake/INTAKE_TEMPLATE.md), or JSON with a
`problem` field. The authoring rules come from
[`packages/blueprint/`](../../packages/blueprint/) — change them there and every future
deliverable changes with them. Generation streams (adaptive thinking, effort high) and the
result is validated against the skeleton before it is written; a failed validation exits 2.
