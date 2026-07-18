"""Simple portfolio cash + position tracker with risk caps."""
from __future__ import annotations

import logging
from typing import Any, Dict, List

logger = logging.getLogger("ota.portfolio")


class PortfolioManager:
    def __init__(self, initial_capital: float = 50_000.0, risk_tolerance: float = 0.02):
        self.initial_capital = float(initial_capital)
        self.risk_tolerance = float(risk_tolerance)
        self.cash = float(initial_capital)
        self.positions: List[Dict[str, Any]] = []
        self.closed: List[Dict[str, Any]] = []

    def snapshot(self) -> Dict[str, Any]:
        return {
            "cash": round(self.cash, 2),
            "open_positions": len(self.positions),
            "closed_trades": len(self.closed),
            "initial_capital": self.initial_capital,
            "risk_tolerance": self.risk_tolerance,
        }

    def try_open(self, trade: Dict[str, Any]) -> bool:
        """Open long option position if BUY* and cash allows."""
        rec = str(trade.get("recommendation", ""))
        if "BUY" not in rec:
            logger.info("Skip open: recommendation=%s", rec)
            return False
        size = int(trade.get("size") or 0)
        fair = float(trade.get("fair_value") or 0)
        cost = size * fair * 100.0
        if size <= 0 or cost <= 0:
            return False
        if cost > self.cash:
            logger.warning("Insufficient cash: need %.2f have %.2f", cost, self.cash)
            return False
        self.cash -= cost
        pos = {
            **trade,
            "premium_paid": fair,
            "entry_price": fair,
            "contracts": size,
            "cost": cost,
            "status": "open",
        }
        self.positions.append(pos)
        logger.info("Opened %s x%d cost=%.2f cash=%.2f", rec, size, cost, self.cash)
        return True

    def close_position(self, index: int, exit_premium: float) -> Dict[str, Any]:
        pos = self.positions.pop(index)
        size = int(pos["contracts"])
        proceeds = size * exit_premium * 100.0
        self.cash += proceeds
        pnl = proceeds - float(pos["cost"])
        closed = {**pos, "status": "closed", "exit_premium": exit_premium, "pnl": pnl}
        self.closed.append(closed)
        logger.info("Closed contracts=%d pnl=%.2f cash=%.2f", size, pnl, self.cash)
        return closed
