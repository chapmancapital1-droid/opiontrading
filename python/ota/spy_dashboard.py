"""
Standalone SPY 1DTE Dashboard — alerts when/how to trade SPY only.

Run:
  cd python
  python -m ota.spy_dashboard
  python -m ota.spy_dashboard --bias bullish --once
  python -m ota.spy_dashboard --loop 900   # every 15 min

Outputs JSON alert + log file spy_1dte_dashboard.log
Optional webhook: set OTA_SPY_WEBHOOK_URL env for POST JSON.
"""
from __future__ import annotations

import argparse
import json
import logging
import os
import sys
import time
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Optional

# Allow `python -m ota.spy_dashboard` from python/
if __name__ == "__main__" and __package__ is None:
    sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from ota.spy_strategy import SPY1DTEStrategy
from ota.knowledge import KnowledgeBase

LOG_PATH = Path(__file__).resolve().parent / "data" / "spy_1dte_dashboard.log"
LOG_PATH.parent.mkdir(parents=True, exist_ok=True)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
    handlers=[
        logging.FileHandler(LOG_PATH, encoding="utf-8"),
        logging.StreamHandler(sys.stdout),
    ],
)
logger = logging.getLogger("spy_dashboard")


class SPY1DTEDashboard:
    """SPY-only monitor: chain → high-POP strikes → alert payload."""

    def __init__(self, capital: float = 50_000.0, min_pop: float = 0.55):
        self.kb = KnowledgeBase()
        self.strategy = SPY1DTEStrategy(kb=self.kb, min_pop=min_pop)
        self.capital = capital
        self.last_alert: Optional[Dict[str, Any]] = None

    def generate_alert(
        self,
        bias: str = "neutral",
        news_sentiment: float = 0.0,
        force: bool = False,
    ) -> Dict[str, Any]:
        plan = self.strategy.generate_trade_plan(
            bias=bias if bias in ("bullish", "bearish", "neutral") else "neutral",  # type: ignore
            capital=self.capital,
            news_sentiment=news_sentiment,
        )
        bull = plan.get("bullish_book") or []
        bear = plan.get("bearish_book") or []
        n_ops = len(bull) + len(bear)
        has_edge = n_ops > 0

        credit_bull = self.strategy.credit_spread_sketch(
            plan["spy_price"], bias="bullish"
        )
        credit_bear = self.strategy.credit_spread_sketch(
            plan["spy_price"], bias="bearish"
        )

        alert = {
            "type": "SPY_1DTE_DASHBOARD",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "spy_price": plan["spy_price"],
            "bias": plan["bias"],
            "opportunity": has_edge or force,
            "strike_count_primary": plan["strike_count"],
            "primary_strikes": plan["recommended_strikes"],
            "bullish_high_pop": bull,
            "bearish_high_pop": bear,
            "safe_credit_sketches": {
                "bull_put": credit_bull,
                "bear_call": credit_bear,
            },
            "how_to_trade": plan["alerts"],
            "adjustment_rules": plan["adjustment_rules"],
            "risk_management": plan["risk_management"],
            "action": (
                "REVIEW high-POP strikes + defined-risk structures"
                if has_edge
                else "NO TRADE — no liquid high-POP strikes / stand down"
            ),
            "log_file": str(LOG_PATH),
        }
        self.last_alert = alert

        if has_edge or force:
            logger.info(
                "ALERT SPY $%s | primary strikes=%s | %s",
                alert["spy_price"],
                alert["strike_count_primary"],
                alert["action"],
            )
            for line in plan["alerts"]:
                logger.info("  %s", line)
        else:
            logger.info("No SPY 1DTE opportunity @ $%s", alert["spy_price"])

        self._maybe_webhook(alert)
        self._write_latest_json(alert)
        return alert

    def _write_latest_json(self, alert: Dict[str, Any]) -> None:
        out = Path(__file__).resolve().parent / "data" / "spy_dashboard_latest.json"
        out.write_text(json.dumps(alert, indent=2, default=str), encoding="utf-8")

    def _maybe_webhook(self, alert: Dict[str, Any]) -> None:
        url = os.environ.get("OTA_SPY_WEBHOOK_URL", "").strip()
        if not url or not alert.get("opportunity"):
            return
        try:
            data = json.dumps(alert, default=str).encode("utf-8")
            req = urllib.request.Request(
                url,
                data=data,
                headers={"Content-Type": "application/json"},
                method="POST",
            )
            with urllib.request.urlopen(req, timeout=10) as resp:
                logger.info("Webhook POST %s → %s", url, resp.status)
        except Exception as e:
            logger.warning("Webhook failed: %s", e)


def main(argv: Optional[list] = None) -> int:
    p = argparse.ArgumentParser(description="NERDCOMMAND SPY 1DTE Dashboard")
    p.add_argument("--bias", default="neutral", choices=["bullish", "bearish", "neutral"])
    p.add_argument("--capital", type=float, default=50_000.0)
    p.add_argument("--min-pop", type=float, default=0.55)
    p.add_argument("--sentiment", type=float, default=0.0, help="News sentiment [-1,1]")
    p.add_argument("--once", action="store_true", help="Single scan (default)")
    p.add_argument("--loop", type=int, default=0, help="Repeat every N seconds (0=once)")
    p.add_argument("--force", action="store_true", help="Always print plan")
    args = p.parse_args(argv)

    dash = SPY1DTEDashboard(capital=args.capital, min_pop=args.min_pop)
    interval = args.loop if args.loop > 0 else 0

    while True:
        alert = dash.generate_alert(
            bias=args.bias,
            news_sentiment=args.sentiment,
            force=args.force or True,
        )
        print(json.dumps(alert, indent=2, default=str))
        if interval <= 0:
            break
        logger.info("Sleeping %ss…", interval)
        time.sleep(interval)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
