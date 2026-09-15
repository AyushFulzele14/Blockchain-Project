import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import {
  PackagePlus,
  Download,
  RotateCcw,
  ShieldCheck,
  ShieldAlert,
  ArrowRight,
  CheckCircle2,
  Cpu,
  Loader2,
  Sparkles,
} from "lucide-react";
import { SiteShell, Panel, Hash } from "@/components/site-shell";
import {
  formatTime,
  loadLedger,
  registerProduct,
  resetLedger,
  shortHash,
  type Ledger,
  type Product,
  type RegisterInput,
} from "@/lib/chain";
import { useWeb3 } from "@/hooks/use-web3";
import {
  createBatchOnChain,
  advanceStageOnChain,
  getAllBatchesOnChain,
  type OnChainBatch,
  STAGE_NAMES,
} from "@/lib/web3";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Manufacturer Dashboard — PharmaLedger" },
      {
        name: "description",
        content:
          "Register pharmaceutical batches on-chain, advance custody stages, generate printable QR labels, and review every verification event.",
      },
      { property: "og:title", content: "Manufacturer Dashboard — PharmaLedger" },
      {
        property: "og:description",
        content:
          "Batch registration, stage advancement, QR label generation, and verification history.",
      },
    ],
  }),
  component: Dashboard,
});

const emptyForm: RegisterInput = {
  name: "",
  batch: "",
  manufacturer: "Nordis Pharma Labs",
  dosage: "",
  quantity: 1000,
  mfgDate: "",
  expDate: "",
};

export type DashboardBatchItem = {
  id: string;
  batchId?: number;
  name: string;
  batch: string;
  manufacturer: string;
  dosage: string;
  quantity: number;
  mfgDate: string;
  expDate: string;
  registeredAt: string;
  txHash: string;
  blockIndex: number;
  stage: number;
  stageName: string;
  isOnChain: boolean;
};

const STAGE_BADGE_STYLES: Record<number, string> = {
  0: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30",
  1: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30",
  2: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30",
  3: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
};

function Dashboard() {
  const { status, config, refreshStatus } = useWeb3();
  const [ledger, setLedger] = useState<Ledger>({
    products: [],
    blocks: [],
    stakeholders: [],
    alerts: [],
  });
  const [onChainBatches, setOnChainBatches] = useState<OnChainBatch[]>([]);
  const [form, setForm] = useState<RegisterInput>(emptyForm);
  const [selected, setSelected] = useState<DashboardBatchItem | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [advancingId, setAdvancingId] = useState<string | number | null>(null);
  const [lastTxAlert, setLastTxAlert] = useState<{
    type: "create" | "advance";
    txHash: string;
    message: string;
  } | null>(null);

  // Load local ledger
  useEffect(() => {
    setLedger(loadLedger());
  }, []);

  // Fetch on-chain batches if connected
  useEffect(() => {
    if (status.connected) {
      getAllBatchesOnChain(config).then((batches) => {
        setOnChainBatches(batches);
      });
    } else {
      setOnChainBatches([]);
    }
  }, [status.connected, config]);

  // Combined batch list
  const combinedBatches: DashboardBatchItem[] = useMemo(() => {
    if (status.connected && onChainBatches.length > 0) {
      return onChainBatches.map((b) => {
        // Try to parse metadata if stored, or parse from string
        return {
          id: `BATCH-#${b.batchId}`,
          batchId: b.batchId,
          name: b.drugName,
          batch: `BATCH-${b.batchId}`,
          manufacturer: b.manufacturer,
          dosage: "Standard",
          quantity: 1000,
          mfgDate: new Date(b.lastUpdated * 1000).toISOString().split("T")[0] || "",
          expDate: "—",
          registeredAt: b.lastUpdatedFormatted,
          txHash: "0x" + "0".repeat(60) + b.batchId.toString(16).padStart(4, "0"),
          blockIndex: b.batchId,
          stage: b.stage,
          stageName: b.stageName,
          isOnChain: true,
        };
      });
    }

    // Fallback to local ledger
    return ledger.products.map((p) => ({
      ...p,
      stage: p.stage ?? 0,
      stageName: p.stageName ?? "Manufactured",
      isOnChain: false,
    }));
  }, [status.connected, onChainBatches, ledger.products]);

  useEffect(() => {
    if (!selected) {
      setQr(null);
      return;
    }
    let active = true;
    const qrPayload = selected.batchId ? String(selected.batchId) : selected.id;
    void QRCode.toDataURL(qrPayload, {
      margin: 1,
      width: 320,
      color: { dark: "#04211f", light: "#ffffff" },
    }).then((url) => {
      if (active) setQr(url);
    });
    return () => {
      active = false;
    };
  }, [selected]);

  const verifications = useMemo(
    () => ledger.blocks.filter((b) => b.kind === "VERIFY").sort((a, b) => b.index - a.index),
    [ledger],
  );

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setLastTxAlert(null);

    try {
      if (status.connected) {
        // Live On-Chain batch registration
        const compositeDrugName = `${form.name} [${form.batch}] (${form.dosage})`;
        const res = await createBatchOnChain(compositeDrugName, config);
        await refreshStatus();
        const updated = await getAllBatchesOnChain(config);
        setOnChainBatches(updated);

        const newBatchItem: DashboardBatchItem = {
          id: `BATCH-#${res.batchId}`,
          batchId: res.batchId,
          name: form.name,
          batch: form.batch,
          manufacturer: status.account || form.manufacturer,
          dosage: form.dosage,
          quantity: form.quantity,
          mfgDate: form.mfgDate,
          expDate: form.expDate,
          registeredAt: new Date().toLocaleString(),
          txHash: res.txHash,
          blockIndex: res.blockNumber,
          stage: 0,
          stageName: "Manufactured",
          isOnChain: true,
        };

        setSelected(newBatchItem);
        setLastTxAlert({
          type: "create",
          txHash: res.txHash,
          message: `Batch #${res.batchId} minted in Block #${res.blockNumber}!`,
        });
      } else {
        // Simulated local fallback
        const { ledger: next, product } = registerProduct(ledger, form);
        setLedger(next);
        setSelected({
          ...product,
          stage: 0,
          stageName: "Manufactured",
          isOnChain: false,
        });
        setLastTxAlert({
          type: "create",
          txHash: product.txHash,
          message: `Simulated batch ${product.batch} registered.`,
        });
      }

      setForm({ ...emptyForm, manufacturer: form.manufacturer });
    } catch (err: unknown) {
      alert(`Transaction failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleAdvanceStage(item: DashboardBatchItem) {
    if (!item.isOnChain || !item.batchId) {
      alert(
        "Stage advancement is enabled for on-chain batches. Start Hardhat node to use live stages.",
      );
      return;
    }

    if (item.stage >= 3) {
      alert("This batch is already at the final stage (Sold).");
      return;
    }

    setAdvancingId(item.batchId);
    try {
      const res = await advanceStageOnChain(item.batchId, config);
      await refreshStatus();
      const updated = await getAllBatchesOnChain(config);
      setOnChainBatches(updated);

      if (selected && selected.batchId === item.batchId) {
        setSelected({
          ...selected,
          stage: res.newStage,
          stageName: res.stageName,
        });
      }

      setLastTxAlert({
        type: "advance",
        txHash: res.txHash,
        message: `Batch #${item.batchId} advanced to stage: ${res.stageName}!`,
      });
    } catch (err: unknown) {
      alert(`Advance stage failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setAdvancingId(null);
    }
  }

  return (
    <SiteShell>
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex size-6 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500 border border-amber-500/20">
              <PackagePlus className="size-3.5" />
            </span>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-600 dark:text-amber-400">
              Stakeholder #1 · Manufacturer Portal
            </p>
            {status.connected ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <span className="size-1.5 rounded-full bg-emerald-500"></span> Live Blockchain Mode
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-600 dark:text-amber-400 border border-amber-500/20">
                Simulation Mode
              </span>
            )}
          </div>
          <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">
            Batch Registration & QR Minting
          </h1>
          <p className="mt-3 max-w-xl text-sm text-muted-foreground">
            Register authentic pharmaceutical batches on Ethereum, mint tamper-proof origin blocks,
            and generate printable serialized QR labels for packaging lines.
          </p>
        </div>
        {!status.connected && (
          <button
            onClick={() => {
              setLedger(resetLedger());
              setSelected(null);
            }}
            className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            <RotateCcw className="size-3.5" /> Reset demo data
          </button>
        )}
      </header>

      {/* Transaction Success Banner */}
      {lastTxAlert && (
        <div className="mb-6 flex items-start justify-between gap-3 rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-4 text-emerald-700 dark:text-emerald-300">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="size-5 shrink-0 text-emerald-500" />
            <div>
              <p className="text-sm font-semibold">{lastTxAlert.message}</p>
              <p className="mt-0.5 font-mono text-xs opacity-80">
                Tx Hash: {shortHash(lastTxAlert.txHash, 10)}
              </p>
            </div>
          </div>
          <button
            onClick={() => setLastTxAlert(null)}
            className="text-xs font-semibold opacity-70 hover:opacity-100"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat
          label={status.connected ? "On-chain batches" : "Batches registered"}
          value={String(combinedBatches.length)}
          subtitle={status.connected ? "DrugTracker.sol" : "Local ledger"}
        />
        <Stat
          label={status.connected ? "Ethereum block height" : "Blocks on chain"}
          value={status.connected ? `#${status.blockNumber}` : String(ledger.blocks.length)}
          subtitle={status.connected ? "Hardhat Node (8545)" : "Simulated chain"}
        />
        <Stat
          label="Verification checks"
          value={String(verifications.length)}
          subtitle="Customer & pharmacy scans"
        />
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:items-start">
        <Panel
          title="Register a product"
          hint={
            status.connected ? "Mints DrugTracker on-chain batch" : "Writes local REGISTER block"
          }
        >
          <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Product name"
              value={form.name}
              onChange={(v) => setForm({ ...form, name: v })}
              placeholder="Azithromycin 250mg Tablets"
              className="sm:col-span-2"
              required
            />
            <Input
              label="Batch identifier / lot"
              value={form.batch}
              onChange={(v) => setForm({ ...form, batch: v })}
              placeholder="AZI-4471"
              required
            />
            <Input
              label="Manufacturer"
              value={
                status.connected && status.account
                  ? `${status.account.slice(0, 12)}…`
                  : form.manufacturer
              }
              onChange={(v) => setForm({ ...form, manufacturer: v })}
              required
            />
            <Input
              label="Strength / Dosage"
              value={form.dosage}
              onChange={(v) => setForm({ ...form, dosage: v })}
              placeholder="250 mg"
              required
            />
            <Input
              label="Units"
              type="number"
              value={String(form.quantity)}
              onChange={(v) => setForm({ ...form, quantity: Number(v) || 0 })}
              required
            />
            <Input
              label="Manufactured on"
              type="date"
              value={form.mfgDate}
              onChange={(v) => setForm({ ...form, mfgDate: v })}
              required
            />
            <Input
              label="Expires on"
              type="date"
              value={form.expDate}
              onChange={(v) => setForm({ ...form, expDate: v })}
              required
            />
            <button
              type="submit"
              disabled={submitting}
              className="sm:col-span-2 inline-flex items-center justify-center gap-2 rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Confirming on Ethereum Blockchain...
                </>
              ) : (
                <>
                  <PackagePlus className="size-4" />
                  {status.connected
                    ? "Mint batch on Ethereum (createBatch)"
                    : "Register batch on chain"}
                </>
              )}
            </button>
          </form>
        </Panel>

        <Panel
          title="QR label"
          hint={
            selected
              ? selected.isOnChain
                ? `on-chain batch #${selected.batchId}`
                : `block #${selected.blockIndex}`
              : "select a batch"
          }
        >
          {selected ? (
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                {qr ? (
                  <img
                    src={qr}
                    alt={`QR code for ${selected.id}`}
                    className="size-32 rounded-2xl bg-card p-2 ring-1 ring-border"
                  />
                ) : (
                  <div className="size-32 animate-pulse rounded-2xl bg-secondary" />
                )}
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold">{selected.name}</p>
                    <span
                      className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                        STAGE_BADGE_STYLES[selected.stage] ?? "bg-secondary text-foreground"
                      }`}
                    >
                      {selected.stageName}
                    </span>
                  </div>
                  <p className="mt-1 font-mono text-xs text-muted-foreground">
                    {selected.batch} · {selected.dosage}
                  </p>
                  <p className="mt-2 font-mono text-xs">{selected.id}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {selected.manufacturer.slice(0, 16)}…
                  </p>
                </div>
              </div>

              {/* Stage Progression Bar */}
              <div className="rounded-xl border border-border bg-secondary/30 p-3">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                  Lifecycle Stage Progression
                </p>
                <div className="grid grid-cols-4 gap-1.5 text-center text-xs">
                  {STAGE_NAMES.map((sName, idx) => (
                    <div
                      key={sName}
                      className={`rounded-lg py-1.5 px-1 font-medium transition-all ${
                        idx <= selected.stage
                          ? "bg-primary text-primary-foreground font-semibold shadow-sm"
                          : "bg-background/60 text-muted-foreground border border-border/50"
                      }`}
                    >
                      <span className="block text-[10px] opacity-75">Step {idx + 1}</span>
                      <span className="truncate block">{sName}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-border bg-surface-muted p-3">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  origin transaction
                </p>
                <div className="mt-1.5">
                  <Hash value={selected.txHash} />
                </div>
              </div>

              <div className="flex flex-wrap gap-2 pt-1">
                {qr ? (
                  <a
                    href={qr}
                    download={`${selected.id}.png`}
                    className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-xs font-medium transition-colors hover:bg-secondary"
                  >
                    <Download className="size-3.5" /> Download label
                  </a>
                ) : null}

                {selected.isOnChain && selected.stage < 3 && (
                  <button
                    onClick={() => handleAdvanceStage(selected)}
                    disabled={advancingId === selected.batchId}
                    className="inline-flex items-center gap-1.5 rounded-full bg-secondary border border-border px-4 py-2 text-xs font-semibold hover:border-primary/50 transition-colors"
                  >
                    {advancingId === selected.batchId ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <ArrowRight className="size-3.5 text-primary" />
                    )}
                    Advance to {STAGE_NAMES[selected.stage + 1]}
                  </button>
                )}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Register a batch or pick one below to inspect details, advance stages, or generate its
              scannable QR label.
            </p>
          )}
        </Panel>
      </div>

      <Panel
        className="mt-5"
        title="Registered batches"
        hint={`${combinedBatches.length} total ${status.connected ? "(live on-chain)" : ""}`}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                <th className="pb-2 pr-4">ID / Serial</th>
                <th className="pb-2 pr-4">Product Name</th>
                <th className="pb-2 pr-4">Current Stage</th>
                <th className="pb-2 pr-4">Manufacturer</th>
                <th className="pb-2 pr-4">Tx / Timestamp</th>
                <th className="pb-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {combinedBatches.map((p) => (
                <tr
                  key={p.id}
                  className="border-b border-border/50 last:border-0 hover:bg-secondary/20 transition-colors"
                >
                  <td className="py-3 pr-4 font-mono text-xs font-medium">{p.id}</td>
                  <td className="py-3 pr-4 font-medium">{p.name}</td>
                  <td className="py-3 pr-4">
                    <span
                      className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                        STAGE_BADGE_STYLES[p.stage] ?? "bg-secondary text-foreground"
                      }`}
                    >
                      {p.stageName}
                    </span>
                  </td>
                  <td className="py-3 pr-4 font-mono text-xs text-muted-foreground">
                    {p.manufacturer.length > 16
                      ? `${p.manufacturer.slice(0, 8)}…${p.manufacturer.slice(-6)}`
                      : p.manufacturer}
                  </td>
                  <td className="py-3 pr-4 font-mono text-xs text-accent">{shortHash(p.txHash)}</td>
                  <td className="py-3 text-right">
                    <div className="inline-flex items-center gap-1.5">
                      {p.isOnChain && p.stage < 3 && (
                        <button
                          onClick={() => handleAdvanceStage(p)}
                          disabled={advancingId === p.batchId}
                          title={`Advance to ${STAGE_NAMES[p.stage + 1]}`}
                          className="rounded-full border border-primary/40 bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary hover:bg-primary/20 transition-colors disabled:opacity-50"
                        >
                          {advancingId === p.batchId ? (
                            <Loader2 className="size-3 animate-spin" />
                          ) : (
                            `Next: ${STAGE_NAMES[p.stage + 1]}`
                          )}
                        </button>
                      )}
                      <button
                        onClick={() => setSelected(p)}
                        className="rounded-full border border-border px-3 py-1 text-xs transition-colors hover:border-primary/50"
                      >
                        QR
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!combinedBatches.length && (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-sm text-muted-foreground">
                    No drug batches registered yet. Use the form above to register your first batch!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel className="mt-5" title="Verification history" hint={`${verifications.length} checks`}>
        {verifications.length ? (
          <ul className="space-y-3">
            {verifications.map((b) => (
              <li key={b.index} className="flex items-start gap-3">
                {b.valid ? (
                  <ShieldCheck className="mt-0.5 size-4 shrink-0 text-success" />
                ) : (
                  <ShieldAlert className="mt-0.5 size-4 shrink-0 text-destructive" />
                )}
                <div className="min-w-0">
                  <p className="text-sm">{b.summary}</p>
                  <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                    #{b.index} · {formatTime(b.timestamp)} · tx {shortHash(b.txHash)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">No packs have been verified yet.</p>
        )}
      </Panel>
    </SiteShell>
  );
}

function Stat({ label, value, subtitle }: { label: string; value: string; subtitle?: string }) {
  return (
    <div className="card-surface p-5">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold tracking-tight">{value}</p>
      {subtitle && <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>}
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  className = "",
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  className?: string;
  required?: boolean;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <input
        type={type}
        value={value}
        required={required}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1.5 w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none placeholder:text-muted-foreground/60 focus:border-primary"
      />
    </label>
  );
}
