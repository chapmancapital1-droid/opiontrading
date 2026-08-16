#!/usr/bin/env node
/**
 * NCI setup — run this once from the repo root:
 *
 *     node setup-nci.js
 *
 * It moves the nested build files into place, wires the Dashboard tab, adds the
 * npm scripts, and verifies the result. Safe to run more than once — every step
 * checks whether it has already been done.
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const ok = (m) => console.log(`  OK    ${m}`);
const skip = (m) => console.log(`  ...   ${m}`);
const bad = (m) => console.log(`  FAIL  ${m}`);

console.log("\nNERDCOMMAND · NCI setup\n" + "-".repeat(46));

/* -- 0. sanity: are we in the repo root? --------------------------------- */
if (!fs.existsSync("package.json") || !fs.existsSync("src")) {
  bad("Run this from the repo root (the folder with package.json and src/).");
  process.exit(1);
}

/* -- 1. find the uploaded build, however deep it nested ------------------- */
function findRunner(dir, depth = 0) {
  if (depth > 4) return null;
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return null;
  }
  for (const e of entries) {
    if (!e.isDirectory() || e.name === ".git" || e.name === "node_modules") continue;
    const p = path.join(dir, e.name);
    if (e.name === "runner" && fs.existsSync(path.join(p, "daily.ts"))) return p;
    const found = findRunner(p, depth + 1);
    if (found) return found;
  }
  return null;
}

console.log("\n[1] Moving build files into place");

if (fs.existsSync("runner/daily.ts")) {
  skip("runner/ already in place");
} else {
  const src = findRunner(".");
  if (!src) {
    bad("Could not find the runner folder. Unzip the build into the repo first.");
    process.exit(1);
  }
  fs.cpSync(src, "runner", { recursive: true });
  ok(`runner/ moved from ${src}`);
}

if (fs.existsSync("src/components/CommandBoard.tsx")) {
  skip("CommandBoard.tsx already in place");
} else {
  const hits = [];
  (function walk(d, depth = 0) {
    if (depth > 5) return;
    let es;
    try {
      es = fs.readdirSync(d, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of es) {
      if (e.name === ".git" || e.name === "node_modules") continue;
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p, depth + 1);
      else if (e.name === "CommandBoard.tsx") hits.push(p);
    }
  })(".");
  if (!hits.length) {
    bad("CommandBoard.tsx not found anywhere. Unzip the build into the repo first.");
    process.exit(1);
  }
  fs.mkdirSync("src/components", { recursive: true });
  fs.copyFileSync(hits[0], "src/components/CommandBoard.tsx");
  ok(`CommandBoard.tsx copied from ${hits[0]}`);
}

// clean up the nested upload folder if it's still lying around
for (const e of fs.readdirSync(".")) {
  if (/^nci-build-/.test(e) && fs.statSync(e).isDirectory()) {
    fs.rmSync(e, { recursive: true, force: true });
    ok(`removed leftover ${e}/`);
  }
}

/* -- 2. wire the Dashboard ----------------------------------------------- */
console.log("\n[2] Wiring the Board tab");

const dashPath = path.join("src", "app", "(app)", "Dashboard.tsx");
if (!fs.existsSync(dashPath)) {
  bad(`${dashPath} not found`);
  process.exit(1);
}
let dash = fs.readFileSync(dashPath, "utf8");
let dashChanged = false;

if (dash.includes("CommandBoard")) {
  skip("Dashboard already wired");
} else {
  const importAnchor = dash.match(/^import .*from "@\/components\/.*";$/m);
  if (!importAnchor) {
    bad("Could not find an import anchor in Dashboard.tsx");
    process.exit(1);
  }
  dash = dash.replace(
    importAnchor[0],
    `${importAnchor[0]}\nimport CommandBoard from "@/components/CommandBoard";`,
  );

  dash = dash.replace(/type TabId =\s*\n\s*\| "/, 'type TabId =\n  | "board"\n  | "');

  const tabRow = dash.match(/\{ id: "cockpit",[^\n]*\n/);
  if (tabRow) {
    dash = dash.replace(
      tabRow[0],
      `  { id: "board", label: "Board", icon: "ti-layout-board" },\n${tabRow[0]}`,
    );
  }

  dash = dash.replace(/useState<TabId>\("cockpit"\)/, 'useState<TabId>("board")');

  const renderAnchor = dash.match(/\n(\s*)\{tab === "cockpit" && \(/);
  if (renderAnchor) {
    dash = dash.replace(
      renderAnchor[0],
      `\n${renderAnchor[1]}{tab === "board" && <CommandBoard />}\n${renderAnchor[0].slice(1)}`,
    );
  }

  fs.writeFileSync(dashPath, dash);
  dashChanged = true;
  ok("Dashboard.tsx wired (import, tab, default view, render)");
}

/* -- 3. npm scripts ------------------------------------------------------- */
console.log("\n[3] Adding npm scripts");

const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
pkg.scripts = pkg.scripts || {};
const scripts = {
  "runner:london": "tsx runner/daily.ts london",
  "runner:premarket": "tsx runner/daily.ts premarket",
  "runner:open": "tsx runner/daily.ts open",
  "runner:advance": "tsx runner/daily.ts advance",
  "runner:review": "tsx runner/daily.ts review",
  "runner:status": "tsx runner/daily.ts status",
  "runner:month": "node runner/month.js",
};
let added = 0;
for (const [k, v] of Object.entries(scripts)) {
  if (pkg.scripts[k] !== v) {
    pkg.scripts[k] = v;
    added++;
  }
}
if (added) {
  fs.writeFileSync("package.json", JSON.stringify(pkg, null, 2) + "\n");
  ok(`${added} script(s) added`);
} else {
  skip("scripts already present");
}

/* -- 4. gitignore --------------------------------------------------------- */
let gi = fs.existsSync(".gitignore") ? fs.readFileSync(".gitignore", "utf8") : "";
if (!gi.includes(".nci-runner")) {
  fs.writeFileSync(".gitignore", gi + "\n# NCI runner state (your trade history)\n.nci-runner/\n");
  ok(".nci-runner/ added to .gitignore");
} else {
  skip(".gitignore already set");
}

/* -- 5. month helper ------------------------------------------------------ */
const monthJs = `#!/usr/bin/env node
// Fast-forward N simulated trading days. Usage: npm run runner:month -- 20
const { execSync } = require("child_process");
const days = Number(process.argv[2] || 20);
console.log(\`Simulating \${days} trading days...\\n\`);
for (let i = 1; i <= days; i++) {
  for (const s of ["open", "advance", "review"]) {
    execSync(\`npx tsx runner/daily.ts \${s}\`, { stdio: "ignore" });
  }
  process.stdout.write(\`\\r  day \${i}/\${days}\`);
}
console.log("\\n");
execSync("npx tsx runner/daily.ts status", { stdio: "inherit" });
`;
fs.writeFileSync(path.join("runner", "month.js"), monthJs);
ok("runner/month.js created");

/* -- 6. dependency -------------------------------------------------------- */
console.log("\n[4] Installing tsx");
try {
  require.resolve("tsx/package.json", { paths: [process.cwd()] });
  skip("tsx already installed");
} catch {
  execSync("npm install -D tsx --silent", { stdio: "inherit" });
  ok("tsx installed");
}

/* -- 7. verify ------------------------------------------------------------ */
console.log("\n[5] Verifying");
let pass = true;
try {
  execSync("npx tsc --noEmit", { stdio: "pipe" });
  ok("typecheck clean");
} catch (e) {
  bad("typecheck failed:");
  console.log(String(e.stdout || e.message).slice(0, 1200));
  pass = false;
}
try {
  execSync("npx tsx runner/daily.ts status", { stdio: "pipe" });
  ok("runner starts");
} catch (e) {
  bad("runner failed to start");
  console.log(String(e.stdout || e.message).slice(0, 800));
  pass = false;
}

console.log("\n" + "-".repeat(46));
if (pass) {
  console.log(`SETUP COMPLETE${dashChanged ? "" : " (nothing left to do)"}

Next:
  npm run dev            -> localhost:3000/dashboard, Board tab
  npm run runner:status  -> baseline
  npm run runner:month -- 20   -> simulate 20 trading days

Then commit:
  git add -A && git commit -m "Add NCI runner + Command Board" && git push
`);
} else {
  console.log("\nSetup hit an error above. Paste it to me and I'll fix it.\n");
  process.exit(1);
}
