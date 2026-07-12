# @atlas/runtime

Droplet deployment for the live ATLAS agent (#4460 on OKX AI).

```
CLAUDE.md                     # the brain memory the a2a daemon's Claude reads (HOME=/opt/atlas)
bin/okx_approval_check.sh     # daily listing-status + session-expiry monitor
systemd/atlas-a2a.service     # the OKX A2A daemon (okx-a2a run)
systemd/atlas-okx-check.*     # daily check timer
deploy.sh                     # idempotent provisioning (run with sudo on the host)
```

Deploy restores the agent's identity state (OKX wallet session, XMTP keys, secrets,
`onchainos` binary) from an encrypted-at-rest backup tarball, installs Node + the
`@okxweb3/a2a-node` daemon + the Claude CLI, clones this monorepo to `/opt/atlas/app`,
and wires systemd:

```bash
sudo bash deploy.sh /root/backups/atlas-full-YYYYMMDD.tar.gz
```

There is deliberately **no HTTP endpoint** — ATLAS sells A2A architecture work only.
Secrets live in `/opt/atlas/secrets/` (0600, never in git). The OKX session belongs to
the owner's email login; never use API-key (`--force`) login on this host — it switches
to a different OKX account and destroys the session that owns agent #4460.
