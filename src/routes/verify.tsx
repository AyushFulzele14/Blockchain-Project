import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import {
  ScanLine,
  ShieldCheck,
  ShieldAlert,
  Clock,
  Camera,
  CameraOff,
  Copy,
  Check,
  Loader2,
  AlertTriangle,
  Boxes,
  Truck,
  Store,
  Users,
  CheckCircle2,
  ExternalLink,
  Barcode,
  Maximize2,
  Download,
  Sparkles,
  Pill,
} from "lucide-react";
import { SiteShell, Panel, Hash } from "@/components/site-shell";
import { MedicineQrGallery } from "@/components/medicine-qr-gallery";
import {
  MedicinePackageModal,
  type MedicinePackageData,
} from "@/components/medicine-package-modal";
import {
  formatTime,
  historyFor,
  loadLedger,
  verifyCode,
  reportCounterfeit,
  type Block,
  type Ledger,
  type VerifyResult,
  type Product,
  shortHash,
  getActivePersona,
} from "@/lib/chain";
import { useWeb3 } from "@/hooks/use-web3";
import {
  getBatchOnChain,
  getAllBatchesOnChain,
  type OnChainBatch,
  STAGE_NAMES,
  StageIndex,
} from "@/lib/web3";

export const Route = createFileRoute("/verify")({
  validateSearch: (search: Record<string, unknown>): { code?: string; id?: string } => {
    return {
      code: typeof search.code === "string" ? search.code : undefined,
      id: typeof search.id === "string" ? search.id : undefined,
    };
  },
  head: () => ({
    meta: [
      { title: "Consumer Verification Portal — PharmaLedger" },
      {
        name: "description",
        content:
          "Scan any medicine pack QR code to instantly verify authenticity, view the complete manufacturer-to-patient custody trail, and report counterfeits.",
      },
      { property: "og:title", content: "Consumer Verification Portal — PharmaLedger" },
      {
        property: "og:description",
        content:
          "Instant genuine-or-counterfeit verdict verified against DrugTracker.sol on Ethereum.",
      },
    ],
  }),
  component: VerifyPage,
});

type OnChainVerifyResult = {
  status: "authentic" | "counterfeit";
  code: string;
  batch?: OnChainBatch | null;
  searchedAt: string;
};

function VerifyPage() {
  const { status, config } = useWeb3();
  const searchParams = Route.useSearch();

  const [ledger, setLedger] = useState<Ledger>({
    products: [],
    blocks: [],
    stakeholders: [],
    alerts: [],
  });
  const [onChainBatches, setOnChainBatches] = useState<OnChainBatch[]>([]);
  const [code, setCode] = useState("");
  const [simResult, setSimResult] = useState<VerifyResult | null>(null);
  const [onChainResult, setOnChainResult] = useState<OnChainVerifyResult | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);

  // Packaging inspection modal
  const [inspectingMedicine, setInspectingMedicine] = useState<MedicinePackageData | null>(null);

  // Counterfeit Report Modal
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportSuccess, setReportSuccess] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    setLedger(loadLedger());
  }, []);

  useEffect(() => {
    if (status.connected) {
      getAllBatchesOnChain(config).then(setOnChainBatches);
    }
  }, [status.connected, config]);

  // Handle URL Query Params (?code=... or ?id=...) for auto-verification from camera scan
  useEffect(() => {
    const targetCode = searchParams.code || searchParams.id;
    if (targetCode) {
      setCode(targetCode);
      void submit(targetCode);
    }
  }, [searchParams.code, searchParams.id]);

  useEffect(() => {
    return () => streamRef.current?.getTracks().forEach((t) => t.stop());
  }, []);

  async function toggleCamera() {
    if (scanning) {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      setScanning(false);
      return;
    }
    setScanError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      streamRef.current = stream;
      setScanning(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch {
      setScanError(
        "Camera preview unavailable — please enter the batch ID or serial printed on the box.",
      );
    }
  }

  async function submit(value: string) {
    const trimmed = value.trim();
    if (!trimmed) return;
    setVerifying(true);
    setReportSuccess(false);

    // Ensure we have a loaded ledger instance even if state hasn't populated yet
    const currentLedger = ledger.products.length > 0 ? ledger : loadLedger();

    try {
      if (status.connected) {
        const match = trimmed.match(/\d+/);
        const batchNum = match ? parseInt(match[0], 10) : 0;

        if (batchNum > 0) {
          const batch = await getBatchOnChain(batchNum, config);
          if (batch) {
            setOnChainResult({
              status: "authentic",
              code: trimmed,
              batch,
              searchedAt: new Date().toLocaleString(),
            });
            setSimResult(null);
            return;
          }
        }

        // Check if simulated has it even if on-chain doesn't
        const { ledger: next, result: res } = verifyCode(currentLedger, trimmed);
        setLedger(next);
        if (res.status === "authentic" || res.status === "expired") {
          setSimResult(res);
          setOnChainResult(null);
          return;
        }

        // Counterfeit on-chain
        setOnChainResult({
          status: "counterfeit",
          code: trimmed,
          batch: null,
          searchedAt: new Date().toLocaleString(),
        });
        setSimResult(null);
      } else {
        const { ledger: next, result: res } = verifyCode(currentLedger, trimmed);
        setLedger(next);
        setSimResult(res);
        setOnChainResult(null);
      }
    } catch {
      const { ledger: next, result: res } = verifyCode(currentLedger, trimmed);
      setLedger(next);
      setSimResult(res);
      setOnChainResult(null);
    } finally {
      setVerifying(false);
    }
  }

  function handleReportCounterfeit() {
    if (!reportReason) return;
    const targetCode = simResult?.code || onChainResult?.code || code || "UNKNOWN";
    const currentLedger = ledger.products.length > 0 ? ledger : loadLedger();
    const { ledger: next } = reportCounterfeit(
      currentLedger,
      targetCode,
      reportReason,
      "Submitted via Consumer Mobile Verification Portal",
      getActivePersona(),
    );
    setLedger(next);
    setShowReportModal(false);
    setReportSuccess(true);
    setReportReason("");
  }

  return (
    <SiteShell>
      <header className="mb-8">
        <div className="flex items-center gap-2">
          <span className="flex size-6 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
            <Users className="size-3.5" />
          </span>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-600 dark:text-emerald-400">
            Stakeholder #4 · Consumer & Patient Verification
          </p>
          {status.connected ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <span className="size-1.5 rounded-full bg-emerald-500"></span> Live On-Chain Query
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-600 dark:text-amber-400 border border-amber-500/20">
              Simulated Ledger Query
            </span>
          )}
        </div>
        <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">
          Authenticate Your Medicine
        </h1>
        <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
          Consumers and patients scan the packaging QR code or enter the Pack Serial ID to verify
          medicine authenticity, confirm manufacturing & expiry dates, inspect the 4-party custody trail,
          and flag suspected counterfeits.
        </p>
      </header>

      {reportSuccess && (
        <div className="mb-6 flex items-center justify-between rounded-2xl border border-destructive/40 bg-destructive/10 p-4 text-destructive">
          <div className="flex items-center gap-2 text-xs">
            <ShieldAlert className="size-5 shrink-0" />
            <p>
              <strong>Counterfeit Report Logged:</strong> Your report has been anchored to the audit
              trail and sent to the Blockchain Administrator for immediate inspection.
            </p>
          </div>
          <button
            onClick={() => setReportSuccess(false)}
            className="text-xs font-semibold hover:opacity-80 ml-2"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_1.3fr] lg:items-start">
        {/* Scanner Panel */}
        <Panel title="Scan QR Code or Enter Pack ID" hint="Printed on Medicine Packaging">
          <div className="relative overflow-hidden rounded-2xl border border-border bg-surface-muted">
            <video
              ref={videoRef}
              muted
              playsInline
              className={`aspect-[4/3] w-full object-cover ${scanning ? "" : "hidden"}`}
            />
            {!scanning ? (
              <div className="flex aspect-[4/3] flex-col items-center justify-center gap-2 text-muted-foreground p-4">
                <ScanLine className="size-10 text-primary/70 mb-1 animate-pulse" />
                <p className="text-center text-xs max-w-[16rem]">
                  Point your mobile phone camera at the QR code on the box, or click Start Scanner.
                </p>
              </div>
            ) : null}
          </div>

          <button
            onClick={toggleCamera}
            className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-full border border-border px-5 py-2.5 text-xs font-semibold transition-colors hover:bg-secondary"
          >
            {scanning ? <CameraOff className="size-4" /> : <Camera className="size-4" />}
            {scanning ? "Stop Camera" : "Start Live Camera Scanner"}
          </button>
          {scanError ? <p className="mt-2 text-xs text-destructive">{scanError}</p> : null}

          <form
            className="mt-5 flex flex-col gap-2 sm:flex-row"
            onSubmit={(e) => {
              e.preventDefault();
              submit(code);
            }}
          >
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="e.g. PH-AMX-8842-0001 or 1"
              className="min-w-0 flex-1 rounded-xl border border-input bg-background px-3.5 py-2.5 font-mono text-sm outline-none placeholder:text-muted-foreground/60 focus:border-primary"
            />
            <button
              type="submit"
              disabled={verifying}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {verifying ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> Verifying...
                </>
              ) : (
                "Verify Pack"
              )}
            </button>
          </form>

          {/* Quick Demo Samples */}
          <div className="mt-5 border-t border-border/60 pt-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              Quick Test Medicines (Click to Verify):
            </p>
            <div className="flex flex-wrap gap-2">
              {ledger.products.map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    setCode(p.id);
                    submit(p.id);
                  }}
                  className="rounded-full border border-border px-3 py-1.5 font-mono text-[11px] text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
                >
                  {p.batch} · {p.name.split(" ")[0]} ({p.stageName})
                </button>
              ))}
              <button
                onClick={() => {
                  setCode("PH-FAKE-COUNTERFEIT-999");
                  submit("PH-FAKE-COUNTERFEIT-999");
                }}
                className="rounded-full border border-destructive/40 bg-destructive/5 px-3 py-1.5 font-mono text-[11px] text-destructive transition-colors hover:bg-destructive/10"
              >
                Fake Sample #999
              </button>
            </div>
          </div>
        </Panel>

        {/* Verification Result Area */}
        <div className="space-y-5">
          {onChainResult ? (
            <OnChainResultCard
              result={onChainResult}
              config={config}
              onReport={() => setShowReportModal(true)}
              onInspect={(med) => setInspectingMedicine(med)}
            />
          ) : simResult ? (
            <SimResultCard
              result={simResult}
              ledger={ledger}
              onReport={() => setShowReportModal(true)}
              onInspect={(med) => setInspectingMedicine(med)}
            />
          ) : (
            <EmptyResult />
          )}
        </div>
      </div>

      {/* Live Medicine Packs with Scannable QR Codes & IDs Gallery */}
      <MedicineQrGallery
        products={ledger.products}
        title="Live Medicines With QR Codes & Pack Serial IDs"
        subtitle="Consumers can point their smartphone camera at any QR code below or click 'Verify Pack' to test the cryptographic verification flow."
        onSelectProduct={(selectedId) => {
          setCode(selectedId);
          submit(selectedId);
          window.scrollTo({ top: 0, behavior: "smooth" });
        }}
      />

      {/* Report Counterfeit Modal */}
      {showReportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl">
            <div className="flex items-center gap-2 text-destructive mb-3">
              <AlertTriangle className="size-5" />
              <h3 className="text-base font-semibold">Report Counterfeit / Suspect Medicine</h3>
            </div>
            <p className="text-xs text-muted-foreground mb-4">
              Help protect patient safety. Your report will be cryptographically anchored to the
              audit log and directly escalated to the Blockchain Administrator.
            </p>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
              Describe the Issue
            </label>
            <textarea
              rows={3}
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              placeholder="e.g. Scanned code gave counterfeit alert, broken packaging seal, tablets different color or powdery..."
              className="w-full rounded-xl border border-input bg-background p-3 text-xs outline-none focus:border-destructive"
            />
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setShowReportModal(false)}
                className="rounded-full border border-border px-4 py-2 text-xs font-medium text-muted-foreground hover:bg-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleReportCounterfeit}
                disabled={!reportReason}
                className="rounded-full bg-destructive px-5 py-2 text-xs font-semibold text-destructive-foreground hover:opacity-90 disabled:opacity-50"
              >
                Submit Counterfeit Report
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Realistic Packaging Modal */}
      <MedicinePackageModal
        medicine={inspectingMedicine}
        onClose={() => setInspectingMedicine(null)}
        onVerify={(verifiedId) => {
          setCode(verifiedId);
          submit(verifiedId);
          window.scrollTo({ top: 0, behavior: "smooth" });
        }}
      />
    </SiteShell>
  );
}

function EmptyResult() {
  return (
    <Panel title="Authenticity Verdict" hint="Awaiting Scan">
      <div className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground">
        <ScanLine className="size-12 text-primary/30 mb-3 animate-pulse" />
        <p className="text-sm font-semibold text-foreground">No Medicine Pack Scanned Yet</p>
        <p className="text-xs max-w-sm mt-1">
          Scan the box QR code or choose a sample lot number to inspect manufacturer origin, supply
          chain custody, and tamper safety.
        </p>
      </div>
    </Panel>
  );
}

function VerifiedMedicineQrBox({
  id,
  name,
  batch,
  onInspect,
}: {
  id: string;
  name: string;
  batch: string;
  onInspect: () => void;
}) {
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let active = true;
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const verifyUrl = `${origin}/verify?code=${encodeURIComponent(id)}`;

    void QRCode.toDataURL(verifyUrl, {
      margin: 1,
      width: 160,
      color: { dark: "#022c22", light: "#ffffff" },
    }).then((url) => {
      if (active) setQrUrl(url);
    });
    return () => {
      active = false;
    };
  }, [id]);

  function copyId() {
    void navigator.clipboard?.writeText(id);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="rounded-xl border border-border bg-white p-1.5 shadow-sm">
            {qrUrl ? (
              <img src={qrUrl} alt={`QR for ${id}`} className="size-16 rounded-lg object-contain" />
            ) : (
              <div className="size-16 animate-pulse rounded-lg bg-secondary" />
            )}
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-primary flex items-center gap-1">
              <Sparkles className="size-3" /> Scanned Packaging QR & Serial ID
            </span>
            <p className="font-mono text-xs font-bold text-foreground mt-0.5">{id}</p>
            <p className="text-[11px] text-muted-foreground">Lot: {batch} · {name}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={copyId}
            className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:bg-secondary transition-colors"
            title="Copy Pack ID"
          >
            {copied ? <Check className="size-3 text-emerald-500" /> : <Copy className="size-3" />}
            <span>{copied ? "Copied" : "Copy ID"}</span>
          </button>
          <button
            onClick={onInspect}
            className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90 transition-opacity"
            title="Inspect 3D Medicine Box Packaging"
          >
            <Maximize2 className="size-3" />
            <span>Inspect Box</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function OnChainResultCard({
  result,
  config,
  onReport,
  onInspect,
}: {
  result: OnChainVerifyResult;
  config: { rpcUrl: string; contractAddress: string };
  onReport: () => void;
  onInspect: (med: MedicinePackageData) => void;
}) {
  const isAuthentic = result.status === "authentic" && result.batch;

  return (
    <>
      <Panel>
        <div
          className={`flex items-start gap-4 rounded-2xl border p-5 ${
            isAuthentic
              ? "border-success/40 bg-success-soft text-success"
              : "border-destructive/50 bg-destructive/10 text-destructive"
          }`}
        >
          {isAuthentic ? (
            <ShieldCheck className="mt-0.5 size-7 shrink-0 text-success" />
          ) : (
            <ShieldAlert className="mt-0.5 size-7 shrink-0 text-destructive" />
          )}
          <div className="min-w-0">
            <h2 className="text-lg font-bold tracking-tight">
              {isAuthentic
                ? "AUTHENTIC MEDICINE — VERIFIED ON BLOCKCHAIN"
                : "COUNTERFEIT ALERT — UNREGISTERED SERIAL"}
            </h2>
            <p className="mt-1 text-xs opacity-90 leading-relaxed">
              {isAuthentic
                ? "Cryptographic origin confirmed on Ethereum smart contract DrugTracker.sol. All stakeholder signatures are valid."
                : `The identifier "${result.code}" does NOT match any genuine manufacturer batch in the blockchain registry. DO NOT CONSUME.`}
            </p>
          </div>
        </div>

        {isAuthentic && result.batch && (
          <div className="mt-6 space-y-5">
            {/* Scanned Packaging QR Box */}
            <VerifiedMedicineQrBox
              id={result.code}
              name={result.batch.drugName}
              batch={`#${result.batch.batchId}`}
              onInspect={() => {
                onInspect({
                  id: result.code,
                  name: result.batch!.drugName,
                  batch: `#${result.batch!.batchId}`,
                  dosage: "Prescription Formulation",
                  manufacturer: result.batch!.manufacturer,
                  expDate: "Certified via Smart Contract",
                  stage: result.batch!.stage,
                  stageName: result.batch!.stageName,
                });
              }}
            />

            {/* 4-Stage Supply Chain Timeline */}
            <div className="rounded-2xl border border-border bg-secondary/30 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                End-to-End Stakeholder Custody Timeline
              </p>
              <div className="grid grid-cols-4 gap-2 text-center text-xs">
                {[
                  { stage: 0, name: "Manufactured", role: "Manufacturer" },
                  { stage: 1, name: "Shipped", role: "Distributor" },
                  { stage: 2, name: "Delivered", role: "Pharmacy" },
                  { stage: 3, name: "Sold", role: "Patient" },
                ].map((s) => {
                  const isDone = s.stage <= result.batch!.stage;
                  return (
                    <div
                      key={s.stage}
                      className={`rounded-xl p-2.5 transition-all ${
                        isDone
                          ? "bg-primary text-primary-foreground font-semibold shadow-sm"
                          : "bg-background/60 text-muted-foreground border border-border/50 opacity-60"
                      }`}
                    >
                      <span className="block text-[10px] opacity-75">{s.role}</span>
                      <span className="truncate block font-bold mt-0.5">{s.name}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2 text-xs">
              <Field label="Batch Lot ID" value={`#${result.batch.batchId}`} mono />
              <Field label="Product Formulation" value={result.batch.drugName} />
              <Field label="Manufacturer Address" value={result.batch.manufacturer} mono />
              <Field
                label="Current Status"
                value={`${result.batch.stageName} (Stage ${result.batch.stage})`}
              />
              <Field label="Last Updated on Chain" value={result.batch.lastUpdatedFormatted} />
              <Field label="Scan Verification Time" value={result.searchedAt} />
            </dl>

            {/* Smart Contract Proof Row */}
            <div className="rounded-xl border border-border bg-surface-muted p-3 text-xs space-y-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block">
                On-Chain Origin Hash
              </span>
              <p className="font-mono text-[11px] text-accent">
                Contract: {config.contractAddress}
              </p>
            </div>
          </div>
        )}

        <div className="mt-5 pt-4 border-t border-border flex justify-between items-center">
          <span className="text-xs text-muted-foreground">Notice suspicious packaging?</span>
          <button
            onClick={onReport}
            className="rounded-full border border-destructive/40 bg-destructive/5 px-4 py-1.5 text-xs font-semibold text-destructive hover:bg-destructive/10"
          >
            Report Counterfeit Pack
          </button>
        </div>
      </Panel>
    </>
  );
}

function SimResultCard({
  result,
  ledger,
  onReport,
  onInspect,
}: {
  result: VerifyResult;
  ledger: Ledger;
  onReport: () => void;
  onInspect: (med: MedicinePackageData) => void;
}) {
  const isAuthentic = result.status === "authentic";
  const isExpired = result.status === "expired";
  const product = result.product;
  const history = product ? historyFor(ledger, product.id) : [];

  return (
    <>
      <Panel>
        <div
          className={`flex items-start gap-4 rounded-2xl border p-5 ${
            isAuthentic
              ? "border-success/40 bg-success-soft text-success"
              : isExpired
                ? "border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400"
                : "border-destructive/50 bg-destructive/10 text-destructive"
          }`}
        >
          {isAuthentic ? (
            <ShieldCheck className="mt-0.5 size-7 shrink-0 text-success" />
          ) : isExpired ? (
            <Clock className="mt-0.5 size-7 shrink-0 text-amber-500" />
          ) : (
            <ShieldAlert className="mt-0.5 size-7 shrink-0 text-destructive" />
          )}
          <div className="min-w-0">
            <h2 className="text-lg font-bold tracking-tight">
              {isAuthentic
                ? "GENUINE PHARMACEUTICAL PRODUCT — 100% AUTHENTIC"
                : isExpired
                  ? "GENUINE MEDICINE — PAST EXPIRATION DATE"
                  : "COUNTERFEIT MEDICINE ALERT — DO NOT USE"}
            </h2>
            <p className="mt-1 text-xs opacity-90 leading-relaxed">
              {isAuthentic
                ? "Origin block matched. Cryptographic hash verifies packaging has not been tampered with since manufacturing."
                : isExpired
                  ? `Origin verified, but this batch expired on ${product?.expDate}. Please return to pharmacy for safe disposal.`
                  : `Serial "${result.code}" was not found on the blockchain. Possible unauthorized reproduction.`}
            </p>
          </div>
        </div>

        {product && (
          <div className="mt-6 space-y-5">
            {/* Scanned Packaging QR Box */}
            <VerifiedMedicineQrBox
              id={product.id}
              name={product.name}
              batch={product.batch}
              onInspect={() => {
                onInspect({
                  id: product.id,
                  name: product.name,
                  batch: product.batch,
                  dosage: product.dosage,
                  manufacturer: product.manufacturer,
                  expDate: product.expDate,
                  mfgDate: product.mfgDate,
                  stage: product.stage,
                  stageName: product.stageName,
                });
              }}
            />

            {/* 4-Stage Custody Progress */}
            <div className="rounded-2xl border border-border bg-secondary/30 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                Full 4-Party Custody Provenance
              </p>
              <div className="grid grid-cols-4 gap-2 text-center text-xs">
                {[
                  { stage: 0, label: "Manufacturer", title: "Factory Mint" },
                  { stage: 1, label: "Distributor", title: "In Transit" },
                  { stage: 2, label: "Retailer", title: "In Pharmacy" },
                  { stage: 3, label: "Consumer", title: "Dispensed" },
                ].map((st) => {
                  const isPassed = st.stage <= product.stage;
                  return (
                    <div
                      key={st.stage}
                      className={`rounded-xl p-2.5 transition-all ${
                        isPassed
                          ? "bg-primary text-primary-foreground font-semibold shadow-sm"
                          : "bg-background/60 text-muted-foreground border border-border/50 opacity-60"
                      }`}
                    >
                      <span className="block text-[10px] opacity-75">{st.label}</span>
                      <span className="truncate block font-bold mt-0.5">{st.title}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2 text-xs">
              <Field label="Serial / Pack ID" value={product.id} mono />
              <Field label="Batch Number" value={product.batch} mono />
              <Field label="Medicine Name" value={product.name} />
              <Field label="Dosage Strength" value={product.dosage} />
              <Field label="Manufacturing Facility" value={product.manufacturer} />
              <Field label="Expiration Date" value={product.expDate} />
              {product.distributor && (
                <Field label="Logistics Carrier" value={product.distributor} />
              )}
              {product.retailer && <Field label="Dispensing Pharmacy" value={product.retailer} />}
            </dl>

            {/* Custody events history */}
            {history.length > 0 && (
              <div className="rounded-2xl border border-border p-4 bg-card">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                  Blockchain Event Trail ({history.length} blocks)
                </p>
                <div className="space-y-3">
                  {history.map((b) => (
                    <div
                      key={b.index}
                      className="flex gap-3 border-l-2 border-primary/50 pl-3 text-xs"
                    >
                      <div>
                        <p className="font-semibold text-foreground">{b.summary}</p>
                        <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                          Block #{b.index} · Actor: {b.actorName} ({b.actorRole}) · Tx{" "}
                          {shortHash(b.txHash)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="mt-5 pt-4 border-t border-border flex justify-between items-center">
          <span className="text-xs text-muted-foreground">Suspicious of this product?</span>
          <button
            onClick={onReport}
            className="rounded-full border border-destructive/40 bg-destructive/5 px-4 py-1.5 text-xs font-semibold text-destructive hover:bg-destructive/10"
          >
            Report Counterfeit Pack
          </button>
        </div>
      </Panel>
    </>
  );
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <dt className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </dt>
      <dd
        className={`mt-0.5 text-xs font-medium ${mono ? "font-mono text-foreground" : "text-foreground"}`}
      >
        {value}
      </dd>
    </div>
  );
}
