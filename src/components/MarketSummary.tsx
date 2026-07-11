"use client";
import { useEffect } from "react";

const SRC = "https://widgets.tradingview-widget.com/w/en/tv-market-summary.js";

/**
 * TradingView Market Summary web component — a live market-overview strip
 * (indices, futures, forex, etc.). Loads the widget's module script once, then
 * renders the <tv-market-summary> custom element.
 */
export default function MarketSummary({
  direction = "horizontal",
}: {
  direction?: "horizontal" | "vertical";
}) {
  useEffect(() => {
    if (!document.querySelector(`script[src="${SRC}"]`)) {
      const s = document.createElement("script");
      s.type = "module";
      s.src = SRC;
      document.head.appendChild(s);
    }
  }, []);

  return <tv-market-summary direction={direction} />;
}
