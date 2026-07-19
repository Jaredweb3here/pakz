import { ROBINHOOD_CHAIN_EXPLORER_URL } from "@/lib/chain";

export const HOODPACKZ_TOKENS = [
  {
    address: "0x020bfc650a365f8bb26819deaabf3e21291018b4",
    name: "Cash Cat",
    ticker: "CASHCAT",
    decimals: 18,
    color: "#f3c84b",
    logo: "/token-logos/cashcat.jpg",
  },
  {
    address: "0x56910d4409f3a0c78c64dd8d0545ff0705389870",
    name: "The Index",
    ticker: "Index",
    decimals: 18,
    color: "#86d6ef",
    logo: "/token-logos/index.jpg",
  },
  {
    address: "0xd7321801caae694090694ff55a9323139f043b88",
    name: "The Juggernaut",
    ticker: "JUGGERNAUT",
    decimals: 18,
    color: "#ff604d",
    logo: "/token-logos/juggernaut.jpg",
  },
  {
    address: "0x4a380618777eed8d513bcd6e983df3c5d2ba7777",
    name: "Real World Assets",
    ticker: "RWA",
    decimals: 18,
    color: "#68d391",
    logo: "/token-logos/rwa.jpg",
  },
  {
    address: "0x39dbed3a2bd333467115de45665cc57f813c4571",
    name: "Pons",
    ticker: "PONS",
    decimals: 18,
    color: "#bda78a",
    logo: "/token-logos/pons.jpg",
  },
  {
    address: "0x45242320dbb855eea8fd36804c6487e10e97fcf9",
    name: "TENDIES",
    ticker: "TENDIES",
    decimals: 18,
    color: "#ff9d3d",
    logo: "/token-logos/tendies.jpg",
  },
  {
    address: "0x0339f5459fc690ac85f1782e15782a151b4a9e1b",
    name: "Robinhood Wallet",
    ticker: "WALLET",
    decimals: 18,
    color: "#5c9ded",
    logo: "/token-logos/wallet.jpg",
  },
] as const;

export const PUBLIC_TOKEN_PRICE_USD_BY_TICKER: Record<string, number> = {
  CASHCAT: 0.0596,
  INDEX: 0.0161,
  JUGGERNAUT: 0.00343,
  PONS: 0.0167,
  RWA: 0.00114,
  TENDIES: 0.0246,
  WALLET: 0.00871,
};

export function tokenExplorerUrl(address: string) {
  return `${ROBINHOOD_CHAIN_EXPLORER_URL}/token/${address}`;
}
