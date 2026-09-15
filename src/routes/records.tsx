import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Blocks, Link2, ShieldCheck, ShieldAlert, Search, RefreshCw } from "lucide-react";
import { SiteShell, Panel, Hash } from "@/components/site-shell";
import { formatTime, loadLedger, type BlockKind, type Ledger } from "@/lib/chain";
import { useWeb3 } from "@/hooks/use-web3";
import { getOnChainEvents, type OnChainEventRecord } from "@/lib/web3";

export const Route = createFileRoute("/records")({
  head: () => ({
    meta: [
      { title: "Blockchain Records Explorer — PharmaLedger" },
      {
        name: "description",
        content:
          "Browse live on-chain Ethereum blocks and events for pharmaceutical batches: transaction hashes, timestamps, custody transitions, and contract integrity.",
      },
      { property: "og:title", content: "Blockchain Records Explorer — PharmaLedger" },
      {
        property: "og:description",
        content:
          "Blocks, hashes, timestamps, and smart contract event logs for drug supply chain batches.",
      },
    ],
  }),
  component: Records,
});

type ExplorerRecord = {
  id: string;
  index: number;
  kind: BlockKind;
  timestamp: string;
  txHash: string;
  blockHash?: string;
  prevHash?: string;
  summary: string;
  productId: string;
  valid: boolean;
  isOnChain: boolean;
};

const filters: { key: BlockKind | "ALL"; label: string }[] = [
  { key: "ALL", label: "All Records" },
  { key: "REGISTER", label: "Registrations" },
  { key: "DISPATCH", label: "Shipments" },
  { key: "RECEIVE", label: "Store Intakes" },
  { key: "DISPENSE", label: "Dispenses" },
  { key: "VERIFY", label: "Verifications" },
  { key: "FLAG_COUNTERFEIT", label: "Alerts" },
];

const kindTone: Record<BlockKind, string> = {
  REGISTER: "border-primary/30 bg-primary-soft text-primary",
  TRANSFER: "border-accent/40 bg-accent/10 text-accent",
  DISPATCH: "border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400",
  RECEIVE: "border-purple-500/30 bg-purple-500/10 text-purple-600 dark:text-purple-400",
  DISPENSE: "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  VERIFY: "border-border bg-secondary text-muted-foreground",
  FLAG_COUNTERFEIT: "border-destructive/40 bg-destructive/10 text-destructive",
  STAKEHOLDER_REGISTER: "border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400",
  STAKEHOLDER_REVOKE: "border-destructive/30 bg-destructive/10 text-destructive",
};

function Records() {
  const { status, config, refreshStatus } = useWeb3();
  const [ledger, setLedger] = useState<Ledger>({
    products: [],
    blocks: [],
    stakeholders: [],
    alerts: [],
  });
  const [onChainEvents, setOnChainEvents] = useState<OnChainEventRecord[]>([]);
  const [filter, setFilter] = useState<BlockKind | "ALL">("ALL");
  const [query, setQuery] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [displayCount, setDisplayCount] = useState(30);

  useEffect(() => {
    setLedger(loadLedger());
  }, []);

  useEffect(() => {
    if (status.connected) {
      getOnChainEvents(config).then(setOnChainEvents);
    }
  }, [status.connected, config]);

  async function handleRefresh() {
    setRefreshing(true);
    await refreshStatus();
    if (status.connected) {
      const events = await getOnChainEvents(config);
      setOnChainEvents(events);
    }
    setRefreshing(false);
  }

  // Unified records
  const allRecords: ExplorerRecord[] = useMemo(() => {
    if (status.connected && onChainEvents.length > 0) {
      return onChainEvents.map((evt) => {
        const isRegister = evt.kind === "BATCH_CREATED";
        return {
          id: `${evt.txHash}-${evt.batchId}`,
          index: evt.blockNumber,
          kind: isRegister ? "REGISTER" : "TRANSFER",
          timestamp: evt.timestamp,
          txHash: evt.txHash,
          blockHash: evt.txHash,
          prevHash: "0x" + "0".repeat(64),
          summary: evt.summary,
          productId: `BATCH-#${evt.batchId}`,
          valid: true,
          isOnChain: true,
        };
      });
    }

    // Fallback to local simulation ledger
    return ledger.blocks.map((b) => ({
      id: String(b.index),
      index: b.index,
      kind: b.kind,
      timestamp: b.timestamp,
      txHash: b.txHash,
      blockHash: b.hash,
      prevHash: b.prevHash,
      summary: b.summary,
      productId: b.productId,
      valid: b.valid,
      isOnChain: false,
    }));
  }, [status.connected, onChainEvents, ledger.blocks]);

  const filteredBlocks = useMemo(() => {
    const q = query.trim().toLowerCase();
    return allRecords
      .filter((b) => (filter === "ALL" ? true : b.kind === filter))
      .filter((b) =>
        q
          ? b.txHash.toLowerCase().includes(q) ||
            b.productId.toLowerCase().includes(q) ||
            b.summary.toLowerCase().includes(q)
          : true,
      )
      .sort((a, b) => b.index - a.index);
  }, [allRecords, filter, query]);

  const visibleBlocks = useMemo(() => {
    return filteredBlocks.slice(0, displayCount);
  }, [filteredBlocks, displayCount]);

  return (
    <SiteShell>
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">Explorer</p>
            {status.connected ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <span className="size-1.5 rounded-full bg-emerald-500"></span> Live Ethereum Records
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-600 dark:text-amber-400 border border-amber-500/20">
                Simulated Records
              </span>
            )}
          </div>
          <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">Blockchain records</h1>
          <p className="mt-3 max-w-xl text-sm text-muted-foreground">
            Cryptographic ledger of batch creations, custody handoffs, and verification events
            written to the blockchain.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
          >
            <RefreshCw className={`size-3.5 ${refreshing ? "animate-spin" : ""}`} /> Refresh records
          </button>
        </div>
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="card-surface p-5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {status.connected ? "Current Block Height" : "Chain Height"}
          </p>
          <p className="mt-2 flex items-center gap-2 text-2xl font-semibold tracking-tight">
            <Blocks className="size-5 text-primary" />
            {status.connected ? `#${status.blockNumber}` : allRecords.length}
          </p>
        </div>
        <div className="card-surface p-5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {status.connected ? "On-Chain Batches" : "Batches Tracked"}
          </p>
          <p className="mt-2 text-2xl font-semibold tracking-tight">
            {status.connected ? status.batchCount : ledger.products.length}
          </p>
        </div>
        <div className="card-surface p-5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Smart Contract Status
          </p>
          <p
            className={`mt-2 flex items-center gap-2 text-2xl font-semibold tracking-tight ${
              status.connected ? "text-success" : "text-amber-500"
            }`}
          >
            <Link2 className="size-5" />
            {status.connected ? "Active & Verified" : "Simulated"}
          </p>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => {
              setFilter(f.key);
              setDisplayCount(30);
            }}
            className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
              filter === f.key
                ? "border-primary bg-primary-soft text-primary"
                : "border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {f.label}
          </button>
        ))}
        <label className="ml-auto flex min-w-56 items-center gap-2 rounded-xl border border-input bg-background px-3 py-1.5">
          <Search className="size-3.5 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setDisplayCount(30);
            }}
            placeholder="search hash or batch ID"
            className="w-full bg-transparent font-mono text-xs outline-none placeholder:text-muted-foreground/60"
          />
        </label>
      </div>

      <div className="mt-5 space-y-4">
        {visibleBlocks.map((b) => (
          <RecordCard key={b.id} record={b} />
        ))}
        {!filteredBlocks.length && (
          <Panel>
            <p className="text-sm text-muted-foreground">
              No blockchain records match this filter or search query.
            </p>
          </Panel>
        )}
        {filteredBlocks.length > visibleBlocks.length && (
          <div className="flex justify-center pt-2">
            <button
              onClick={() => setDisplayCount((prev) => prev + 50)}
              className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-5 py-2 text-xs font-semibold text-foreground transition-colors hover:bg-secondary"
            >
              Show More (Showing {visibleBlocks.length} of {filteredBlocks.length} blocks)
            </button>
          </div>
        )}
      </div>
    </SiteShell>
  );
}

function RecordCard({ record }: { record: ExplorerRecord }) {
  return (
    <Panel>
      <div className="flex flex-wrap items-center gap-3">
        <span className="font-mono text-sm font-semibold">
          {record.isOnChain ? `Block #${record.index}` : `#${record.index}`}
        </span>
        <span
          className={`rounded-full border px-2.5 py-0.5 font-mono text-[11px] uppercase tracking-widest ${kindTone[record.kind]}`}
        >
          {record.kind}
        </span>
        <span className="font-mono text-[11px] text-muted-foreground">
          {formatTime(record.timestamp)}
        </span>
        <div className="ml-auto flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 text-xs ${
              record.valid ? "text-success" : "text-destructive"
            }`}
          >
            {record.valid ? <ShieldCheck className="size-4" /> : <ShieldAlert className="size-4" />}
            {record.isOnChain ? "On-Chain Verified" : "Verified"}
          </span>
        </div>
      </div>

      <p className="mt-3 text-sm">{record.summary}</p>
      <p className="mt-1 font-mono text-[11px] text-muted-foreground">
        identifier: {record.productId}
      </p>

      <dl className="mt-4 grid gap-3 sm:grid-cols-2">
        <div>
          <dt className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Transaction Hash
          </dt>
          <dd className="mt-1">
            <Hash value={record.txHash} />
          </dd>
        </div>
        <div>
          <dt className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {record.isOnChain ? "Network" : "Block Hash"}
          </dt>
          <dd className="mt-1">
            {record.isOnChain ? (
              <span className="font-mono text-xs text-muted-foreground">
                Ethereum Hardhat Local (Chain ID 31337)
              </span>
            ) : (
              <Hash value={record.blockHash ?? "—"} />
            )}
          </dd>
        </div>
      </dl>
    </Panel>
  );
}
