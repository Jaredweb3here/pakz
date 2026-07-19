import { NextResponse } from "next/server";
import { createPublicClient, http } from "viem";
import { HOODPACKZ_TOKENS } from "@/lib/hoodpackz-tokens";
import { ROBINHOOD_CHAIN_RPC_URL, robinhoodChain } from "@/lib/chain";

export const dynamic = "force-dynamic";

const ADAPTER_ADDRESS = "0x0b17df805a8c0921cb1b141f4515612028d8e4a7" as const;
const USDG_ADDRESS = "0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168" as const;
const quoteAbi = [
  {
    type: "function",
    name: "quote",
    stateMutability: "view",
    inputs: [
      { name: "inputToken", type: "address" },
      { name: "outputToken", type: "address" },
      { name: "amountIn", type: "uint256" },
    ],
    outputs: [{ name: "amountOut", type: "uint256" }],
  },
] as const;

const client = createPublicClient({
  chain: robinhoodChain,
  transport: http(ROBINHOOD_CHAIN_RPC_URL),
});

export async function GET() {
  try {
    const block = await client.getBlockNumber();
    const prices = await Promise.all(
      HOODPACKZ_TOKENS.map(async (token) => {
        try {
          const quote = await client.readContract({
            address: ADAPTER_ADDRESS,
            abi: quoteAbi,
            functionName: "quote",
            args: [token.address, USDG_ADDRESS, 10n ** BigInt(token.decimals)],
          });

          return {
            address: token.address,
            ticker: token.ticker,
            priceUsd: Number(quote) / 1e6,
            status: "live" as const,
            source: "Robinhood RPC / Uniswap v4 spot quote",
          };
        } catch {
          return {
            address: token.address,
            ticker: token.ticker,
            priceUsd: null,
            status: "unavailable" as const,
            source: "Robinhood RPC / no configured liquid quote",
          };
        }
      }),
    );

    return NextResponse.json(
      { chainId: robinhoodChain.id, block: block.toString(), prices },
      { headers: { "Cache-Control": "public, max-age=30, s-maxage=60" } },
    );
  } catch {
    return NextResponse.json(
      { chainId: robinhoodChain.id, prices: [], error: "Robinhood RPC unavailable" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
