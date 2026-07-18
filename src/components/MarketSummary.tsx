"use client";
import { useEffect, useRef, memo } from "react";

/**
 * Live market strip via TradingView's classic embed (ticker tape).
 *
 * NOTE: The newer <tv-market-summary> web component
 * (widgets.tradingview-widget.com) throws unhandled
 * "M is not a function or its return value is not iterable" under
 * React Strict Mode / Next 16 — so we use the stable s3 embed instead.
 */
function MarketSummary({
  direction = "horizontal",
}: {
  direction?: "horizontal" | "vertical";
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const theme =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";

    // Fresh mount each time (symbol/theme); keep a widget child so TV can attach.
    container.innerHTML =
      '<div class="tradingview-widget-container__widget" style="width:100%;height:100%"></div>';

    const script = document.createElement("script");
    script.src =
      "https://s3.tradingview.com/external-embedding/embed-widget-ticker-tape.js";
    script.type = "text/javascript";
    script.async = true;
    script.innerHTML = JSON.stringify({
      symbols: [
        { proName: "FOREXCOM:SPXUSD", title: "S&P 500" },
        { proName: "FOREXCOM:NSXUSD", title: "US 100" },
        { proName: "FOREXCOM:DJI", title: "Dow 30" },
        { proName: "BITSTAMP:BTCUSD", title: "Bitcoin" },
        { proName: "BITSTAMP:ETHUSD", title: "Ethereum" },
        { proName: "TVC:GOLD", title: "Gold" },
        { proName: "TVC:USOIL", title: "Crude Oil" },
        { proName: "FX:EURUSD", title: "EUR/USD" },
      ],
      showSymbolLogo: true,
      isTransparent: true,
      displayMode: direction === "vertical" ? "compact" : "adaptive",
      colorTheme: theme,
      locale: "en",
    });

    // Defer one tick so Strict Mode cleanup of the previous mount finishes first.
    const t = window.setTimeout(() => {
      if (!container.isConnected) return;
      container.appendChild(script);
    }, 0);

    return () => {
      window.clearTimeout(t);
      container.innerHTML = "";
    };
  }, [direction]);

  return (
    <div
      ref={containerRef}
      className="tradingview-widget-container w-full overflow-hidden"
      style={{ minHeight: direction === "vertical" ? 280 : 46, width: "100%" }}
      aria-label="Market summary ticker"
    />
  );
}

export default memo(MarketSummary);
