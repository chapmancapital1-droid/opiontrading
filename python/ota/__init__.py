"""NERDCOMMAND Option Trading Agent (Python brain / pipelines)."""

from .agent import NERDCOMMAND_OTA
from .pricing import black_scholes, monte_carlo_european, monte_carlo_european_call
from .backtester import SPY1DTEBacktester, run_demo_backtest
from .knowledge import KnowledgeBase, KnowledgeIngestion
from .spy_strategy import SPY1DTEStrategy
from .options_chain import RealOptionsChain
from .spy_dashboard import SPY1DTEDashboard
from .genome import BrainGenome
from .self_improve import evolve, apply_champion_to_strategy

# rh_history_learn is CLI-first (python -m ota.rh_history_learn)

__all__ = [
    "NERDCOMMAND_OTA",
    "black_scholes",
    "monte_carlo_european",
    "monte_carlo_european_call",
    "SPY1DTEBacktester",
    "run_demo_backtest",
    "KnowledgeBase",
    "KnowledgeIngestion",
    "SPY1DTEStrategy",
    "RealOptionsChain",
    "SPY1DTEDashboard",
    "BrainGenome",
    "evolve",
    "apply_champion_to_strategy",
]

__version__ = "0.1.0"
