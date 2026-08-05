#!/usr/bin/env node
// Publish helper for the `posts` GitHub Pages repo.
//
//   npm run publish                         -> stage everything, commit, push
//   npm run publish ~/Downloads/thing.md    -> copy file(s) into the repo, then publish
//   npm run publish a.md b.zip -m "message" -> copy files + custom commit message
//
// Anything not preceded by -m is treated as a file to copy into the repo root.
import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync, statSync } from "node:fs";
import { basename, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const run = (cmd, args) =>
  execFileSync(cmd, args, { cwd: repoRoot, stdio: "inherit" });

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

// --- stage, commit, push ----------------------------------------------------
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
