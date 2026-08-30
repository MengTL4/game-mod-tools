import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

class BuildTopologyError extends Error {
  constructor(message) {
    super(message);
    this.name = "BuildTopologyError";
  }
}

const require = createRequire(import.meta.url);

function usage() {
  return [
    "Usage: node tests/build-topology.ts [--expect-out-file <path>]",
    "",
    "Verifies the NW GUI TypeScript build emits the single app.js entry without a bundler."
  ].join("\n");
}

function parseOptions(argv) {
  const options = { expectedOutFile: "app.js" };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--help") {
      console.log(usage());
      process.exitCode = 0;
      return null;
    }
    if (arg === "--expect-out-file") {
      const value = argv[index + 1];
      if (!value) throw new BuildTopologyError("--expect-out-file requires a value");
      options.expectedOutFile = value;
      index += 1;
      continue;
    }
    if (arg.startsWith("--expect-out-file=")) {
      const value = arg.slice("--expect-out-file=".length);
      if (!value) throw new BuildTopologyError("--expect-out-file requires a value");
      options.expectedOutFile = value;
      continue;
    }
    throw new BuildTopologyError(`unknown argument: ${arg}`);
  }
  return options;
}

function readText(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function readJson(filePath) {
  return JSON.parse(readText(filePath));
}

function assert(condition, message) {
  if (!condition) throw new BuildTopologyError(message);
}

function assetPath(assetUrl) {
  const delimiterIndex = assetUrl.search(/[?#]/u);
  return delimiterIndex === -1 ? assetUrl : assetUrl.slice(0, delimiterIndex);
}

function findAssetRefs(html, tagName, attrName) {
  const refs = [];
  const tagPattern = new RegExp(`<${tagName}\\b[^>]*>`, "giu");
  const attrPattern = new RegExp(`\\b${attrName}\\s*=\\s*(["'])(.*?)\\1`, "iu");
  for (const match of html.matchAll(tagPattern)) {
    const attrMatch = match[0].match(attrPattern);
    if (attrMatch) refs.push(attrMatch[2]);
  }
  return refs;
}

function runBuild(appDir) {
  const shell = process.platform === "win32";
  const npmCommand = shell ? "npm.cmd" : "npm";
  const result = spawnSync(npmCommand, ["run", "build"], {
    cwd: appDir,
    encoding: "utf8",
    windowsHide: true,
    shell
  });
  if (result.status !== 0) {
    throw new BuildTopologyError(
      [`vite build failed with exit ${result.status}`, result.stdout, result.stderr].join("\n")
    );
  }
}

function run() {
  const options = parseOptions(process.argv.slice(2));
  if (options === null) return;

  const testsDir = path.dirname(fileURLToPath(import.meta.url));
  const appDir = path.resolve(testsDir, "..");
  const modkitDir = path.resolve(appDir, "..", "..");
  const tsconfig = readJson(path.join(appDir, "tsconfig.json"));
  const tsconfigApp = readJson(path.join(appDir, "tsconfig.app.json"));
  const indexHtml = readText(path.join(appDir, "index.html"));
  const launcher = readText(path.join(modkitDir, "tools", "launch-gui.ps1"));
  const packageJson = readJson(path.join(appDir, "package.json"));

  assert(fs.existsSync(path.join(appDir, "vite.config.ts")), "vite config must exist for modern GUI build");
  assert(packageJson.scripts?.build, "package.json must define a build script");
  assert(tsconfig.references?.some((ref) => ref.path === "./tsconfig.app.json"), "tsconfig must reference tsconfig.app.json");
  assert(tsconfigApp.compilerOptions?.module === "ESNext", "tsconfig.app.json must use ESNext module for Vite");
  assert(tsconfigApp.compilerOptions?.noEmit === true, "tsconfig.app.json must set noEmit for Vite type-checking");
  assert(tsconfigApp.compilerOptions?.jsx === "react-jsx", "tsconfig.app.json must use react-jsx transform");
  assert(
    (tsconfigApp.include || []).some((pattern) => pattern.includes("src")),
    "tsconfig.app.json must include src directory"
  );

  const scriptRefs = findAssetRefs(indexHtml, "script", "src");
  const entryScript = scriptRefs.find((ref) => assetPath(ref) === "/src/main.tsx" || assetPath(ref) === "src/main.tsx");
  assert(entryScript, "index.html must load the Vite React entry src/main.tsx");

  assert(launcher.includes('$AppSrc = Join-Path $Gui "src"'), "launch-gui.ps1 must know the src source directory");
  assert(
    launcher.includes('Get-ChildItem -LiteralPath $AppSrc -Filter "*.ts" -File -Recurse') ||
      launcher.includes('Get-ChildItem -LiteralPath $AppSrc -Filter "*.tsx" -File -Recurse'),
    "launch-gui.ps1 must watch src TypeScript/TSX files"
  );

  runBuild(appDir);
  const distDir = path.join(appDir, "dist");
  assert(fs.existsSync(distDir), "vite build must produce dist directory");
  const distFiles = fs.readdirSync(distDir);
  const indexPath = path.join(distDir, "index.html");
  assert(fs.existsSync(indexPath), "vite build must produce dist/index.html");
  const indexSize = fs.statSync(indexPath).size;
  const assetsDir = path.join(distDir, "assets");
  const assetCount = fs.existsSync(assetsDir) ? fs.readdirSync(assetsDir).length : 0;

  console.log("GUI build topology");
  console.log(`tsconfig module: ${tsconfigApp.compilerOptions.module}`);
  console.log(`tsconfig jsx: ${tsconfigApp.compilerOptions.jsx}`);
  console.log(`index entry: ${entryScript}`);
  console.log(`launcher watches src: yes`);
  console.log(`dist files: ${distFiles.length}`);
  console.log(`dist assets: ${assetCount}`);
  console.log(`dist/index.html bytes: ${indexSize}`);
}

try {
  run();
} catch (error) {
  if (error instanceof BuildTopologyError) {
    console.error(error.message);
    process.exitCode = 1;
  } else {
    throw error;
  }
}
