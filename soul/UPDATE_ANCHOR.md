# Refining the ATLAS soul on-chain (owner action)

The soul (`neural_soul.md`) has been rewritten to **v2 — the Harness Architect**. The
on-chain metadata anchor still serves v1 and must be refined by you, because the update
has to be **signed by the wallet that sealed the root** — MetaMask
`0xb94bba9d50a8b4b7473cb2687f5f633a54710fad`. That private key is not on this machine,
and it should not be handled by anyone but you.

## What's ready

- `neural_soul.md` — the v2 soul (source of truth, in git).
- `atlas1.metadata.v2.json` — the exact ERC-721 metadata to upload: same structure as
  the sealed v1 (name, image, animation, attributes preserved), with the soul, the
  distilled `system_prompt`, the `Personality` trait, and `temperature` swapped to v2.
  Also fixes the UTF-8 mojibake in the sealed v1. 33 KB → **free** on Irys mainnet.
- `update-irys-anchor.mjs` — the one-shot uploader; it refuses to run from the wrong
  wallet, so a mistake can't corrupt the anchor.

## Run it (≈1 minute, no cost)

Run from `soul/` — its own `package.json` pins the `@irys` deps, so the imports
resolve after a one-time `npm install`:

```sh
cd ~/Desktop/atlas_corporation_okx_ai/soul
npm install                                  # one-time — creates soul/node_modules
export IRYS_KEY=0x<private key of 0xb94b…0fad>
npm run update-anchor                         # signs + uploads atlas1.metadata.v2.json
unset IRYS_KEY
```

It prints the new tx id. Then verify the anchor now points at it:

```sh
curl -sI https://gateway.irys.xyz/mutable/JCTu7dmsEa327ymLZXpXvvPDv3vi3Vu69kaVddDCoiMZ | grep -i location:
curl -sL  https://gateway.irys.xyz/mutable/JCTu7dmsEa327ymLZXpXvvPDv3vi3Vu69kaVddDCoiMZ | head -c 400
```

The `location:` header must end in the **new** tx id, and the JSON must show the v2
soul. The immutable root (`gateway.irys.xyz/JCTu7dms…`) keeps serving v1 forever —
that's the point of a permanent datachain.

> ⚠️ **Correction (verified on-chain 2026-07-14):** updating the mutable anchor does **not**,
> by itself, change what the NFT displays. This contract's on-chain `tokenURI(1)` points at the
> **immutable root** (`gateway.irys.xyz/JCTu7dms…`), so OpenSea and every marketplace read **v1**
> until the token is re-pointed at the mutable path. Do that once with
> `setTokenURI(1, …/mutable/JCTu7dms…)` — see **`TOKENURI_RETARGET.md`** and the signing page
> `tokenuri-retarget.html`. After the retarget, anchor updates like the one above become live.

## Alternative — sign in the browser (no key export)

If you prefer never to export the key: open the iIrys Frame web app, connect the same
MetaMask account, and upload `atlas1.metadata.v2.json` with tag `Root-TX =
JCTu7dmsEa327ymLZXpXvvPDv3vi3Vu69kaVddDCoiMZ` (plus the item/collection tags). MetaMask
signs the data item directly. The repo's web app doesn't have an "update anchor" button
yet — the CLI path above is the ready one.
