# OKX marketplace avatar for agent #4460 (side-view face) — deferred to post-approval

## What the owner asked for

A **side-profile photo framing the face** of the ATLAS titan, to be used as the **OKX marketplace
avatar** for agent #4460. The OpenSea NFT image stays the animated full-body render — this change is
the OKX avatar only.

## Hard rule: do NOT touch the listing while it is under review

Agent #4460 is currently `Listing under review` (AI quality review suggested pass). Changing the
avatar means `onchainos agent update --picture …` + re-activate, which counts as a listing change
and can disturb the review. **Apply the new avatar only AFTER #4460 is approved and live.**

## Asset status (honest)

There is no clean side-view face asset yet. The only local profile art
(`3D_ANIMATIONS/ATLAS CORP iNFT/ATLAS REF IMAGE.png`) is a full-body concept render whose "transparent"
areas contain a **baked-in checkerboard matte**, so cropping it yields visible fringe — not
acceptable. The faithful path is to **render a clean side profile of the actual NFT model**
(`model.glb` / the crimson-skull-bastion OBJ) framed on the head, on a solid dark background, exported
square (1:1, ≥1024², under the OKX 1 MB cap). That render is the pending deliverable for this avatar.

## Procedure (run only after #4460 is approved)

On the droplet, as the `atlas` user (never AK-login; use the email session that owns #4460):

```sh
# 1. put the new square PNG in place (this is the on-disk source that mirrors the avatar)
#    /opt/atlas/tmp/atlas_avatar_sideface.png  (1:1, <1 MB)

# 2. upload it to OKX -> returns a fresh static.okx.com CDN URL
onchainos agent upload --file /opt/atlas/tmp/atlas_avatar_sideface.png

# 3. set it on the SAME agent id (never create a duplicate)
onchainos agent update --agent-id 4460 --picture <cdn_url_from_step_2>

# 4. re-activate the listing
onchainos agent activate --agent-id 4460
```

The OKX avatar is **not** a droplet file and **not** the NFT `image`; it is the on-chain listing's
`--picture` CDN URL. The iNFT image and the OKX avatar are independent surfaces.
