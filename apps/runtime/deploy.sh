#!/usr/bin/env bash
# ATLAS droplet deploy — idempotent. Run as a sudoer on the host.
#
#   sudo bash deploy.sh [backup.tar.gz]
#
# Provisions the isolated `atlas` slice, restores identity state (OKX wallet
# session, XMTP keys, secrets, onchainos binary) from the backup tarball,
# installs Node + the a2a daemon + the Claude brain, clones the monorepo, and
# wires systemd. The x402/API endpoint is intentionally gone — ATLAS sells
# A2A architecture work only.
set -euo pipefail

BACKUP="${1:-$(ls -t /root/backups/atlas-full-*.tar.gz 2>/dev/null | head -1)}"
REPO_URL="https://github.com/devclone20/atlas_corporation_okx_ai.git"
NODE_VERSION="v22.23.1"
HOME_DIR=/opt/atlas

[ -n "$BACKUP" ] && [ -f "$BACKUP" ] || { echo "backup tarball not found (pass it as \$1)"; exit 1; }

echo "== user + home =="
id atlas >/dev/null 2>&1 || useradd --system --create-home --home-dir "$HOME_DIR" --shell /bin/bash atlas
mkdir -p "$HOME_DIR"
chown atlas:atlas "$HOME_DIR"
chmod 750 "$HOME_DIR"

echo "== restore identity from backup =="
tar -xzf "$BACKUP" -C /opt   # extracts atlas/... over /opt/atlas
chown -R atlas:atlas "$HOME_DIR"
chmod 700 "$HOME_DIR/secrets" "$HOME_DIR/.onchainos" "$HOME_DIR/.okx-agent-task" 2>/dev/null || true
chmod 600 "$HOME_DIR"/secrets/* 2>/dev/null || true

echo "== node (nvm) =="
if [ ! -x "$HOME_DIR/.nvm/versions/node/$NODE_VERSION/bin/node" ]; then
  sudo -u atlas bash -lc '
    export NVM_DIR=/opt/atlas/.nvm
    mkdir -p "$NVM_DIR"
    curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | PROFILE=/dev/null bash
    . "$NVM_DIR/nvm.sh"
    nvm install '"$NODE_VERSION"'
  '
fi

echo "== daemon + brain packages =="
sudo -u atlas bash -lc '
  export NVM_DIR=/opt/atlas/.nvm; . "$NVM_DIR/nvm.sh"; nvm use '"$NODE_VERSION"' >/dev/null
  npm install -g @okxweb3/a2a-node @anthropic-ai/claude-code
'

echo "== monorepo =="
if [ -d "$HOME_DIR/app/.git" ]; then
  sudo -u atlas git -C "$HOME_DIR/app" pull --ff-only
else
  sudo -u atlas git clone --depth 1 "$REPO_URL" "$HOME_DIR/app"
fi
sudo -u atlas bash -lc '
  export NVM_DIR=/opt/atlas/.nvm; . "$NVM_DIR/nvm.sh"; nvm use '"$NODE_VERSION"' >/dev/null
  cd /opt/atlas/app && npm install --omit=dev
'

echo "== brain memory + check script =="
install -o atlas -g atlas -m 644 "$HOME_DIR/app/apps/runtime/CLAUDE.md" "$HOME_DIR/CLAUDE.md"
sudo -u atlas mkdir -p "$HOME_DIR/.claude"
install -o atlas -g atlas -m 644 "$HOME_DIR/app/apps/runtime/CLAUDE.md" "$HOME_DIR/.claude/CLAUDE.md"
sudo -u atlas mkdir -p "$HOME_DIR/bin"
install -o atlas -g atlas -m 755 "$HOME_DIR/app/apps/runtime/bin/okx_approval_check.sh" "$HOME_DIR/bin/okx_approval_check.sh"

echo "== systemd =="
install -m 644 "$HOME_DIR"/app/apps/runtime/systemd/atlas-a2a.service /etc/systemd/system/
install -m 644 "$HOME_DIR"/app/apps/runtime/systemd/atlas-okx-check.service /etc/systemd/system/
install -m 644 "$HOME_DIR"/app/apps/runtime/systemd/atlas-okx-check.timer /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now atlas-okx-check.timer
systemctl enable --now atlas-a2a.service

echo "== verify =="
sleep 8
systemctl --no-pager --lines 0 status atlas-a2a atlas-okx-check.timer || true
sudo -u atlas bash -lc '
  export NVM_DIR=/opt/atlas/.nvm; . "$NVM_DIR/nvm.sh" >/dev/null
  set -a; . /opt/atlas/secrets/a2a.env; set +a
  okx-a2a doctor 2>&1 | grep -E "✓|✗|Summary"
'
echo "deploy done."
