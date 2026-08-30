import path from "node:path";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function read(relativePath) {
  return readFileSync(path.join(projectRoot, relativePath), "utf8");
}

function render(relativePath, stack = []) {
  if (stack.includes(relativePath)) {
    throw new Error(`Recursive HTML include: ${[...stack, relativePath].join(" -> ")}`);
  }
  const source = read(relativePath);
  return source.replace(/^[ \t]*<!--\s*@include\s+(.+?)\s*-->\s*$/gm, (_match, includePath) => {
    const nextPath = path.posix.join(path.posix.dirname(relativePath), includePath.trim());
    return render(nextPath, [...stack, relativePath]).trimEnd();
  });
}

const html = render("app/gui/index.template.html").trimEnd() + "\n";
writeFileSync(path.join(projectRoot, "app", "gui", "index.html"), html, "utf8");
