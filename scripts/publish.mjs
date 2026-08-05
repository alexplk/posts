#!/usr/bin/env node
// Publish helper for the `posts` GitHub Pages repo.
//
//   npm run publish                         -> stage everything, commit, push
//   npm run publish ~/Downloads/thing.md    -> copy file(s) into the repo, then publish
//   npm run publish a.md b.zip -m "message" -> copy files + custom commit message
//
// Anything not preceded by -m is treated as a file to copy into the repo root.
import { execFileSync } from "node:child_process";
import {
  copyFileSync,
  existsSync,
  statSync,
  readdirSync,
  mkdirSync,
  writeFileSync,
} from "node:fs";
import { basename, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const run = (cmd, args) =>
  execFileSync(cmd, args, { cwd: repoRoot, stdio: "inherit" });

// Files that live in the repo root but aren't published content.
const HIDDEN = new Set([
  "package.json",
  "package-lock.json",
  "README.md",
  ".gitignore",
  ".nojekyll",
]);

// Regenerate ls/index.html — a plain listing of the root content files,
// served at https://alexplk.github.io/posts/ls/
function writeIndex() {
  const files = readdirSync(repoRoot)
    .filter((name) => !name.startsWith("."))
    .filter((name) => !HIDDEN.has(name))
    .filter((name) => statSync(resolve(repoRoot, name)).isFile())
    .sort((a, b) => a.localeCompare(b));

  const rows = files.length
    ? files.map((f) => `    <li><a href="../${f}">${f}</a></li>`).join("\n")
    : "    <li><em>No files yet.</em></li>";

  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>posts — index</title>
  <style>
    body { font: 16px/1.6 -apple-system, system-ui, sans-serif; max-width: 42rem; margin: 3rem auto; padding: 0 1rem; }
    h1 { font-size: 1.4rem; }
    ul { list-style: none; padding: 0; }
    li { padding: .2rem 0; }
    a { text-decoration: none; }
    a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <h1>posts</h1>
  <ul>
${rows}
  </ul>
</body>
</html>
`;
  mkdirSync(resolve(repoRoot, "ls"), { recursive: true });
  writeFileSync(resolve(repoRoot, "ls", "index.html"), html);
}

// --- parse args -------------------------------------------------------------
const argv = process.argv.slice(2);
const files = [];
let message = null;
for (let i = 0; i < argv.length; i++) {
  if (argv[i] === "-m" || argv[i] === "--message") {
    message = argv[++i];
  } else {
    files.push(argv[i]);
  }
}

// --- copy any incoming files into the repo ----------------------------------
const copied = [];
for (const f of files) {
  const src = resolve(f);
  if (!existsSync(src) || !statSync(src).isFile()) {
    console.error(`✗ not a file: ${f}`);
    process.exit(1);
  }
  const dest = resolve(repoRoot, basename(src));
  copyFileSync(src, dest);
  copied.push(basename(src));
  console.log(`+ ${basename(src)}`);
}

// --- default commit message -------------------------------------------------
if (!message) {
  const stamp = new Date().toISOString().slice(0, 16).replace("T", " ");
  message =
    copied.length > 0
      ? `Add ${copied.join(", ")} (${stamp})`
      : `Update posts (${stamp})`;
}

// --- regenerate the /ls index, then stage, commit, push ---------------------
writeIndex();
run("git", ["add", "-A"]);
try {
  execFileSync("git", ["diff", "--cached", "--quiet"], { cwd: repoRoot });
  console.log("Nothing to commit — working tree clean.");
  process.exit(0);
} catch {
  // there are staged changes; continue
}
run("git", ["commit", "-m", message]);
run("git", ["push", "origin", "main"]);

const links = copied.length ? copied : ["<your file>"];
console.log("\n✓ Published. Live shortly at:");
for (const name of links) {
  console.log(`  https://alexplk.github.io/posts/${name}`);
}
