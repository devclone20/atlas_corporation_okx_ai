# OKX Payments SDK — Deep Research (Domain 03)

> Research target: **OKX Payments SDK** — required before an ASP (Agent Service Provider) can go live and receive pay-per-call / escrow payments on OKX X Layer.
> Method: `git clone https://github.com/okx/payments` (shallow), then direct source reading of README, per-language docs, source, constants, and env examples.
> Date: 2026-07-05. All facts below are from the cloned repo unless prefixed `[UNVERIFIED]`.

---

## Sources fetched

Cloned repo `github.com/okx/payments` (default branch, shallow). Files read directly:

- `README.md` (root), `package.json`, `ok-meta.json`, `NOTICE`, `LICENSE`
- `go/x402/README.md`, `go/x402/SELLER.md`, `go/x402/mcp/README.md`
- `typescript/SELLER.md` (the single richest doc — full verbatim type signatures for every capability)
- `typescript/bu-payments/app-mpp/README.md`, all `typescript/bu-payments/*/package.json`
- `rust/mpp/README.md`, `rust/mpp/src/types.rs`, `rust/mpp/src/eip712/voucher.rs`
- `python/x402/pyproject.toml`, `python/mpp/pyproject.toml`, `python/x402/src/x402/http/okx_auth.py`
- `java/README.md`
- `go/x402/mechanisms/evm/constants.go`, `go/x402/signers/evm/README.md`, `go/x402/signers/evm/okx_signer.go`
- `go/x402/http/okx_facilitator_client.go`, `go/mpp/saclient/session.go`, `go/mpp/saclient/charge.go`
- `typescript/demo/mpp/.env.example`, `typescript/demo/x402/.env.example`, `typescript/bu-payments/app-x402-evm/src/constants.ts`

The GitHub web page fetch and one web search were used only for orientation; **all specifics below come from the cloned source**.

---

## Key Facts

1. `okx/payments` is a **multi-language monorepo** implementing **two payment protocols over HTTP 402**: **x402** (Coinbase open standard, extended by OKX) and **MPP** (Machine/Machine Payments Protocol, `mpp.dev`). Both gate a resource: request → server returns `402` + requirements → client signs payment → retries with proof → server verifies + settles → `200` + receipt.
2. All on-chain settlement is **brokered by the OKX SA API (Settlement API)** / OKX Facilitator over HTTPS, authenticated with **HMAC-SHA256** (`OK-ACCESS-KEY/SIGN/TIMESTAMP/PASSPHRASE`). The SDK does **not** require the seller to run an RPC node or hold on-chain state for basic charge flows — OKX broadcasts.
3. **Primary/default network is X Layer mainnet** (`eip155:196`, chainId 196) with default token **USD₮0** at `0x779Ded0c9e1022225f8E0630b35a9b54bE713736` (6 decimals, EIP-3009). The TypeScript seller SDK is **X-Layer-only**; the Go SDK supports several other EVM chains + Solana.
4. Four billing capabilities exist today: **exact** (fixed price per call, EIP-3009 gasless), **upto** (metered cap, Permit2), **aggr_deferred/deferred** (batched high-frequency), and **MPP session** (on-chain escrow + off-chain EIP-712 vouchers = the pay-as-you-go / streaming channel). Multi-recipient **splits** (≤10) are supported in MPP charge.
5. **"Escrow"** in this SDK = the **MPP session payment channel**: an on-chain `EvmPaymentChannel` escrow contract (default X Layer `0x5E550002e64FaF79B41D89fE8439eEb1be66CE3b`). Buyer deposits → sends off-chain signed vouchers per call → seller settles the highest cumulative voucher on close. This is **not** a generic "hold-until-delivery" arbitration escrow; it is a prepaid deposit channel.

---

## SDK overview (langs, install)

Root `README.md` support matrix:

| Language   | Path          | x402 | MPP |
| ---------- | ------------- | ---- | --- |
| Go         | `go/`         | ✅   | ✅  |
| Python     | `python/`     | ✅   | ✅  |
| Rust       | `rust/`       | ✅   | ✅  |
| TypeScript | `typescript/` | ✅   | ✅  |
| Java       | `java/`       | ✅   | —   |

**License:** Apache-2.0 (root). Note: TypeScript `@okxweb3/app-mpp` README and Python packages declare **MIT**; the x402 code carries a Coinbase copyright (NOTICE = "Copyright 2024 Coinbase"). Mixed licensing — verify per-package before shipping.

**Install commands (verbatim from docs):**

- **Go x402:** `go get github.com/okx/payments/go/x402`
- **Go x402 MCP:** `go get github.com/okx/payments/go/x402/mcp`
- **TypeScript** (npm package names, monorepo workspaces `typescript/bu-*/*`):
  - `@okxweb3/app-x402-core`, `@okxweb3/app-x402-evm`, `@okxweb3/app-mpp`, `@okxweb3/app-payment-router`
  - Framework adapters: `@okxweb3/app-x402-express`, `-hono`, `-fastify`, `-next`, `-fetch`, `-axios`
  - MPP: `npm install @okxweb3/app-mpp`
  - **NOTE:** the `typescript/SELLER.md` doc uses shortened names like `@okxweb3/x402-core`, `@okxweb3/x402-express`, `@okxweb3/mpp`, `@okxweb3/payment-router`, but the actual `package.json` names are `@okxweb3/app-*`. **[UNVERIFIED]** whether both names are published or the docs are aspirational; treat `app-*` as canonical from the manifests.
- **Python** (packages `okxweb3-app-x402`, `okxweb3-app-mpp`; requires Python ≥3.11; extras: `httpx`/`requests`, `flask`/`fastapi`, `evm`). Install via pip/uv; no explicit `pip install` line quoted in docs but pyproject names are canonical. Deps: pydantic≥2, eth-abi, eth-keys, eth-utils.
- **Rust** (crate `okxweb3-app-mpp = "0.2"`, plus upstream `mpp = "0.10"` with features `["server","evm","tower","axum"]`; x402 crates `x402-core`, `x402-axum`, `x402-evm`). `use` path `mpp_evm::*`.
- **Java** (Maven; Java 17+; Jakarta or `javax.servlet`): `mvn clean install`. Package namespace `com.coinbase.x402.*` (x402 only, no MPP).

---

## Core API (methods + what they do)

### x402 (three roles, framework-agnostic core)

**TypeScript (from `typescript/SELLER.md`, verbatim signatures):**

- `new OKXFacilitatorClient({ apiKey, secretKey, passphrase, baseUrl?, syncSettle? })` — the settlement broker client. **Always use this** (the doc's "COMMON MISTAKES" table explicitly says do not use the generic `HTTPFacilitatorClient`). HMAC signing is automatic.
- `new x402ResourceServer(facilitatorClients?)` with:
  - `.register(network, schemeServer)` (chainable) — register a scheme (e.g. `new ExactEvmScheme()`, `new UptoEvmScheme()`, `new DeferredEvmScheme()`).
  - `.initialize(): Promise<void>` — **MUST be called after the server starts, before any request**; it queries the facilitator's `/supported` endpoint.
  - Lifecycle hooks: `onBeforeVerify`, `onAfterVerify`, `onVerifyFailure` (may return `{recovered,result}`), `onBeforeSettle`, `onAfterSettle`, `onSettleFailure`.
- `new x402HTTPResourceServer(resourceServer, routes)` with `onProtectedRequest` (grant/abort/continue), `onSettlementTimeout` (`{confirmed}`), `setPollDeadline(ms)` (default 5000).
- Framework middleware factories: `paymentMiddlewareFromHTTPServer(...)`, `paymentMiddleware(routes, server, ...)`, `paymentMiddlewareFromConfig(routes, facilitatorClients?, schemes?, ...)`. Fastify signature differs (app is FIRST arg). Next.js: `paymentProxyFromHTTPServer`, `withX402FromHTTPServer`, `withX402`.
- `setSettlementOverrides(res, { amount })` — for the **upto** (metered) scheme; sets the actual charge (≤ cap). Formats: raw units `"1234000"`, percent `"50%"`, dollar `"$0.034"`, `"0"` (short-circuit, no tx). Non-Express: set header `settlement-overrides` (JSON).

**Go (from `go/x402/SELLER.md`):**
- `x402http.NewOKXFacilitatorClient(&OKXFacilitatorConfig{Auth: OKXAuthConfig{APIKey,SecretKey,Passphrase}, BaseURL, SyncSettle?, HTTPClient?, Timeout?})`
- `x402http.RoutesConfig{ "GET /api/data": {Accepts: PaymentOptions{{Scheme,Price,Network,PayTo}}, Description, MimeType} }`
- Scheme constructors: `exact.NewExactEvmScheme()`, `deferred.NewAggrDeferredEvmScheme()`.
- Middleware: `ginmw.X402Payment(ginmw.Config{Routes, Facilitator, Schemes, Timeout})`; also `echomw`, `nethttpmw`.
- Core types: `x402.X402Client`, `x402.X402ResourceServer`, `x402.X402Facilitator`.

**OKX Facilitator HTTP endpoints (from `go/x402/http/okx_facilitator_client.go`), base path `/api/v6/pay/x402`:**
- `GET /supported` — list supported schemes/networks (called during init).
- `POST /verify` — verify a payment payload (signature/authorization valid, not expired).
- `POST /settle` — settle on-chain (broadcast).
- `GET /settle/status?txHash=…` — poll settlement status.

### MPP (charge + session)

**TypeScript (`@okxweb3/app-mpp`):**
- `new SaApiClient({ apiKey, secretKey, passphrase, baseUrl?, onError? })` — the OKX Settlement API client; all settle/verify calls go through it.
- `Mppx.create({ methods: [charge({saClient})] and/or [session({saClient, signer, ...})], realm?, secretKey (= MPP_SECRET_KEY, REQUIRED), transport? })`.
- `mppx.charge(options)(request)` → returns `{status:402, challenge}` (return as-is) OR `{status:200, withReceipt(res)}` (wrap the business response). Options: `amount` (**base units string**, not `"$…"`), `currency` (ERC-20 addr), `recipient`, `description?`, `externalId?` (idempotency), `methodDetails:{chainId (default 196), feePayer?, splits?[≤10]}`.
- `mppx.session(options)(request)` — same return shape; one endpoint serves 4 actions dispatched by `payload.action`: **open / voucher / topUp / close**. Options add `unitType` (`request|token|byte`), `suggestedDeposit`, `methodDetails.escrowContract` (REQUIRED, 40-hex), `minVoucherDelta?`.

**SA API endpoints (from `go/mpp/saclient/*.go`):**
- Charge: `POST /api/v6/pay/mpp/charge/settle` (transaction mode — seller/OKX broadcasts) and `POST /api/v6/pay/mpp/charge/verifyHash` (hash mode — buyer already broadcast).
- Session: `POST …/session/open`, `…/session/topUp`, `…/session/settle`, `…/session/close`, `GET …/session/status?channelId=…`.

### Payment Router (protocol multiplexer)
- `paymentRouter({ adapters:[new MppAdapter({mppx}), new X402Adapter({resourceServer, httpResourceServerCtor})], routes, onError? })(handler)` — exposes one URL to buyers speaking either dialect. Detection: `Authorization: Payment …` → MPP (priority 10, wins); `payment-signature`/`x-payment` → x402 (priority 20); neither → both challenges merged into one 402. Custom adapters use priority ≥100.

### MCP integration (Go) — directly relevant to an agent ASP
- Server: `mcp.NewPaymentWrapper(resourceServer, {Accepts, Resource, Hooks})` + `wrapper.Wrap(handler)` → makes a **paid MCP tool**. Hooks: `OnBeforeExecution`, `OnAfterExecution`, `OnAfterSettlement`.
- Client: `mcp.NewX402MCPClientFromConfig(session, []SchemeRegistration, Options{})` — `AutoPayment` defaults true; `CallTool(...)` pays automatically when it hits a 402.
- Constants: `MCP_PAYMENT_REQUIRED_CODE` (JSON-RPC 402), `_meta` keys `x402/payment`, `x402/payment-response`.

---

## Payment & escrow flow (step-by-step)

### x402 pay-per-call (exact scheme — the ASP baseline)

1. Client `GET /api/data` with no payment.
2. Server middleware matches the route → returns **HTTP 402** with `PAYMENT-REQUIRED` header (base64-encoded PaymentRequired JSON: scheme, network `eip155:196`, payTo, amount, token, validity).
3. Client wallet signs an **EIP-3009 `TransferWithAuthorization`** (gasless — the payer authorizes a transfer without sending a tx). Typed struct: `from, to, value, validAfter, validBefore, nonce (bytes32)`.
4. Client retries `GET /api/data` + `PAYMENT-SIGNATURE` header (base64 PaymentPayload).
5. Server calls facilitator **`POST /verify`** → runs the business handler → **`POST /settle`** (OKX broadcasts `transferWithAuthorization` on X Layer) → returns **HTTP 200** + data + `PAYMENT-RESPONSE` header.
6. **Sync vs async settlement** (`syncSettle`): `true` waits for on-chain confirmation before delivery (returns `status="success"`) — use for high-value; `false`/omitted returns `status="pending"` immediately, settles in background — use for low-value/high-throughput. Go docs describe sync as returning `status="pending"` while waiting for confirm; TS docs describe async as returning `status="success"` immediately — semantics differ slightly between the two docs, so **test the exact status contract on your target SDK.**

### upto (metered cap) — pay-by-usage
- Buyer signs a **Permit2 `PermitWitnessTransferFrom`** with an upper-bound amount (the cap). Witness type = `Witness(address to,address facilitator,uint256 validAfter)` — the `facilitator` field binds settlement to the authorized facilitator.
- Handler computes the real charge per request and calls `setSettlementOverrides(res, {amount})` (must be ≤ cap; if omitted the facilitator settles the **full cap**).
- One-time buyer prerequisite: `IERC20.approve(PERMIT2, MAX_UINT256)` (Permit2 canonical `0x000000000022D473030F116dDEE9F6B43aC78BA3`). Proxy contracts: exact `0x402085c248EeA27D92E8b30b2C58ed07f9E20001`, upto `0x4020e7393B728A3939659E5732F87fdd8e680002`.

### aggr_deferred / deferred — batched
- Buyer uses a session-key delegation; many small calls are amortized by the facilitator into fewer on-chain settles. Settlement is asynchronous. No escrow contract; OKX batches.

### MPP session channel — the "escrow" flow (release-on-voucher)
1. **open** — buyer makes an on-chain deposit into the `EvmPaymentChannel` escrow contract (`methodDetails.escrowContract`, default X Layer `0x5E550002e64FaF79B41D89fE8439eEb1be66CE3b`). SA API `…/session/open`. Returns a `channelId`.
2. **voucher** — per call, buyer sends **one off-chain EIP-712 voucher** (signature only, no on-chain tx). Voucher struct = `{ bytes32 channelId; uint128 cumulativeAmount }`, EIP-712 domain `name="EVM Payment Channel"`, `version="1"`. Vouchers are **cumulative** (each ≥ previous by `minVoucherDelta`, anti-griefing). Seller verifies locally (65-byte sig, low-s check, ecrecover) then runs the business handler.
3. **topUp** — buyer adds more deposit into the existing channel (`…/session/topUp`).
4. **close** — seller settles the **highest cumulative voucher** on-chain via `…/session/close` (or `…/session/settle` for mid-channel settle), pulling that amount from escrow to the payee.
- **Release model:** funds are released to the seller when the seller settles the accumulated voucher — i.e. "release" = seller-driven settlement of prepaid escrow, keyed to units actually consumed. There is **no auto-settle idle timer** in the SDK (Go/Rust explicitly note this); if a buyer abandons without closing, the deposit stays escrowed until the seller settles or the contract's own timeout fires (`[UNVERIFIED]` doc says "typically 12–24h" — contract-defined, not in SDK).
- `signer.address` **MUST equal** `recipient` (the payee) — `session({signer})` fast-fails at startup otherwise.
- **Voucher signers must be EOAs** — smart-contract wallets (EIP-1271/4337/Safe/Argent) are NOT supported as voucher signers (local verification can't do on-chain `isValidSignature`); workaround = set an EOA `authorizedSigner` at open time.

### Multi-recipient splits (revenue share)
- MPP charge `methodDetails.splits: [{amount, recipient, memo?}]`, `sum(splits) < amount`, `splits.length ≤ 10`. Primary recipient gets `amount − sum(splits)`. Buyer signs one EIP-3009 per recipient.

---

## Onchain components (chains / contracts / tokens)

**Networks (from Go `constants.go` `NetworkConfigs` + TS constants):**

| Chain        | CAIP-2 / chainId | Token | Contract                                     | Dec | Method   |
| ------------ | ---------------- | ----- | -------------------------------------------- | --- | -------- |
| **X Layer**  | `eip155:196` / 196 | **USD₮0** | `0x779Ded0c9e1022225f8E0630b35a9b54bE713736` | 6   | EIP-3009 |
| X Layer testnet | `eip155:1952` / 1952 | — | — | — | — |
| Base         | `eip155:8453`    | USDC  | `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913` | 6   | EIP-3009 |
| Base Sepolia | `eip155:84532`   | USDC  | `0x036CbD53842c5426634e7929541eC2318f3dCF7e` | 6   | EIP-3009 |
| MegaETH      | `eip155:4326`    | USDM  | `0xFAfDdbb3FC7688494971a79cc65DCa3EF82079E7` | 18  | Permit2  |
| Monad        | `eip155:143`     | USDC  | `0x754704Bc059F8C67012fEd69BC8A327a5aafb603` | 6   | EIP-3009 |
| Mezo Testnet | `eip155:31611`   | mUSD  | `0x118917a40FAF1CD7a13dB0Ef56C86De7973Ac503` | 18  | Permit2  |
| Stable       | `eip155:988`     | USDT0 | `0x779Ded0c9e1022225f8E0630b35a9b54bE713736` | 6   | EIP-3009 |
| Solana (Go)  | `solana:*`       | USDC SPL | — | — | SPL transfer + memo |

> **TypeScript seller SDK is X-Layer-only** (`eip155:196`); the "COMMON MISTAKES" table rejects any other network. Go SDK is multi-chain (EVM + SVM, `eip155:*` / `solana:*` wildcards).

**Fixed contract addresses:**
- Permit2 (canonical, same on all EVM via CREATE2): `0x000000000022D473030F116dDEE9F6B43aC78BA3`
- Multicall3: `0xcA11bde05977b3631167028862bE2a173976CA11`
- x402 Exact Permit2 proxy: `0x402085c248EeA27D92E8b30b2C58ed07f9E20001`
- x402 Upto Permit2 proxy: `0x4020e7393B728A3939659E5732F87fdd8e680002`
- **MPP session escrow (`EvmPaymentChannel`) on X Layer mainnet: `0x5E550002e64FaF79B41D89fE8439eEb1be66CE3b`**

**On-chain primitives:** EIP-3009 `transferWithAuthorization` (gasless exact), Permit2 `PermitWitnessTransferFrom` (upto + ERC-20 without EIP-3009), EIP-712 vouchers (session channel), EIP-1271/ERC-6492 (smart-wallet sig verification on the verify path — magic values in constants). Solidity contract sources live under `contracts/evm/` with submodules (forge-std, OpenZeppelin, Permit2) — not in the shallow clone tree read here (`[UNVERIFIED]` full contract source).

---

## Setup / Requirements

**Credentials — an OKX SA API key is mandatory** (apply at `https://web3.okx.com`):

| Env var | Required | Purpose |
| --- | --- | --- |
| `OKX_API_KEY` | Yes | OKX API key |
| `OKX_SECRET_KEY` | Yes | HMAC-SHA256 signing secret |
| `OKX_PASSPHRASE` | Yes | OKX API passphrase |
| `PAY_TO` / `PAY_TO_ADDRESS` | Yes | Seller wallet that receives payments |
| `OKX_BASE_URL` | No | Facilitator/SA base URL (default `https://web3.okx.com`) |
| `MPP_SECRET_KEY` (aka `MPPX_SECRET_KEY`) | Session/MPP | High-entropy secret the seller uses to sign the 402 challenge — **never exposed to clients** |
| `MPP_MERCHANT_PRIVATE_KEY` (aka `SELLER_PRIVATE_KEY`) | Session only | Seller EIP-712 signer for voucher settle/close; `signer.address` must equal `recipient` |
| `MPP_ESCROW` | Session only | Escrow contract (defaults to `0x5E55…CE3b` on X Layer) |

**Go env (verbatim):** `OKX_API_KEY`, `OKX_SECRET_KEY`, `OKX_PASSPHRASE`, `PAY_TO_ADDRESS`, optional `OKX_BASE_URL`.

**Go-getting live (minimal exact ASP, from `go/x402/SELLER.md`):** create `OKXFacilitatorClient` → define `RoutesConfig` with `Accepts` (scheme/price/network/payTo) → register schemes (`exact.NewExactEvmScheme()`) → wrap routes in `ginmw.X402Payment(...)`. Routes NOT in the middleware group are free.

**TS gotcha:** for the `@okxweb3/x402-*` family you MUST `await resourceServer.initialize()` after the server starts, before handling requests.

---

## Security notes (KEY HANDLING is critical)

1. **HMAC-SHA256 request signing** (verified in `python/.../okx_auth.py`): prehash = `timestamp + method + path + body`; `HMAC-SHA256(secretKey, prehash)` → base64 → header `OK-ACCESS-SIGN`; plus `OK-ACCESS-KEY`, `OK-ACCESS-TIMESTAMP` (ISO-8601 ms UTC), `OK-ACCESS-PASSPHRASE`. The **`OKX_SECRET_KEY` is a bearer secret** — leaking it lets an attacker forge SA API calls. Keep server-side only; never in client bundles.
2. **`MPP_SECRET_KEY` never goes to the client** (explicit in env comments — signs the 402 challenge).
3. **Seller EIP-712 private key** (`MPP_MERCHANT_PRIVATE_KEY` / `SELLER_PRIVATE_KEY`): used to sign session close/settle authorizations. Docs are explicit — **use KMS/HSM/hardware in production, never raw env vars.** Rust README shows first-class integrations: **AWS KMS (`AwsSigner`)**, **Ledger (`LedgerSigner`)**, and a **custom remote signer** (WalletConnect / self-hosted signing service) implementing only 4 `Signer` methods. `.verify_payee(addr)` / `.verify_payee` fast-fails when signer ≠ payee.
4. **OKX TEE signing (`OKXSigner` / `TEEConfig`)**: designed for private-key-in-TEE signing, but per `go/x402/signers/evm/okx_signer.go` it is **Phase 2 — "TEE signing not yet implemented"** (returns an error). Today only Phase 1 local-private-key signing works via `NewClientSignerFromPrivateKey`. **[This is a real gap: the TEE wallet path advertised in the root README acknowledgments is not yet functional.]**
5. **Signature hygiene enforced:** strict 65-byte signatures (EIP-2098 compact form rejected), explicit low-s check (`s ≤ N/2`, anti-malleability), ecrecover with strict address comparison. Nonce/replay handled per EIP-3009 (`authorizationState`) and per-channel cumulative vouchers.
6. **Idempotency:** `externalId` on charge; `nonce` (bytes32) on EIP-3009 prevents replay.
7. **Signer restriction:** voucher signers must be EOAs (no EIP-1271/4337) — a security-relevant constraint for agent wallets that are smart-contract wallets (see Implications).

---

## Risks & Gotchas

- **Doc vs manifest package-name mismatch:** `typescript/SELLER.md` says `@okxweb3/x402-core` etc.; `package.json` says `@okxweb3/app-x402-core` / `@okxweb3/app-mpp`. Resolve before writing install scripts.
- **Mixed licenses:** root Apache-2.0, but MPP TS/Python declare MIT, x402 carries Coinbase copyright. Audit before redistributing.
- **TEE signing not implemented** (Phase 2 stub). Any "trustless agent key in TEE" design must wait or self-build.
- **No idle auto-settle for session channels** — the seller must drive settle/close; abandoned channels lock buyer funds until contract timeout. Requires an operational settlement job.
- **In-memory session store is the default** — restart loses channel state; topUp can leave stale local deposit caps. Production **requires** a persistent `SessionStore` (SQLite/Redis/Postgres/DynamoDB shown in Rust docs).
- **Sync/async settlement status semantics differ** between Go and TS docs — verify the exact `status` string your SDK returns before relying on it as a delivery gate.
- **MPP `amount` is base units, not `"$…"`** — mixing the x402 USD-string convention into MPP silently mis-prices.
- **Permit2 requires a one-time buyer `approve`** — first-payment UX friction for upto/ERC-20 tokens.
- **Escrow here is a prepaid deposit channel, not delivery-arbitration escrow.** OKX's marketing ("escrow released on verification of delivery") describes the higher-level Agent Payments Protocol (APP) roadmap; the SDK's `session`/escrow is unit-metered prepaid, not good-delivery-conditioned. Do not conflate.
- **X Layer only for the TS seller SDK** — if ATLAS wants Base/Solana it must use the Go SDK.

---

## Open Questions

- `[UNVERIFIED]` Are the short `@okxweb3/x402-*` package names actually published on npm, or only `@okxweb3/app-*`? (Manifests say `app-*`.)
- `[UNVERIFIED]` Full Solidity source and audit status of `EvmPaymentChannel` (`0x5E55…CE3b`) and the two Permit2 proxies — sources are under `contracts/evm/` submodules not present in the shallow clone.
- `[UNVERIFIED]` The exact SA API base path/version for x402 vs MPP appears as `/api/v6/pay/x402/*` and `/api/v6/pay/mpp/*`; the Go generic client also references `/verify`, `/settle`, `/supported` under a configurable `BasePath` (`/api/v6/x402` in one comment). Confirm the production paths from OKX's official API console before go-live.
- `[UNVERIFIED]` Fee structure / OKX's cut on settled payments — not in the repo.
- `[UNVERIFIED]` Rate limits, KYC/business requirements to obtain a production SA API key with settlement enabled.
- `[UNVERIFIED]` Session escrow contract's own on-chain timeout duration (SDK says merchant-driven; "12–24h" is doc prose, not a constant).
- `[UNVERIFIED]` Whether OKX sponsors gas on X Layer for `feePayer:true` charges or the seller's SA account is debited.

---

## Implications for ATLAS

ATLAS = a 24/7 Harness/Orchestrator agent (iNFT) selling services on OKX X Layer and taking on-chain payment. Concrete guidance:

1. **This is the right, official rail.** OKX Payments SDK on X Layer (`eip155:196`, USD₮0, chainId 196) is exactly the ASP payment layer. ATLAS becomes an x402 **resource server** (seller). Pick the SDK by ATLAS's runtime — likely **TypeScript** (`@okxweb3/app-x402-*` + a framework adapter) or **Go** if multi-chain is needed.
2. **Pay-per-call = the `exact` scheme.** Fixed price per service call, gasless EIP-3009 on USD₮0. Minimal: `OKXFacilitatorClient` + `x402ResourceServer.register("eip155:196", new ExactEvmScheme())` + route `accepts:{scheme:"exact", network:"eip155:196", payTo: ATLAS_WALLET, price:"$0.xx"}`. Use `syncSettle:true` for anything where ATLAS must confirm payment before doing work.
3. **Metered/agentic billing = `upto`.** For variable-cost work (LLM tokens, compute), have the buyer sign a cap and ATLAS call `setSettlementOverrides` with the real cost. Fits agent economics well.
4. **"Escrow" for sub-agent hiring = MPP `session` channel.** When ATLAS hires a sub-agent (or is hired), the deposit-channel model (open → per-call voucher → close/settle) gives streaming pay-per-use with one on-chain settle. But note: **it is prepaid-deposit metering, not delivery-arbitration.** True "release-only-on-delivery" arbitration is OKX APP roadmap, not in this SDK — ATLAS would build delivery gating in its own handler logic (verify work → then settle voucher).
5. **Agent wallet caution (ERC-6551/4337):** ATLAS's memory notes iCLONE/VEGETA use 6551 agent wallets (smart-contract wallets). **Session vouchers require EOA signers** — a smart-contract agent wallet cannot directly sign vouchers. Use an EOA `authorizedSigner` delegate at channel open, or use x402 `exact`/`upto` (which support EIP-1271/ERC-6492 smart-wallet verification on the verify path) instead of MPP session for smart-wallet payers.
6. **Key handling is the go-live blocker to get right:** OKX SA API key (`OKX_*`) server-side only; the seller EIP-712 signing key (for session settle) belongs in **AWS KMS / Ledger / a remote signer**, never a raw env var. The advertised **OKX TEE signer is not implemented yet (Phase 2 stub)** — do not architect around it.
7. **Go-live checklist:** (a) obtain production OKX SA API key + passphrase with settlement enabled; (b) fund/verify ATLAS's `PAY_TO` on X Layer; (c) integrate the SDK, register schemes, `initialize()`; (d) for session/escrow, deploy/point to the escrow contract and stand up a persistent `SessionStore` + a settlement job (no auto-settle); (e) move signing keys to KMS/HSM; (f) confirm production SA API paths and fee terms with OKX. Then ATLAS can receive pay-per-call and channel payments 24/7.
8. **MCP synergy:** the Go SDK has native **paid-MCP-tool** wrappers (`NewPaymentWrapper` / `Wrap`) and an auto-paying MCP client. If ATLAS exposes services as MCP tools, this makes each tool call directly monetizable with x402 — a strong fit for the orchestrator model.
