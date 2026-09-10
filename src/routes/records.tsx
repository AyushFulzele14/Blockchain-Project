import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Blocks, Link2, ShieldCheck, ShieldAlert, Search } from "lucide-react";
import { SiteShell, Panel, Hash } from "@/components/site-shell";
import { formatTime, loadLedger, shortHash, type Block, type BlockKind, type Ledger } from "@/lib/chain";

export const Route = createFileRoute("/records")({
  head: () => ({
    meta: [
      { title: "Blockchain Records Explorer — PharmaLedger" },
      {
        name: "description",
        content:
          "Browse every block in the pharmaceutical ledger: transaction hashes, timestamps, custody events, and verification status.",
      },
      { property: "og:title", content: "Blockchain Records Explorer — PharmaLedger" },
      {
        property: "og:description",
        content: "Blocks, hashes, timestamps, and chain integrity for every registered drug batch.",
      },
    ],
  }),
  component: Records,
});

const filters: { key: BlockKind | "ALL"; label: string }[] = [
  { key: "ALL", label: "All" },
  { key: "REGISTER", label: "Registrations" },
  { key: "TRANSFER", label: "Transfers" },
  { key: "VERIFY", label: "Verifications" },
];

const kindTone: Record<BlockKind, string> = {
  REGISTER: "border-primary/40 bg-primary/10 text-primary",
  TRANSFER: "border-accent/40 bg-accent/10 text-accent",
  VERIFY: "border-border bg-secondary text-muted-foreground",
};

function Records() {
  const [ledger, setLedger] = useState<Ledger>({ products: [], blocks: [] });
  const [filter, setFilter] = useState<BlockKind | "ALL">("ALL");
  const [query, setQuery] = useState("");

  useEffect(() => {
    setLedger(loadLedger());
  }, []);

  const blocks = useMemo(() => {
    const q = query.trim().toLowerCase();
    return ledger.blocks
      .filter((b) => (filter === "ALL" ? true : b.kind === filter))
      .filter((b) =>
        q
          ? b.txHash.toLowerCase().includes(q) ||
            b.hash.toLowerCase().includes(q) ||
            b.productId.toLowerCase().includes(q) ||
            b.summary.toLowerCase().includes(q)
          : true,
      )
      .sort((a, b) => b.index - a.index);
  }, [ledger, filter, query]);

  const intact = ledger.blocks.every(
    (b, i) => i === 0 || b.prevHash === ledger.blocks[i - 1]?.hash,
  );

  return (
    <SiteShell>
      <header className="mb-8">
        <p className="font-mono text-xs uppercase tracking-[0.28em] text-primary">Explorer</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
          Blockchain records
        </h1>
        <p className="mt-3 max-w-xl text-sm text-muted-foreground">
          Every registration, custody handoff, and verification, in the order it was written.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-border/80 bg-card/70 p-4">
          <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
            Chain height
          </p>
          <p className="mt-2 flex items-center gap-2 text-2xl font-semibold tracking-tight">
            <Blocks className="size-5 text-primary" /> {ledger.blocks.length}
          </p>
        </div>
        <div className="rounded-xl border border-border/80 bg-card/70 p-4">
          <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
            Batches tracked
          </p>
          <p className="mt-2 text-2xl font-semibold tracking-tight">{ledger.products.length}</p>
        </div>
        <div className="rounded-xl border border-border/80 bg-card/70 p-4">
          <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
            Chain integrity
          </p>
          <p
            className={`mt-2 flex items-center gap-2 text-2xl font-semibold tracking-tight ${
              intact ? "text-primary" : "text-destructive"
            }`}
          >
            <Link2 className="size-5" /> {intact ? "Intact" : "Broken"}
          </p>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`rounded-md border px-3 py-1.5 text-xs transition-colors ${
              filter === f.key
                ? "border-primary/50 bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {f.label}
          </button>
        ))}
        <label className="ml-auto flex min-w-56 items-center gap-2 rounded-md border border-input bg-background/60 px-3 py-1.5">
          <Search className="size-3.5 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="search hash or serial"
            className="w-full bg-transparent font-mono text-xs outline-none placeholder:text-muted-foreground/60"
          />
        </label>
      </div>

      <div className="mt-5 space-y-4">
        {blocks.map((b) => (
          <BlockCard key={b.index} block={b} />
        ))}
        {!blocks.length ? (
          <Panel>
            <p className="text-sm text-muted-foreground">No blocks match this filter.</p>
          </Panel>
        ) : null}
      </div>
    </SiteShell>
  );
}

function BlockCard({ block }: { block: Block }) {
  return (
    <Panel>
      <div className="flex flex-wrap items-center gap-3">
        <span className="font-mono text-sm font-semibold">#{block.index}</span>
        <span
          className={`rounded-md border px-2 py-0.5 font-mono text-[11px] uppercase tracking-widest ${kindTone[block.kind]}`}
        >
          {block.kind}
        </span>
        <span className="font-mono text-[11px] text-muted-foreground">
          {formatTime(block.timestamp)}
        </span>
        <span
          className={`ml-auto inline-flex items-center gap-1.5 text-xs ${
            block.valid ? "text-primary" : "text-destructive"
          }`}
        >
          {block.valid ? <ShieldCheck className="size-4" /> : <ShieldAlert className="size-4" />}
          {block.valid ? "Verified" : "Flagged"}
        </span>
      </div>

      <p className="mt-3 text-sm">{block.summary}</p>
      <p className="mt-1 font-mono text-[11px] text-muted-foreground">
        serial {block.productId}
      </p>

      <dl className="mt-4 grid gap-3 sm:grid-cols-3">
        <div>
          <dt className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
            tx hash
          </dt>
          <dd className="mt-1">
            <Hash value={block.txHash} />
          </dd>
        </div>
        <div>
          <dt className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
            block hash
          </dt>
          <dd className="mt-1">
            <Hash value={block.hash} />
          </dd>
        </div>
        <div>
          <dt className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
            prev hash
          </dt>
          <dd className="mt-1 font-mono text-xs text-muted-foreground">
            {shortHash(block.prevHash, 8)}
          </dd>
        </div>
      </dl>
    </Panel>
  );
}
