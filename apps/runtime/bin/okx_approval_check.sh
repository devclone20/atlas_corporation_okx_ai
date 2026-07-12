#!/usr/bin/env bash
# Daily OKX approval check for ATLAS agent #4460.
# Logs status, keeps a state file, and drops a flag when the listing leaves "under review".
set -uo pipefail
export NVM_DIR=/opt/atlas/.nvm
. "$NVM_DIR/nvm.sh" >/dev/null 2>&1 || true
NODE=/opt/atlas/.nvm/versions/node/v22.23.1/bin/node
BIN=/opt/atlas/.local/bin/onchainos
LOG=/opt/atlas/okx_approval.log
STATEF=/opt/atlas/.okx_approval_state
FLAG=/opt/atlas/okx_approved.flag
TS=$(date -u +%FT%TZ)

JSON=$("$BIN" agent get-my-agents 2>/dev/null || true)
STATUS=$(printf '%s' "$JSON" | "$NODE" -e '
let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{
  let code="err",label="";
  try{ let d=JSON.parse(s); let found=null;
    (function f(o){ if(found)return; if(o&&typeof o==="object"){ if(String(o.agentId)==="4460"){found=o;return;} for(let k in o) f(o[k]); } })(d);
    if(found){ code=String(found.approvalDisplayStatus); label=String(found.approvalLabel||""); }
  }catch(e){}
  process.stdout.write(code+"|"+label);
});' 2>/dev/null)
[ -z "$STATUS" ] && STATUS="err|no-output"

echo "$TS status=$STATUS" >> "$LOG"
CODE="${STATUS%%|*}"
LAST=$(cat "$STATEF" 2>/dev/null || echo "")

if [ "$STATUS" != "$LAST" ]; then
  echo "$TS CHANGED: [$LAST] -> [$STATUS]" >> "$LOG"
  printf '%s' "$STATUS" > "$STATEF"
  if [ "$CODE" != "2" ] && [ "$CODE" != "err" ] && [ -n "$CODE" ]; then
    echo "$TS *** APPROVAL STATE LEFT under-review -> $STATUS ***" >> "$LOG"
    printf '%s left review -> %s\n' "$TS" "$STATUS" > "$FLAG"
  fi
fi

# --- Session-expiry watch: warn when the email login session (owner of agent
#     4460) is within 14 days of expiring. AK re-login is NOT a substitute —
#     API-Key auth maps to a separate OKX account that cannot see this agent. ---
SESSF=/opt/atlas/.onchainos/session.json
SFLAG=/opt/atlas/okx_session_expiring.flag
if [ -r "$SESSF" ]; then
  EXP=$("$NODE" -e 'try{const d=require("/opt/atlas/.onchainos/session.json");process.stdout.write(String(d.sessionKeyExpireAt||""))}catch(e){}' 2>/dev/null)
  if [ -n "$EXP" ]; then
    NOW=$(date -u +%s)
    LEFT=$(( (EXP - NOW) / 86400 ))
    if [ "$LEFT" -le 14 ]; then
      echo "$TS *** SESSION EXPIRES IN ${LEFT}d (renew: onchainos wallet login <owner email> + OTP) ***" >> "$LOG"
      printf '%s session expires in %sd\n' "$TS" "$LEFT" > "$SFLAG"
    else
      rm -f "$SFLAG"
    fi
  fi
fi
