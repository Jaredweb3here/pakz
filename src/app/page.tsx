"use client";

import { useState } from "react";
import Image from "next/image";
import {
  ArrowUpRight,
  Check,
  ChevronDown,
  CircleDollarSign,
  Code2,
  Coins,
  Dices,
  ExternalLink,
  LockKeyhole,
  Radio,
  RefreshCw,
  ShieldCheck,
  TriangleAlert,
  Wallet,
  Zap,
} from "lucide-react";
import { useAccount, useConnect, useDisconnect, useSwitchChain } from "wagmi";
import { robinhoodChain } from "@/lib/chain";
import { HOODPACKZ_TOKENS, tokenExplorerUrl } from "@/lib/hoodpackz-tokens";
import { HoodPackzBrand } from "@/components/brand/hoodpackz-brand";

const TIERS = [
  { name: "Corner", price: 5, label: "ENTRY" },
  { name: "Block", price: 15, label: "CORE" },
  { name: "City", price: 50, label: "HEAT" },
] as const;

const TOKEN_POOLS = [
  [HOODPACKZ_TOKENS[0], HOODPACKZ_TOKENS[1], HOODPACKZ_TOKENS[2]],
  [HOODPACKZ_TOKENS[3], HOODPACKZ_TOKENS[4], HOODPACKZ_TOKENS[5]],
  [HOODPACKZ_TOKENS[6], HOODPACKZ_TOKENS[0], HOODPACKZ_TOKENS[3]],
] as const;

function shortAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function HoodWalletButton() {
  const { address, isConnected, chainId } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain, isPending: switching } = useSwitchChain();
  const [open, setOpen] = useState(false);

  if (isConnected && address) {
    if (chainId !== robinhoodChain.id) {
      return (
        <button
          type="button"
          className="hp-wallet hp-wallet-wrong"
          onClick={() => switchChain({ chainId: robinhoodChain.id })}
          disabled={switching}
        >
          <TriangleAlert size={15} />
          {switching ? "SWITCHING" : "SWITCH NETWORK"}
        </button>
      );
    }

    return (
      <div className="hp-wallet-menu">
        <button type="button" className="hp-wallet" onClick={() => setOpen((value) => !value)}>
          <span className="hp-online-dot" />
          {shortAddress(address)}
          <ChevronDown size={14} />
        </button>
        {open && (
          <button
            type="button"
            className="hp-disconnect"
            onClick={() => {
              setOpen(false);
              disconnect();
            }}
          >
            Disconnect wallet
          </button>
        )}
      </div>
    );
  }

  return (
    <button
      type="button"
      className="hp-wallet"
      disabled={isPending || connectors.length === 0}
      onClick={() => connectors[0] && connect({ connector: connectors[0] })}
    >
      <Wallet size={15} />
      {isPending ? "CONNECTING" : "CONNECT WALLET"}
    </button>
  );
}

export default function HoodPackzPage() {
  const [tierIndex, setTierIndex] = useState(1);
  const [poolIndex, setPoolIndex] = useState(0);
  const tier = TIERS[tierIndex];
  const tokens = TOKEN_POOLS[poolIndex];

  function reshufflePreview() {
    setPoolIndex((current) => (current + 1) % TOKEN_POOLS.length);
  }

  return (
    <main id="top" className="hp-shell">
      <header className="hp-header">
        <HoodPackzBrand href="#top" />
        <nav className="hp-nav" aria-label="Primary navigation">
          <a href="#packs">PACKS</a>
          <a href="#assets">TOKENS</a>
          <a href="#proof">PROOF</a>
          <a href="#economics">ECONOMICS</a>
        </nav>
        <HoodWalletButton />
      </header>

      <section id="packs" className="hp-workbench" aria-labelledby="pack-heading">
        <div className="hp-intro">
          <div className="hp-kicker">
            <span>PACK OPENING DESK / RHC 4663</span>
            <span className="hp-live"><i /> PREVIEW MODE</span>
          </div>
          <h1 id="pack-heading">
            THREE TOKENS.<br />ONE <span>SEALED DRAW.</span>
          </h1>
          <p>
            At launch, each USDG tier will draw three different assets from funded onchain
            inventory. No duplicates, no rerolls after the request is sealed.
          </p>
          <div className="hp-pool-strip" aria-label="Seven verified tokens in the pool">
            {HOODPACKZ_TOKENS.map((token) => (
              <span key={token.address} title={token.ticker}>
                <Image src={token.logo} alt={`${token.name} logo`} width={34} height={34} />
              </span>
            ))}
            <small>7 VERIFIED ASSETS</small>
          </div>
          <div className="hp-trust-row">
            <span><ShieldCheck size={15} /> 4-OF-7 BEACON</span>
            <span><Dices size={15} /> 3 UNIQUE OUTPUTS</span>
          </div>
        </div>

        <div className="hp-product-stage" aria-label={`${tier.name} pack preview`}>
          <div className={`hp-drop-ticket hp-drop-ticket-${tierIndex}`}>
            <div className="hp-ticket-head">
              <span>HOODPACKZ / DROP 001</span>
              <span className="hp-ticket-lock"><LockKeyhole size={12} /> NOT LIVE</span>
            </div>
            <div className="hp-ticket-price">
              <span>{tier.name} pack</span>
              <strong>${tier.price}<small> USDG</small></strong>
            </div>
            <div className="hp-ticket-rule">
              <span>OUTPUT</span>
              <strong>3 TOKENS / NO DUPES</strong>
            </div>
            <div className="hp-ticket-pulls" aria-label="Three token preview">
              {tokens.map((token, index) => (
                <div key={token.ticker} className="hp-ticket-token">
                  <span>0{index + 1}</span>
                  <Image src={token.logo} alt={`${token.name} logo`} width={64} height={64} />
                  <div>
                    <strong>{token.ticker}</strong>
                    <small>{token.name}</small>
                  </div>
                </div>
              ))}
            </div>
            <div className="hp-ticket-foot">
              <span>PREVIEW SELECTION</span>
              <span>FINAL DRAW: BEACON</span>
            </div>
          </div>
          <button type="button" className="hp-shuffle" onClick={reshufflePreview}>
            <RefreshCw size={14} /> SHUFFLE PREVIEW
          </button>
        </div>

        <div className="hp-control-panel">
          <div className="hp-panel-head">
            <div>
              <span>SELECT DROP</span>
              <strong>PACK TIER</strong>
            </div>
            <span className="hp-series">SERIES 01</span>
          </div>

          <div className="hp-tier-control" role="radiogroup" aria-label="Pack tier">
            {TIERS.map((option, index) => (
              <button
                key={option.name}
                type="button"
                role="radio"
                aria-checked={tierIndex === index}
                className={tierIndex === index ? "active" : ""}
                onClick={() => setTierIndex(index)}
              >
                <span>{option.label}</span>
                <strong>${option.price}</strong>
                <small>{option.name}</small>
              </button>
            ))}
          </div>

          <div className="hp-pull-list">
            <div className="hp-pull-title">
              <span>VERIFIED CONTRACTS</span>
              <span>3 / 7 SHOWN</span>
            </div>
            {tokens.map((token, index) => (
              <div className="hp-pull" key={token.ticker}>
                <span className="hp-mini-token">
                  <Image src={token.logo} alt="" width={28} height={28} />
                </span>
                <span>
                  <strong>{token.ticker}</strong>
                  <small>{token.name}</small>
                  <a
                    className="hp-token-address"
                    href={tokenExplorerUrl(token.address)}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={`${token.name} contract on Blockscout`}
                  >
                    {shortAddress(token.address)} <ExternalLink size={9} />
                  </a>
                </span>
                <span className="hp-pull-slot">SLOT {index + 1}</span>
              </div>
            ))}
          </div>

          <div className="hp-total">
            <span>PACK TOTAL</span>
            <strong>{tier.price}.00 <small>USDG</small></strong>
          </div>

          <button type="button" className="hp-locked-action" disabled>
            <LockKeyhole size={17} /> OPENING AFTER V2 DEPLOYMENT
          </button>
          <p className="hp-action-note">
            Preview only. This interface cannot approve tokens or move funds until the audited
            HoodPackz V2 core address is configured.
          </p>
        </div>
      </section>

      <section className="hp-status-rail" aria-label="Protocol status">
        <div><Radio size={16} /><span>BEACON</span><strong>4 / 7 THRESHOLD</strong></div>
        <div><ShieldCheck size={16} /><span>COLLATERAL</span><strong>EXPOSURE CAPPED</strong></div>
        <div><Zap size={16} /><span>SETTLEMENT</span><strong>ROBINHOOD CHAIN</strong></div>
        <div className="hp-status-warning"><TriangleAlert size={16} /><span>CORE</span><strong>NOT DEPLOYED</strong></div>
      </section>

      <section id="assets" className="hp-assets" aria-labelledby="assets-heading">
        <div className="hp-assets-head">
          <div>
            <span className="hp-section-label">ROBINHOOD CHAIN / VERIFIED ERC-20</span>
            <h2 id="assets-heading">THE REAL TOKEN POOL.</h2>
          </div>
          <div className="hp-assets-state">
            <span>CONTRACTS</span>
            <strong>7 / 7 ONCHAIN</strong>
            <small>PACK RESERVES NOT FUNDED</small>
          </div>
        </div>

        <div className="hp-token-registry">
          <div className="hp-token-registry-head" aria-hidden="true">
            <span>ASSET</span>
            <span>CONTRACT</span>
            <span>DECIMALS</span>
            <span>EXPLORER</span>
          </div>
          {HOODPACKZ_TOKENS.map((token, index) => (
            <a
              key={token.address}
              className="hp-token-registry-row"
              href={tokenExplorerUrl(token.address)}
              target="_blank"
              rel="noreferrer"
              aria-label={`${token.name} contract on Blockscout`}
            >
              <span className="hp-token-identity">
                <i><Image src={token.logo} alt={`${token.name} logo`} width={38} height={38} /></i>
                <span>
                  <strong>{token.ticker}</strong>
                  <small>{token.name}</small>
                </span>
              </span>
              <code>{token.address}</code>
              <span className="hp-token-decimals">{token.decimals}</span>
              <span className="hp-token-explorer">
                VIEW <ExternalLink size={13} />
              </span>
              <span className="hp-token-number">0{index + 1}</span>
            </a>
          ))}
        </div>

        <p className="hp-assets-note">
          These contracts exist on Robinhood Chain mainnet. HoodPackz will not distribute them
          until liquidity admission, inventory funding, and the V2 pack core are complete.
        </p>
      </section>

      <section id="economics" className="hp-economics" aria-labelledby="economics-heading">
        <div className="hp-section-label">EVERY DOLLAR ACCOUNTED FOR</div>
        <div className="hp-economics-grid">
          <div className="hp-economics-copy">
            <h2 id="economics-heading">NO MYSTERY<br />IN THE MARGIN.</h2>
            <p>
              Pack proceeds follow one published split. Prize value funds the three-token pull;
              the rest funds the jackpot and protocol operations.
            </p>
          </div>
          <div className="hp-split" aria-label="Pack proceeds: 80 percent prize value, 10 percent jackpot, 10 percent protocol">
            <div className="hp-split-prize" style={{ width: "80%" }}>80%</div>
            <div className="hp-split-jackpot" style={{ width: "10%" }}>10%</div>
            <div className="hp-split-fee" style={{ width: "10%" }}>10%</div>
          </div>
          <div className="hp-ledger">
            <div><Coins /><span>PRIZE EV</span><strong>80%</strong><small>Three different meme tokens</small></div>
            <div><CircleDollarSign /><span>USDG JACKPOT</span><strong>10%</strong><small>Paid from a capped vault</small></div>
            <div><Check /><span>PROTOCOL</span><strong>10%</strong><small>Operations and reserves</small></div>
          </div>
        </div>
      </section>

      <section id="proof" className="hp-proof" aria-labelledby="proof-heading">
        <div className="hp-proof-head">
          <div>
            <span className="hp-section-label">RANDOMNESS, WITH CONSEQUENCES</span>
            <h2 id="proof-heading">THE BEACON CAN BE VERIFIED.<br />THE OPERATORS CAN BE SLASHED.</h2>
          </div>
          <a href="https://github.com/Jaredweb3here/hoodpackz" target="_blank" rel="noreferrer">
            VIEW SOURCE <ArrowUpRight size={16} />
          </a>
        </div>
        <div className="hp-proof-grid">
          <article><span>01</span><Radio /><h3>REQUEST</h3><p>The pack locks its value before a randomness round is sealed.</p></article>
          <article><span>02</span><ShieldCheck /><h3>SIGN</h3><p>Four independent operators produce threshold BLS shares against bonded collateral.</p></article>
          <article><span>03</span><Dices /><h3>FINALIZE</h3><p>One unique aggregate signature becomes immutable randomness for the pull.</p></article>
          <article><span>04</span><Zap /><h3>DELIVER</h3><p>Randomness finalizes independently, even if delivery needs to be retried.</p></article>
        </div>
      </section>

      <footer className="hp-footer">
        <HoodPackzBrand />
        <p>HOODPACKZ V2 PREVIEW / ROBINHOOD CHAIN</p>
        <div>
          <a href="https://github.com/Jaredweb3here/hoodpackz" target="_blank" rel="noreferrer" aria-label="HoodPackz on GitHub"><Code2 size={18} /></a>
          <a href="https://robinhoodchain.blockscout.com" target="_blank" rel="noreferrer" aria-label="Robinhood Chain explorer"><ExternalLink size={18} /></a>
        </div>
      </footer>
    </main>
  );
}
