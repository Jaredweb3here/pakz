"use client";

import { useState, type KeyboardEvent } from "react";
import Image from "next/image";
import { AnimatePresence, motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import { ArrowDown, ArrowUpRight, ChevronDown, Dices, ExternalLink, Wallet } from "lucide-react";
import { HoodPackzBrand } from "@/components/brand/hoodpackz-brand";
import { LivingWordmark } from "@/components/getpack/living-wordmark";
import { DemoPackOpening } from "@/components/hoodpackz/demo-pack-opening";
import { GETPACK_TOKENS, solanaExplorerUrl } from "@/lib/getpack-tokens";

type SolanaProvider = {
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
    label: "PULSE",
    image: "/trencher1.png",
    note: "The first frequency. Three rewards pulled from the GetPack reserve list.",
  },
  {
    name: "Ansem Signal",
    price: 50,
    priceSol: 0.25,
    label: "SIGNAL",
    image: "/cashcat-max-pack.png",
    note: "A heavier pull tuned toward ANSEM and JIMOTHY reward exposure.",
  },
  {
    name: "Whale Current",
    price: 120,
    priceSol: 0.6,
    label: "CURRENT",
    image: "/techpro-pack.png",
    note: "The widest allocation across SOL, ETH, ANSEM, and JIMOTHY.",
  },
] as const;

function shortAddress(address: string) {
  return `${address.slice(0, 5)}...${address.slice(-4)}`;
}

function formatSol(value: number) {
  return `${value.toLocaleString("en-US", { maximumFractionDigits: 3 })} SOL`;
}

function reveal(reducedMotion: boolean | null, delay = 0) {
  return {
    initial: reducedMotion ? false : { opacity: 0, y: 44 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, amount: 0.22 },
    transition: { duration: 0.9, delay, ease: [0.16, 1, 0.3, 1] as const },
  };
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
    } catch {
      setError("CONNECT CANCELLED");
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
      <div className="gp-wallet-menu">
        <button type="button" className="gp-wallet" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
          {shortAddress(address)} <ChevronDown size={12} />
        </button>
        {open && <button type="button" className="gp-disconnect" onClick={disconnectWallet}>Disconnect</button>}
      </div>
    );
  }

  return (
    <button type="button" className="gp-wallet" disabled={pending} onClick={connectWallet} title={error ?? undefined}>
      <Wallet size={13} /> {pending ? "CONNECTING" : error ?? "CONNECT SOLANA"}
    </button>
  );
}

export default function GetPackPage() {
  const [tierIndex, setTierIndex] = useState(0);
  const [tokenIndex, setTokenIndex] = useState(0);
  const [demoOpen, setDemoOpen] = useState(false);
  const reducedMotion = useReducedMotion();
  const { scrollYProgress } = useScroll();
  const heroCaptionY = useTransform(scrollYProgress, [0, 0.16], [0, reducedMotion ? 0 : 52]);
  const tier = TIERS[tierIndex];
  const token = GETPACK_TOKENS[tokenIndex];

  function selectTierByKey(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const next = (index + (event.key === "ArrowRight" ? 1 : -1) + TIERS.length) % TIERS.length;
    setTierIndex(next);
    document.getElementById(`gp-tier-${next}`)?.focus();
  }

  return (
    <main className="gp-shell">
      <a className="gp-skip" href="#packs">Skip to packs</a>

      <section id="top" className="gp-hero" aria-labelledby="gp-title">
        <header className="gp-header">
          <HoodPackzBrand href="#top" />
          <nav aria-label="Primary navigation">
            <a href="#packs">Packs</a>
            <a href="#pool">Pool</a>
            <a href="#protocol">Protocol</a>
          </nav>
          <SolWalletButton />
        </header>

        <div id="gp-title" className="gp-title-label">GetPack</div>
        <LivingWordmark />

        <div className="gp-hero-caption-anchor">
          <motion.div className="gp-hero-caption" style={{ y: heroCaptionY }}>
            <span><i /> staging on Solana</span>
            <a href="#packs">enter the current <ArrowDown size={13} /></a>
          </motion.div>
        </div>
        <a className="gp-social" href="https://getpack.fun" target="_blank" rel="noreferrer">getpack.fun</a>
      </section>

      <section id="packs" className="gp-packs" aria-labelledby="packs-title">
        <div className="gp-section-line"><span>01 / PACKS</span><span>THREE FREQUENCIES</span></div>
        <div className="gp-pack-scene">
          <div className="gp-scene-word">
            <AnimatePresence mode="wait">
              <motion.h2
                id="packs-title"
                key={tier.label}
                initial={reducedMotion ? false : { opacity: 0, x: -80 }}
                animate={{ opacity: 1, x: 0 }}
                exit={reducedMotion ? undefined : { opacity: 0, x: 80 }}
                transition={{ duration: 0.72, ease: [0.16, 1, 0.3, 1] }}
              >
                {tier.label}
              </motion.h2>
            </AnimatePresence>
          </div>

          <motion.div className="gp-pack-intro" {...reveal(reducedMotion)}>
            <span>One pack / three pulls</span>
            <p>Select a frequency. Preview the reveal now; settlement opens after the public Solana program and reserve vault.</p>
          </motion.div>

          <div className="gp-tier-rail" role="radiogroup" aria-label="Choose a GetPack tier">
            {TIERS.map((option, index) => (
              <button
                id={`gp-tier-${index}`}
                key={option.name}
                type="button"
                role="radio"
                aria-checked={tierIndex === index}
                tabIndex={tierIndex === index ? 0 : -1}
                className={tierIndex === index ? "active" : ""}
                onClick={() => setTierIndex(index)}
                onKeyDown={(event) => selectTierByKey(event, index)}
              >
                <span>0{index + 1}</span> {option.label} <small>{formatSol(option.priceSol)}</small>
              </button>
            ))}
          </div>

          <div className="gp-pack-stage">
            <AnimatePresence mode="wait">
              <motion.figure
                key={tier.name}
                initial={reducedMotion ? false : { opacity: 0, rotate: -4, y: 30, scale: 0.94 }}
                animate={{ opacity: 1, rotate: 2, y: 0, scale: 1 }}
                exit={reducedMotion ? undefined : { opacity: 0, rotate: 5, y: -24, scale: 0.96 }}
                transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
              >
                <Image src={tier.image} alt={`${tier.name} GetPack pack`} width={1024} height={1536} priority sizes="(max-width: 760px) 72vw, 38vw" />
              </motion.figure>
            </AnimatePresence>
            <span className="gp-orbit gp-orbit-one" aria-hidden="true" />
          </div>

          <div className="gp-pack-meta-anchor">
            <motion.div className="gp-pack-meta" {...reveal(reducedMotion, 0.08)}>
              <div><span>Selected</span><strong>{tier.name}</strong></div>
              <div><span>Entry</span><strong>{formatSol(tier.priceSol)}</strong></div>
              <p>{tier.note}</p>
              <button type="button" onClick={() => setDemoOpen(true)}><Dices size={16} /> Open preview</button>
              <small>Live settlement is not enabled.</small>
            </motion.div>
          </div>
        </div>
      </section>

      <section id="pool" className="gp-pool" aria-labelledby="pool-title">
        <div className="gp-section-line"><span>02 / RESERVE</span><span>FOUR SOLANA ASSETS</span></div>
        <div className="gp-token-scene">
          <div className="gp-scene-word">
            <AnimatePresence mode="wait">
              <motion.h2
                id="pool-title"
                key={token.ticker}
                initial={reducedMotion ? false : { opacity: 0, y: 64 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reducedMotion ? undefined : { opacity: 0, y: -64 }}
                transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
              >
                {token.ticker}
              </motion.h2>
            </AnimatePresence>
          </div>

          <div className="gp-token-focus-anchor">
            <AnimatePresence mode="wait">
              <motion.div
                className="gp-token-focus"
                key={token.address}
                initial={reducedMotion ? false : { opacity: 0, scale: 0.88, rotate: -7 }}
                animate={{ opacity: 1, scale: 1, rotate: 3 }}
                exit={reducedMotion ? undefined : { opacity: 0, scale: 0.92, rotate: 8 }}
                transition={{ duration: 0.72, ease: [0.16, 1, 0.3, 1] }}
              >
                <Image src={token.logo} alt={`${token.name} logo`} width={520} height={520} />
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="gp-token-detail-anchor">
            <motion.div className="gp-token-detail" {...reveal(reducedMotion)}>
              <span>Reserve asset 0{tokenIndex + 1}</span>
              <strong>{token.name}</strong>
              <code>{shortAddress(token.address)}</code>
              <a href={solanaExplorerUrl(token.address)} target="_blank" rel="noreferrer">View on Solscan <ExternalLink size={14} /></a>
            </motion.div>
          </div>

          <div className="gp-token-rail" role="tablist" aria-label="GetPack reserve assets">
          {GETPACK_TOKENS.map((token, index) => (
            <button
              key={token.address}
              type="button"
              role="tab"
              aria-selected={tokenIndex === index}
              className={tokenIndex === index ? "active" : ""}
              onClick={() => setTokenIndex(index)}
            >
              <span>0{index + 1}</span> {token.ticker}
            </button>
          ))}
          </div>
        </div>
      </section>

      <section className="gp-split" aria-labelledby="split-title">
        <div className="gp-section-line"><span>03 / FLOW</span><span>SOL IN / TOKENS OUT</span></div>
        <div className="gp-flow-scene">
          <div className="gp-scene-word"><motion.h2 id="split-title" {...reveal(reducedMotion)}>80</motion.h2></div>
          <motion.p {...reveal(reducedMotion, 0.08)}>Most SOL is intended to flow back into rewards.</motion.p>
          <div className="gp-flow-ledger">
            <div><span>Rewards</span><strong>80%</strong></div>
            <div><span>Jackpot</span><strong>10%</strong></div>
            <div><span>Protocol</span><strong>10%</strong></div>
          </div>
        </div>
      </section>

      <section id="protocol" className="gp-protocol" aria-labelledby="protocol-title">
        <div className="gp-section-line"><span>04 / PROTOCOL</span><span>PUBLIC STATUS</span></div>
        <motion.div className="gp-protocol-copy" {...reveal(reducedMotion)}>
          <p>Current state</p>
          <h2 id="protocol-title">Live now.<br /><em>Settlement next.</em></h2>
        </motion.div>
        <div className="gp-status-ledger">
          <div><span>Wallet</span><strong>Connects now</strong><i>Ready</i></div>
          <div><span>Preview</span><strong>Opens now</strong><i>Ready</i></div>
          <div><span>Program</span><strong>Address pending</strong><i>Next</i></div>
          <div><span>Vaults</span><strong>Reserve pending</strong><i>Next</i></div>
        </div>
        <a className="gp-protocol-link" href="/docs">Read protocol status <ArrowUpRight size={18} /></a>
      </section>

      <footer className="gp-footer">
        <div className="gp-footer-mark" aria-hidden="true">GetPack</div>
        <div className="gp-footer-base">
          <span>Solana token packs / preview mode</span>
          <a href="#top">Back to top <ArrowUpRight size={13} /></a>
          <span>getpack.fun</span>
        </div>
      </footer>

      <DemoPackOpening open={demoOpen} pack={tier} onClose={() => setDemoOpen(false)} />
    </main>
  );
}
