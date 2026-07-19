"use client";

import { useEffect, useState } from "react";

export interface LiveTokenPrice {
  address: string;
  ticker: string;
  priceUsd: number | null;
  status: "live" | "unavailable";
  source: string;
}

let sharedCache: Map<string, LiveTokenPrice> | null = null;

export function useLiveTokenPrices() {
  const [prices, setPrices] = useState<Map<string, LiveTokenPrice>>(
    () => sharedCache ?? new Map(),
  );

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const response = await fetch("/api/token-prices", { cache: "no-store" });
        if (!response.ok) return;
        const data = (await response.json()) as { prices: LiveTokenPrice[] };
        const next = new Map(data.prices.map((price) => [price.address.toLowerCase(), price]));
        sharedCache = next;
        if (!cancelled) setPrices(next);
      } catch {
        // Keep the previous RPC snapshot. The UI never invents a price on failure.
      }
    }

    void load();
    const interval = window.setInterval(load, 60_000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, []);

  return prices;
}
