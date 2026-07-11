"use client";
import { useEffect, useRef, memo } from "react";

/**
 * TradingView Advanced Chart widget (live market data, symbol-changeable).
 * Client-only: the widget script runs in the browser and renders an <iframe>.
 * Theme follows the OS light/dark preference so it matches the app shell.
 */
function TradingViewChart({
  symbol = "NASDAQ:AAPL",
  height = 480,
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

    // Reset any prior widget (symbol/theme change re-injects).
    container.innerHTML =
      '<div class="tradingview-widget-container__widget" style="height:calc(100% - 32px);width:100%"></div>';

    const script = document.createElement("script");
    script.src =
      "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.type = "text/javascript";
    script.async = true;
    script.innerHTML = JSON.stringify({
      allow_symbol_change: true,
      calendar: false,
      details: false,
      hide_side_toolbar: true,
      hide_top_toolbar: false,
      hide_legend: false,
      hide_volume: false,
      hotlist: false,
      interval: "D",
      locale: "en",
      save_image: true,
      style: "1",
      symbol,
      theme,
      timezone: "Etc/UTC",
      backgroundColor: theme === "dark" ? "#1e222a" : "#ffffff",
      gridColor: "rgba(120,120,120,0.10)",
      withdateranges: false,
      autosize: true,
    });
    container.appendChild(script);

    return () => {
      container.innerHTML = "";
    };
  }, [symbol]);

  return (
    <div
      className="tradingview-widget-container rounded-xl overflow-hidden border border-[var(--border)]"
      ref={containerRef}
      style={{ height, width: "100%" }}
    />
  );
}

export default memo(TradingViewChart);
