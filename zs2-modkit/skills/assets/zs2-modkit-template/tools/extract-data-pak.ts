import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { resolveGameRoot, resolveProjectRootFromTool } from "./modkit-config.ts";

const projectRoot = resolveProjectRootFromTool(import.meta.url);
const gameRoot = resolveGameRoot(projectRoot);
const outDir = path.join(projectRoot, "output", "extract", "data");
const bootstrapKey = "e5c8bec60f27777fdc7161d01125819d";

function sha256(buf) {
  return crypto.createHash("sha256").update(buf).digest();
}

function hmacSha256(key, buf) {
  return crypto.createHmac("sha256", key).update(buf).digest();
}

function aesCbcDecrypt(key, iv, ciphertext) {
  const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}

function decryptManifest() {
  const manifestPath = path.join(gameRoot, "www", "manifest.enc");
  const envelope = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  const plain = aesCbcDecrypt(
    Buffer.from(bootstrapKey, "utf8"),
    Buffer.from(envelope.iv, "hex"),
    Buffer.from(envelope.encryptedData, "hex")
  );
  return JSON.parse(plain.toString("utf8"));
}

function normalizeKey(key) {
  return Buffer.from(String(key).padEnd(32, "0").slice(0, 32), "utf8");
}

function derivePakKeys(key) {
  const normalized = normalizeKey(key);
  return {
    encKey: sha256(Buffer.concat([Buffer.from("enc:"), normalized])),
    macKey: sha256(Buffer.concat([Buffer.from("mac:"), normalized]))
  };
}

function decryptAuthenticatedPayload(payload, aad, keys) {
  if (!payload || payload.v !== 2 || payload.alg !== "A256CBC-HS256") {
    throw new Error(`unsupported authenticated payload for ${aad}`);
  }
  const iv = Buffer.from(payload.iv, "hex");
  const ciphertext = Buffer.from(payload.data, "hex");
  const expectedMac = Buffer.from(payload.mac, "hex");
  const actualMac = hmacSha256(keys.macKey, Buffer.concat([Buffer.from(aad), iv, ciphertext]));
  if (!crypto.timingSafeEqual(expectedMac, actualMac)) {
    throw new Error(`MAC mismatch for ${aad}`);
  }
  return aesCbcDecrypt(keys.encKey, iv, ciphertext);
}

function inflatePak1(buf) {
  if (buf.subarray(0, 4).toString("ascii") !== "PAK1") {
    return zlib.inflateSync(buf);
  }
  let off = 4;
  off += 8; // type
  off += 4; // original size
  off += 4; // compressed size
  const filenameLength = buf.readUInt32LE(off);
  off += 4;
  off += 16; // reserved
  off += filenameLength;

  const candidates = [off, 44 + filenameLength];
  for (let i = 0; i < buf.length - 1; i++) {
    if (buf[i] === 0x78 && [0x01, 0x5e, 0x9c, 0xda].includes(buf[i + 1])) {
      candidates.push(i);
      break;
    }
  }
  for (const start of candidates) {
    try {
      return zlib.inflateSync(buf.subarray(start));
    } catch {
      // Try the next plausible header size.
    }
  }
  throw new Error("unable to inflate PAK1 payload");
}

function decryptLegacyJson(text, key) {
  let envelope;
  try {
    envelope = JSON.parse(text);
  } catch {
    return text;
  }
  if (!envelope.iv || !envelope.encryptedData) return text;
  const plain = aesCbcDecrypt(
    Buffer.from(String(key).slice(0, 32), "utf8"),
    Buffer.from(envelope.iv, "hex"),
    Buffer.from(envelope.encryptedData, "hex")
  );
  return plain.toString("utf8");
}

function main() {
  const manifest = decryptManifest();
  const key = manifest.key || bootstrapKey;
  const pak = fs.readFileSync(path.join(gameRoot, "www", "data.pak"));

  if (pak.subarray(0, 4).toString("ascii") !== "PAKX") {
    throw new Error("data.pak is not a PAKX archive");
  }

  const metaLen = pak.readUInt32LE(4);
  fs.rmSync(outDir, { recursive: true, force: true });
  fs.mkdirSync(outDir, { recursive: true });

  const files = [];
  let offset = 8 + metaLen;
  while (offset < pak.length) {
    const start = offset;
    if (pak.subarray(offset, offset + 4).toString("ascii") !== "PAK1") {
      throw new Error(`invalid PAK1 entry at offset ${offset}`);
    }
    offset += 4;
    const type = pak.subarray(offset, offset + 8).toString("ascii").replace(/\0+$/g, "");
    offset += 8;
    const originalSize = pak.readUInt32LE(offset);
    offset += 4;
    const compressedSize = pak.readUInt32LE(offset);
    offset += 4;
    const filenameLength = pak.readUInt32LE(offset);
    offset += 4;
    const reserved = pak.subarray(offset, offset + 20).toString("hex");
    offset += 20;
    const name = pak.subarray(offset, offset + filenameLength).toString("utf8");
    offset += filenameLength;
    const compressed = pak.subarray(offset, offset + compressedSize);
    offset += compressedSize;

    const plain = zlib.inflateSync(compressed);
    const rawText = plain.toString("utf8");
    const plainText = decryptLegacyJson(rawText, key);
    const outputPath = path.join(outDir, name);
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    try {
      fs.writeFileSync(outputPath, JSON.stringify(JSON.parse(plainText), null, 2), "utf8");
    } catch {
      fs.writeFileSync(outputPath, plainText, "utf8");
    }

    files.push({
      path: name,
      type,
      offset: start,
      originalSize,
      compressedSize,
      reserved,
      inflatedSize: plain.length,
      legacyJsonDecrypted: plainText !== rawText,
      sizeMatches: plain.length === originalSize
    });
  }

  fs.writeFileSync(path.join(outDir, "_manifest.json"), JSON.stringify(manifest, null, 2), "utf8");
  fs.writeFileSync(path.join(outDir, "_index.json"), JSON.stringify({ metaLength: metaLen, files }, null, 2), "utf8");
  console.log(`Extracted ${files.length} files to ${outDir}`);
}

main();
