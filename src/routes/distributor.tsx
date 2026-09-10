import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import {
  Truck,
  ShieldCheck,
  ShieldAlert,
  ArrowRight,
  Boxes,
  Loader2,
  CheckCircle2,
  ThermometerSnowflake,
  MapPin,
  Barcode,
  Clock,
  ScanLine,
} from "lucide-react";
import { SiteShell, Panel, Hash } from "@/components/site-shell";
import {
  loadLedger,
  dispatchBatch,
  shortHash,
  type Ledger,
  type Product,
  STAGE_NAMES,
  getActivePersona,
} from "@/lib/chain";
import { useWeb3 } from "@/hooks/use-web3";
import { advanceStageOnChain, getAllBatchesOnChain, type OnChainBatch } from "@/lib/web3";

export const Route = createFileRoute("/distributor")({
  head: () => ({
    meta: [
      { title: "Distributor & Supplier Portal — PharmaLedger" },
      {
        name: "description",
        content:
          "Handle pharmaceutical product movement through the supply chain, verify manufacturer origin, and log custody transit.",
      },
      { property: "og:title", content: "Distributor & Supplier Portal — PharmaLedger" },
      {
        property: "og:description",
        content: "Supply chain logistics, cold-chain verification, and transit status updates.",
      },
    ],
  }),
  component: DistributorPage,
});

function DistributorPage() {
  const { status, config, refreshStatus } = useWeb3();
  const [ledger, setLedger] = useState<Ledger>({
    products: [],
    blocks: [],
    stakeholders: [],
    alerts: [],
  });
  const [onChainBatches, setOnChainBatches] = useState<OnChainBatch[]>([]);
  const [activePersona, setActivePersonaState] = useState(getActivePersona());

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [destination, setDestination] = useState("MedPlus Central Pharmacy #104");
  const [carrierNotes, setCarrierNotes] = useState(
    "Temperature verified at 4.2°C (within 2°C - 8°C cold-chain spec). Reefer truck #RT-8812.",
  );
  const [dispatching, setDispatching] = useState(false);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    setLedger(loadLedger());
    setActivePersonaState(getActivePersona());

    const handlePersona = (e: Event) => {
      setActivePersonaState((e as CustomEvent).detail);
    };
    window.addEventListener("chaincare:persona_changed", handlePersona);
    return () => window.removeEventListener("chaincare:persona_changed", handlePersona);
  }, []);

  useEffect(() => {
    if (status.connected) {
      getAllBatchesOnChain(config).then(setOnChainBatches);
    }
  }, [status.connected, config]);

  // Products awaiting dispatch (Stage 0: Manufactured)
  const incomingBatches = useMemo(() => {
    return ledger.products.filter((p) => p.stage === 0);
  }, [ledger.products]);

  // Products currently in transit (Stage 1: Shipped)
  const inTransitBatches = useMemo(() => {
    return ledger.products.filter((p) => p.stage === 1);
  }, [ledger.products]);

  // Filtered list for search
  const filteredProducts = useMemo(() => {
    if (!searchQuery) return ledger.products;
    const q = searchQuery.toLowerCase();
    return ledger.products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.batch.toLowerCase().includes(q) ||
        p.id.toLowerCase().includes(q),
    );
  }, [ledger.products, searchQuery]);

  async function handleDispatch(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedProduct) return;
    setDispatching(true);
    setStatusNotice(null);

    try {
      const notes = `Dest: ${destination}. ${carrierNotes}`;

      if (status.connected) {
        // Try parsing batch ID
        const match = selectedProduct.id.match(/\d+/);
        const batchNum = match ? parseInt(match[0], 10) : selectedProduct.blockIndex;
        await advanceStageOnChain(batchNum, notes, config);
        await refreshStatus();
        const updated = await getAllBatchesOnChain(config);
        setOnChainBatches(updated);
      }

      const { ledger: next, product: updated } = dispatchBatch(
        ledger,
        selectedProduct.id,
        notes,
        activePersona,
      );
      setLedger(next);
      setSelectedProduct(updated);
      setStatusNotice(
        `Batch ${updated.batch} ("${updated.name}") successfully dispatched to ${destination}! Status advanced to SHIPPED.`,
      );
    } catch (err: unknown) {
      alert(`Dispatch failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setDispatching(false);
    }
  }

  return (
    <SiteShell>
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex size-6 items-center justify-center rounded-lg bg-blue-500/10 text-blue-500 border border-blue-500/20">
              <Truck className="size-3.5" />
            </span>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-500">
              Stakeholder #2 · Distributor & Logistics Portal
            </p>
            {status.connected ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <span className="size-1.5 rounded-full bg-emerald-500"></span> Live Node Connected
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-600 dark:text-amber-400 border border-amber-500/20">
                Simulation Mode
              </span>
            )}
          </div>
          <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">
            Supply Chain Transit
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
            Verify manufacturer batch origins before receiving into distribution hubs, maintain
            cold-chain integrity, and record tamper-evident dispatch to licensed pharmacies.
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-3.5 shadow-card text-xs">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Truck className="size-3.5 text-primary" /> Active Logistics Hub
          </div>
          <p className="font-semibold text-foreground">{activePersona.orgName}</p>
          <p className="font-mono text-[11px] text-muted-foreground">
            Operator: {activePersona.name} ({shortHash(activePersona.address, 6)})
          </p>
        </div>
      </header>

      {statusNotice && (
        <div className="mb-6 flex items-center justify-between rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-4 text-emerald-700 dark:text-emerald-300">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="size-5 text-emerald-500" />
            <p className="text-sm font-semibold">{statusNotice}</p>
          </div>
          <button
            onClick={() => setStatusNotice(null)}
            className="text-xs font-semibold hover:opacity-80"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="card-surface p-5">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Awaiting Dispatch
            </p>
            <Boxes className="size-4 text-amber-500" />
          </div>
          <p className="mt-2 text-2xl font-semibold">{incomingBatches.length}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Manufactured at factory, pending shipment
          </p>
        </div>

        <div className="card-surface p-5">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              In Transit
            </p>
            <Truck className="size-4 text-blue-500" />
          </div>
          <p className="mt-2 text-2xl font-semibold">{inTransitBatches.length}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Dispatched to pharmacies under custody
          </p>
        </div>

        <div className="card-surface p-5">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Cold Chain Standard
            </p>
            <ThermometerSnowflake className="size-4 text-emerald-500" />
          </div>
          <p className="mt-2 text-2xl font-semibold">100% Compliant</p>
          <p className="mt-1 text-xs text-muted-foreground">IoT & seal telemetry logged on-chain</p>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        {/* Batches Table & Selection */}
        <Panel
          title="Supply Chain Consignments"
          hint={`${filteredProducts.length} tracked batches`}
        >
          <div className="mb-4">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by lot number, drug name, or serial..."
              className="w-full rounded-xl border border-input bg-background px-3.5 py-2 text-sm outline-none focus:border-primary placeholder:text-muted-foreground/60"
            />
          </div>

          <div className="space-y-2.5 max-h-[480px] overflow-y-auto pr-1">
            {filteredProducts.map((p) => {
              const isSelected = selectedProduct?.id === p.id;
              const isReadyToShip = p.stage === 0;

              return (
                <div
                  key={p.id}
                  onClick={() => setSelectedProduct(p)}
                  className={`cursor-pointer rounded-2xl border p-4 transition-all ${
                    isSelected
                      ? "border-primary bg-primary-soft shadow-sm"
                      : "border-border bg-card hover:border-primary/40"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold">{p.name}</p>
                        <span
                          className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase ${
                            p.stage === 0
                              ? "bg-amber-500/10 text-amber-600 border-amber-500/30"
                              : p.stage === 1
                                ? "bg-blue-500/10 text-blue-600 border-blue-500/30"
                                : "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                          }`}
                        >
                          {p.stageName}
                        </span>
                      </div>
                      <p className="mt-1 font-mono text-xs text-muted-foreground">
                        Batch: {p.batch} · Serial: {p.id} · {p.dosage}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Mfg: {p.manufacturer} · Exp: {p.expDate}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      {isReadyToShip ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-primary px-2.5 py-1 text-xs font-semibold text-primary-foreground">
                          Ready to Ship
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground font-mono">
                          Stage {p.stage}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Panel>

        {/* Dispatch & Verification Action Panel */}
        <Panel
          title="Dispatch & Handover Console"
          hint={selectedProduct ? selectedProduct.batch : "select a batch"}
        >
          {selectedProduct ? (
            <div className="space-y-4">
              {/* Authenticity Verification Badge */}
              <div className="flex items-center gap-3 rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-4 text-emerald-700 dark:text-emerald-300">
                <ShieldCheck className="size-5 shrink-0 text-emerald-500" />
                <div className="text-xs">
                  <p className="font-semibold">Manufacturer Origin Authenticated</p>
                  <p className="opacity-80">
                    Minted on Ethereum by {shortHash(selectedProduct.manufacturerAddress, 8)}
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-border bg-secondary/30 p-3.5 text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Current Stage:</span>
                  <span className="font-semibold">
                    {selectedProduct.stageName} (Stage {selectedProduct.stage})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Units in Lot:</span>
                  <span className="font-semibold">
                    {selectedProduct.quantity.toLocaleString()} packs
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Origin Tx:</span>
                  <span className="font-mono text-accent">{shortHash(selectedProduct.txHash)}</span>
                </div>
              </div>

              {selectedProduct.stage === 0 ? (
                <form onSubmit={handleDispatch} className="space-y-3 pt-2">
                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Destination Retailer / Pharmacy
                    </label>
                    <input
                      type="text"
                      required
                      value={destination}
                      onChange={(e) => setDestination(e.target.value)}
                      placeholder="e.g. MedPlus Central Pharmacy #104"
                      className="mt-1.5 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Transit Logistics & Cold-Chain Telemetry
                    </label>
                    <textarea
                      rows={3}
                      required
                      value={carrierNotes}
                      onChange={(e) => setCarrierNotes(e.target.value)}
                      className="mt-1.5 w-full rounded-xl border border-input bg-background p-3 text-xs outline-none focus:border-primary"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={dispatching}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
                  >
                    {dispatching ? (
                      <>
                        <Loader2 className="size-4 animate-spin" /> Recording Custody on Chain...
                      </>
                    ) : (
                      <>
                        <Truck className="size-4" /> Dispatch Shipment (Advance to SHIPPED)
                      </>
                    )}
                  </button>
                </form>
              ) : (
                <div className="rounded-xl border border-border bg-card p-4 text-xs text-muted-foreground">
                  <p className="font-medium text-foreground">Consignment already dispatched.</p>
                  <p className="mt-1">
                    This batch has already progressed to{" "}
                    <strong>{selectedProduct.stageName}</strong> and is in transit or handed over to
                    the receiving retailer.
                  </p>
                  {selectedProduct.transitNotes && (
                    <div className="mt-2 rounded-lg bg-surface-muted p-2.5 font-mono text-[11px]">
                      {selectedProduct.transitNotes}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
              <Barcode className="size-10 text-primary/40 mb-3" />
              <p className="text-sm font-medium">Select a consignment to dispatch</p>
              <p className="text-xs max-w-xs mt-1">
                Choose any batch from the list on the left to verify origin, add temperature data,
                and log transit movement.
              </p>
            </div>
          )}
        </Panel>
      </div>
    </SiteShell>
  );
}
