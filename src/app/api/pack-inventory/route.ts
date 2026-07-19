import { NextResponse } from "next/server";
import { createPublicClient, http } from "viem";
import { ROBINHOOD_CHAIN_RPC_URL, robinhoodChain } from "@/lib/chain";
import { HOODPACKZ_TOKENS } from "@/lib/hoodpackz-tokens";

export const dynamic = "force-dynamic";

const coreAddress = process.env.NEXT_PUBLIC_HOODPACKZ_V2_ADDRESS?.trim();
const assetAbi = [
  {
    type: "function",
    name: "asset",
    stateMutability: "view",
    inputs: [{ name: "index", type: "uint8" }],
    outputs: [
      { name: "token", type: "address" },
      { name: "weight", type: "uint32" },
      { name: "rewards", type: "uint256[3]" },
      { name: "available", type: "uint256" },
      { name: "reserved", type: "uint256" },
    ],
  },
] as const;

const client = createPublicClient({
  chain: robinhoodChain,
  transport: http(ROBINHOOD_CHAIN_RPC_URL),
});

export async function GET(request: Request) {
  if (!coreAddress || !/^0x[0-9a-fA-F]{40}$/.test(coreAddress)) {
    return NextResponse.json({ error: "Pack contract is not configured." }, { status: 503 });
  }

  const tier = Number(new URL(request.url).searchParams.get("tier") ?? "0");
  if (!Number.isInteger(tier) || tier < 0 || tier > 2) {
    return NextResponse.json({ error: "Invalid pack tier." }, { status: 400 });
  }

  const assets = await Promise.all(
    HOODPACKZ_TOKENS.map(async (token, index) => {
      const [, , rewards, available, reserved] = await client.readContract({
        address: coreAddress as `0x${string}`,
        abi: assetAbi,
        functionName: "asset",
        args: [index],
      });
      return {
        ticker: token.ticker.toUpperCase(),
        reward: rewards[tier].toString(),
        available: available.toString(),
        reserved: reserved.toString(),
        sufficient: available >= rewards[tier],
      };
    }),
  );
  const missing = assets.filter((asset) => !asset.sufficient).map((asset) => asset.ticker);

  return NextResponse.json(
    { chainId: robinhoodChain.id, tier, canOpen: missing.length === 0, missing, assets },
    { headers: { "Cache-Control": "public, max-age=15, s-maxage=30" } },
  );
}
