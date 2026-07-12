// JSX typing for TradingView web-component widgets (custom elements).
import type React from "react";

declare global {
  namespace JSX {
    interface IntrinsicElements {
      "tv-market-summary": React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement>,
        HTMLElement
      > & { direction?: "horizontal" | "vertical" };
    }
  }
}

export {};
