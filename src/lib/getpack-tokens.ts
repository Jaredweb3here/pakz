export interface GetPackToken {
  ticker: string;
  name: string;
  address: string;
  decimals: number;
  logo: string;
  color: string;
  note: string;
  priceUsd: number;
}

export const GETPACK_TOKENS: GetPackToken[] = [
  {
    ticker: "SOL",
    name: "Solana",
    address: "So11111111111111111111111111111111111111112",
    decimals: 9,
    logo: "/getpack-sol.png",
    color: "#14f195",
    note: "Native Solana reserve asset.",
    priceUsd: 180,
  },
  {
    ticker: "ETH",
    name: "Ethereum on Solana",
    address: "7vfCXTUXxNiyY1g5gTts2yY2Kf4XR3hqqnz9TQ9p8W8",
    decimals: 8,
    logo: "/globe.svg",
    color: "#8b8cff",
    note: "Wormhole ETH-style reward slot.",
    priceUsd: 3200,
  },
  {
    ticker: "ANSEM",
    name: "Ansem",
    address: "9cRCn9rGT8V2imeM2BaKs13yhMEais3ruM3rPvTGpump",
    decimals: 6,
    logo: "/getpack-ansem.png",
    color: "#ff7a18",
    note: "Pump.fun culture coin.",
    priceUsd: 0.012,
  },
  {
    ticker: "JIMOTHY",
    name: "Jimothy",
    address: "Ge87EtsjwRQbHaqQmKRno69RFTwh9bfSsm99XNxTpump",
    decimals: 6,
    logo: "/getpack-jim.png",
    color: "#d9ff5a",
    note: "Pump.fun meme reward.",
    priceUsd: 0.008,
  },
];

export function solanaExplorerUrl(address: string) {
  return `https://solscan.io/token/${address}`;
}
