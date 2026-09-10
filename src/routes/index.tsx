import { createFileRoute, Link } from "@tanstack/react-router";
import { ScanLine, PackagePlus, Blocks, ArrowRight, Fingerprint, Lock, Route as RouteIcon } from "lucide-react";
import { SiteShell, Panel } from "@/components/site-shell";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "PharmaLedger — Blockchain Drug Traceability" },
      {
        name: "description",
        content:
          "Verify medicine authenticity, register batches, and audit every custody event on an immutable pharmaceutical supply-chain ledger.",
      },
      { property: "og:title", content: "PharmaLedger — Blockchain Drug Traceability" },
      {
        property: "og:description",
        content:
          "Scan a pack, confirm the batch against its on-chain origin record, and trace every handoff from plant to pharmacy.",
      },
    ],
  }),
  component: Home,
});

const actions = [
  {
    to: "/verify" as const,
    icon: ScanLine,
    label: "Verify a product",
    copy: "Scan or type a pack serial to confirm it against its origin block.",
  },
  {
    to: "/dashboard" as const,
    icon: PackagePlus,
    label: "Register a product",
    copy: "Mint a batch record, generate its QR label, and anchor the tx hash.",
  },
  {
    to: "/records" as const,
    icon: Blocks,
    label: "Blockchain records",
    copy: "Walk the chain: blocks, hashes, timestamps, verification status.",
  },
];

const pillars = [
  { icon: Fingerprint, title: "One serial, one truth", copy: "Every pack carries a unique serial hashed into its origin block." },
  { icon: RouteIcon, title: "Custody you can replay", copy: "Plant, distributor, pharmacy — each handoff appends a new block." },
  { icon: Lock, title: "Tamper-evident", copy: "Blocks link by hash, so a rewritten record breaks the chain visibly." },
];

function Home() {
  return (
    <SiteShell>
      <section className="pb-14">
        <p className="font-mono text-xs uppercase tracking-[0.28em] text-primary">
          Pharmaceutical integrity network
        </p>
        <h1 className="mt-4 max-w-3xl text-4xl font-semibold leading-[1.08] tracking-tight sm:text-6xl">
          Counterfeit medicine stops at the{" "}
          <span className="text-primary">first hash mismatch.</span>
        </h1>
        <p className="mt-5 max-w-xl text-base text-muted-foreground">
          PharmaLedger anchors every manufactured batch to an immutable block. Pharmacies and
          patients verify a pack in seconds; regulators replay its entire journey.
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Link
            to="/verify"
            className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
          >
            <ScanLine className="size-4" /> Verify a pack
          </Link>
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 rounded-md border border-border px-5 py-3 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
          >
            Manufacturer dashboard <ArrowRight className="size-4" />
          </Link>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-3">
        {actions.map(({ to, icon: Icon, label, copy }) => (
          <Link key={to} to={to} className="group">
            <Panel className="h-full transition-colors group-hover:border-primary/50">
              <Icon className="size-5 text-primary" />
              <h2 className="mt-4 text-base font-semibold tracking-tight">{label}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{copy}</p>
              <span className="mt-4 inline-flex items-center gap-1 font-mono text-xs text-accent">
                open <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
              </span>
            </Panel>
          </Link>
        ))}
      </div>

      <div className="mt-14 grid gap-8 border-t border-border/70 pt-10 sm:grid-cols-3">
        {pillars.map(({ icon: Icon, title, copy }) => (
          <div key={title}>
            <Icon className="size-4 text-accent" />
            <h3 className="mt-3 text-sm font-semibold">{title}</h3>
            <p className="mt-1.5 text-sm text-muted-foreground">{copy}</p>
          </div>
        ))}
      </div>
    </SiteShell>
  );
}
