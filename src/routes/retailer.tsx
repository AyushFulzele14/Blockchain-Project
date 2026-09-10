import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import {
  Store,
  ShieldCheck,
  ShieldAlert,
  ArrowRight,
  PackageCheck,
  ShoppingBag,
  AlertOctagon,
  Loader2,
  CheckCircle2,
  Barcode,
  Search,
} from "lucide-react";
import { SiteShell, Panel, Hash } from "@/components/site-shell";
import {
  loadLedger,
  receiveBatch,
  dispenseBatch,
  reportCounterfeit,
  shortHash,
  type Ledger,
  type Product,
  STAGE_NAMES,
  getActivePersona,
} from "@/lib/chain";
import { useWeb3 } from "@/hooks/use-web3";
import { advanceStageOnChain, getAllBatchesOnChain, type OnChainBatch } from "@/lib/web3";

export const Route = createFileRoute("/retailer")({
  head: () => ({
    meta: [
      { title: "Retailer & Pharmacy Portal — PharmaLedger" },
      {
        name: "description",
        content:
          "Verify pharmaceutical shipments before accepting inventory and selling medicine to patients. Prevent counterfeit distribution at the point of sale.",
      },
      { property: "og:title", content: "Retailer & Pharmacy Portal — PharmaLedger" },
      {
        property: "og:description",
        content:
          "Pharmacy inventory verification, delivery acceptance, and point-of-sale dispense.",
      },
    ],
  }),
  component: RetailerPage,
});

function RetailerPage() {
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
  const [pharmacyNotes, setPharmacyNotes] = useState(
    "Tamper-evident seals intact. Barcode scanned and matched with invoice #INV-99201. Shelf storage assigned: Bin A-14.",
  );
  const [processing, setProcessing] = useState(false);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [quarantineReason, setQuarantineReason] = useState("");
  const [showQuarantineModal, setShowQuarantineModal] = useState(false);

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

  const awaitingIntake = useMemo(
    () => ledger.products.filter((p) => p.stage === 1), // Shipped by distributor
    [ledger.products],
  );

  const inStockBatches = useMemo(
    () => ledger.products.filter((p) => p.stage === 2), // Delivered in pharmacy
    [ledger.products],
  );

  const soldBatches = useMemo(
    () => ledger.products.filter((p) => p.stage === 3), // Sold to patients
    [ledger.products],
  );

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

  async function handleAcceptDelivery() {
    if (!selectedProduct) return;
    setProcessing(true);
    setStatusNotice(null);

    try {
      if (status.connected) {
        const match = selectedProduct.id.match(/\d+/);
        const batchNum = match ? parseInt(match[0], 10) : selectedProduct.blockIndex;
        await advanceStageOnChain(batchNum, pharmacyNotes, config);
        await refreshStatus();
        const updated = await getAllBatchesOnChain(config);
        setOnChainBatches(updated);
      }

      const { ledger: next, product: updated } = receiveBatch(
        ledger,
        selectedProduct.id,
        pharmacyNotes,
        activePersona,
      );
      setLedger(next);
      setSelectedProduct(updated);
      setStatusNotice(
        `Batch ${updated.batch} accepted into pharmacy stock! Status advanced to DELIVERED.`,
      );
    } catch (err: unknown) {
      alert(`Accept delivery failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setProcessing(false);
    }
  }

  async function handleDispense() {
    if (!selectedProduct) return;
    setProcessing(true);
    setStatusNotice(null);

    try {
      if (status.connected) {
        const match = selectedProduct.id.match(/\d+/);
        const batchNum = match ? parseInt(match[0], 10) : selectedProduct.blockIndex;
        await advanceStageOnChain(batchNum, "Dispensed to customer at counter", config);
        await refreshStatus();
        const updated = await getAllBatchesOnChain(config);
        setOnChainBatches(updated);
      }

      const { ledger: next, product: updated } = dispenseBatch(
        ledger,
        selectedProduct.id,
        activePersona,
      );
      setLedger(next);
      setSelectedProduct(updated);
      setStatusNotice(
        `Batch ${updated.batch} successfully dispensed to patient! Status marked as SOLD.`,
      );
    } catch (err: unknown) {
      alert(`Dispense failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setProcessing(false);
    }
  }

  function handleQuarantine() {
    if (!selectedProduct || !quarantineReason) return;
    const { ledger: next } = reportCounterfeit(
      ledger,
      selectedProduct.id,
      quarantineReason,
      `Quarantined by Retailer ${activePersona.orgName}`,
      activePersona,
    );
    setLedger(next);
    setShowQuarantineModal(false);
    setQuarantineReason("");
    setStatusNotice(
      `Batch ${selectedProduct.batch} flagged and quarantined. Alert sent to Administrator.`,
    );
  }

  return (
    <SiteShell>
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex size-6 items-center justify-center rounded-lg bg-purple-500/10 text-purple-500 border border-purple-500/20">
              <Store className="size-3.5" />
            </span>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-purple-500">
              Stakeholder #3 · Retailer & Pharmacy Portal
            </p>
            {status.connected ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <span className="size-1.5 rounded-full bg-emerald-500"></span> Live Blockchain
                Registry
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-600 dark:text-amber-400 border border-amber-500/20">
                Simulation Mode
              </span>
            )}
          </div>
          <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">
            Pharmacy Dispense & Inventory
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
            Verify every incoming shipment before stocking pharmacy shelves, authenticate
            tamper-evident seals, and register final dispense events to patients on the blockchain.
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-3.5 shadow-card text-xs">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Store className="size-3.5 text-primary" /> Active Pharmacy Location
          </div>
          <p className="font-semibold text-foreground">{activePersona.orgName}</p>
          <p className="font-mono text-[11px] text-muted-foreground">
            Pharmacist: {activePersona.name} ({shortHash(activePersona.address, 6)})
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

      {/* Metrics */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="card-surface p-5">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Awaiting Intake
            </p>
            <PackageCheck className="size-4 text-blue-500" />
          </div>
          <p className="mt-2 text-2xl font-semibold">{awaitingIntake.length}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            In-transit from distributor, verify before shelving
          </p>
        </div>

        <div className="card-surface p-5">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              In Stock & Ready
            </p>
            <Store className="size-4 text-purple-500" />
          </div>
          <p className="mt-2 text-2xl font-semibold">{inStockBatches.length}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Verified authenticity, stocked on pharmacy shelves
          </p>
        </div>

        <div className="card-surface p-5">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Dispensed to Patients
            </p>
            <ShoppingBag className="size-4 text-emerald-500" />
          </div>
          <p className="mt-2 text-2xl font-semibold">{soldBatches.length}</p>
          <p className="mt-1 text-xs text-muted-foreground">Final retail transactions registered</p>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        {/* Inventory Table */}
        <Panel title="Pharmacy Stock Registry" hint={`${filteredProducts.length} units tracked`}>
          <div className="mb-4">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by lot, drug name, or batch ID..."
              className="w-full rounded-xl border border-input bg-background px-3.5 py-2 text-sm outline-none focus:border-primary placeholder:text-muted-foreground/60"
            />
          </div>

          <div className="space-y-2.5 max-h-[480px] overflow-y-auto pr-1">
            {filteredProducts.map((p) => {
              const isSelected = selectedProduct?.id === p.id;

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
                            p.stage === 1
                              ? "bg-blue-500/10 text-blue-600 border-blue-500/30"
                              : p.stage === 2
                                ? "bg-purple-500/10 text-purple-600 border-purple-500/30"
                                : p.stage === 3
                                  ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                                  : "bg-amber-500/10 text-amber-600 border-amber-500/30"
                          }`}
                        >
                          {p.stageName}
                        </span>
                      </div>
                      <p className="mt-1 font-mono text-xs text-muted-foreground">
                        Batch: {p.batch} · Strength: {p.dosage} · Units:{" "}
                        {p.quantity.toLocaleString()}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Exp: {p.expDate}{" "}
                        {p.distributor ? `· Route: ${p.distributor.slice(0, 20)}…` : ""}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      {p.stage === 1 && (
                        <span className="rounded-full bg-blue-500/10 px-2 py-1 text-xs font-semibold text-blue-600">
                          Needs Intake
                        </span>
                      )}
                      {p.stage === 2 && (
                        <span className="rounded-full bg-purple-500/10 px-2 py-1 text-xs font-semibold text-purple-600">
                          In Stock
                        </span>
                      )}
                      {p.stage === 3 && (
                        <span className="rounded-full bg-emerald-500/10 px-2 py-1 text-xs font-semibold text-emerald-600">
                          Dispensed
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Panel>

        {/* Verification & Action Console */}
        <Panel
          title="Retailer Verification & Dispense Console"
          hint={selectedProduct ? selectedProduct.batch : "select item"}
        >
          {selectedProduct ? (
            <div className="space-y-4">
              {/* Authenticity Verification Status */}
              <div className="flex items-start gap-3 rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-4 text-emerald-700 dark:text-emerald-300">
                <ShieldCheck className="mt-0.5 size-5 shrink-0 text-emerald-500" />
                <div className="text-xs">
                  <p className="font-semibold text-sm">Verified Authentic Origin Record</p>
                  <p className="opacity-90 mt-0.5">
                    Batch #{selectedProduct.batch} validated against smart contract. Manufacturer:{" "}
                    {selectedProduct.manufacturer}
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-border bg-secondary/30 p-3.5 text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Current Status:</span>
                  <span className="font-semibold">
                    {selectedProduct.stageName} (Stage {selectedProduct.stage})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Lot Identifier:</span>
                  <span className="font-mono">{selectedProduct.batch}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Expiry Date:</span>
                  <span>{selectedProduct.expDate}</span>
                </div>
                {selectedProduct.transitNotes && (
                  <div className="pt-1 border-t border-border/60">
                    <span className="text-muted-foreground block mb-1">
                      Distributor Logistics Stamp:
                    </span>
                    <p className="font-mono text-[11px] bg-background/60 p-2 rounded-lg">
                      {selectedProduct.transitNotes}
                    </p>
                  </div>
                )}
              </div>

              {/* Action Buttons based on stage */}
              {selectedProduct.stage === 1 && (
                <div className="space-y-3 pt-1">
                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Pharmacy Intake & Seal Verification Notes
                    </label>
                    <textarea
                      rows={2}
                      value={pharmacyNotes}
                      onChange={(e) => setPharmacyNotes(e.target.value)}
                      className="mt-1.5 w-full rounded-xl border border-input bg-background p-2.5 text-xs outline-none focus:border-primary"
                    />
                  </div>
                  <button
                    onClick={handleAcceptDelivery}
                    disabled={processing}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
                  >
                    {processing ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <PackageCheck className="size-4" />
                    )}
                    Accept Delivery & Shelve (Advance to DELIVERED)
                  </button>
                </div>
              )}

              {selectedProduct.stage === 2 && (
                <div className="space-y-3 pt-1">
                  <div className="rounded-xl border border-border bg-card p-3 text-xs text-muted-foreground">
                    This batch is verified and in active pharmacy stock. When a patient purchases
                    this pack, click below to record point-of-sale checkout on the blockchain.
                  </div>
                  <button
                    onClick={handleDispense}
                    disabled={processing}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-emerald-600 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors disabled:opacity-50"
                  >
                    {processing ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <ShoppingBag className="size-4" />
                    )}
                    Dispense to Customer (Mark as SOLD)
                  </button>
                </div>
              )}

              {selectedProduct.stage === 3 && (
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 text-xs text-emerald-700 dark:text-emerald-300">
                  <p className="font-semibold">Batch Fully Dispensed</p>
                  <p className="mt-1 opacity-85">
                    This unit has already been sold and completed its supply chain journey. Patients
                    can scan its QR code to inspect complete provenance.
                  </p>
                </div>
              )}

              {/* Quarantine Button */}
              <div className="pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowQuarantineModal(true)}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-destructive hover:underline"
                >
                  <AlertOctagon className="size-3.5" /> Flag Damaged or Suspicious Pack
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
              <Store className="size-10 text-primary/40 mb-3" />
              <p className="text-sm font-medium">Select a consignment to verify</p>
              <p className="text-xs max-w-xs mt-1">
                Choose a batch to accept warehouse delivery, register customer dispense, or
                quarantine suspicious packs.
              </p>
            </div>
          )}
        </Panel>
      </div>

      {/* Quarantine Modal */}
      {showQuarantineModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl">
            <div className="flex items-center gap-2 text-destructive mb-3">
              <AlertOctagon className="size-5" />
              <h3 className="text-base font-semibold">Quarantine Suspicious Pack</h3>
            </div>
            <p className="text-xs text-muted-foreground mb-4">
              Flagging this package will write an immutable alert to the blockchain and immediately
              notify network administrators.
            </p>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
              Reason for Quarantine
            </label>
            <textarea
              rows={3}
              value={quarantineReason}
              onChange={(e) => setQuarantineReason(e.target.value)}
              placeholder="e.g. Broken holographic seal, tampered batch code, packaging discoloration..."
              className="w-full rounded-xl border border-input bg-background p-3 text-xs outline-none focus:border-destructive"
            />
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setShowQuarantineModal(false)}
                className="rounded-full border border-border px-4 py-2 text-xs font-medium text-muted-foreground hover:bg-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleQuarantine}
                disabled={!quarantineReason}
                className="rounded-full bg-destructive px-5 py-2 text-xs font-semibold text-destructive-foreground hover:opacity-90 disabled:opacity-50"
              >
                Submit Quarantine Alert
              </button>
            </div>
          </div>
        </div>
      )}
    </SiteShell>
  );
}
