import { http, createConfig } from "wagmi";
import { injected } from "wagmi/connectors/injected";

export const ROBINHOOD_CHAIN_RPC_URL = "https://rpc.mainnet.chain.robinhood.com";
export const ROBINHOOD_CHAIN_EXPLORER_URL = "https://robinhoodchain.blockscout.com";

export const robinhoodChain = {
  id: 4663,
  name: "Robinhood Chain",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: {
    default: { http: [ROBINHOOD_CHAIN_RPC_URL] },
  },
  blockExplorers: {
    default: {
      name: "Blockscout",
      url: ROBINHOOD_CHAIN_EXPLORER_URL,
    },
  },
} as const;

export const wagmiConfig = createConfig({
  chains: [robinhoodChain],
  connectors: [injected({ shimDisconnect: true })],
  transports: {
    [robinhoodChain.id]: http(ROBINHOOD_CHAIN_RPC_URL),
  },
  ssr: true,
});
