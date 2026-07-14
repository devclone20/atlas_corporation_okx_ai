# Retargeting the ATLAS #1 `tokenURI` to the living anchor (owner action)

## The problem we found

The soul is designed to live behind a **mutable Irys anchor** so it can be refined without a
re-mint. That only works if the NFT's on-chain `tokenURI` resolves to the **mutable** path.

It does not. On Base, read directly from the contract:

```
tokenURI(1) = https://gateway.irys.xyz/JCTu7dmsEa327ymLZXpXvvPDv3vi3Vu69kaVddDCoiMZ
```

That is the **immutable root** (no `/mutable/`). The immutable root serves the sealed **v1**
metadata **forever** — the old "Orchestrator / Druckenmiller" soul. The **v2 Harness Architect**
soul only lives at:

```
https://gateway.irys.xyz/mutable/JCTu7dmsEa327ymLZXpXvvPDv3vi3Vu69kaVddDCoiMZ
```

which `tokenURI` does **not** reference. So OpenSea and every marketplace read **v1**, and no
number of mutable-anchor updates will ever appear — the anchor updates are invisible to the token.

This is the corrected fact: **updating the mutable anchor does not change what the NFT reads until
`tokenURI` itself is pointed at the mutable path.** (The earlier `UPDATE_ANCHOR.md` claim that "the
mutable anchor is what your NFT reads" was wrong for this contract as deployed.)

## The fix (one transaction, owner-signed)

The contract exposes `setTokenURI(uint256,string)` and its `owner()` is the CLONE FRAME root
MetaMask `0xb94bba9d50a8b4b7473cb2687f5f633a54710fad` — both verified on-chain. So the owner can
re-point the token in a single call:

```
setTokenURI(1, "https://gateway.irys.xyz/mutable/JCTu7dmsEa327ymLZXpXvvPDv3vi3Vu69kaVddDCoiMZ")
```

After this, `tokenURI(1)` resolves through the mutable anchor → the v2 soul, and **every future
soul refinement pushed to the anchor becomes live automatically** (the living-anchor design finally
works end to end). The animated image (`poster.png` / `model.glb`) is unchanged.

### How to sign it — no key handling

Open **`tokenuri-retarget.html`** (in this folder) in a browser with MetaMask, over a local server
so the wallet injects (MetaMask does not inject on `file://`):

```sh
cd ~/Desktop/atlas_corporation_okx_ai/soul
python3 -m http.server 8777          # then open http://localhost:8777/tokenuri-retarget.html
```

The page:
1. reads the current `tokenURI(1)` and shows it (you'll see the immutable root),
2. checks the connected account is the owner wallet and the network is Base (8453),
3. builds the calldata in-browser (inspect it before signing),
4. sends `setTokenURI(1, <mutable anchor>)` — **you approve one transaction in MetaMask**,
5. waits for confirmation and re-reads `tokenURI(1)` to prove it changed.

This page never sees your private key or seed phrase; MetaMask signs the transaction.

## After it confirms — refresh OpenSea

Open the item — `https://opensea.io/item/base/0x3D9f35E08c41a80155353862f883F2B70119809f/1` —
open the **…** menu and choose **Refresh metadata**. OpenSea re-reads `tokenURI` and updates the
traits + soul to v2. (Marketplaces cache; the refresh can take a few minutes.)

## Optional, same session — fill the on-anchor description

The anchor metadata (`atlas1.metadata.v2.json`) now carries a proper `description` and its
`nft.token_uri` records the mutable anchor. That edit only reaches OpenSea when the **anchor
metadata is re-uploaded** (see `UPDATE_ANCHOR.md`) — a separate owner-signed Irys upload. The
`setTokenURI` retarget above is independent and is the one that surfaces v2; the description refresh
is a nicety you can do whenever.

## Sequence summary

1. **`setTokenURI` retarget** — required, 1 tx, surfaces v2 → **do this**.
2. **Refresh metadata on OpenSea** — required, no cost.
3. **Re-upload anchor metadata** (fills description) — optional, per `UPDATE_ANCHOR.md`.
4. **OKX avatar** — separate surface; see `OKX_AVATAR.md`. Do **not** touch the listing while
   agent #4460 is under review.
