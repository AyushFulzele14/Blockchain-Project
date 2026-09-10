import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import {
  ScanLine,
  PackagePlus,
  Blocks,
  ArrowRight,
  Fingerprint,
  Lock,
  Route as RouteIcon,
  Truck,
  Store,
  Users,
  ShieldCheck,
  Sparkles,
  Smartphone,
  CheckCircle2,
  FileSearch,
} from "lucide-react";
import { SiteShell, Panel } from "@/components/site-shell";
import { MedicineQrGallery } from "@/components/medicine-qr-gallery";
import { loadLedger, type Ledger } from "@/lib/chain";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "PharmaLedger — Blockchain Anti-Counterfeit Verification" },
      {
        name: "description",
        content:
          "5-Stakeholder blockchain pharmaceutical traceability network: Manufacturer, Distributor, Retailer, Consumer, and Administrator.",
      },
      { property: "og:title", content: "PharmaLedger — Blockchain Anti-Counterfeit Verification" },
      {
        property: "og:description",
        content:
          "Scan QR codes, authenticate origin records, and trace end-to-end custody from plant to patient.",
      },
    ],
  }),
  component: Home,
});

const stakeholders = [
  {
    roleNumber: 1,
    title: "Manufacturer",
    portal: "Mint & QR Portal",
    to: "/dashboard" as const,
    icon: PackagePlus,
    badgeColor: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30",
    description:
      "Registers genuine products on the blockchain, mints origin blocks with lot numbers and expiry, and generates unique serialized QR codes.",
    actionText: "Open Manufacturer Portal",
  },
  {
    roleNumber: 2,
    title: "Distributor / Supplier",
    portal: "Logistics Hub",
    to: "/distributor" as const,
    icon: Truck,
    badgeColor: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30",
    description:
      "Handles product movement through the supply chain, verifies factory origins, monitors cold-chain conditions, and records transit handoffs.",
    actionText: "Open Logistics Portal",
  },
  {
    roleNumber: 3,
    title: "Retailer / Pharmacy",
    portal: "Point of Sale",
    to: "/retailer" as const,
    icon: Store,
    badgeColor: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30",
    description:
      "Verifies products before stocking them, accepts sealed inventory, registers customer dispense at checkout, and quarantines suspect batches.",
    actionText: "Open Pharmacy Portal",
  },
  {
    roleNumber: 4,
    title: "Customer / Consumer",
    portal: "Verification App",
    to: "/verify" as const,
    icon: Users,
    badgeColor: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
    description:
      "Scans the pack QR code to verify whether medicine is genuine or counterfeit, views the complete 4-party custody trail, and reports fake medicine.",
    actionText: "Verify a Medicine Pack",
  },
  {
    roleNumber: 5,
    title: "Blockchain Administrator",
    portal: "Governance Console",
    to: "/admin" as const,
    icon: Lock,
    badgeColor: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30",
    description:
      "Manages the blockchain network, authorizes verified participant wallet addresses, configures role permissions, and investigates tamper alerts.",
    actionText: "Open Admin Portal",
  },
];

const pillars = [
  {
    icon: Fingerprint,
    title: "One Serial, One Truth",
    copy: "Every pack carries a unique cryptographic serial hashed into an immutable Ethereum smart contract block.",
  },
  {
    icon: RouteIcon,
    title: "Custody You Can Replay",
    copy: "Plant, logistics carrier, pharmacy — each handoff records a cryptographic block with verified wallet signatures.",
  },
  {
    icon: Lock,
    title: "Zero-Trust Tamper Evident",
    copy: "Any counterfeit copy or altered expiration date breaks the cryptographic chain visibly before reaching patients.",
  },
];

function Home() {
  const navigate = useNavigate();
  const [ledger, setLedger] = useState<Ledger>({
    products: [],
    blocks: [],
    stakeholders: [],
    alerts: [],
  });

  useEffect(() => {
    setLedger(loadLedger());
  }, []);

  function handleVerifyMedicine(code: string) {
    void navigate({
      to: "/verify",
      search: { code },
    });
  }

  return (
    <SiteShell>
      {/* Hero Section */}
      <section className="pb-14 text-center sm:text-left">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3.5 py-1 text-xs font-semibold text-primary">
            <ShieldCheck className="size-3.5" /> 5-Stakeholder Anti-Counterfeit Network
          </span>
          <span className="rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground font-mono">
            Solidity 0.8.28 · DrugTracker.sol
          </span>
        </div>

        <h1 className="mx-auto mt-6 max-w-4xl text-4xl font-bold leading-[1.08] tracking-tight sm:mx-0 sm:text-6xl">
          Counterfeit medicine stops at the{" "}
          <span className="text-primary">first hash mismatch.</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground sm:mx-0">
          PharmaLedger unites Manufacturers, Distributors, Retailers, Consumers, and Network
          Administrators on a unified blockchain ledger. Every pack is minted at the factory,
          verified across each supply chain handover, and proven authentic at the point of patient
          care.
        </p>

        <div className="mt-8 flex flex-wrap justify-center gap-3 sm:justify-start">
          <Link
            to="/verify"
            className="inline-flex items-center gap-2 rounded-full bg-primary px-7 py-3.5 text-sm font-semibold text-primary-foreground shadow-card transition-all hover:shadow-lift"
          >
            <ScanLine className="size-4" /> Verify a Medicine Pack
          </Link>
          <a
            href="#scannable-medicines"
            className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/5 px-7 py-3.5 text-sm font-semibold text-primary transition-colors hover:bg-primary/10 shadow-sm"
          >
            <Smartphone className="size-4" /> View Scannable QR Codes
          </a>
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-7 py-3.5 text-sm font-semibold transition-colors hover:bg-secondary shadow-sm"
          >
            <PackagePlus className="size-4" /> Manufacturer Batch Minting
          </Link>
          <Link
            to="/admin"
            className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-5 py-3.5 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
          >
            <Lock className="size-4" /> Administrator Console
          </Link>
        </div>
      </section>

      {/* 3-Step Consumer Verification Guide Banner */}
      <section className="my-6 rounded-3xl border border-primary/20 bg-gradient-to-r from-primary/10 via-card to-secondary/30 p-6 sm:p-8 backdrop-blur-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <span className="text-xs font-bold uppercase tracking-[0.18em] text-primary">
              Patient & Consumer Protection
            </span>
            <h2 className="mt-1 text-xl font-bold sm:text-2xl text-foreground">
              How Consumers Verify Medicine in 3 Simple Steps
            </h2>
          </div>
          <Link
            to="/verify"
            className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline"
          >
            Open Full Verification App <ArrowRight className="size-3" />
          </Link>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-border/80 bg-card p-4">
            <span className="flex size-8 items-center justify-center rounded-xl bg-primary/10 text-primary font-bold text-xs mb-2">
              1
            </span>
            <h3 className="text-sm font-bold text-foreground">Locate QR & Serial ID</h3>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              Every genuine pack features a 2D Datamatrix QR code and serialized Pack ID (e.g.{" "}
              <code className="font-mono text-[11px] text-primary">PH-AMX-8842-0001</code>).
            </p>
          </div>

          <div className="rounded-2xl border border-border/80 bg-card p-4">
            <span className="flex size-8 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold text-xs mb-2">
              2
            </span>
            <h3 className="text-sm font-bold text-foreground">Scan with Phone Camera</h3>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              Point your iOS or Android camera at the QR code on the box to open the verification link,
              or enter the Pack ID directly.
            </p>
          </div>

          <div className="rounded-2xl border border-border/80 bg-card p-4">
            <span className="flex size-8 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-xs mb-2">
              3
            </span>
            <h3 className="text-sm font-bold text-foreground">View Cryptographic Proof</h3>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              Instantly inspect manufacturer origin, batch lot, expiration date, and complete custody
              handoffs on the Ethereum blockchain.
            </p>
          </div>
        </div>
      </section>

      {/* Live Scannable Medicines Showcase Section */}
      <div id="scannable-medicines" className="scroll-mt-24">
        <MedicineQrGallery
          products={ledger.products}
          title="Live Medicines with QR Codes & Serial IDs"
          subtitle="Point your mobile camera at any QR code on this screen or click 'Verify Pack' to test the instant authenticity check."
          onSelectProduct={handleVerifyMedicine}
        />
      </div>

      {/* 5 Stakeholders Section */}
      <section className="mt-16 border-t border-border pt-12">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">
              Multi-Party Governance
            </p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
              The 5 Stakeholders of Anti-Counterfeiting
            </h2>
            <p className="mt-1 text-sm text-muted-foreground max-w-2xl">
              Each stakeholder plays a cryptographic role in maintaining the chain of custody and
              guaranteeing genuine medicine distribution.
            </p>
          </div>
          <Link
            to="/records"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
          >
            <Blocks className="size-3.5" /> Explore Full Blockchain Ledger{" "}
            <ArrowRight className="size-3" />
          </Link>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {stakeholders.map((s) => {
            const Icon = s.icon;
            return (
              <Link key={s.to} to={s.to} className="group">
                <Panel className="h-full flex flex-col justify-between transition-all group-hover:shadow-lift group-hover:border-primary/50">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="flex size-11 items-center justify-center rounded-2xl bg-primary-soft text-primary shadow-sm">
                        <Icon className="size-5" />
                      </span>
                      <span
                        className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${s.badgeColor}`}
                      >
                        Stakeholder #{s.roleNumber}
                      </span>
                    </div>

                    <div className="mt-4">
                      <h3 className="text-base font-bold tracking-tight text-foreground group-hover:text-primary transition-colors">
                        {s.title}
                      </h3>
                      <p className="text-xs font-semibold text-primary/80 mt-0.5">{s.portal}</p>
                      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                        {s.description}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 pt-3 border-t border-border/60 flex items-center justify-between text-xs font-semibold text-primary">
                    <span>{s.actionText}</span>
                    <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-1" />
                  </div>
                </Panel>
              </Link>
            );
          })}

          {/* 6th Card: Blockchain Ledger Explorer */}
          <Link to="/records" className="group">
            <Panel className="h-full flex flex-col justify-between border-dashed transition-all group-hover:shadow-lift group-hover:border-primary/50">
              <div>
                <div className="flex items-center justify-between">
                  <span className="flex size-11 items-center justify-center rounded-2xl bg-secondary text-foreground">
                    <Blocks className="size-5" />
                  </span>
                  <span className="rounded-full bg-secondary border border-border px-2.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
                    Shared Ledger
                  </span>
                </div>
                <div className="mt-4">
                  <h3 className="text-base font-bold tracking-tight text-foreground group-hover:text-primary transition-colors">
                    Blockchain Records Explorer
                  </h3>
                  <p className="text-xs font-semibold text-muted-foreground mt-0.5">
                    Audit & Telemetry
                  </p>
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                    Walk blocks, view transaction hashes, inspect smart contract event logs, and
                    audit every custody handoff across all 5 stakeholders.
                  </p>
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-border/60 flex items-center justify-between text-xs font-semibold text-primary">
                <span>View Blockchain Explorer</span>
                <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-1" />
              </div>
            </Panel>
          </Link>
        </div>
      </section>

      {/* Pillars Section */}
      <div className="mt-16 grid gap-8 border-t border-border pt-12 sm:grid-cols-3">
        {pillars.map(({ icon: Icon, title, copy }) => (
          <div key={title} className="card-surface p-6">
            <span className="flex size-9 items-center justify-center rounded-xl bg-accent/10 text-accent mb-3">
              <Icon className="size-4" />
            </span>
            <h3 className="text-base font-semibold tracking-tight">{title}</h3>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{copy}</p>
          </div>
        ))}
      </div>
    </SiteShell>
  );
}
