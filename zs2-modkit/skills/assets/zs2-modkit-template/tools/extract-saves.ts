import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { decode } from "@msgpack/msgpack";
import { resolveGameRoot, resolveProjectRootFromTool } from "./modkit-config.ts";

const projectRoot = resolveProjectRootFromTool(import.meta.url);
const gameRoot = resolveGameRoot(projectRoot);
const inDir = path.join(gameRoot, "www", "save");
const outDir = path.join(projectRoot, "output", "extract", "save");

function jsonReplacer(key, value) {
  return typeof value === "bigint" ? value.toString() : value;
}

function decodeSaveText(text) {
  const raw = Buffer.from(String(text).trim(), "base64");
  const msgpackBytes = zlib.inflateSync(raw);
  return {
    msgpackBytes,
    value: decode(msgpackBytes)
  };
}

function main() {
  fs.rmSync(outDir, { recursive: true, force: true });
  fs.mkdirSync(outDir, { recursive: true });

  const index = [];
  const files = fs.readdirSync(inDir)
    .filter(name => name.toLowerCase().endsWith(".rpgsave"))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

  for (const name of files) {
    const inputPath = path.join(inDir, name);
    const text = fs.readFileSync(inputPath, "utf8");
    const { msgpackBytes, value } = decodeSaveText(text);
    const baseName = name.replace(/\.rpgsave$/i, "");

    fs.writeFileSync(path.join(outDir, `${baseName}.msgpack`), msgpackBytes);
    fs.writeFileSync(path.join(outDir, `${baseName}.json`), JSON.stringify(value, jsonReplacer, 2), "utf8");

    index.push({
      file: name,
      source: inputPath,
      payloadLength: text.trim().length,
      msgpackLength: msgpackBytes.length,
      decodedType: Object.prototype.toString.call(value),
      keys: value && typeof value === "object" ? Object.keys(value).slice(0, 30) : []
    });
  }

  fs.writeFileSync(path.join(outDir, "_index.json"), JSON.stringify(index, null, 2), "utf8");
  console.log(`Extracted ${files.length} saves to ${outDir}`);
}

main();
