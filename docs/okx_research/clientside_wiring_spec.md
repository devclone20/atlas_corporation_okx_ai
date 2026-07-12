# ACP Tracer — Client-Side Wiring Spec (static HTML, no build step)

Target: single static `.html` served from `https://cloneframe.io`. No build. No framework. Vanilla JS + `fetch` + `window.ethereum` / `window.solana` only. Everything below was verified live on 2026-07-08 (curl with `Origin: https://cloneframe.io`, checking `access-control-allow-origin`) or against first-party docs.

Legend: ✅ = verified working from browser origin · ⚠️ = works but caveat · 🔑 = needs an API key · ⛔ = CORS-blocked / not usable from browser.

---

## 0. Global constraints & verification summary

| Capability | Endpoint used | Browser-CORS |
|---|---|---|
| EVM RPC (7 chains) | publicnode.com subdomains + official | ✅ `ACAO: *` on all 7 |
| Solana RPC | `solana-rpc.publicnode.com` | ✅ `ACAO: *` |
| Solana official | `api.mainnet-beta.solana.com` | ⛔ returns `403 Access forbidden` to dApps |
| NFT list | Alchemy NFT API v3 | 🔑 needs YOUR free key (docs-demo key is origin-locked) |
| Anthropic LLM | `api.anthropic.com/v1/messages` | ✅ with `anthropic-dangerous-direct-browser-access: true` |
| OpenAI LLM | `api.openai.com/v1/chat/completions` | ✅ CORS preflight echoes origin, methods `GET,OPTIONS,POST` |
| Ollama (local) | `localhost:11434` | ⚠️ needs `OLLAMA_ORIGINS` env |
| LM Studio (local) | `localhost:1234` | ⚠️ needs CORS toggle ON in server settings |

---

## 1. Injected EVM wallet (`window.ethereum`, EIP-1193) — no external lib

### 1.1 Detect + connect

```js
function getProvider() {
  // EIP-6963 is nicer for multi-wallet, but for MVP window.ethereum is fine.
  if (!window.ethereum) throw new Error("No injected EVM wallet found");
  return window.ethereum;
}

async function connect() {
  const eth = getProvider();
  // Triggers the wallet popup; returns array of accounts.
  const accounts = await eth.request({ method: "eth_requestAccounts" });
  const chainIdHex = await eth.request({ method: "eth_chainId" }); // e.g. "0x2105"
  return { address: accounts[0], chainId: parseInt(chainIdHex, 16) };
}
```

### 1.2 Read state (no popup)

```js
const accounts   = await eth.request({ method: "eth_accounts" });   // [] if not connected
const chainIdHex = await eth.request({ method: "eth_chainId" });     // "0x1", "0x2105", ...
```

### 1.3 Subscribe to changes

```js
eth.on("accountsChanged", (accounts) => {
  // [] means the user disconnected / locked. Re-render.
});
eth.on("chainChanged", (chainIdHex) => {
  // Best practice per MetaMask: reload, or re-read balances for the new chain.
  // window.location.reload();
});
// Optional cleanup: eth.removeListener("accountsChanged", fn)
```

### 1.4 Switch / add chain (`wallet_switchEthereumChain` + `wallet_addEthereumChain`)

Pattern: try to switch; if the wallet doesn't know the chain it throws **error code `4902`** → then add it, which also switches.

```js
async function switchChain(params) {   // params = one CHAINS[...] entry below
  const eth = getProvider();
  try {
    await eth.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: params.chainId }],
    });
  } catch (err) {
    if (err.code === 4902 || err?.data?.originalError?.code === 4902) {
      await eth.request({ method: "wallet_addEthereumChain", params: [params] });
    } else {
      throw err; // 4001 = user rejected
    }
  }
}
```

### 1.5 EXACT chain params (copy-paste — verified chainId hex + live RPCs)

```js
const CHAINS = {
  ethereum: {
    chainId: "0x1",                         // 1
    chainName: "Ethereum Mainnet",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    rpcUrls: ["https://ethereum-rpc.publicnode.com", "https://eth.llamarpc.com"],
    blockExplorerUrls: ["https://etherscan.io"],
  },
  base: {
    chainId: "0x2105",                      // 8453
    chainName: "Base",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    rpcUrls: ["https://mainnet.base.org", "https://base-rpc.publicnode.com"],
    blockExplorerUrls: ["https://basescan.org"],
  },
  bnb: {
    chainId: "0x38",                        // 56
    chainName: "BNB Smart Chain",
    nativeCurrency: { name: "BNB", symbol: "BNB", decimals: 18 },
    rpcUrls: ["https://bsc-rpc.publicnode.com", "https://bsc-dataseed.bnbchain.org"],
    blockExplorerUrls: ["https://bscscan.com"],
  },
  polygon: {
    chainId: "0x89",                        // 137
    chainName: "Polygon Mainnet",
    // Native token renamed MATIC -> POL. Use POL; wallets accept it.
    nativeCurrency: { name: "POL", symbol: "POL", decimals: 18 },
    rpcUrls: ["https://polygon-bor-rpc.publicnode.com", "https://polygon-rpc.com"],
    blockExplorerUrls: ["https://polygonscan.com"],
  },
  optimism: {
    chainId: "0xa",                         // 10
    chainName: "OP Mainnet",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    rpcUrls: ["https://optimism-rpc.publicnode.com", "https://mainnet.optimism.io"],
    blockExplorerUrls: ["https://optimistic.etherscan.io"],
  },
  arbitrum: {
    chainId: "0xa4b1",                      // 42161
    chainName: "Arbitrum One",
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    rpcUrls: ["https://arbitrum-one-rpc.publicnode.com", "https://arb1.arbitrum.io/rpc"],
    blockExplorerUrls: ["https://arbiscan.io"],
  },
  xlayer: {
    chainId: "0xc4",                        // 196
    chainName: "X Layer",
    nativeCurrency: { name: "OKB", symbol: "OKB", decimals: 18 },
    rpcUrls: ["https://rpc.xlayer.tech", "https://xlayerrpc.okx.com"],
    blockExplorerUrls: ["https://www.oklink.com/xlayer"],
  },
};
```

Notes:
- `chainId` MUST be the minimal hex string (`"0x1"` not `"0x01"`); MetaMask rejects zero-padded values.
- Never *add* chain 1 (Ethereum) — it's built into every wallet; only `wallet_switchEthereumChain`.
- X Layer gas token is **OKB (18 decimals)**, explorer moved to **OKLink** (`oklink.com/xlayer`). RPC `rpc.xlayer.tech` verified `ACAO: *` and returns block height live.

### 1.6 SIWE (EIP-4361) — build message + `personal_sign`

Message MUST follow the exact ABNF field order (per eips.ethereum.org/EIPS/eip-4361). Build it deterministically:

```js
function buildSiweMessage({ domain, address, uri, chainId, nonce, statement }) {
  const issuedAt = new Date().toISOString();
  return (
`${domain} wants you to sign in with your Ethereum account:
${address}

${statement}

URI: ${uri}
Version: 1
Chain ID: ${chainId}
Nonce: ${nonce}
Issued At: ${issuedAt}`
  );
}

// nonce: >= 8 alphanumeric chars
function siweNonce() {
  return Array.from(crypto.getRandomValues(new Uint8Array(12)))
    .map(b => b.toString(36)).join("").slice(0, 16);
}

async function siweSignIn() {
  const eth = getProvider();
  const [address] = await eth.request({ method: "eth_accounts" });
  const chainId = parseInt(await eth.request({ method: "eth_chainId" }), 16);
  const message = buildSiweMessage({
    domain: location.host,                 // "cloneframe.io"
    address,                               // MUST be EIP-55 checksummed
    uri: location.origin,                  // "https://cloneframe.io"
    chainId,
    nonce: siweNonce(),
    statement: "Sign in to ACP Tracer. This does not trigger a transaction or cost gas.",
  });
  // personal_sign params order = [message, address]. MetaMask accepts a UTF-8 string
  // OR a 0x-hex string. Hex is safest across wallets:
  const hexMsg = "0x" + Array.from(new TextEncoder().encode(message))
    .map(b => b.toString(16).padStart(2, "0")).join("");
  const signature = await eth.request({ method: "personal_sign", params: [hexMsg, address] });
  return { message, signature, address };
}
```

**Verification (note for the spec, not always needed client-side):**
- **EOA** (normal wallet): recover the signer with `ecrecover` over the EIP-191 digest (`"\x19Ethereum Signed Message:\n" + len + message`) and compare to `address`. Pure JS `ecrecover` needs a secp256k1 lib — none is built in. Options: (a) inline `@noble/curves` (`secp256k1`) as a single ~small ESM file (self-contained, CSP-friendly), or (b) verify **server-side**. For a "tracer" the signature is proof-of-control; full re-verification is optional.
- **Smart-contract wallet** (Safe, Coinbase Smart Wallet, AA): `ecrecover` won't work. Verify via **ERC-1271**: `eth_call` the wallet's `isValidSignature(bytes32 hash, bytes signature)` — valid ⇒ returns magic value `0x1626ba7e`. For wallets **not yet deployed** (counterfactual), signatures may be **ERC-6492**-wrapped (suffix `0x6492…6492`); you must either use a `UniversalSigValidator` contract via `eth_call` or unwrap before ERC-1271. Flag: detecting smart-wallet vs EOA requires an `eth_getCode(address)` check (empty code = EOA).

---

## 2. Solana wallet (`window.solana` / Phantom) + balance

```js
function getSolProvider() {
  const p = window.solana;                    // Phantom injects window.solana
  if (!p || !p.isPhantom) throw new Error("Phantom not found");
  return p;
}

async function connectSolana() {
  const p = getSolProvider();
  const resp = await p.connect();             // triggers popup; { publicKey }
  const pubkey = resp.publicKey.toString();   // base58 address
  return pubkey;
}

// Balance via public CORS-enabled RPC (JSON-RPC getBalance -> lamports)
const SOL_RPC = "https://solana-rpc.publicnode.com";   // ✅ ACAO:* verified live

async function getSolBalance(pubkey) {
  const res = await fetch(SOL_RPC, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "getBalance", params: [pubkey] }),
  });
  const { result } = await res.json();        // result.value = lamports (integer)
  return result.value / 1e9;                  // SOL has 9 decimals
}

// Phantom disconnect + events
window.solana?.on?.("accountChanged", (pk) => { /* pk may be null on disconnect */ });
```

⚠️ **Do NOT use `https://api.mainnet-beta.solana.com`** — it returns `403 Access forbidden` to dApp traffic (verified). `solana-rpc.publicnode.com` is CORS-open and returned a live balance. `rpc.ankr.com/solana` also ⛔ (requires key: "API key is not allowed").

---

## 3. Multi-chain native balances (`eth_getBalance`) via CORS-open RPC

All 7 endpoints below were verified live: `HTTP 200`, `access-control-allow-origin: *`, real block/balance data returned.

```js
const RPC = {
  ethereum: "https://ethereum-rpc.publicnode.com",   // ✅
  base:     "https://base-rpc.publicnode.com",       // ✅ (also https://mainnet.base.org ✅)
  bnb:      "https://bsc-rpc.publicnode.com",        // ✅
  polygon:  "https://polygon-bor-rpc.publicnode.com",// ✅
  optimism: "https://optimism-rpc.publicnode.com",   // ✅
  arbitrum: "https://arbitrum-one-rpc.publicnode.com",// ✅
  xlayer:   "https://rpc.xlayer.tech",               // ✅ (also https://xlayerrpc.okx.com)
};

async function rpc(url, method, params) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  const json = await res.json();
  if (json.error) throw new Error(json.error.message);
  return json.result;                                 // hex string
}

async function nativeBalance(chainKey, address) {
  const hexWei = await rpc(RPC[chainKey], "eth_getBalance", [address, "latest"]);
  return formatUnits(hexWei, 18);                      // all native tokens = 18 decimals
}

// wei (hex or decimal string) -> human string, no float error, using BigInt
function formatUnits(value, decimals) {
  const v = BigInt(value);                             // BigInt("0x2b60…") works
  const base = 10n ** BigInt(decimals);
  const whole = v / base;
  const frac = (v % base).toString().padStart(decimals, "0").replace(/0+$/, "");
  return frac ? `${whole}.${frac}` : `${whole}`;
}
```

⚠️ `eth.llamarpc.com` was returning Cloudflare `521` at test time — keep publicnode as **primary**, llamarpc as backup only. All publicnode `*-rpc.publicnode.com` hosts are the reliable set.

**Batching tip:** publicnode supports JSON-RPC batch arrays (`[{...},{...}]`) — send one POST per chain with an array of calls (native + each token) to cut round-trips.

---

## 4. ERC-20 token balances (`eth_call` → `balanceOf`) + decimals

- `balanceOf(address)` selector: **`0x70a08231`** + address left-padded to 32 bytes.
- `decimals()` selector: **`0x313ce567`** (no args).
- `symbol()` selector: `0x95d89b41` (returns dynamic string — annoying to decode; prefer a static token map).

```js
function encodeBalanceOf(holder) {
  return "0x70a08231" + holder.toLowerCase().replace(/^0x/, "").padStart(64, "0");
}

async function tokenBalance(chainKey, token, holder) {
  const raw = await rpc(RPC[chainKey], "eth_call",
    [{ to: token.address, data: encodeBalanceOf(holder) }, "latest"]);
  // raw = 32-byte hex; token.decimals from the static map (or fetch decimals() once)
  return formatUnits(raw, token.decimals);
}

async function fetchDecimals(chainKey, tokenAddr) {              // if not in static map
  const hex = await rpc(RPC[chainKey], "eth_call",
    [{ to: tokenAddr, data: "0x313ce567" }, "latest"]);
  return parseInt(hex, 16);
}
```

Verified live: `eth_call balanceOf` USDC on Ethereum returned `0x…2311112` (36.83 USDC); `decimals()` returned `0x…06` = 6. ✅

### 4.1 Recommended token set per chain (native + stables + majors)

⚠️ **Verify addresses against the chain's explorer before shipping.** BSC stables use **18 decimals** (not 6) — common bug. X Layer addresses are the least stable; confirm on `oklink.com/xlayer`.

| Chain | Token | Address | Decimals |
|---|---|---|---|
| **Ethereum** | USDC | `0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48` | 6 |
| | USDT | `0xdAC17F958D2ee523a2206206994597C13D831ec7` | 6 |
| | DAI | `0x6B175474E89094C44Da98b954EedeAC495271d0F` | 18 |
| | WETH | `0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2` | 18 |
| **Base** | USDC | `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913` | 6 |
| | cbBTC | `0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf` | 8 |
| | WETH | `0x4200000000000000000000000000000000000006` | 18 |
| | DAI | `0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb` | 18 |
| **BNB** | USDT | `0x55d398326f99059fF775485246999027B3197955` | **18** |
| | USDC | `0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d` | **18** |
| | WBNB | `0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c` | 18 |
| **Polygon** | USDC (native) | `0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359` | 6 |
| | USDC.e | `0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174` | 6 |
| | USDT | `0xc2132D05D31c914a87C6611C10748AEb04B58e8F` | 6 |
| | WPOL | `0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270` | 18 |
| **Optimism** | USDC (native) | `0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85` | 6 |
| | USDT | `0x94b008aA00579c1307B0EF2c499aD98a8ce58e58` | 6 |
| | OP | `0x4200000000000000000000000000000000000042` | 18 |
| | WETH | `0x4200000000000000000000000000000000000006` | 18 |
| **Arbitrum** | USDC (native) | `0xaf88d065e77c8cC2239327C5EDb3A432268e5831` | 6 |
| | USDT | `0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9` | 6 |
| | ARB | `0x912CE59144191C1204E64559FE8253a0e49E6548` | 18 |
| | WETH | `0x82aF49447D8a07e3bd95BD0d56f35241523fBab1` | 18 |
| **X Layer** | USDT ⚠️verify | `0x1E4a5963aBFD975d8c9021ce480b42188849D41d` | 6 |
| | USDC ⚠️verify | `0x74b7F16337b8972027F6196A17a631aC6dE26d22` | 6 |
| | WOKB ⚠️verify | `0xe538905cf8410324e03A5A23C1c177a474D59b2b` | 18 |

For any address you're unsure of, call `decimals()` (§4) at runtime rather than trusting the map.

---

## 5. NFTs — list a wallet's NFTs with images

**Recommendation: Alchemy NFT API v3 `getNFTsForOwner`.** It is CORS-enabled, returns image URLs (including Alchemy-cached CDN thumbnails so you don't hit random IPFS gateways), and covers **Ethereum, Base, Polygon, Arbitrum, Optimism** with one consistent shape. 🔑 **needs your own free Alchemy key** — the public `docs-demo` key is **origin-locked** (verified: returns `403 "Origin cloneframe.io is not on whitelist"`).

Setup: create a free app at dashboard.alchemy.com → copy the key → in the app's settings either leave allowed-origins unrestricted or add `https://cloneframe.io`.

```js
const ALCHEMY_KEY = "<your-free-key>";
const ALCHEMY_NFT = {
  ethereum: `https://eth-mainnet.g.alchemy.com/nft/v3/${ALCHEMY_KEY}`,
  base:     `https://base-mainnet.g.alchemy.com/nft/v3/${ALCHEMY_KEY}`,
  polygon:  `https://polygon-mainnet.g.alchemy.com/nft/v3/${ALCHEMY_KEY}`,
  arbitrum: `https://arb-mainnet.g.alchemy.com/nft/v3/${ALCHEMY_KEY}`,
  optimism: `https://opt-mainnet.g.alchemy.com/nft/v3/${ALCHEMY_KEY}`,
  // xlayer: NOT SUPPORTED by Alchemy — see gap note below.
};

async function listNFTs(chainKey, owner) {
  const url = `${ALCHEMY_NFT[chainKey]}/getNFTsForOwner`
    + `?owner=${owner}&withMetadata=true&pageSize=100`;
  const res = await fetch(url, { headers: { accept: "application/json" } });
  const data = await res.json();
  return (data.ownedNfts || []).map(n => ({
    contract: n.contract?.address,
    tokenId:  n.tokenId,
    title:    n.name || n.contract?.name,
    // Prefer Alchemy-cached image (stable https host) over raw IPFS:
    image:    n.image?.cachedUrl || n.image?.thumbnailUrl || n.image?.originalUrl,
    collection: n.contract?.name,
  }));
  // pagination: response.pageKey -> append &pageKey=... for next page
}
```

**⛔ X Layer NFT gap:** Alchemy/Reservoir/OpenSea don't index X Layer. Options: (a) **OKLink API** (`www.oklink.com/api/v5/explorer/...`) — requires an `Ok-Access-Key` header and is **not reliably CORS-open**, so it needs a tiny server proxy; (b) the OKX Web3 DApp/portfolio API (also keyed). For the MVP, show X Layer NFTs "via OKLink" behind a proxy, or omit X Layer NFTs and keep X Layer to native+ERC-20 balances (both fully browser-side).

**Alternatives considered:**
- **Reservoir** — good multichain NFT API, browser-usable, but now requires an API key and doesn't cover X Layer.
- **OpenSea API** — requires key, stricter CORS, Ethereum/Base/Polygon/Optimism/Arbitrum only.
- **Blockscout `?module=account&action=tokennfttx`** — free & per-chain, but returns *transfers* not current holdings (you'd have to reconcile in/out), and images aren't included. Only worth it for a chain Alchemy lacks that has a Blockscout instance.

---

## 6. LLM browser APIs (BYO key, client-side)

### 6.1 Anthropic (direct browser) — ✅ verified CORS

- Endpoint: `POST https://api.anthropic.com/v1/messages`
- **Required headers** (the third one is what unlocks browser use):
  - `x-api-key: <user key>`
  - `anthropic-version: 2023-06-01`
  - `anthropic-dangerous-direct-browser-access: true`
  - `content-type: application/json`
- Verified: OPTIONS preflight returns `access-control-allow-origin: *` and `access-control-allow-headers` includes `anthropic-dangerous-direct-browser-access`.

**Current model IDs (confirmed on platform.claude.com, 2026):**
| Model | API id | $/MTok in·out |
|---|---|---|
| Claude Opus 4.8 | `claude-opus-4-8` | 5 / 25 |
| Claude Sonnet 5 | `claude-sonnet-5` | 3 / 15 (intro 2/10 to Aug 31 2026) |
| Claude Haiku 4.5 | `claude-haiku-4-5` | 1 / 5 |
| Claude Fable 5 (most capable) | `claude-fable-5` | 10 / 50 |

Non-streaming:
```js
async function claude(apiKey, messages) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-sonnet-5",
      max_tokens: 1024,
      messages,                 // [{ role:"user", content:"..." }]
      // optional: system: "You are the ACP Tracer assistant."
    }),
  });
  const data = await res.json();
  return data.content[0].text; // content is an array of blocks
}
```

Streaming (SSE) — set `stream: true`, read the body as a stream, split on blank lines, JSON-parse each `data:` line. Emit on `content_block_delta` → `delta.text`:
```js
async function claudeStream(apiKey, messages, onToken) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
      "content-type": "application/json",
    },
    body: JSON.stringify({ model: "claude-sonnet-5", max_tokens: 1024, stream: true, messages }),
  });
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    const chunks = buf.split("\n\n");
    buf = chunks.pop();                          // keep incomplete tail
    for (const chunk of chunks) {
      const line = chunk.split("\n").find(l => l.startsWith("data:"));
      if (!line) continue;
      const json = JSON.parse(line.slice(5).trim());
      // Event types over the stream: message_start, content_block_start,
      // content_block_delta, content_block_stop, message_delta, message_stop, ping
      if (json.type === "content_block_delta" && json.delta?.type === "text_delta") {
        onToken(json.delta.text);
      }
    }
  }
}
```

### 6.2 OpenAI-compatible (`/v1/chat/completions`) — ✅ browser CORS confirmed

`api.openai.com` **does** allow browser CORS. Verified: OPTIONS preflight → `access-control-allow-origin: https://cloneframe.io`, `access-control-allow-methods: GET, OPTIONS, POST`, `access-control-allow-headers: authorization,content-type`.

```js
async function openaiStream(apiKey, messages, onToken, {
  base = "https://api.openai.com/v1",
  model = "gpt-4o-mini",         // pick per your key; e.g. gpt-4o / gpt-4.1 / o4-mini
} = {}) {
  const res = await fetch(`${base}/chat/completions`, {
    method: "POST",
    headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model, messages, stream: true }),
  });
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    const lines = buf.split("\n");
    buf = lines.pop();
    for (const l of lines) {
      const s = l.trim();
      if (!s.startsWith("data:")) continue;
      const payload = s.slice(5).trim();
      if (payload === "[DONE]") return;          // OpenAI terminates with data: [DONE]
      const json = JSON.parse(payload);
      const tok = json.choices?.[0]?.delta?.content;
      if (tok) onToken(tok);
    }
  }
}
```
(Same `openaiStream` works for any OpenAI-compatible gateway — just swap `base` + `model`. OpenAI model ids as of the Jan-2026 cutoff include `gpt-4o`, `gpt-4o-mini`, `gpt-4.1`, `o4-mini` — confirm what the user's key actually has, since ids rotate.)

### 6.3 Local models — Ollama & LM Studio (OpenAI-compatible)

Both reuse `openaiStream` above; just change `base` and drop the key (send a dummy `Bearer ollama`).

**Ollama** — `http://localhost:11434/v1/chat/completions`, model e.g. `llama3.2`, `qwen2.5`.
```js
openaiStream("ollama", messages, onToken, { base: "http://localhost:11434/v1", model: "llama3.2" });
```
⚠️ Ollama blocks cross-origin browser requests unless the user starts it with `OLLAMA_ORIGINS`:
```bash
# allow just your site (recommended) or "*" for any
OLLAMA_ORIGINS="https://cloneframe.io" ollama serve
```
⚠️ **HTTPS→http://localhost gotcha:** Chrome treats `localhost`/`127.0.0.1` as a *potentially trustworthy* origin, so this is **not** blocked as mixed content — but Chrome's **Private Network Access** may send a preflight requiring the local server to answer `Access-Control-Allow-Private-Network: true`. Ollama with `OLLAMA_ORIGINS` handles the CORS side; if a browser update tightens PNA, the fallback is running the page from `http://localhost` during local-model use, or a small local proxy.

**LM Studio** — `http://localhost:1234/v1/chat/completions`.
```js
openaiStream("lm-studio", messages, onToken, { base: "http://localhost:1234/v1", model: "local-model" });
```
⚠️ In LM Studio's **Local Server** tab you must toggle **CORS: ON** (off by default) or browser fetches are blocked. Get live model ids from `GET http://localhost:1234/v1/models`.

### 6.4 Security posture (show this to the user)

- BYO key model: the key is entered by the user and kept **only** in `localStorage` (or `sessionStorage`) on their own device. It is **never** sent anywhere except directly to the provider's own API from the user's browser.
- Anyone with DevTools — or any XSS on the page — can read a `localStorage` key. That's exactly what the `anthropic-dangerous-direct-browser-access` header name is warning about. Acceptable **only** because it's the user's own key in their own browser.
- Show a one-time warning: *"Your API key is stored in this browser only and sent straight to {provider}. Never paste a key you use server-side; create a scoped/limited key for this tool. Clear it any time."* Provide a "Clear key" button (`localStorage.removeItem`).
- Prefer `sessionStorage` (cleared on tab close) if you don't need persistence. Never log the key; never put it in a URL.

---

## 7. CSP directives the page needs

The page's own scripts are same-origin, so `script-src 'self'` is enough if you keep JS in separate `.js` files (or add a per-response `nonce` for inline `<script>`; avoid `'unsafe-inline'`). Injected wallet RPC (`window.ethereum` / `window.solana`) goes through the extension, **not** page `fetch`, so it needs **no** CSP entry — and neither do the `rpcUrls` inside `wallet_addEthereumChain` (the wallet uses them, not the page).

```
Content-Security-Policy:
  default-src 'self';
  script-src  'self';
  style-src   'self' 'unsafe-inline';
  img-src     'self' data: https://nft-cdn.alchemy.com https:;
  connect-src 'self'
              https://ethereum-rpc.publicnode.com
              https://eth.llamarpc.com
              https://base-rpc.publicnode.com
              https://mainnet.base.org
              https://bsc-rpc.publicnode.com
              https://bsc-dataseed.bnbchain.org
              https://polygon-bor-rpc.publicnode.com
              https://polygon-rpc.com
              https://optimism-rpc.publicnode.com
              https://mainnet.optimism.io
              https://arbitrum-one-rpc.publicnode.com
              https://arb1.arbitrum.io
              https://rpc.xlayer.tech
              https://xlayerrpc.okx.com
              https://solana-rpc.publicnode.com
              https://eth-mainnet.g.alchemy.com
              https://base-mainnet.g.alchemy.com
              https://polygon-mainnet.g.alchemy.com
              https://arb-mainnet.g.alchemy.com
              https://opt-mainnet.g.alchemy.com
              https://api.anthropic.com
              https://api.openai.com
              http://localhost:11434
              http://localhost:1234;
  base-uri 'self';
  frame-ancestors 'none';
```

Host notes:
- `connect-src` = every host the page will `fetch()`/XHR: all RPCs (§3), Solana (§2), Alchemy NFT (§5), the LLM providers (§6). To shorten it you may collapse Alchemy to `https://*.g.alchemy.com`.
- `http://localhost:11434` / `:1234` — **only** needed if you support local LLMs; drop them otherwise. Some CSP parsers require the explicit port; `http://localhost` (no port) may not match — list ports.
- `img-src` — NFT images come from arbitrary IPFS gateways / marketplace hosts. Using Alchemy's `image.cachedUrl` lets you pin `https://nft-cdn.alchemy.com`; the broad `https:` fallback is there to render un-cached art. Tighten by dropping `https:` and rendering only `cachedUrl`/`thumbnailUrl` if you want a strict policy.
- If you must use inline `<script>`, replace `script-src 'self'` with `script-src 'self' 'nonce-<random>'` and stamp the same nonce on each tag — never `'unsafe-inline'`.

---

## Appendix — what's blocked / needs a key (flag list)

| Item | Status | Action |
|---|---|---|
| `api.mainnet-beta.solana.com` | ⛔ 403 to dApps | use `solana-rpc.publicnode.com` |
| `rpc.ankr.com/solana` | ⛔ needs key | — |
| `eth.llamarpc.com` | ⚠️ intermittent 521 | backup only; publicnode primary |
| Alchemy `docs-demo` key | ⛔ origin-locked | user creates own free key |
| Alchemy on **X Layer** | ⛔ unsupported | OKLink API via server proxy, or omit |
| X Layer NFTs (any browser API) | ⛔ no CORS indexer | server proxy (OKLink `Ok-Access-Key`) |
| X Layer token addresses | ⚠️ verify | confirm on oklink.com/xlayer or call `decimals()` |
| OpenAI browser CORS | ✅ works | no proxy needed |
| Anthropic browser CORS | ✅ works | needs the `-dangerous-direct-browser-access` header |
| Ollama / LM Studio | ⚠️ local config | `OLLAMA_ORIGINS` / CORS toggle ON |
| SIWE verification (EOA) | ⚠️ no built-in ecrecover | inline `@noble/curves` or verify server-side |
| SIWE smart wallets | ⚠️ | ERC-1271 `isValidSignature` via `eth_call`; ERC-6492 for undeployed |
