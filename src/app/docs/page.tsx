import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Check, Clock3, LockKeyhole, ShieldCheck } from "lucide-react";
import { HoodPackzBrand } from "@/components/brand/hoodpackz-brand";

export const metadata: Metadata = {
  title: "Protocol Status | GetPack",
  description: "GetPack protocol notes, reserve model, economics, and deployment status.",
};

const STATUS = [
  { name: "Solana wallet connect", state: "Ready", ready: true },
  { name: "Pack preview", state: "Ready", ready: true },
  { name: "SOL reserve", state: "Staged", ready: true },
  { name: "ANSEM reserve", state: "Staged", ready: true },
  { name: "Solana program", state: "Pending", ready: false },
  { name: "Vault addresses", state: "Pending", ready: false },
  { name: "External audit review", state: "Ongoing", ready: false },
] as const;

export default function DocsPage() {
  return (
    <main className="hp-shell hp-docs-shell">
      <header className="hp-header hp-docs-header">
        <HoodPackzBrand />
        <Link href="/" className="hp-docs-back"><ArrowLeft size={15} /> BACK TO PACKS</Link>
      </header>

      <section className="hp-docs-hero">
        <div>
          <span className="hp-section-label">PROTOCOL STATUS</span>
          <h1>SOLANA PACKS.<br />PUBLIC STATUS.</h1>
        </div>
        <p>
          GetPack connects Solana wallets and previews token pulls. Live SOL payments and reward
          settlement stay disabled until the Solana program and vaults are deployed.
        </p>
      </section>

      <section className="hp-docs-grid">
        <article className="hp-docs-status">
          <div className="hp-docs-title"><span>BUILD STATUS</span><strong>{STATUS.filter((item) => item.ready).length} / {STATUS.length}</strong></div>
          {STATUS.map((item) => (
            <div key={item.name} className="hp-docs-row">
              {item.ready ? <Check size={16} /> : <Clock3 size={16} />}
              <span>{item.name}</span>
              <strong className={item.ready ? "ready" : "pending"}>{item.state}</strong>
            </div>
          ))}
        </article>

        <aside className="hp-docs-callout">
          <LockKeyhole size={28} />
          <span>MAINNET ACTIONS</span>
          <strong>STAGING</strong>
          <p>Openings become wallet-submitted and non-custodial after the deployed Solana program is configured.</p>
        </aside>
      </section>

      <section className="hp-docs-spec">
        <div><span>PACKS</span><strong>0.1 / 0.25 / 0.6 SOL</strong><p>Each preview resolves to three different reward tokens.</p></div>
        <div><span>ECONOMICS</span><strong>80 / 10 / 10</strong><p>Reward reserve, SOL jackpot, and protocol operations.</p></div>
        <div><span>PROGRAM</span><strong>PENDING</strong><p>The live opening program address will be published after deployment.</p></div>
        <div><span>RESERVES</span><strong>SOL / ETH / MEMES</strong><p>Reserve vaults cover SOL, ETH, ANSEM, and JIMOTHY rewards.</p></div>
      </section>

      <section className="hp-docs-principles">
        <div>
          <span className="hp-section-label">GUARDRAILS</span>
          <h2>WHAT EVERY<br />OPENING CHECKS.</h2>
        </div>
        <ul>
          <li><ShieldCheck size={18} /><span>The public UI must not accept SOL until the program address is configured.</span></li>
          <li><ShieldCheck size={18} /><span>Rewards need funded vaults before a pack can accept payment.</span></li>
          <li><ShieldCheck size={18} /><span>Preview mode moves no funds and creates no onchain opening.</span></li>
          <li><ShieldCheck size={18} /><span>Program, vault, and audit status must stay visible before launch.</span></li>
        </ul>
      </section>

      <footer className="hp-footer hp-docs-footer">
        <HoodPackzBrand />
        <p>GETPACK STATUS AND TEST NOTES</p>
        <span>SOLANA / PREVIEW</span>
      </footer>
    </main>
  );
}
