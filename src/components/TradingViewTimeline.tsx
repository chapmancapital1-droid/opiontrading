"use client";
import { useEffect, useRef, memo } from "react";

/**
 * TradingView Timeline (Top Stories) news widget. When a `symbol` is given it
 * shows that symbol's news; otherwise a market-wide feed. Theme follows the OS
 * light/dark preference. Client-only (the script renders an <iframe>).
 */
function TradingViewTimeline({
  symbol,
  height = 550,
}: {
  symbol?: string;
  height?: number;
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

    container.innerHTML =
      '<div class="tradingview-widget-container__widget"></div>';

    const script = document.createElement("script");
    script.src =
      "https://s3.tradingview.com/external-embedding/embed-widget-timeline.js";
    script.type = "text/javascript";
    script.async = true;
    script.innerHTML = JSON.stringify({
      displayMode: "regular",
      feedMode: symbol ? "symbol" : "all_symbols",
      ...(symbol ? { symbol } : {}),
      colorTheme: theme,
      isTransparent: true,
      locale: "en",
      width: "100%",
      height,
    });
    container.appendChild(script);

    return () => {
      container.innerHTML = "";
    };
  }, [symbol, height]);

  return (
    <div
      className="tradingview-widget-container"
      ref={containerRef}
      style={{ height, width: "100%" }}
    />
  );
}

export default memo(TradingViewTimeline);
