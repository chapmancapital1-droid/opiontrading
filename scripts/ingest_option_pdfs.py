#!/usr/bin/env python3
"""
OptionScope Phase 4.2 — PDF knowledge ingest.

Scans the option-trader library, extracts text (bounded pages for large PDFs),
maps keywords → catalog categories + strategy seeds, writes:
  src/knowledge/catalog/ingested/manifest.json
  src/knowledge/catalog/ingested/entries.jsonl
  src/knowledge/catalog/ingested/strategy_seeds.json
  src/knowledge/catalog/snippets/<slug>.txt  (first-pass extracts)

Run from repo root:
  python scripts/ingest_option_pdfs.py
"""
from __future__ import annotations

import json
import re
import sys
import hashlib
from dataclasses import dataclass, asdict
from datetime import datetime, timezone
from pathlib import Path

try:
    import pdfplumber
except ImportError:
    print("pdfplumber required: pip install pdfplumber", file=sys.stderr)
    sys.exit(1)

REPO = Path(__file__).resolve().parents[1]
OUT_DIR = REPO / "src" / "knowledge" / "catalog" / "ingested"
SNIP_DIR = REPO / "src" / "knowledge" / "catalog" / "snippets"

# Primary library + extras (C + removable/data drives with trading libraries)
SOURCE_DIRS = [
    Path(r"C:\Users\Michael Chapman\Documents\Claude\Projects\option trader"),
    Path(r"C:\Users\Michael Chapman\Documents\Claude\Projects\Master Trader stocks forex and algorithms trading"),
    Path(r"C:\Users\Michael Chapman\Downloads"),
    # External drives — trading data / book libraries / Pine courses
    Path(r"G:\\"),
    Path(r"H:\Tradingview Pine Script Strategies The Complete Guide"),
    Path(r"H:\GetFreeCourses.Co-Udemy-Learn TradingView Pine Script Programming From Scratch"),
    Path(r"L:\bookLibrary"),
    Path(r"L:\docs"),
    Path(r"L:\Downloads"),
]

# Skip non-option giants / noise by name or path
SKIP_NAME = re.compile(
    r"(porn|setup\.exe|ninjatrader|battle\.net|discord|zip$|rar$|"
    r"windows\s*11|office\s*ltsc|kms\s*vl|simgolf|pc-engine|veggie|"
    r"martial\s*arts|cartoon|unicorn\s*team|real\s*estate|"
    r"\\eve\\|find your niche)",
    re.I,
)

# Max pages to read per PDF (full small books; cap large ones)
def max_pages_for(size_bytes: int) -> int:
    if size_bytes < 2_000_000:
        return 80
    if size_bytes < 6_000_000:
        return 50
    if size_bytes < 15_000_000:
        return 35
    return 25


# Keyword → (category, subsection, strategy hints)
KEYWORD_MAP: list[tuple[str, str, str, list[str]]] = [
    # (keyword, category, subsection, strategyId hints)
    ("black-scholes", "Core Foundations", "Black-Scholes Formula & Assumptions", []),
    ("black scholes", "Core Foundations", "Black-Scholes Formula & Assumptions", []),
    ("put-call parity", "Core Foundations", "Put-Call Parity", []),
    ("put call parity", "Core Foundations", "Put-Call Parity", []),
    ("implied volatility", "Risk Management", "Implied Volatility & Rank", ["iron_condor", "bull_put_credit", "cash_secured_put"]),
    ("iv rank", "Risk Management", "Implied Volatility & Rank", ["iron_condor", "bull_put_credit"]),
    ("historical volatility", "Risk Management", "Volatility Surface", []),
    ("volatility smile", "Risk Management", "Volatility Surface", []),
    ("delta hedging", "Trading Strategies", "Hedging Strategies", ["long_put", "covered_call"]),
    ("delta", "Core Foundations", "Option Greeks & Hedging", []),
    ("gamma", "Core Foundations", "Option Greeks & Hedging", []),
    ("theta", "Core Foundations", "Option Greeks & Hedging", ["bull_put_credit", "iron_condor", "covered_call"]),
    ("vega", "Core Foundations", "Option Greeks & Hedging", ["long_straddle", "iron_condor"]),
    ("monte carlo", "Numerical Methods", "Monte Carlo Simulation", []),
    ("binomial", "Numerical Methods", "Binomial/Lattice Methods", []),
    ("american option", "Risk Management", "Early Exercise & American Options", []),
    ("early exercise", "Risk Management", "Early Exercise & American Options", ["covered_call"]),
    ("assignment", "Risk Management", "Assignment & Pin Risk", ["cash_secured_put", "covered_call", "bull_put_credit"]),
    ("cash-secured put", "Trading Strategies", "Cash-Secured Put / Wheel", ["cash_secured_put"]),
    ("cash secured put", "Trading Strategies", "Cash-Secured Put / Wheel", ["cash_secured_put"]),
    ("covered call", "Trading Strategies", "Covered Call / Wheel", ["covered_call"]),
    ("buy-write", "Trading Strategies", "Covered Call / Wheel", ["covered_call"]),
    ("the wheel", "Trading Strategies", "Cash-Secured Put / Wheel", ["cash_secured_put", "covered_call"]),
    ("iron condor", "Trading Strategies", "Iron Condor & Butterflies", ["iron_condor"]),
    ("iron butterfly", "Trading Strategies", "Iron Condor & Butterflies", ["iron_butterfly"]),
    ("butterfly", "Trading Strategies", "Iron Condor & Butterflies", ["call_butterfly", "put_butterfly"]),
    ("bull call", "Trading Strategies", "Vertical Spreads", ["bull_call_debit"]),
    ("bear put", "Trading Strategies", "Vertical Spreads", ["bear_put_debit"]),
    ("credit spread", "Trading Strategies", "Vertical Spreads", ["bull_put_credit", "bear_call_credit"]),
    ("debit spread", "Trading Strategies", "Vertical Spreads", ["bull_call_debit", "bear_put_debit"]),
    ("put credit", "Trading Strategies", "Vertical Spreads", ["bull_put_credit"]),
    ("call credit", "Trading Strategies", "Vertical Spreads", ["bear_call_credit"]),
    ("straddle", "Trading Strategies", "Straddle & Strangle", ["long_straddle"]),
    ("strangle", "Trading Strategies", "Straddle & Strangle", ["long_strangle"]),
    ("collar", "Trading Strategies", "Protective Strategies", ["long_put"]),
    ("protective put", "Trading Strategies", "Protective Strategies", ["long_put"]),
    ("married put", "Trading Strategies", "Protective Strategies", ["long_put"]),
    ("probability of profit", "Risk Management", "Probability & Expected Value", []),
    ("break-even", "Risk Management", "Probability & Expected Value", []),
    ("breakeven", "Risk Management", "Probability & Expected Value", []),
    ("position sizing", "Risk Management", "Position Sizing & VaR", []),
    ("risk management", "Risk Management", "Position Sizing & VaR", []),
    ("maximum loss", "Risk Management", "Position Sizing & VaR", []),
    ("margin requirement", "Risk Management", "Collateral & Margin", ["cash_secured_put"]),
    ("collateral", "Risk Management", "Collateral & Margin", ["cash_secured_put", "bull_put_credit"]),
    ("earnings", "Risk Management", "Events & Earnings", ["long_straddle", "iron_condor"]),
    ("ex-dividend", "Risk Management", "Events & Earnings", ["covered_call"]),
    ("roll the position", "Trading Strategies", "Adjustments & Rolling", ["cash_secured_put", "covered_call"]),
    ("rolling", "Trading Strategies", "Adjustments & Rolling", ["covered_call", "bull_put_credit"]),
    ("adjust the trade", "Trading Strategies", "Adjustments & Rolling", []),
    ("defined risk", "Risk Management", "Defined vs Undefined Risk", ["bull_put_credit", "iron_condor"]),
    ("unlimited risk", "Risk Management", "Defined vs Undefined Risk", []),
    ("naked call", "Risk Management", "Defined vs Undefined Risk", []),
    ("naked put", "Risk Management", "Defined vs Undefined Risk", ["cash_secured_put"]),
    ("robinhood", "Python & Automation", "Broker Workflow", []),
    ("order ticket", "Python & Automation", "Broker Workflow", []),
]


@dataclass
class KnowledgeEntry:
    source_file: str
    source_title: str
    category: str
    subsection: str
    keyword: str
    snippet: str
    strategy_hints: list[str]
    page: int | None
    timestamp: str


def slugify(name: str) -> str:
    s = re.sub(r"[^\w\s-]", "", name.lower())
    s = re.sub(r"[-\s]+", "_", s).strip("_")
    return s[:80] or "book"


def find_pdfs() -> list[Path]:
    found: list[Path] = []
    for root in SOURCE_DIRS:
        if not root.exists():
            continue
        for p in root.rglob("*.pdf"):
            if SKIP_NAME.search(p.name):
                continue
            # Prefer option-ish names under Master Trader / Downloads
            if "option trader" in str(p).lower():
                found.append(p)
            elif re.search(r"option|Option|OPTIONS|wheel|spread|delta|Black.?Scholes|volatility", p.name):
                found.append(p)
            elif "Master Trader" in str(p) and re.search(r"option|Option|trading|Trading", p.name):
                found.append(p)
    # de-dupe by name+size
    uniq: dict[tuple[str, int], Path] = {}
    for p in found:
        try:
            uniq[(p.name.lower(), p.stat().st_size)] = p
        except OSError:
            continue
    return sorted(uniq.values(), key=lambda x: x.name.lower())


def extract_pages(pdf_path: Path, max_pages: int) -> list[tuple[int, str]]:
    pages: list[tuple[int, str]] = []
    try:
        with pdfplumber.open(pdf_path) as pdf:
            n = min(len(pdf.pages), max_pages)
            for i in range(n):
                try:
                    t = pdf.pages[i].extract_text() or ""
                except Exception:
                    t = ""
                if t.strip():
                    pages.append((i + 1, t))
    except Exception as e:
        print(f"  FAIL open {pdf_path.name}: {e}")
    return pages


def snippets_around(text: str, keyword: str, window: int = 220) -> list[str]:
    out: list[str] = []
    low = text.lower()
    key = keyword.lower()
    start = 0
    while True:
        idx = low.find(key, start)
        if idx < 0:
            break
        a = max(0, idx - window)
        b = min(len(text), idx + len(keyword) + window)
        snip = re.sub(r"\s+", " ", text[a:b]).strip()
        if len(snip) > 40:
            out.append(snip)
        start = idx + len(keyword)
        if len(out) >= 3:
            break
    return out


def strategy_seed_from_hits(
    title: str,
    path: str,
    strategy_hits: dict[str, int],
    keyword_hits: dict[str, int],
) -> list[dict]:
    """Build draft rule seeds from which strategy structures a book mentions most."""
    seeds: list[dict] = []
    if not strategy_hits:
        return seeds

    # Map strategyId → template
    templates = {
        "cash_secured_put": {
            "id_suffix": "csp",
            "name": "Cash-Secured Put",
            "strategyId": "cash_secured_put",
            "thesis": "moderately_bullish",
            "portfolioRole": "income_engine",
            "riskProfile": "substantial_downside_capped_upside",
            "approval": "level2_basic",
            "ivConditions": ["elevated", "neutral"],
            "trends": ["up", "sideways"],
            "eventStance": "avoid_earnings",
            "growthPrimary": True,
            "priority": 0.9,
            "shortDeltaTarget": 0.25,
            "dteMin": 21,
            "dteMax": 45,
            "exitRules": ["profit_50pct_max", "assignment_then_cc", "dte_21_close_or_roll"],
        },
        "covered_call": {
            "id_suffix": "cc",
            "name": "Covered Call",
            "strategyId": "covered_call",
            "thesis": "neutral",
            "portfolioRole": "campaign",
            "riskProfile": "substantial_downside_capped_upside",
            "approval": "level2_basic",
            "ivConditions": ["elevated", "neutral"],
            "trends": ["up", "sideways", "down"],
            "eventStance": "avoid_ex_div",
            "growthPrimary": True,
            "priority": 0.88,
            "shortDeltaTarget": 0.30,
            "dteMin": 21,
            "dteMax": 45,
            "exitRules": ["profit_50pct_max", "dte_21_close_or_roll", "manual_review"],
        },
        "bull_put_credit": {
            "id_suffix": "bpc",
            "name": "Bull Put Credit Spread",
            "strategyId": "bull_put_credit",
            "thesis": "moderately_bullish",
            "portfolioRole": "income_engine",
            "riskProfile": "defined",
            "approval": "level3_spreads",
            "ivConditions": ["elevated", "neutral"],
            "trends": ["up", "sideways"],
            "eventStance": "avoid_earnings",
            "growthPrimary": True,
            "priority": 0.87,
            "shortDeltaTarget": 0.30,
            "dteMin": 21,
            "dteMax": 45,
            "exitRules": ["profit_50pct_max", "stop_2x_credit", "dte_21_close_or_roll"],
        },
        "bear_call_credit": {
            "id_suffix": "bcc",
            "name": "Bear Call Credit Spread",
            "strategyId": "bear_call_credit",
            "thesis": "moderately_bearish",
            "portfolioRole": "income_engine",
            "riskProfile": "defined",
            "approval": "level3_spreads",
            "ivConditions": ["elevated", "neutral"],
            "trends": ["down", "sideways"],
            "eventStance": "avoid_earnings",
            "growthPrimary": True,
            "priority": 0.84,
            "shortDeltaTarget": 0.30,
            "dteMin": 21,
            "dteMax": 45,
            "exitRules": ["profit_50pct_max", "stop_2x_credit", "dte_21_close_or_roll"],
        },
        "iron_condor": {
            "id_suffix": "ic",
            "name": "Iron Condor",
            "strategyId": "iron_condor",
            "thesis": "range",
            "portfolioRole": "income_engine",
            "riskProfile": "defined",
            "approval": "level3_spreads",
            "ivConditions": ["elevated"],
            "trends": ["sideways"],
            "eventStance": "avoid_earnings",
            "growthPrimary": False,
            "priority": 0.8,
            "shortDeltaTarget": 0.16,
            "dteMin": 25,
            "dteMax": 45,
            "exitRules": ["profit_50pct_max", "stop_2x_credit", "dte_21_close_or_roll"],
        },
        "bull_call_debit": {
            "id_suffix": "bcd",
            "name": "Bull Call Debit Spread",
            "strategyId": "bull_call_debit",
            "thesis": "bullish",
            "portfolioRole": "growth_tactical",
            "riskProfile": "defined",
            "approval": "level3_spreads",
            "ivConditions": ["low", "neutral"],
            "trends": ["up"],
            "eventStance": "prefer_clear",
            "growthPrimary": False,
            "priority": 0.7,
            "shortDeltaTarget": None,
            "dteMin": 21,
            "dteMax": 60,
            "exitRules": ["profit_50pct_max", "stop_1x_debit", "manual_review"],
        },
        "bear_put_debit": {
            "id_suffix": "bpd",
            "name": "Bear Put Debit Spread",
            "strategyId": "bear_put_debit",
            "thesis": "bearish",
            "portfolioRole": "growth_tactical",
            "riskProfile": "defined",
            "approval": "level3_spreads",
            "ivConditions": ["low", "neutral"],
            "trends": ["down"],
            "eventStance": "prefer_clear",
            "growthPrimary": False,
            "priority": 0.68,
            "shortDeltaTarget": None,
            "dteMin": 21,
            "dteMax": 60,
            "exitRules": ["profit_50pct_max", "stop_1x_debit", "manual_review"],
        },
        "long_put": {
            "id_suffix": "lp",
            "name": "Long / Protective Put",
            "strategyId": "long_put",
            "thesis": "bearish",
            "portfolioRole": "hedge",
            "riskProfile": "defined",
            "approval": "level2_basic",
            "ivConditions": ["low", "neutral"],
            "trends": ["down", "sideways"],
            "eventStance": "ok_through_events",
            "growthPrimary": False,
            "priority": 0.55,
            "shortDeltaTarget": None,
            "dteMin": 21,
            "dteMax": 90,
            "exitRules": ["manual_review", "profit_50pct_max"],
        },
        "long_straddle": {
            "id_suffix": "ls",
            "name": "Long Straddle",
            "strategyId": "long_straddle",
            "thesis": "large-move",
            "portfolioRole": "growth_tactical",
            "riskProfile": "defined",
            "approval": "level3_spreads",
            "ivConditions": ["low"],
            "trends": ["sideways"],
            "eventStance": "ok_through_events",
            "growthPrimary": False,
            "priority": 0.4,
            "shortDeltaTarget": None,
            "dteMin": 7,
            "dteMax": 45,
            "exitRules": ["manual_review", "profit_50pct_max"],
        },
        "long_strangle": {
            "id_suffix": "lsg",
            "name": "Long Strangle",
            "strategyId": "long_strangle",
            "thesis": "large-move",
            "portfolioRole": "growth_tactical",
            "riskProfile": "defined",
            "approval": "level3_spreads",
            "ivConditions": ["low"],
            "trends": ["sideways"],
            "eventStance": "ok_through_events",
            "growthPrimary": False,
            "priority": 0.38,
            "shortDeltaTarget": None,
            "dteMin": 7,
            "dteMax": 45,
            "exitRules": ["manual_review", "profit_50pct_max"],
        },
        "iron_butterfly": {
            "id_suffix": "ib",
            "name": "Iron Butterfly",
            "strategyId": "iron_butterfly",
            "thesis": "range",
            "portfolioRole": "income_engine",
            "riskProfile": "defined",
            "approval": "level3_spreads",
            "ivConditions": ["elevated"],
            "trends": ["sideways"],
            "eventStance": "avoid_earnings",
            "growthPrimary": False,
            "priority": 0.75,
            "shortDeltaTarget": 0.5,
            "dteMin": 21,
            "dteMax": 45,
            "exitRules": ["profit_50pct_max", "dte_21_close_or_roll", "stop_2x_credit"],
        },
        "call_butterfly": {
            "id_suffix": "cbf",
            "name": "Call Butterfly",
            "strategyId": "call_butterfly",
            "thesis": "neutral",
            "portfolioRole": "growth_tactical",
            "riskProfile": "defined",
            "approval": "level3_spreads",
            "ivConditions": ["neutral", "elevated"],
            "trends": ["sideways"],
            "eventStance": "prefer_clear",
            "growthPrimary": False,
            "priority": 0.6,
            "shortDeltaTarget": None,
            "dteMin": 21,
            "dteMax": 45,
            "exitRules": ["profit_50pct_max", "manual_review"],
        },
        "put_butterfly": {
            "id_suffix": "pbf",
            "name": "Put Butterfly",
            "strategyId": "put_butterfly",
            "thesis": "neutral",
            "portfolioRole": "growth_tactical",
            "riskProfile": "defined",
            "approval": "level3_spreads",
            "ivConditions": ["neutral", "elevated"],
            "trends": ["sideways"],
            "eventStance": "prefer_clear",
            "growthPrimary": False,
            "priority": 0.58,
            "shortDeltaTarget": None,
            "dteMin": 21,
            "dteMax": 45,
            "exitRules": ["profit_50pct_max", "manual_review"],
        },
    }

    top = sorted(strategy_hits.items(), key=lambda x: -x[1])[:6]
    book_slug = slugify(title)[:40]
    iv_focus = keyword_hits.get("implied volatility", 0) + keyword_hits.get("iv rank", 0)
    risk_focus = keyword_hits.get("risk management", 0) + keyword_hits.get("position sizing", 0)

    for sid, count in top:
        tmpl = templates.get(sid)
        if not tmpl:
            continue
        entry_rules = [
            f"Distilled from book mentions (hit_weight={count}) in: {title}",
            "Verify strikes, liquidity, and max loss in OptionScope before Robinhood entry",
        ]
        if iv_focus and sid in ("iron_condor", "bull_put_credit", "bear_call_credit", "cash_secured_put", "covered_call"):
            entry_rules.append("Book emphasizes volatility — prefer elevated IV when selling premium")
        if risk_focus:
            entry_rules.append("Book emphasizes risk management — size with portfolio 1% rule")
        if keyword_hits.get("assignment", 0) and sid in ("cash_secured_put", "covered_call"):
            entry_rules.append("Plan for assignment / early exercise near ex-div or deep ITM")

        seeds.append(
            {
                **tmpl,
                "id": f"ingest_{book_slug}_{tmpl['id_suffix']}",
                "name": f"{tmpl['name']} — {title[:48]}",
                "minLiquidity": "normal",
                "newsBias": "any",
                "entryRules": entry_rules,
                "bookSource": f"{title} [{path}]",
                "structure": tmpl["name"],
                "notes": [
                    f"Auto-ingested seed from PDF keyword map; weight={count}",
                    "Educational — not investment advice",
                ],
                "hitWeight": count,
            }
        )
    return seeds


def main() -> int:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    SNIP_DIR.mkdir(parents=True, exist_ok=True)

    pdfs = find_pdfs()
    print(f"Found {len(pdfs)} PDFs to ingest")
    ts = datetime.now(timezone.utc).isoformat()

    entries: list[KnowledgeEntry] = []
    manifest_books: list[dict] = []
    all_seeds: list[dict] = []
    category_counts: dict[str, int] = {}

    for i, pdf in enumerate(pdfs, 1):
        size = pdf.stat().st_size
        max_p = max_pages_for(size)
        print(f"[{i}/{len(pdfs)}] {pdf.name} ({size//1024}KB, max_pages={max_p})")
        pages = extract_pages(pdf, max_p)
        if not pages:
            manifest_books.append(
                {
                    "title": pdf.stem,
                    "path": str(pdf),
                    "bytes": size,
                    "pages_read": 0,
                    "status": "no_text",
                    "entries": 0,
                }
            )
            continue

        full_text = "\n".join(t for _, t in pages)
        # write snippet sample
        snip_path = SNIP_DIR / f"{slugify(pdf.stem)}.txt"
        snip_path.write_text(full_text[:12000], encoding="utf-8", errors="replace")

        strategy_hits: dict[str, int] = {}
        keyword_hits: dict[str, int] = {}
        book_entries = 0

        for page_no, text in pages:
            for keyword, cat, sub, hints in KEYWORD_MAP:
                if keyword.lower() not in text.lower():
                    continue
                keyword_hits[keyword] = keyword_hits.get(keyword, 0) + 1
                for h in hints:
                    strategy_hits[h] = strategy_hits.get(h, 0) + 1
                for snip in snippets_around(text, keyword):
                    entries.append(
                        KnowledgeEntry(
                            source_file=str(pdf),
                            source_title=pdf.stem,
                            category=cat,
                            subsection=sub,
                            keyword=keyword,
                            snippet=snip,
                            strategy_hints=hints,
                            page=page_no,
                            timestamp=ts,
                        )
                    )
                    book_entries += 1
                    category_counts[cat] = category_counts.get(cat, 0) + 1
                    # cap per keyword per page already via snippets_around
                # don't explode: max entries per book handled later

        # cap entries per book to top unique snippets
        # (already streaming; global dedupe later)

        seeds = strategy_seed_from_hits(pdf.stem, str(pdf), strategy_hits, keyword_hits)
        all_seeds.extend(seeds)

        manifest_books.append(
            {
                "title": pdf.stem,
                "path": str(pdf),
                "bytes": size,
                "pages_read": len(pages),
                "status": "ok",
                "entries": book_entries,
                "top_keywords": sorted(keyword_hits.items(), key=lambda x: -x[1])[:12],
                "strategy_hits": sorted(strategy_hits.items(), key=lambda x: -x[1])[:10],
                "seed_count": len(seeds),
                "snippet_file": str(snip_path.relative_to(REPO)),
            }
        )
        print(f"    pages={len(pages)} entries+={book_entries} seeds={len(seeds)}")

    # Dedupe entries by hash of snippet+keyword+title
    seen: set[str] = set()
    unique_entries: list[dict] = []
    for e in entries:
        h = hashlib.sha1(f"{e.source_title}|{e.keyword}|{e.snippet[:120]}".encode()).hexdigest()
        if h in seen:
            continue
        seen.add(h)
        unique_entries.append(asdict(e))

    # Cap total entries for catalog size (keep highest diversity)
    if len(unique_entries) > 4000:
        unique_entries = unique_entries[:4000]

    # Dedupe seeds by id (keep highest hitWeight)
    seed_map: dict[str, dict] = {}
    for s in all_seeds:
        prev = seed_map.get(s["id"])
        if prev is None or s.get("hitWeight", 0) > prev.get("hitWeight", 0):
            seed_map[s["id"]] = s
    unique_seeds = sorted(seed_map.values(), key=lambda x: (-x.get("hitWeight", 0), x["id"]))

    # Also merge seeds by strategyId — keep top 2 books per strategy for TS export
    by_sid: dict[str, list[dict]] = {}
    for s in unique_seeds:
        by_sid.setdefault(s["strategyId"], []).append(s)
    export_seeds: list[dict] = []
    for sid, lst in by_sid.items():
        lst_sorted = sorted(lst, key=lambda x: -x.get("hitWeight", 0))
        export_seeds.extend(lst_sorted[:3])  # top 3 books per strategy
    export_seeds = sorted(export_seeds, key=lambda x: (-x.get("priority", 0), -x.get("hitWeight", 0)))

    # Write outputs
    entries_path = OUT_DIR / "entries.jsonl"
    with entries_path.open("w", encoding="utf-8") as f:
        for e in unique_entries:
            f.write(json.dumps(e, ensure_ascii=False) + "\n")

    seeds_path = OUT_DIR / "strategy_seeds.json"
    seeds_path.write_text(json.dumps(export_seeds, indent=2, ensure_ascii=False), encoding="utf-8")

    all_seeds_path = OUT_DIR / "strategy_seeds_all.json"
    all_seeds_path.write_text(json.dumps(unique_seeds, indent=2, ensure_ascii=False), encoding="utf-8")

    # Hierarchical catalog for OTA-style brain
    catalog: dict = {
        "Core Foundations": {},
        "Numerical Methods": {},
        "Trading Strategies": {},
        "Risk Management": {},
        "Python & Automation": {},
        "ML/AI Integration": {},
        "Data Pipelines": {},
        "Edge Cases": {},
        "Source References": [],
    }
    for e in unique_entries:
        cat = e["category"]
        sub = e["subsection"]
        if cat not in catalog:
            catalog[cat] = {}
        if not isinstance(catalog[cat], dict):
            continue
        catalog[cat].setdefault(sub, [])
        if len(catalog[cat][sub]) < 8:
            catalog[cat][sub].append(
                {
                    "snippet": e["snippet"],
                    "source": e["source_title"],
                    "page": e["page"],
                    "keyword": e["keyword"],
                }
            )
    catalog["Source References"] = [
        {"title": b["title"], "path": b["path"], "status": b["status"], "entries": b["entries"]}
        for b in manifest_books
    ]

    catalog_path = OUT_DIR / "ota_knowledge_catalog.json"
    catalog_path.write_text(json.dumps(catalog, indent=2, ensure_ascii=False), encoding="utf-8")

    manifest = {
        "version": "1.0.0",
        "ingestedAt": ts,
        "pdfCount": len(pdfs),
        "booksOk": sum(1 for b in manifest_books if b["status"] == "ok"),
        "booksFailed": sum(1 for b in manifest_books if b["status"] != "ok"),
        "entryCount": len(unique_entries),
        "seedCountExport": len(export_seeds),
        "seedCountAll": len(unique_seeds),
        "categoryCounts": category_counts,
        "books": manifest_books,
        "outputs": {
            "entries": str(entries_path.relative_to(REPO)),
            "seeds": str(seeds_path.relative_to(REPO)),
            "seedsAll": str(all_seeds_path.relative_to(REPO)),
            "catalog": str(catalog_path.relative_to(REPO)),
            "snippetsDir": str(SNIP_DIR.relative_to(REPO)),
        },
    }
    (OUT_DIR / "manifest.json").write_text(json.dumps(manifest, indent=2, ensure_ascii=False), encoding="utf-8")

    print("\n=== INGEST COMPLETE ===")
    print(f"Books OK: {manifest['booksOk']}/{manifest['pdfCount']}")
    print(f"Entries: {manifest['entryCount']}")
    print(f"Export seeds: {manifest['seedCountExport']}")
    print(f"Catalog: {catalog_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
