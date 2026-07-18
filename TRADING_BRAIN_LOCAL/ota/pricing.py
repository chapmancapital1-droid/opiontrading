"""
Option pricing: Black-Scholes + risk-neutral Monte Carlo (GBM).
Aligned with Crack Basic Black-Scholes + OTA Numerical Methods catalog.
"""
from __future__ import annotations

import math
from dataclasses import dataclass
from typing import Literal, Optional, Tuple

import numpy as np
from scipy.stats import norm

OptionType = Literal["call", "put"]


@dataclass
class EuropeanPriceResult:
    price: float
    std_err: float
    black_scholes: float
    abs_error: float
    sample_terminal: np.ndarray
    method: str
    simulations: int
    steps: int
    antithetic: bool


def black_scholes(
    S: float,
    X: float,
    T: float,
    r: float,
    sigma: float,
    option_type: OptionType = "call",
    q: float = 0.0,
) -> float:
    """European Black-Scholes-Merton price (continuous dividend yield q)."""
    if T <= 0 or sigma <= 0:
        if option_type == "call":
            return max(S - X, 0.0)
        return max(X - S, 0.0)

    vol = sigma * math.sqrt(T)
    d1 = (math.log(S / X) + (r - q + 0.5 * sigma * sigma) * T) / vol
    d2 = d1 - vol
    df = math.exp(-r * T)
    dq = math.exp(-q * T)

    if option_type == "call":
        return S * dq * norm.cdf(d1) - X * df * norm.cdf(d2)
    return X * df * norm.cdf(-d2) - S * dq * norm.cdf(-d1)


def black_scholes_greeks(
    S: float,
    X: float,
    T: float,
    r: float,
    sigma: float,
    option_type: OptionType = "call",
    q: float = 0.0,
) -> dict:
    """Price + first-order Greeks (theta per year, vega per 1.00 vol)."""
    if T <= 0 or sigma <= 0:
        intrinsic = max(S - X, 0.0) if option_type == "call" else max(X - S, 0.0)
        delta = 1.0 if (option_type == "call" and S > X) else (
            -1.0 if (option_type == "put" and S < X) else 0.0
        )
        return {
            "price": intrinsic,
            "delta": delta,
            "gamma": 0.0,
            "theta": 0.0,
            "vega": 0.0,
            "rho": 0.0,
        }

    vol = sigma * math.sqrt(T)
    d1 = (math.log(S / X) + (r - q + 0.5 * sigma * sigma) * T) / vol
    d2 = d1 - vol
    df = math.exp(-r * T)
    dq = math.exp(-q * T)
    pdf = norm.pdf(d1)
    gamma = (dq * pdf) / (S * sigma * math.sqrt(T))
    vega = S * dq * pdf * math.sqrt(T)

    if option_type == "call":
        price = S * dq * norm.cdf(d1) - X * df * norm.cdf(d2)
        delta = dq * norm.cdf(d1)
        theta = (
            -(S * dq * pdf * sigma) / (2 * math.sqrt(T))
            - r * X * df * norm.cdf(d2)
            + q * S * dq * norm.cdf(d1)
        )
        rho = X * T * df * norm.cdf(d2)
    else:
        price = X * df * norm.cdf(-d2) - S * dq * norm.cdf(-d1)
        delta = -dq * norm.cdf(-d1)
        theta = (
            -(S * dq * pdf * sigma) / (2 * math.sqrt(T))
            + r * X * df * norm.cdf(-d2)
            - q * S * dq * norm.cdf(-d1)
        )
        rho = -X * T * df * norm.cdf(-d2)

    return {
        "price": float(price),
        "delta": float(delta),
        "gamma": float(gamma),
        "theta": float(theta),
        "vega": float(vega),
        "rho": float(rho),
    }


def monte_carlo_european(
    S0: float,
    X: float,
    T: float,
    r: float,
    sigma: float,
    option_type: OptionType = "call",
    q: float = 0.0,
    num_simulations: int = 50_000,
    num_steps: int = 1,
    seed: int = 42,
    antithetic: bool = True,
    sample_size: int = 1000,
) -> EuropeanPriceResult:
    """
    Risk-neutral GBM Monte Carlo for European call/put.

    steps=1 uses exact lognormal terminal (no discretization bias).
    steps>1 uses multi-step path (for path-dependent extensions / charts).
    Antithetic variates (Z, -Z) when steps==1.
    """
    bs = black_scholes(S0, X, T, r, sigma, option_type, q)

    if T <= 0 or sigma <= 0:
        intrinsic = max(S0 - X, 0.0) if option_type == "call" else max(X - S0, 0.0)
        return EuropeanPriceResult(
            price=intrinsic,
            std_err=0.0,
            black_scholes=bs,
            abs_error=abs(intrinsic - bs),
            sample_terminal=np.array([S0]),
            method="intrinsic",
            simulations=0,
            steps=num_steps,
            antithetic=antithetic,
        )

    rng = np.random.default_rng(seed)
    n = max(1, int(num_simulations))
    steps = max(1, int(num_steps))
    mu = r - q
    discount = math.exp(-r * T)

    if steps == 1:
        drift = (mu - 0.5 * sigma * sigma) * T
        vol = sigma * math.sqrt(T)
        if antithetic:
            half = (n + 1) // 2
            Z = rng.standard_normal(half)
            S_pos = S0 * np.exp(drift + vol * Z)
            S_neg = S0 * np.exp(drift + vol * (-Z))
            S_T = np.concatenate([S_pos, S_neg])[:n]
        else:
            Z = rng.standard_normal(n)
            S_T = S0 * np.exp(drift + vol * Z)
    else:
        dt = T / steps
        drift_dt = (mu - 0.5 * sigma * sigma) * dt
        diff_dt = sigma * math.sqrt(dt)
        Z = rng.standard_normal((n, steps))
        log_inc = drift_dt + diff_dt * Z
        log_paths = np.cumsum(log_inc, axis=1)
        S_T = S0 * np.exp(log_paths[:, -1])

    if option_type == "call":
        payoffs = np.maximum(S_T - X, 0.0)
    else:
        payoffs = np.maximum(X - S_T, 0.0)

    disc = discount * payoffs
    price = float(np.mean(disc))
    std_err = float(np.std(disc, ddof=1) / math.sqrt(n)) if n > 1 else 0.0

    return EuropeanPriceResult(
        price=price,
        std_err=std_err,
        black_scholes=bs,
        abs_error=abs(price - bs),
        sample_terminal=S_T[: max(1, sample_size)],
        method="mc_gbm_rn" + ("_antithetic" if antithetic and steps == 1 else ""),
        simulations=n,
        steps=steps,
        antithetic=bool(antithetic and steps == 1),
    )


def monte_carlo_european_call(
    S0: float,
    X: float,
    T: float,
    r: float,
    sigma: float,
    num_simulations: int = 50_000,
    num_steps: int = 252,
    seed: int = 42,
) -> Tuple[float, float, np.ndarray]:
    """Legacy API matching the OTA handoff snippet."""
    res = monte_carlo_european(
        S0, X, T, r, sigma,
        option_type="call",
        num_simulations=num_simulations,
        num_steps=num_steps,
        seed=seed,
        antithetic=True,
        sample_size=1000,
    )
    return res.price, res.std_err, res.sample_terminal
