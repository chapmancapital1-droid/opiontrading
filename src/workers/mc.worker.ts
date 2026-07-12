/// <reference lib="webworker" />
import { runMonteCarlo, type MCParams, type MCResult } from "../domain/montecarlo";

export type MCRequest = { id: string; params: MCParams };
export type MCResponse = { id: string; result: MCResult };

self.onmessage = (e: MessageEvent<MCRequest>) => {
  const { id, params } = e.data;
  const result = runMonteCarlo(params);
  const msg: MCResponse = { id, result };
  (self as unknown as Worker).postMessage(msg);
};
