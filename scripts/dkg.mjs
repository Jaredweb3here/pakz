#!/usr/bin/env node
/**
 * HoodPackz V2 — Local 4-of-7 BLS12-381 DKG
 *
 * Generates 7 operator key shares and an aggregated master public key
 * for use with BLS12381Verifier and BeaconOperatorRegistry.
 *
 * Output: .dkg/epoch-1.json — keep SECRET, backup securely.
 *
 * Usage:
 *   node scripts/dkg.mjs [--out .dkg/epoch-1.json]
 *
 * Requires: @noble/curves (npm install -g @noble/curves)
 */

import { bls12_381 as bls } from "@noble/curves/bls12-381.js";
import { randomBytes } from "crypto";
import { writeFileSync, mkdirSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dir = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dir, "..");
const outIdx = process.argv.indexOf("--out");
const outArg = outIdx !== -1 ? process.argv[outIdx + 1] : null;
const outFile = outArg ? resolve(outArg) : resolve(projectRoot, ".dkg", "epoch-1.json");

const OPERATORS = 7;
const THRESHOLD = 4;

// ── Feldman VSS (simplified) ──────────────────────────────────────────────────
// Generate a random polynomial of degree (THRESHOLD-1) over Fr.
// Secret = poly[0]. Shares = poly(i) for i = 1..OPERATORS.

function randomFr() {
  // Fr order for BLS12-381
  const ORDER = bls.fields.Fr.ORDER;
  let r;
  do {
    r = BigInt("0x" + randomBytes(32).toString("hex"));
  } while (r >= ORDER || r === 0n);
  return r;
}

function evalPoly(poly, x) {
  let result = 0n;
  let xPow = 1n;
  const ORDER = bls.fields.Fr.ORDER;
  for (const coeff of poly) {
    result = bls.fields.Fr.add(result, bls.fields.Fr.mul(coeff, xPow));
    xPow = bls.fields.Fr.mul(xPow, x);
  }
  return result;
}

// ── G1 point serialisation (uncompressed, 96 bytes) ──────────────────────────
function g1ToHex(point) {
  return point.toHex(false); // uncompressed
}

function scalarToG1(scalar) {
  return bls.G1.Point.BASE.multiply(scalar);
}

// ── Main ─────────────────────────────────────────────────────────────────────
const poly = Array.from({ length: THRESHOLD }, () => randomFr());
const secret = poly[0];

const masterPrivKey = secret;
const masterPubKey  = scalarToG1(masterPrivKey);

const shares = [];
for (let i = 1; i <= OPERATORS; i++) {
  const shareScalar = evalPoly(poly, BigInt(i));
  const sharePubKey = scalarToG1(shareScalar);
  shares.push({
    operatorIndex: i - 1,
    privateKey:    "0x" + shareScalar.toString(16).padStart(64, "0"),
    publicKey:     "0x" + g1ToHex(sharePubKey),
  });
}

const epoch = {
  threshold: THRESHOLD,
  operatorCount: OPERATORS,
  masterPublicKey: "0x" + g1ToHex(masterPubKey),
  // master private key — only needed to produce aggregate signatures
  masterPrivateKey: "0x" + masterPrivKey.toString(16).padStart(64, "0"),
  shares,
  generatedAt: new Date().toISOString(),
  note: "KEEP SECRET. Back up securely. Do not commit to git.",
};

mkdirSync(dirname(outFile), { recursive: true });
writeFileSync(outFile, JSON.stringify(epoch, null, 2));

console.log("DKG complete.");
console.log("Master public key :", epoch.masterPublicKey);
console.log("Output            :", outFile);
console.log();
console.log("Next: run scripts/sign-round.mjs to produce aggregate signatures.");
