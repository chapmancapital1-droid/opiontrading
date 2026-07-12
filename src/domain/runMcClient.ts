import { runMonteCarlo, type MCParams, type MCResult } from "./montecarlo";

export function runMcClient(params: MCParams): Promise<MCResult> {
  if (typeof window === "undefined" || typeof Worker === "undefined") {
    return Promise.resolve(runMonteCarlo(params)); // SSR/test fallback
  }
  return new Promise((resolve) => {
    const worker = new Worker(new URL("../workers/mc.worker.ts", import.meta.url), {
      type: "module",
    });
    const id = Math.random().toString(36).slice(2);
    worker.onmessage = (e: MessageEvent<{ id: string; result: MCResult }>) => {
      if (e.data.id === id) {
        resolve(e.data.result);
        worker.terminate();
      }
    };
    worker.postMessage({ id, params });
  });
}
