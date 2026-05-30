import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import zlib from "node:zlib";
import { decode, encode } from "@msgpack/msgpack";

const toolDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(toolDir, "..");

function parseArgs(argv) {
  const options = {
    inputDir: path.join(projectRoot, "output", "extract", "save"),
    outputDir: path.join(projectRoot, "output", "repack", "save"),
    ids: null,
    includeConfig: true
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--input") options.inputDir = path.resolve(argv[++i]);
    else if (arg === "--output") options.outputDir = path.resolve(argv[++i]);
    else if (arg === "--ids") options.ids = argv[++i].split(",").map(x => Number(x.trim())).filter(Number.isFinite);
    else if (arg === "--no-config") options.includeConfig = false;
    else if (!arg.startsWith("--") && !options._posInput) {
      options.inputDir = path.resolve(arg);
      options._posInput = true;
    } else if (!arg.startsWith("--") && !options._posOutput) {
      options.outputDir = path.resolve(arg);
      options._posOutput = true;
    } else {
      throw new Error(`unknown argument: ${arg}`);
    }
  }
  return options;
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function stableJson(value) {
  return JSON.stringify(value, (key, val) => typeof val === "bigint" ? val.toString() : val);
}

function packSave(value) {
  const msgpackBytes = Buffer.from(encode(value));
  const text = zlib.deflateSync(msgpackBytes).toString("base64");
  return { text, msgpackBytes };
}

function unpackSave(text) {
  const raw = Buffer.from(String(text).trim(), "base64");
  return decode(zlib.inflateSync(raw));
}

function saveBaseName(savefileId) {
  return Number(savefileId) === 0 ? "global" : `file${savefileId}`;
}

function writeSaveJson(inputPath, outputPath, label) {
  const value = readJson(inputPath);
  const { text, msgpackBytes } = packSave(value);
  fs.writeFileSync(outputPath, text, "utf8");
  const roundTrip = unpackSave(text);
  return {
    name: path.basename(outputPath),
    source: inputPath,
    output: outputPath,
    format: "base64+zlib+msgpack",
    label,
    msgpackLength: msgpackBytes.length,
    outputLength: text.length,
    verified: stableJson(roundTrip) === stableJson(value)
  };
}

function discoverInputs(options) {
  const entries = [];

  if (options.includeConfig) {
    const configPath = path.join(options.inputDir, "config.json");
    if (fs.existsSync(configPath)) {
      entries.push({
        input: configPath,
        outputName: "config.rpgsave",
        label: "config"
      });
    }
  }

  const saveEntries = [];
  if (Array.isArray(options.ids)) {
    for (const id of options.ids) {
      const baseName = saveBaseName(id);
      const input = path.join(options.inputDir, `${baseName}.json`);
      if (fs.existsSync(input)) saveEntries.push({ id, input });
    }
  } else if (fs.existsSync(options.inputDir)) {
    for (const name of fs.readdirSync(options.inputDir)) {
      const lower = name.toLowerCase();
      if (lower === "global.json") {
        saveEntries.push({ id: 0, input: path.join(options.inputDir, name) });
      } else {
        const match = lower.match(/^file(\d+)\.json$/);
        if (match) saveEntries.push({ id: Number(match[1]), input: path.join(options.inputDir, name) });
      }
    }
  }

  saveEntries
    .sort((a, b) => a.id - b.id)
    .forEach(entry => entries.push({
      input: entry.input,
      outputName: `${saveBaseName(entry.id)}.rpgsave`,
      label: String(entry.id)
    }));

  return entries;
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  fs.mkdirSync(options.outputDir, { recursive: true });

  const inputs = discoverInputs(options);
  if (inputs.length === 0) {
    throw new Error(`no save JSON files found in ${options.inputDir}`);
  }

  const results = inputs.map(entry => writeSaveJson(
    entry.input,
    path.join(options.outputDir, entry.outputName),
    entry.label
  ));

  const failures = results.filter(x => !x.verified);
  fs.writeFileSync(path.join(options.outputDir, "_repack-report.json"), JSON.stringify({
    inputDir: options.inputDir,
    outputDir: options.outputDir,
    results
  }, null, 2), "utf8");

  if (failures.length > 0) {
    throw new Error(`verification failed for: ${failures.map(x => x.name).join(", ")}`);
  }

  for (const result of results) {
    console.log(`${result.name}\t${result.outputLength}\tverified=${result.verified}`);
  }
  console.log(`Wrote ${results.length} files to ${options.outputDir}`);
}

main();
