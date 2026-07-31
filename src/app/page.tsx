"use client";

import { useState, type CSSProperties } from "react";
import Image from "next/image";
import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
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
  const [previewTierIndex, setPreviewTierIndex] = useState(0);
  const [demoOpen, setDemoOpen] = useState(false);
  const reducedMotion = useReducedMotion();
  const { scrollYProgress } = useScroll();
  const heroCaptionY = useTransform(scrollYProgress, [0, 0.16], [0, reducedMotion ? 0 : 52]);
  const previewTier = TIERS[previewTierIndex];

  function openPreview(index: number) {
    setPreviewTierIndex(index);
    setDemoOpen(true);
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

        <div className="gp-hero-products" aria-label="Pulse, Signal, and Current GetPack packs">
          {TIERS.map((option, index) => (
            <motion.figure
              key={option.name}
              className={`gp-hero-pack gp-hero-pack-${index + 1}`}
              initial={reducedMotion ? false : { opacity: 0, y: 70, rotate: 0 }}
              animate={{ opacity: 1, y: 0, rotate: index === 0 ? -10 : index === 2 ? 10 : 0 }}
              transition={{ duration: 1, delay: 0.18 + index * 0.11, ease: [0.16, 1, 0.3, 1] }}
            >
              <Image src={option.image} alt={`${option.name} pack`} width={1024} height={1536} priority sizes="(max-width: 760px) 31vw, 16vw" />
              <figcaption>0{index + 1} {option.label}</figcaption>
            </motion.figure>
          ))}
        </div>

        <div className="gp-hero-proof" aria-label="GetPack product summary">
          <span><strong>03</strong> packs</span>
          <span><strong>04</strong> assets</span>
          <span><strong>03</strong> pulls</span>
        </div>

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
        <motion.div className="gp-collection-intro" {...reveal(reducedMotion)}>
          <h2 id="packs-title">All packs.<br />No hidden tiers.</h2>
          <p>Every frequency is on the floor. Each pack previews three pulls from the GetPack reserve.</p>
        </motion.div>
        <div className="gp-pack-collection">
          {TIERS.map((option, index) => (
            <motion.article key={option.name} className="gp-pack-card" {...reveal(reducedMotion, index * 0.08)}>
              <header><span>0{index + 1} / {option.label}</span><strong>{formatSol(option.priceSol)}</strong></header>
              <figure>
                <span aria-hidden="true">{option.label}</span>
                <Image src={option.image} alt={`${option.name} GetPack pack`} width={1024} height={1536} sizes="(max-width: 760px) 76vw, 29vw" />
              </figure>
              <div className="gp-pack-card-copy">
                <h3>{option.name}</h3>
                <p>{option.note}</p>
                <button type="button" onClick={() => openPreview(index)}><Dices size={15} /> Open {option.label.toLowerCase()} preview</button>
                <small>Live settlement is not enabled.</small>
              </div>
            </motion.article>
          ))}
        </div>
      </section>

      <section id="pool" className="gp-pool" aria-labelledby="pool-title">
        <div className="gp-section-line"><span>02 / RESERVE</span><span>FOUR SOLANA ASSETS</span></div>
        <motion.div className="gp-collection-intro gp-reserve-intro" {...reveal(reducedMotion)}>
          <h2 id="pool-title">The reserve,<br />in full view.</h2>
          <p>Four Solana assets. No tabs, no concealed inventory. Contract addresses link directly to Solscan.</p>
        </motion.div>
        <div className="gp-reserve-grid">
          {GETPACK_TOKENS.map((token, index) => (
            <motion.article key={token.address} className="gp-reserve-card" {...reveal(reducedMotion, index * 0.07)}>
              <header><span>Reserve asset 0{index + 1}</span><strong>{token.ticker}</strong></header>
              <div className="gp-reserve-logo" style={{ "--token-color": token.color } as CSSProperties}>
                <Image src={token.logo} alt={`${token.name} logo`} width={520} height={520} />
              </div>
              <div className="gp-reserve-copy">
                <h3>{token.name}</h3>
                <p>{token.note}</p>
                <code title={token.address}>{shortAddress(token.address)}</code>
                <a href={solanaExplorerUrl(token.address)} target="_blank" rel="noreferrer">View on Solscan <ExternalLink size={14} /></a>
              </div>
            </motion.article>
          ))}
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

      <DemoPackOpening open={demoOpen} pack={previewTier} onClose={() => setDemoOpen(false)} />
    </main>
  );
}
