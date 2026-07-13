#!/usr/bin/env node
// Push the ATLAS v2 soul to the mutable Irys anchor.
//
// The anchor is refined by uploading a NEW data item tagged `Root-TX: <root>`,
// SIGNED BY THE SAME WALLET that sealed the root (MetaMask 0xb94b…0fad). The
// gateway then serves the newest tx in that wallet's chain. A foreign wallet is
// ignored, so this MUST be signed by the owner.
//
// The private key never lives in this repo. Export it for one session and unset
// it right after. Run from THIS directory (soul/) — its own package.json pins
// the @irys deps, so `npm install` here makes the imports below resolve:
//
//   cd ~/Desktop/atlas_corporation_okx_ai/soul
//   npm install                 # one-time — installs @irys/upload into soul/node_modules
//   export IRYS_KEY=0x<metamask-private-key-of-0xb94b…0fad>
//   npm run update-anchor       # = node update-irys-anchor.mjs atlas1.metadata.v2.json
//   unset IRYS_KEY
//
// Upload is < 100 KiB → free on Irys mainnet (same as the 26 KB v1 seal). No
// funding step. If the node ever asks for balance, `irys fund` a few cents.

import fs from "node:fs";
import { Uploader } from "@irys/upload";
import { BaseEth } from "@irys/upload-ethereum";

const ROOT_TX = "JCTu7dmsEa327ymLZXpXvvPDv3vi3Vu69kaVddDCoiMZ";
const OWNER = "0xb94bba9d50a8b4b7473cb2687f5f633a54710fad";

const file = process.argv[2];
if (!file || !fs.existsSync(file)) {
  console.error("usage: node update-irys-anchor.mjs <metadata.json>");
  process.exit(1);
}
if (!process.env.IRYS_KEY) {
  console.error("set IRYS_KEY to the MetaMask private key of " + OWNER);
  process.exit(1);
}

// Fail fast if the JSON is malformed or oversized.
const bytes = fs.readFileSync(file);
JSON.parse(bytes.toString("utf8"));
if (bytes.length >= 100 * 1024) {
  console.error(`file is ${bytes.length} bytes (>=100KiB) — would not be free; aborting`);
  process.exit(1);
}

const irys = await Uploader(BaseEth).withWallet(process.env.IRYS_KEY);
if (irys.address.toLowerCase() !== OWNER) {
  console.error(`wrong wallet ${irys.address} — the gateway would ignore this update. Expected ${OWNER}`);
  process.exit(1);
}

const tags = [
  { name: "Content-Type", value: "application/json" },
  { name: "Root-TX", value: ROOT_TX },
  { name: "App-Name", value: "iIrys Frame" },
  { name: "Item", value: "34b57dd7-6bc8-4163-b489-63e14c97447f" },
  { name: "Name", value: "ATLAS #1 — metadata" },
  { name: "Type", value: "metadata" },
  { name: "Edition", value: "1" },
  { name: "Collection", value: "ATLAS CORPORATION" },
  { name: "Tier", value: "iclone" },
];

const receipt = await irys.upload(bytes, { tags });
console.log("new tx:", receipt.id);
console.log("verify: curl -sI https://gateway.irys.xyz/mutable/" + ROOT_TX + " | grep -i location:");
console.log("        (the location must now end in " + receipt.id + ")");
