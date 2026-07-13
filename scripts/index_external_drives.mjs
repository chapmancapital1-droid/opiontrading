/**
 * Index trading-relevant assets on G: / H: / L: into
 * src/knowledge/catalog/external/driveInventory.json
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(__dirname, "..");
const OUT = path.join(REPO, "src/knowledge/catalog/external/driveInventory.json");

const ROOTS = [
  { drive: "G", path: "G:\\", role: "NCI brain memory + codebase graph" },
  { drive: "H", path: "H:\\", role: "Pine Script courses + strategy guides" },
  { drive: "L", path: "L:\\bookLibrary", role: "Trading book library + options courses + EAs" },
  { drive: "L", path: "L:\\", role: "Misc (Tradingplan1.docx, dumps)" },
];

const INTEREST =
  /trad|option|forex|pine|nci|brain|stock|market|spread|wheel|volatility|robinhood|spy|macd|scalp/i;
const SKIP =
  /\\porn\\|\\windows 11|office ltsc|martial arts|cartoon|simgolf|pc-engine|\\eve\\|find your niche/i;

function walk(dir, depth, maxDepth, acc) {
  if (depth > maxDepth) return;
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const ent of entries) {
    const full = path.join(dir, ent.name);
    if (SKIP.test(full)) continue;
    if (ent.isDirectory()) {
      if (INTEREST.test(ent.name) || depth < 2) {
        walk(full, depth + 1, maxDepth, acc);
      }
      continue;
    }
    const ext = path.extname(ent.name).toLowerCase();
    if (![".pdf", ".txt", ".pine", ".md", ".csv", ".json", ".docx", ".xlsx", ".mq4", ".ex4"].includes(ext)) {
      continue;
    }
    if (!INTEREST.test(ent.name) && !INTEREST.test(dir)) continue;
    let size = 0;
    try {
      size = fs.statSync(full).size;
    } catch {
      continue;
    }
    acc.push({
      path: full,
      name: ent.name,
      ext,
      size,
      drive: full.slice(0, 1).toUpperCase(),
    });
  }
}

const files = [];
for (const r of ROOTS) {
  if (!fs.existsSync(r.path)) {
    console.log("missing", r.path);
    continue;
  }
  console.log("walk", r.path);
  walk(r.path, 0, r.path === "G:\\" ? 3 : 5, files);
}

// de-dupe
const map = new Map();
for (const f of files) map.set(f.path.toLowerCase(), f);
const unique = [...map.values()].sort((a, b) => a.path.localeCompare(b.path));

const byDrive = { G: [], H: [], L: [] };
for (const f of unique) {
  if (byDrive[f.drive]) byDrive[f.drive].push(f);
}

const inventory = {
  version: "1.0.0",
  indexedAt: new Date().toISOString(),
  roots: ROOTS,
  totals: {
    files: unique.length,
    g: byDrive.G.length,
    h: byDrive.H.length,
    l: byDrive.L.length,
    bytes: unique.reduce((s, f) => s + f.size, 0),
  },
  highlights: {
    g: [
      "G:\\NCI_Brain_CLAUDE.md — NCI operational brain (Forex v3.1 ports, risk, TP ladder)",
      "G:\\codebase-memory-data\\D-NERDCOMMANDCLAUDEBRAIN.db — graph DB (~183MB)",
    ],
    h: [
      "H:\\Tradingview Pine Script Strategies The Complete Guide — full course + strategy .txt sources",
      "H:\\GetFreeCourses.Co-Udemy-Learn TradingView Pine Script Programming From Scratch",
    ],
    l: [
      "L:\\bookLibrary — options courses, forex book pack, EA manuals, TA mastery",
      "L:\\bookLibrary\\The Advanced Options Trading Course Updated 2022",
      "L:\\bookLibrary\\Options Trading MasterClass Options With Technical Analysis",
      "L:\\bookLibrary\\The-Overnight-SPY-Trader-Strategy-Guide-PDF.pdf",
      "L:\\Tradingplan1.docx",
    ],
  },
  files: unique,
};

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(inventory, null, 2));
console.log("Wrote", OUT);
console.log(inventory.totals);
