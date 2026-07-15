"use client";

import { useSyncExternalStore } from "react";
import { useAccount, useConnect, useDisconnect, useSwitchChain } from "wagmi";

const subscribeNoop = () => () => {};
import { robinhoodChain } from "@/lib/chain";
import { Button } from "@/components/ui/button";
import { Wallet, AlertTriangle } from "lucide-react";
import { ProfileMenu } from "./profile-menu";

function truncateAddress(address: string) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export function WalletButton() {
  const { address, isConnected, chainId } = useAccount();
  const { connect, connectors, isPending, error, reset } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain, isPending: isSwitching } = useSwitchChain();

  // Hydration-safe injected-provider detection (null during SSR).
  const hasProvider = useSyncExternalStore(
    subscribeNoop,
    () => !!(window as Window & { ethereum?: unknown }).ethereum,
    () => null
  );

  const wrongChain = isConnected && chainId !== robinhoodChain.id;

  if (isConnected && address) {
    return (
      <div className="flex items-center gap-2">
        {wrongChain && (
          <Button
            size="sm"
            variant="destructive"
            className="h-8 gap-1.5 text-xs"
            onClick={() => switchChain({ chainId: robinhoodChain.id })}
            disabled={isSwitching}
          >
            <AlertTriangle className="h-3 w-3" />
            {isSwitching ? "Switching…" : "Switch Network"}
          </Button>
        )}
        <ProfileMenu address={address} onDisconnect={() => disconnect()} />
      </div>
    );
  }

  // No wallet extension: send the user to get one instead of failing silently.
  if (hasProvider === false) {
    return (
      <Button
        size="sm"
        className="h-9 gap-1.5 rounded-full bg-white/[0.08] px-4 text-xs font-medium text-white hover:bg-white/[0.12]"
        onClick={() => window.open("https://metamask.io/download/", "_blank", "noopener")}
      >
        <Wallet className="h-3.5 w-3.5" />
        Install a Wallet
      </Button>
    );
  }

  const injectedConnector = connectors.find((c) => c.id === "injected") ?? connectors[0];

  function handleConnect() {
    if (!injectedConnector) return;
    reset();
    // Connect WITHOUT forcing a chain switch: if the wallet can't add or
    // reach the Robinhood Chain RPC mid-connect, the entire connection
    // fails. Connect first; the "Switch Network" prompt handles the rest.
    connect({ connector: injectedConnector });
  }

  return (
    <div className="flex items-center gap-2">
      {error && (
        <span className="hidden max-w-[180px] truncate text-[11px] text-red-400/90 md:inline" title={error.message}>
          {error.message.split(".")[0]}
        </span>
      )}
      <Button
        size="sm"
        className="h-9 gap-1.5 rounded-full bg-white/[0.08] px-4 text-xs font-medium text-white hover:bg-white/[0.12]"
        onClick={handleConnect}
        disabled={isPending || !injectedConnector}
      >
        <Wallet className="h-3.5 w-3.5" />
        {isPending ? "Connecting…" : error ? "Retry Connect" : "Connect Wallet"}
      </Button>
    </div>
  );
}

export function useWalletReady() {
  const { isConnected, chainId } = useAccount();
  return isConnected && chainId === robinhoodChain.id;
}

export { truncateAddress };
