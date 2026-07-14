# OKX marketplace avatar for agent #4460 (side-view face) — deferred to post-approval

## What the owner asked for

A **side-profile photo framing the face** of the ATLAS titan, to be used as the **OKX marketplace
avatar** for agent #4460. The OpenSea NFT image stays the animated full-body render — this change is
the OKX avatar only.

## Hard rule: do NOT touch the listing while it is under review

Agent #4460 is currently `Listing under review` (AI quality review suggested pass). Changing the
avatar means `onchainos agent update --picture …` + re-activate, which counts as a listing change
and can disturb the review. **Apply the new avatar only AFTER #4460 is approved and live.**

## Asset status — READY

The clean side-profile avatar exists: **`soul/assets/atlas_avatar_sideface.png`** (1024×1024, ~793 KB,
under the OKX 1 MB cap). It was rendered fresh from the actual NFT model — the
`crimson-skull-bastion-obj/Crimson-Skull-Bastion.obj` titan — in Blender headless (EEVEE), 0° left
profile framed on the head/shoulders, on a dark ground with a faint bronze glow. Reproducible via
`soul/assets/render_avatar.py` (`blender --background --python render_avatar.py -- <obj> <outdir> 1400 0 final`).

The earlier concept art (`3D_ANIMATIONS/ATLAS CORP iNFT/ATLAS REF IMAGE.png`) was rejected as a source:
its "transparent" areas carry a baked-in checkerboard matte, so any crop shows fringe. The 3D render is
clean and is the faithful likeness (same model the NFT's `model.glb` animates).

The same PNG is staged on the droplet at `/opt/atlas/tmp/atlas_avatar_sideface.png`, ready for the
upload step below.

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
