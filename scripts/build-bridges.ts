import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

interface BuildStep {
  cwd: string;
  cmd: string;
  args: string[];
}

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const steps: BuildStep[] = [
  { cwd: path.join(root, "dq2-modkit", "runtime", "bridge"), cmd: "npm", args: ["run", "build"] },
  { cwd: path.join(root, "nwr-modkit", "runtime", "bridge"), cmd: "npm", args: ["run", "build"] },
  { cwd: path.join(root, "zs2-modkit", "tools"), cmd: "npm", args: ["run", "build-bridge"] },
  { cwd: path.join(root, "zs2-modkit", "runtime", "bridge"), cmd: "npm", args: ["run", "build"] },
];

for (const step of steps) {
  console.log(`\n> ${step.cmd} ${step.args.join(" ")} (in ${step.cwd})`);
  const result = spawnSync(step.cmd, step.args, {
    cwd: step.cwd,
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  if (result.status !== 0) {
    console.error(`Build failed in ${step.cwd}`);
    process.exit(result.status ?? 1);
  }
}

console.log("\nAll bridges built successfully.");
