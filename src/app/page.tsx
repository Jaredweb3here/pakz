"use client";

import { useState, type KeyboardEvent } from "react";
import Image from "next/image";
import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import {
  ArrowUpRight,
  Check,
  ChevronDown,
  CircleDollarSign,
  Coins,
  Dices,
  ExternalLink,
  LockKeyhole,
  Radio,
  ShieldCheck,
  TriangleAlert,
  Wallet,
  Zap,
} from "lucide-react";
import { HoodPackzBrand } from "@/components/brand/hoodpackz-brand";
import { DemoPackOpening } from "@/components/hoodpackz/demo-pack-opening";
import { GETPACK_TOKENS, solanaExplorerUrl } from "@/lib/getpack-tokens";

type SolanaProvider = {
  isPhantom?: boolean;
  publicKey?: { toString(): string };
  connect(options?: { onlyIfTrusted?: boolean }): Promise<{ publicKey: { toString(): string } }>;
  disconnect?(): Promise<void>;
};

declare global {
  interface Window {
    solana?: SolanaProvider;
  }
}

const TIERS = [
  {
    name: "Pulse Pack",
    price: 20,
    priceSol: 0.1,
    label: "PACK 01",
    image: "/trencher1.png",
    note: "Start here. Three Solana rewards from the GetPack reserve list.",
  },
  {
    name: "Ansem Signal",
    price: 50,
    priceSol: 0.25,
    label: "PACK 02",
    image: "/cashcat-max-pack.png",
    note: "A heavier Solana pull with ANSEM and JIMOTHY reward exposure.",
  },
  {
    name: "Whale Current",
    price: 120,
    priceSol: 0.6,
    label: "PACK 03",
    image: "/techpro-pack.png",
    note: "The max tier for SOL, ETH, ANSEM, and JIMOTHY allocations.",
  },
] as const;

function shortAddress(address: string) {
  return `${address.slice(0, 5)}...${address.slice(-4)}`;
}

function formatSol(value: number) {
  return `${value.toLocaleString("en-US", { maximumFractionDigits: 3 })} SOL`;
}

function SolWalletButton() {
  const [address, setAddress] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function connectWallet() {
    setError(null);
    const provider = window.solana;
    if (!provider?.connect) {
      setError("INSTALL PHANTOM");
      window.open("https://phantom.app/", "_blank", "noopener,noreferrer");
      return;
    }

    try {
      setPending(true);
      const result = await provider.connect();
      setAddress(result.publicKey.toString());
    } catch (connectError) {
      setError(connectError instanceof Error ? "CONNECT CANCELLED" : "CONNECT FAILED");
    } finally {
      setPending(false);
    }
  }

  async function disconnectWallet() {
    setOpen(false);
    await window.solana?.disconnect?.();
    setAddress(null);
  }

  if (address) {
    return (
      <div className="hp-wallet-menu">
        <button
          type="button"
          className="hp-wallet"
          aria-expanded={open}
          aria-haspopup="menu"
          onClick={() => setOpen((value) => !value)}
        >
          <span className="hp-online-dot" />
          {shortAddress(address)}
          <ChevronDown size={14} />
        </button>
        {open && (
          <button type="button" className="hp-disconnect" role="menuitem" onClick={disconnectWallet}>
            Disconnect Solana wallet
          </button>
        )}
      </div>
    );
  }

  return (
    <button type="button" className="hp-wallet" disabled={pending} onClick={connectWallet} title={error ?? undefined}>
      <Wallet size={15} />
      {pending ? "CONNECTING" : error ?? "CONNECT SOLANA"}
    </button>
  );
}

export default function GetPackPage() {
  const [tierIndex, setTierIndex] = useState(0);
  const [demoOpen, setDemoOpen] = useState(false);
  const prefersReducedMotion = useReducedMotion();
  const { scrollYProgress } = useScroll();
  const heroPackY = useTransform(scrollYProgress, [0, 0.22], [0, prefersReducedMotion ? 0 : -72]);
  const tier = TIERS[tierIndex];
  const solanaProgramLive = false;

  function selectTier(index: number) {
    setTierIndex(index);
  }

  function selectTierByKey(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const direction = event.key === "ArrowRight" ? 1 : -1;
    const next = (index + direction + TIERS.length) % TIERS.length;
    selectTier(next);
    document.getElementById(`pack-tier-${next}`)?.focus();
  }

  return (
    <main id="top" className="hp-shell">
      <div className="hp-announcement">
        <span>GetPack Solana packs are staging on getpack.fun</span>
        <a href="#proof">See the Solana rollout <ArrowUpRight size={13} /></a>
      </div>

      <header className="hp-header">
        <HoodPackzBrand href="#top" />
        <nav className="hp-nav" aria-label="Primary navigation">
          <a href="#packs">PACKS</a>
          <a href="#assets">TOKENS</a>
          <a href="#proof">SOLANA</a>
          <a href="#economics">SPLIT</a>
          <a href="#transparency">STATUS</a>
        </nav>
        <SolWalletButton />
      </header>

      <section id="packs" className="hp-workbench" aria-labelledby="pack-heading">
        <motion.div
          className="hp-intro"
          initial={prefersReducedMotion ? false : { opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="hp-kicker">
            <span>SOLANA TOKEN PACKS / GETPACK</span>
            <span className="hp-launching"><i /> PROGRAM STAGING</span>
          </div>
          <h1 id="pack-heading">
            OPEN THE PULSE.<br /><span>SOLANA PACKS.</span>
          </h1>
          <p>
            GetPack is the Solana pack desk: pick a pack tier, preview a three-token pull,
            and stage rewards around SOL, ETH, ANSEM, and JIMOTHY before live settlement.
          </p>
          <div className="hp-pool-strip" aria-label="Four Solana assets in the GetPack pool">
            {GETPACK_TOKENS.map((token) => (
              <span key={token.address} title={token.ticker}>
                <Image src={token.logo} alt={`${token.name} logo`} width={34} height={34} />
              </span>
            ))}
            <small>4 SOLANA ASSETS</small>
          </div>
        </motion.div>

        <aside className="hp-market-rail" aria-label="GetPack pack desk">
          <div className="hp-rail-head">
            <span>PACK DESK</span>
            <strong>SOL SERIES 01</strong>
          </div>
          <div className="hp-tier-stack" role="radiogroup" aria-label="GetPack pack tier">
            {TIERS.map((option, index) => (
              <button
                key={option.name}
                id={`pack-tier-${index}`}
                type="button"
                role="radio"
                aria-checked={tierIndex === index}
                tabIndex={tierIndex === index ? 0 : -1}
                className={tierIndex === index ? "active" : ""}
                onClick={() => selectTier(index)}
                onKeyDown={(event) => selectTierByKey(event, index)}
              >
                <span>{option.label}</span>
                <strong>{option.name}</strong>
                <small>{formatSol(option.priceSol)}</small>
              </button>
            ))}
          </div>
          <div className="hp-market-metrics">
            <div><span>POOL</span><strong>4 ASSETS</strong></div>
            <div><span>MODE</span><strong>PREVIEW</strong></div>
            <div><span>CHAIN</span><strong>SOLANA</strong></div>
          </div>
        </aside>

        <motion.div
          className="hp-pack-gallery"
          style={{ y: heroPackY }}
          initial={prefersReducedMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.9, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
          aria-label="GetPack pack display"
        >
          {TIERS.map((option, index) => (
            <motion.button
              key={option.name}
              type="button"
              aria-pressed={tierIndex === index}
              className={`hp-pack-card ${tierIndex === index ? "active" : ""}`}
              onClick={() => selectTier(index)}
              onKeyDown={(event) => selectTierByKey(event, index)}
              whileHover={prefersReducedMotion ? undefined : { y: -12 }}
              whileTap={prefersReducedMotion ? undefined : { scale: 0.985 }}
              transition={{ type: "spring", stiffness: 240, damping: 24 }}
            >
              <span className="hp-pack-card-index">GETPACK.FUN / {option.label}</span>
              <span className={`hp-pack-card-art ${index === 0 ? "hp-pack-card-art-square" : ""}`}>
                <Image
                  src={option.image}
                  alt={`${option.name} GetPack pack`}
                  width={index === 0 ? 1254 : 1024}
                  height={index === 0 ? 1254 : 1536}
                  priority={index === 0}
                  sizes="(max-width: 760px) 78vw, (max-width: 1100px) 32vw, 27vw"
                />
              </span>
              <span className="hp-pack-card-meta">
                <span><strong>{option.name}</strong><small>{option.note}</small></span>
                <b>{formatSol(option.priceSol)}</b>
              </span>
            </motion.button>
          ))}
        </motion.div>

        <aside className="hp-reserve-panel" aria-label="GetPack reserve pool">
          <div className="hp-rail-head">
            <span>RESERVE POOL</span>
            <strong>ACTIVE LIST</strong>
          </div>
          <div className="hp-pull-list">
            <div className="hp-pull-title">
              <span>REWARD POOL</span>
              <span>4 ASSETS</span>
            </div>
            {GETPACK_TOKENS.map((token, index) => (
              <div className="hp-pull" key={token.ticker}>
                <span className="hp-mini-token">
                  <Image src={token.logo} alt="" width={28} height={28} />
                </span>
                <span>
                  <strong>{token.ticker}</strong>
                  <small>{token.name}</small>
                  <a
                    className="hp-token-address"
                    href={solanaExplorerUrl(token.address)}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={`${token.name} token on Solscan`}
                  >
                    {shortAddress(token.address)} <ExternalLink size={9} />
                  </a>
                </span>
                <span className="hp-pull-slot">SLOT {index + 1}</span>
              </div>
            ))}
          </div>
        </aside>

        <div className="hp-control-panel">
          <div className="hp-panel-head">
            <div>
              <span>SELECTED PACK</span>
              <strong>{tier.name}</strong>
            </div>
            <span className="hp-series">{tier.label}</span>
          </div>

          <div className="hp-selected-pack">
            <span>ENTRY</span>
            <strong>{formatSol(tier.priceSol)}</strong>
            <p>{tier.note}</p>
          </div>

          <div className="hp-total">
            <span>PACK PRICE</span>
            <strong>{formatSol(tier.priceSol)}</strong>
          </div>

          <button type="button" className="hp-locked-action" disabled>
            <LockKeyhole size={17} /> SOLANA PROGRAM STAGING
          </button>
          <button type="button" className="hp-demo-action" onClick={() => setDemoOpen(true)}>
            <Dices size={17} /> OPEN PACK PREVIEW
          </button>
          <p className="hp-action-note" aria-live="polite">
            Solana wallet connect is live in the UI. Real SOL payment and reward settlement need the GetPack Solana program address before public openings are enabled.
          </p>
        </div>

        <div className="hp-trust-row hp-workbench-trust">
          <span><ShieldCheck size={15} /> SOLANA WALLET</span>
          <span><Dices size={15} /> PACK PREVIEW</span>
          <span><Radio size={15} /> PROGRAM NEXT</span>
        </div>
      </section>

      <section className="hp-status-rail" aria-label="GetPack status">
        <div><Wallet size={16} /><span>WALLET</span><strong>SOLANA</strong></div>
        <div><ShieldCheck size={16} /><span>POOL</span><strong>SOL + MEMES</strong></div>
        <div><Zap size={16} /><span>SETTLEMENT</span><strong>PROGRAM NEXT</strong></div>
        <div className="hp-status-warning"><TriangleAlert size={16} /><span>PACKS</span><strong>PREVIEW</strong></div>
      </section>

      <section id="assets" className="hp-assets" aria-labelledby="assets-heading">
        <div className="hp-assets-head">
          <div>
            <span className="hp-section-label">SOLANA / SPL REWARDS</span>
            <h2 id="assets-heading">THE GETPACK POOL,<br />ON SOLANA.</h2>
          </div>
          <div className="hp-assets-state">
            <span>TOKENS</span>
            <strong>4 / 4 LISTED</strong>
            <small>{solanaProgramLive ? "PROGRAM ACTIVE" : "PROGRAM STAGING"}</small>
          </div>
        </div>

        <div className="hp-token-registry">
          <div className="hp-token-registry-head" aria-hidden="true">
            <span>ASSET</span>
            <span>MINT / ADDRESS</span>
            <span>DECIMALS</span>
            <span>EXPLORER</span>
          </div>
          {GETPACK_TOKENS.map((token, index) => (
            <a
              key={token.address}
              className="hp-token-registry-row"
              href={solanaExplorerUrl(token.address)}
              target="_blank"
              rel="noreferrer"
              aria-label={`${token.name} token on Solscan`}
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
              <span className="hp-token-explorer">VIEW <ExternalLink size={13} /></span>
              <span className="hp-token-number">0{index + 1}</span>
            </a>
          ))}
        </div>

        <p className="hp-assets-note">
          GetPack is staged around SOL, ETH, ANSEM, and JIMOTHY. Live settlement should be enabled only after the Solana program and reserve vault are deployed.
        </p>
      </section>

      <section id="economics" className="hp-economics" aria-labelledby="economics-heading">
        <div className="hp-section-label">SOLANA SPLIT</div>
        <div className="hp-economics-grid">
          <div className="hp-economics-copy">
            <h2 id="economics-heading">SOL IN.<br />TOKENS OUT.</h2>
            <p>
              The intended GetPack split keeps most SOL backing rewards, routes a slice to the jackpot, and leaves a small protocol margin.
            </p>
          </div>
          <div className="hp-split" aria-label="Opening split: 80 percent rewards, 10 percent jackpot, 10 percent protocol">
            <div className="hp-split-prize">80%</div>
            <div className="hp-split-jackpot">10%</div>
            <div className="hp-split-fee">10%</div>
          </div>
          <div className="hp-ledger">
            <div><Coins /><span>REWARDS</span><strong>80%</strong><small>Funds SOL and SPL token reserves</small></div>
            <div><CircleDollarSign /><span>JACKPOT</span><strong>10%</strong><small>Builds the SOL prize vault</small></div>
            <div><Check /><span>PROTOCOL</span><strong>10%</strong><small>Keeps GetPack running</small></div>
          </div>
        </div>
      </section>

      <section id="proof" className="hp-proof" aria-labelledby="proof-heading">
        <div className="hp-proof-head">
          <div>
            <span className="hp-section-label">SOLANA PROGRAM ROADMAP</span>
            <h2 id="proof-heading">CONNECT FIRST.<br />SETTLE AFTER PROGRAM DEPLOY.</h2>
          </div>
          <span className="hp-proof-note">GETPACK STAGING</span>
        </div>
        <div className="hp-proof-grid">
          <article><span>01</span><Wallet /><h3>CONNECT</h3><p>Use Phantom or another injected Solana wallet provider.</p></article>
          <article><span>02</span><ShieldCheck /><h3>RESERVE</h3><p>Prepare SOL, ETH, ANSEM, and JIMOTHY reserve accounts.</p></article>
          <article><span>03</span><Dices /><h3>REVEAL</h3><p>The preview simulates the three-token pull while the Solana program is staged.</p></article>
          <article><span>04</span><Zap /><h3>PROGRAM</h3><p>Enable live openings after the GetPack program and vault addresses are public.</p></article>
        </div>
      </section>

      <section id="transparency" className="hp-transparency" aria-labelledby="transparency-heading">
        <div className="hp-proof-head">
          <div>
            <span className="hp-section-label">LAUNCH STATUS</span>
            <h2 id="transparency-heading">GETPACK IS SOLANA.<br />LIVE OPENINGS NEXT.</h2>
          </div>
          <span className="hp-proof-note">PROGRAM STAGING</span>
        </div>
        <div className="hp-contract-grid">
          <a className="hp-contract-row" href="https://solscan.io" target="_blank" rel="noreferrer">
            <span className="hp-contract-label">GetPack Solana program</span>
            <code className="hp-contract-addr">PROGRAM ADDRESS PENDING</code>
            <span className="hp-contract-note">Add the program and vault addresses here after deployment.</span>
            <span className="hp-contract-cta">SOLSCAN <ExternalLink size={11} /></span>
          </a>
          <a className="hp-contract-row" href="https://getpack.fun" target="_blank" rel="noreferrer">
            <span className="hp-contract-label">GetPack public site</span>
            <code className="hp-contract-addr">GETPACK.FUN</code>
            <span className="hp-contract-note">Solana wallet connect, token pool, and preview mode are public now.</span>
            <span className="hp-contract-cta">OPEN <ExternalLink size={11} /></span>
          </a>
        </div>
      </section>

      <footer className="hp-footer">
        <div className="hp-footer-top">
          <div>
            <span className="hp-section-label">GETPACK ON SOLANA</span>
            <h2>THREE TOKENS.<br />ONE PULSE.</h2>
          </div>
          <nav aria-label="Footer navigation">
            <a href="#packs">Packs <ArrowUpRight size={18} /></a>
            <a href="#assets">Reward pool <ArrowUpRight size={18} /></a>
            <a href="https://getpack.fun" target="_blank" rel="noreferrer">getpack.fun <ArrowUpRight size={18} /></a>
          </nav>
        </div>
        <div className="hp-footer-word" aria-hidden="true">GETPACK</div>
        <div className="hp-footer-base">
          <p />
          <p>SOLANA / GETPACK / PREVIEW</p>
          <div>
            <a href="https://getpack.fun" target="_blank" rel="noreferrer" aria-label="GetPack home">WEB</a>
            <SolWalletButton />
            <a href="https://solscan.io" target="_blank" rel="noreferrer" aria-label="Solscan explorer"><ExternalLink size={18} /></a>
          </div>
        </div>
      </footer>

      <DemoPackOpening open={demoOpen} pack={tier} onClose={() => setDemoOpen(false)} />
    </main>
  );
}
