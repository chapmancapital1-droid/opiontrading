"""
Learn from Robinhood activity CSVs — reconstruct option trades, pattern wins/losses,
write lessons into the OTA brain catalog.

Default path:
  C:\\Users\\Michael Chapman\\Desktop\\NERDCOMMAND_TRADING_BRAIN\\robinhoodhistory

Usage:
  cd python
  python -m ota.rh_history_learn
  python -m ota.rh_history_learn --path "D:\\exports\\rh"
"""
from __future__ import annotations

import argparse
import csv
import json
import re
from collections import Counter, defaultdict
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from .knowledge import KnowledgeBase, KnowledgeEntry

DEFAULT_RH_PATH = Path(
    r"C:\Users\Michael Chapman\Desktop\NERDCOMMAND_TRADING_BRAIN\robinhoodhistory"
)
DATA = Path(__file__).resolve().parent / "data"

OPT_OPEN = {"BTO", "STO"}
OPT_CLOSE = {"BTC", "STC", "OEXP", "OASGN", "OEXER", "OEXCS", "OXREV"}
OPT_CODES = OPT_OPEN | OPT_CLOSE

# Description: "AAPL 1/17/2025 Call $180.00" or "MSTY1 1/21/2028 Put $14.00"
OPT_DESC_RE = re.compile(
    r"(?P<root>[A-Z][A-Z0-9.]{0,8}?)\s+"
    r"(?P<exp>\d{1,2}/\d{1,2}/\d{2,4})\s+"
    r"(?P<cp>Call|Put)\s+\$?(?P<strike>[\d.]+)",
    re.I,
)


@dataclass
class RhLeg:
    date: str
    symbol: str
    trans: str
    qty: float
    price: float  # premium per share
    amount: float  # signed cash from RH amount field when present
    exp: Optional[str]
    cp: Optional[str]  # Call|Put
    strike: Optional[float]
    desc: str
    file: str


@dataclass
class ClosedTrade:
    symbol: str
    side: str  # long_option | short_option | stock
    cp: Optional[str]
    strike: Optional[float]
    exp: Optional[str]
    open_date: str
    close_date: str
    open_trans: str
    close_trans: str
    qty: float
    open_prem: float
    close_prem: float
    pnl: float
    hold_days: Optional[int]
    notes: List[str] = field(default_factory=list)

    @property
    def won(self) -> bool:
        return self.pnl > 0.01

    @property
    def lost(self) -> bool:
        return self.pnl < -0.01


def _parse_money(s: str) -> float:
    if s is None or s == "":
        return 0.0
    t = str(s).replace("$", "").replace(",", "").replace("(", "-").replace(")", "").strip()
    try:
        return float(t)
    except ValueError:
        return 0.0


def _parse_date(s: str) -> Optional[datetime]:
    if not s:
        return None
    s = s.strip()
    for fmt in ("%m/%d/%Y", "%Y-%m-%d", "%m/%d/%y"):
        try:
            return datetime.strptime(s, fmt)
        except ValueError:
            continue
    return None


def _parse_opt_desc(desc: str, instrument: str) -> Tuple[Optional[str], Optional[str], Optional[str], Optional[float]]:
    d = re.sub(r"\s+", " ", (desc or "").replace("\n", " ")).strip()
    m = OPT_DESC_RE.search(d)
    if m:
        root = m.group("root").upper()
        # strip trailing digits often used in OCC roots (MSTY1)
        root_clean = re.sub(r"\d+$", "", root) or root
        return root_clean, m.group("exp"), m.group("cp").title(), float(m.group("strike"))
    if instrument and ("Call" in d or "Put" in d or "Option" in d):
        return instrument.upper(), None, ("Call" if "Call" in d else "Put" if "Put" in d else None), None
    return (instrument.upper() if instrument else None), None, None, None


def load_activity_csvs(folder: Path) -> List[dict]:
    rows: List[dict] = []
    for p in sorted(folder.glob("*.csv")):
        if p.name.upper().startswith("RH00") and "Close Date" in p.read_text(encoding="utf-8", errors="replace")[:200]:
            # prediction market export — skip for options learner
            continue
        try:
            with open(p, "r", encoding="utf-8", errors="replace", newline="") as f:
                reader = csv.DictReader(f)
                if not reader.fieldnames or "Trans Code" not in (reader.fieldnames or []):
                    continue
                for r in reader:
                    r["_file"] = p.name
                    rows.append(r)
        except Exception as e:
            print(f"skip {p.name}: {e}")
    return rows


def rows_to_legs(rows: List[dict]) -> List[RhLeg]:
    legs: List[RhLeg] = []
    for r in rows:
        tc = (r.get("Trans Code") or "").strip().upper()
        inst = (r.get("Instrument") or "").strip()
        desc = r.get("Description") or ""
        qty = abs(_parse_money(r.get("Quantity") or "0"))
        price = abs(_parse_money(r.get("Price") or "0"))
        amount = _parse_money(r.get("Amount") or "0")
        date = (r.get("Activity Date") or "").strip()

        is_opt = tc in OPT_CODES or bool(OPT_DESC_RE.search(desc.replace("\n", " ")))
        if not is_opt and tc not in ("BUY", "SELL"):
            continue

        sym, exp, cp, strike = _parse_opt_desc(desc, inst)
        if not sym:
            continue
        if is_opt or tc in OPT_CODES:
            legs.append(
                RhLeg(
                    date=date,
                    symbol=sym,
                    trans=tc,
                    qty=qty or 1.0,
                    price=price,
                    amount=amount,
                    exp=exp,
                    cp=cp,
                    strike=strike,
                    desc=re.sub(r"\s+", " ", desc)[:160],
                    file=r.get("_file", ""),
                )
            )
    # chronological
    legs.sort(key=lambda x: (_parse_date(x.date) or datetime.min, x.trans))
    return legs


def match_option_trades(legs: List[RhLeg]) -> List[ClosedTrade]:
    """FIFO match BTO↔STC/OEXP and STO↔BTC/OASGN/OEXP."""
    opens: Dict[str, List[RhLeg]] = defaultdict(list)
    closed: List[ClosedTrade] = []

    def key(leg: RhLeg) -> str:
        return f"{leg.symbol}|{leg.cp}|{leg.strike}|{leg.exp}"

    for leg in legs:
        if leg.trans not in OPT_CODES:
            continue
        k = key(leg)
        if leg.trans in ("BTO", "STO"):
            opens[k].append(leg)
            continue
        # close
        if not opens[k]:
            # orphan close — record incomplete
            closed.append(
                ClosedTrade(
                    symbol=leg.symbol,
                    side="unknown",
                    cp=leg.cp,
                    strike=leg.strike,
                    exp=leg.exp,
                    open_date="?",
                    close_date=leg.date,
                    open_trans="?",
                    close_trans=leg.trans,
                    qty=leg.qty,
                    open_prem=0.0,
                    close_prem=leg.price,
                    pnl=leg.amount if leg.amount else 0.0,
                    hold_days=None,
                    notes=["orphan_close"],
                )
            )
            continue
        op = opens[k].pop(0)
        side = "long_option" if op.trans == "BTO" else "short_option"
        # cash: long pnl ≈ exit amount + open amount (open is negative)
        # prefer amount fields
        if op.amount or leg.amount:
            pnl = (leg.amount or 0.0) + (op.amount or 0.0)
            # if OEXP with empty amount, estimate
            if leg.trans == "OEXP" and abs(leg.amount) < 1e-9:
                if side == "long_option":
                    pnl = (op.amount or 0.0)  # premium lost
                else:
                    pnl = (op.amount or 0.0)  # short keeps credit
        else:
            mult = 100.0 * (leg.qty or 1.0)
            if side == "long_option":
                pnl = (leg.price - op.price) * mult
            else:
                pnl = (op.price - leg.price) * mult

        od = _parse_date(op.date)
        cd = _parse_date(leg.date)
        hold = (cd - od).days if od and cd else None
        notes = []
        if leg.trans == "OASGN":
            notes.append("assigned")
            # assignment often painful for shorts
        if leg.trans == "OEXP":
            notes.append("expired")
        if abs(pnl) > 500:
            notes.append("large_pnl")

        closed.append(
            ClosedTrade(
                symbol=op.symbol,
                side=side,
                cp=op.cp or leg.cp,
                strike=op.strike or leg.strike,
                exp=op.exp or leg.exp,
                open_date=op.date,
                close_date=leg.date,
                open_trans=op.trans,
                close_trans=leg.trans,
                qty=min(op.qty, leg.qty) or 1.0,
                open_prem=op.price,
                close_prem=leg.price,
                pnl=round(pnl, 2),
                hold_days=hold,
                notes=notes,
            )
        )
    return closed


def analyze(closed: List[ClosedTrade]) -> Dict[str, Any]:
    trades = [t for t in closed if t.side in ("long_option", "short_option") and "orphan" not in "".join(t.notes)]
    if not trades:
        return {"error": "no_matched_option_trades", "n": 0}

    wins = [t for t in trades if t.won]
    losses = [t for t in trades if t.lost]
    flats = [t for t in trades if not t.won and not t.lost]

    def rate(xs: List[ClosedTrade]) -> float:
        return len([t for t in xs if t.won]) / len(xs) if xs else 0.0

    def sum_pnl(xs: List[ClosedTrade]) -> float:
        return round(sum(t.pnl for t in xs), 2)

    by_symbol: Dict[str, List[ClosedTrade]] = defaultdict(list)
    by_side: Dict[str, List[ClosedTrade]] = defaultdict(list)
    by_cp: Dict[str, List[ClosedTrade]] = defaultdict(list)
    for t in trades:
        by_symbol[t.symbol].append(t)
        by_side[t.side].append(t)
        by_cp[(t.cp or "?").lower()].append(t)

    symbol_stats = []
    for sym, xs in by_symbol.items():
        symbol_stats.append(
            {
                "symbol": sym,
                "n": len(xs),
                "win_rate": round(rate(xs), 3),
                "pnl": sum_pnl(xs),
                "avg_pnl": round(sum_pnl(xs) / len(xs), 2),
            }
        )
    symbol_stats.sort(key=lambda x: x["pnl"])

    assigned = [t for t in trades if "assigned" in t.notes]
    expired = [t for t in trades if "expired" in t.notes]
    short = by_side.get("short_option", [])
    long_ = by_side.get("long_option", [])

    hold_w = [t.hold_days for t in wins if t.hold_days is not None]
    hold_l = [t.hold_days for t in losses if t.hold_days is not None]

    # Consistent loss patterns
    patterns: List[str] = []
    if short and rate(short) < 0.45 and sum_pnl(short) < 0:
        patterns.append(
            f"SHORT OPTIONS: win_rate={rate(short):.0%} pnl=${sum_pnl(short):.0f} on {len(short)} trades — "
            "credit selling is underperforming; tighten underlyings, reduce size, or avoid weak tickers."
        )
    if long_ and rate(long_) < 0.4 and sum_pnl(long_) < 0:
        patterns.append(
            f"LONG OPTIONS: win_rate={rate(long_):.0%} pnl=${sum_pnl(long_):.0f} on {len(long_)} trades — "
            "debit buys often expire worthless; prefer defined-risk debit spreads + time stops."
        )
    if assigned:
        patterns.append(
            f"ASSIGNMENT: {len(assigned)} events, pnl=${sum_pnl(assigned):.0f} — "
            "short puts/calls getting assigned; manage earlier or use defined-risk spreads."
        )
    if expired and sum_pnl(expired) < 0:
        patterns.append(
            f"EXPIRATION: {len(expired)} closes via OEXP, pnl=${sum_pnl(expired):.0f} — "
            "too many held to zero; exit losers at −40–50% premium (SPY playbook rule)."
        )
    worst = symbol_stats[:5]
    best = sorted(symbol_stats, key=lambda x: -x["pnl"])[:5]
    if worst:
        patterns.append(
            "WORST SYMBOLS (by total P/L): "
            + ", ".join(f"{w['symbol']} ${w['pnl']:.0f} (n={w['n']}, wr={w['win_rate']:.0%})" for w in worst)
        )
    if best:
        patterns.append(
            "BEST SYMBOLS (by total P/L): "
            + ", ".join(f"{b['symbol']} ${b['pnl']:.0f} (n={b['n']}, wr={b['win_rate']:.0%})" for b in best)
        )
    if hold_w and hold_l:
        aw, al = sum(hold_w) / len(hold_w), sum(hold_l) / len(hold_l)
        if al > aw * 1.3:
            patterns.append(
                f"HOLD TIME: losses held longer (avg {al:.1f}d) than wins ({aw:.1f}d) — "
                "cut losers faster; let winners work with a plan."
            )
        elif aw > al * 1.3:
            patterns.append(
                f"HOLD TIME: wins held longer (avg {aw:.1f}d) vs losses ({al:.1f}d) — "
                "good habit; keep time stops on losers."
            )

    # Build on wins
    wins_advice: List[str] = []
    for b in best[:3]:
        if b["pnl"] > 0 and b["n"] >= 2:
            wins_advice.append(
                f"Lean into {b['symbol']}-like setups that already paid "
                f"(${b['pnl']:.0f} on {b['n']} trades, wr {b['win_rate']:.0%}) — size only within 1–2% risk."
            )
    if short and rate(short) >= 0.55 and sum_pnl(short) > 0:
        wins_advice.append(
            "Short premium has edge in this sample — keep defined-risk credit spreads; avoid naked assignment risk."
        )
    if long_ and rate(long_) >= 0.5 and sum_pnl(long_) > 0:
        wins_advice.append(
            "Long options worked when selective — require bias+score≥70 and plan debit-spread adjust at −40%."
        )

    lessons = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "n_matched_trades": len(trades),
        "n_wins": len(wins),
        "n_losses": len(losses),
        "n_flat": len(flats),
        "win_rate": round(rate(trades), 4),
        "total_pnl": sum_pnl(trades),
        "avg_win": round(sum_pnl(wins) / len(wins), 2) if wins else 0.0,
        "avg_loss": round(sum_pnl(losses) / len(losses), 2) if losses else 0.0,
        "profit_factor": round(
            abs(sum_pnl(wins) / sum_pnl(losses)) if losses and sum_pnl(losses) != 0 else 0.0,
            3,
        ),
        "by_side": {
            k: {"n": len(v), "win_rate": round(rate(v), 3), "pnl": sum_pnl(v)}
            for k, v in by_side.items()
        },
        "by_cp": {
            k: {"n": len(v), "win_rate": round(rate(v), 3), "pnl": sum_pnl(v)}
            for k, v in by_cp.items()
        },
        "worst_symbols": worst[:8],
        "best_symbols": best[:8],
        "assignment_count": len(assigned),
        "expiration_count": len(expired),
        "patterns": patterns,
        "build_on_wins": wins_advice,
        "how_could_do_better": [
            "Never risk >1–2% equity per campaign (empire rule).",
            "Prefer defined-risk spreads over naked STO when assignment shows up in history.",
            "Exit long options before OEXP wipeouts; use −40% premium adjust/exit.",
            "Avoid repeating worst symbols until process review is journaled.",
            "Use NCI Bias + SPY playbook gates before next entry on liquid underlyings.",
            *patterns[:4],
        ],
        "sample_worst_trades": [
            asdict(t)
            for t in sorted(trades, key=lambda x: x.pnl)[:8]
        ],
        "sample_best_trades": [
            asdict(t)
            for t in sorted(trades, key=lambda x: -x.pnl)[:8]
        ],
    }
    return lessons


def write_to_brain(lessons: Dict[str, Any]) -> None:
    kb = KnowledgeBase()
    kb.meta["rh_history_lessons"] = {
        "generated_at": lessons.get("generated_at"),
        "n_trades": lessons.get("n_matched_trades"),
        "win_rate": lessons.get("win_rate"),
        "total_pnl": lessons.get("total_pnl"),
    }
    # strategy rule for selector soft-use
    kb.strategy_rules["rh_history_coach"] = {
        "action": "PERSONAL_HISTORY_COACH",
        "source": "ROBINHOOD_HISTORY",
        "win_rate": lessons.get("win_rate"),
        "worst_symbols": [w["symbol"] for w in lessons.get("worst_symbols", [])[:5]],
        "best_symbols": [b["symbol"] for b in lessons.get("best_symbols", [])[:5]],
        "priority": 5,
    }
    snippets = [
        (
            "Edge Cases",
            "robinhood history losses",
            "Personal RH history patterns: " + " | ".join(lessons.get("patterns", [])[:3]),
            ["rh_history_coach"],
        ),
        (
            "Risk Management",
            "how could i do better",
            "How you could do better (from your RH fills): "
            + " · ".join(lessons.get("how_could_do_better", [])[:5]),
            ["rh_history_coach", "fixed_fractional"],
        ),
        (
            "Trading Strategies",
            "build on wins",
            "Build on wins: " + " · ".join(lessons.get("build_on_wins", [])[:4] or ["Keep journaling winners."]),
            ["rh_history_coach"],
        ),
    ]
    for section, kw, snip, sids in snippets:
        if not snip.strip().endswith(":") and len(snip) > 40:
            kb.append_entry(
                KnowledgeEntry(
                    section=section,
                    tags=["rh_history", "personal_edge"],
                    snippet=snip[:900],
                    source="ROBINHOOD_HISTORY_LEARN",
                    keyword=kw,
                    strategy_ids=sids,
                )
            )
    kb.save()


def run(folder: Path) -> Dict[str, Any]:
    folder = Path(folder)
    if not folder.is_dir():
        raise FileNotFoundError(folder)
    raw = load_activity_csvs(folder)
    legs = rows_to_legs(raw)
    closed = match_option_trades(legs)
    lessons = analyze(closed)
    lessons["source_path"] = str(folder)
    lessons["n_activity_rows"] = len(raw)
    lessons["n_option_legs"] = len(legs)
    lessons["n_closed_matched"] = len(closed)

    out = DATA / "rh_history_lessons.json"
    DATA.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(lessons, indent=2), encoding="utf-8")

    # also write next to source folder
    side = folder / "lessons_report.json"
    try:
        side.write_text(json.dumps(lessons, indent=2), encoding="utf-8")
    except OSError:
        pass

    if lessons.get("n_matched_trades", 0) > 0:
        write_to_brain(lessons)

    # human markdown
    md = folder / "LESSONS_FROM_YOUR_TRADES.md"
    try:
        lines = [
            "# Lessons from your Robinhood history",
            "",
            f"Generated: {lessons.get('generated_at')}",
            f"Matched option trades: **{lessons.get('n_matched_trades')}**",
            f"Win rate: **{100 * float(lessons.get('win_rate') or 0):.1f}%**",
            f"Total option P/L (matched): **${lessons.get('total_pnl')}**",
            f"Avg win: ${lessons.get('avg_win')} · Avg loss: ${lessons.get('avg_loss')} · PF: {lessons.get('profit_factor')}",
            "",
            "## Consistent patterns",
            *[f"- {p}" for p in lessons.get("patterns", [])],
            "",
            "## How you could do better",
            *[f"- {p}" for p in lessons.get("how_could_do_better", [])],
            "",
            "## Build on wins",
            *[f"- {p}" for p in lessons.get("build_on_wins", []) or ["- (no strong win clusters yet)"]],
            "",
            "## Worst symbols",
            "```",
            json.dumps(lessons.get("worst_symbols", []), indent=2),
            "```",
            "",
            "## Best symbols",
            "```",
            json.dumps(lessons.get("best_symbols", []), indent=2),
            "```",
            "",
            "_Educational reconstruction from activity CSVs. Fees/partials/assignments can skew P/L. Not tax advice._",
        ]
        md.write_text("\n".join(lines), encoding="utf-8")
    except OSError:
        pass

    return lessons


def main(argv: Optional[List[str]] = None) -> int:
    p = argparse.ArgumentParser(description="Learn from Robinhood history CSVs")
    p.add_argument("--path", type=str, default=str(DEFAULT_RH_PATH))
    args = p.parse_args(argv)
    lessons = run(Path(args.path))
    print(json.dumps({
        "n_matched_trades": lessons.get("n_matched_trades"),
        "win_rate": lessons.get("win_rate"),
        "total_pnl": lessons.get("total_pnl"),
        "patterns": lessons.get("patterns"),
        "build_on_wins": lessons.get("build_on_wins"),
        "how_could_do_better": lessons.get("how_could_do_better"),
        "report": str(Path(args.path) / "LESSONS_FROM_YOUR_TRADES.md"),
        "json": str(DATA / "rh_history_lessons.json"),
    }, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
