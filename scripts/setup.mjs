/**
 * OptionScope one-command local setup.
 * Cross-platform (Windows / macOS / Linux). Safe to re-run.
 *
 * Usage (from repo root, after clone):
 *   npm run setup
 *   # or:  node scripts/setup.mjs
 *
 * What it does:
 *   1. Checks Node >= 20
 *   2. Copies .env.example → .env.local if missing (demo mode, no keys)
 *   3. Runs npm install
 *   4. Prints next steps (dev / test / build)
 */
import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

function log(msg) {
  console.log(msg);
}

function fail(msg, code = 1) {
  console.error(`\n[setup] ERROR: ${msg}\n`);
  process.exit(code);
}

function majorNodeVersion() {
  const m = process.versions.node.split(".")[0];
  return Number(m);
}

function run(cmd, args) {
  log(`\n> ${cmd} ${args.join(" ")}`);
  // Windows npm is a .cmd shim; use shell with a single command string.
  // Unix can spawn argv without shell.
  const r =
    process.platform === "win32"
      ? spawnSync(`${cmd} ${args.map((a) => (/\s/.test(a) ? `"${a}"` : a)).join(" ")}`, {
          cwd: root,
          stdio: "inherit",
          shell: true,
        })
      : spawnSync(cmd, args, { cwd: root, stdio: "inherit" });
  if (r.error) fail(r.error.message);
  if (r.status !== 0) fail(`Command failed with exit ${r.status}: ${cmd} ${args.join(" ")}`, r.status ?? 1);
}

// ---- banner ----
log("================================================================================");
log("  OptionScope — local setup");
log("  https://github.com/chapmancapital1-droid/opiontrading");
log("  Educational only. Not investment advice. No auto-trading.");
log("================================================================================");

// ---- Node version ----
const major = majorNodeVersion();
log(`\n[1/3] Node.js ${process.versions.node}`);
if (!Number.isFinite(major) || major < 20) {
  fail(`Node.js 20+ is required. Install from https://nodejs.org/ (you have ${process.versions.node})`);
}

// ---- package.json present ----
const pkgPath = join(root, "package.json");
if (!existsSync(pkgPath)) {
  fail("package.json not found. Run this from the repo root (folder that contains package.json).");
}
try {
  const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
  if (pkg.name !== "optionscope") {
    log(`[setup] Warning: package name is "${pkg.name}" (expected "optionscope"). Continuing.`);
  }
} catch {
  fail("Could not parse package.json");
}

// ---- .env.local ----
log("\n[2/3] Environment file");
const envExample = join(root, ".env.example");
const envLocal = join(root, ".env.local");
if (!existsSync(envExample)) {
  fail(".env.example is missing from the repo. Re-clone or restore it.");
}
if (existsSync(envLocal)) {
  log("  .env.local already exists — leaving it unchanged.");
} else {
  copyFileSync(envExample, envLocal);
  log("  Created .env.local from .env.example (demo mode; no API keys required).");
}

// ---- npm install ----
log("\n[3/3] Installing dependencies (npm install)");
run("npm", ["install"]);

// ---- done ----
log("");
log("================================================================================");
log("  Setup complete.");
log("");
log("  Run the app (demo mode — no keys):");
log("    npm run dev");
log("    open http://localhost:3000");
log("");
log("  Verify install:");
log("    npm test");
log("    npm run typecheck");
log("    # or:  npm run verify");
log("");
log("  Production-style check:");
log("    npm run build");
log("    npm start");
log("");
log("  Full guide (Alpaca, OpenBB, Supabase, troubleshooting):");
log("    install.txt");
log("");
log("  Live trading ritual (data only; you still enter orders):");
log("    GO_LIVE_TRADING.txt");
log("");
log("  Optional live market data: edit .env.local (never commit secrets).");
log("  Demo chain works with MARKET_DATA_PROVIDER=demo (default).");
log("================================================================================");
log("");
