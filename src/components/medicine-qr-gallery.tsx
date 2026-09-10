import { useEffect, useState } from "react";
import QRCode from "qrcode";
import {
  ShieldCheck,
  ShieldAlert,
  Copy,
  Check,
  Download,
  ScanLine,
  Pill,
  ExternalLink,
  Sparkles,
  Barcode,
  Search,
  Maximize2,
  Filter,
} from "lucide-react";
import { type Product, STAGE_NAMES } from "@/lib/chain";
import {
  MedicinePackageModal,
  type MedicinePackageData,
} from "@/components/medicine-package-modal";

const STAGE_BADGE_STYLES: Record<number, string> = {
  0: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30",
  1: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30",
  2: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30",
  3: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
};

export function MedicineQrCard({
  product,
  onVerify,
  onInspect,
  isFake = false,
}: {
  product: {
    id: string;
    name: string;
    batch: string;
    dosage: string;
    manufacturer: string;
    expDate: string;
    mfgDate?: string;
    stage?: number;
    stageName?: string;
  };
  onVerify?: (id: string) => void;
  onInspect?: (medicine: MedicinePackageData) => void;
  isFake?: boolean;
}) {
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [encodeMode, setEncodeMode] = useState<"url" | "id">("url");

  useEffect(() => {
    let active = true;
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const payload =
      encodeMode === "url"
        ? `${origin}/verify?code=${encodeURIComponent(product.id)}`
        : product.id;

    void QRCode.toDataURL(payload, {
      margin: 1,
      width: 280,
      color: {
        dark: isFake ? "#991b1b" : "#022c22",
        light: "#ffffff",
      },
    }).then((url) => {
      if (active) setQrUrl(url);
    });
    return () => {
      active = false;
    };
  }, [product.id, isFake, encodeMode]);

  function copyId() {
    void navigator.clipboard?.writeText(product.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div
      className={`group relative flex flex-col justify-between rounded-3xl border p-5 transition-all duration-300 hover:shadow-xl ${
        isFake
          ? "border-destructive/40 bg-destructive/5 hover:border-destructive hover:shadow-destructive/10"
          : "border-border bg-card/90 hover:border-primary/50 hover:shadow-primary/5 backdrop-blur-sm"
      }`}
    >
      <div>
        {/* Top Header */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-2 min-w-0">
            <span
              className={`flex size-8 shrink-0 items-center justify-center rounded-xl border ${
                isFake
                  ? "bg-destructive/10 text-destructive border-destructive/20"
                  : "bg-primary/10 text-primary border-primary/20"
              }`}
            >
              {isFake ? <ShieldAlert className="size-4" /> : <Pill className="size-4" />}
            </span>
            <div className="min-w-0">
              <h4 className="text-sm font-bold tracking-tight text-foreground line-clamp-1">
                {product.name}
              </h4>
              <p className="text-[11px] font-medium text-muted-foreground">{product.dosage}</p>
            </div>
          </div>

          <span
            className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
              isFake
                ? "bg-destructive/10 text-destructive border-destructive/30"
                : STAGE_BADGE_STYLES[product.stage ?? 0] ?? "bg-secondary text-foreground"
            }`}
          >
            {isFake ? "Fake Sample" : (product.stageName ?? "Manufactured")}
          </span>
        </div>

        {/* QR Code Center Box */}
        <div className="relative my-3 flex flex-col items-center justify-center rounded-2xl border border-border/80 bg-white p-3 shadow-inner">
          {qrUrl ? (
            <img
              src={qrUrl}
              alt={`QR Code for ${product.id}`}
              className="size-36 rounded-xl object-contain sm:size-40"
            />
          ) : (
            <div className="size-36 sm:size-40 animate-pulse rounded-xl bg-secondary" />
          )}

          {/* Camera Scan Helper Badge */}
          <div className="mt-2 flex items-center justify-between w-full px-1 text-[10px] text-slate-600">
            <span className="flex items-center gap-1 font-semibold">
              <ScanLine className="size-3 text-primary" /> Camera scannable
            </span>
            <button
              onClick={() => setEncodeMode(encodeMode === "url" ? "id" : "url")}
              className="text-[9px] uppercase font-bold text-slate-500 hover:text-slate-900 transition-colors"
              title="Toggle QR content between Web Verification Link and Raw Serial ID"
            >
              Mode: {encodeMode === "url" ? "URL" : "Raw ID"}
            </button>
          </div>
        </div>

        {/* Medicine Pack Identifier & Metadata */}
        <div className="mt-3 rounded-xl border border-border/60 bg-secondary/30 p-2.5 text-xs space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Pack Serial ID:
            </span>
            <button
              onClick={copyId}
              className="inline-flex items-center gap-1 font-mono text-[11px] font-bold text-primary hover:underline"
              title="Click to copy pack serial ID"
            >
              <span>{product.id}</span>
              {copied ? <Check className="size-3 text-emerald-500" /> : <Copy className="size-3 text-muted-foreground" />}
            </button>
          </div>

          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span>Lot / Batch:</span>
            <span className="font-mono font-medium text-foreground">{product.batch}</span>
          </div>

          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span>Expires on:</span>
            <span className="font-medium text-foreground">{product.expDate}</span>
          </div>

          <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-0.5">
            <span>Manufacturer:</span>
            <span className="font-medium text-foreground truncate max-w-[130px]" title={product.manufacturer}>
              {product.manufacturer}
            </span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-4 flex items-center gap-2 pt-2 border-t border-border/60">
        {onVerify && (
          <button
            onClick={() => onVerify(product.id)}
            className={`flex-1 inline-flex items-center justify-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold transition-all shadow-sm ${
              isFake
                ? "bg-destructive text-destructive-foreground hover:opacity-90"
                : "bg-primary text-primary-foreground hover:opacity-90"
            }`}
          >
            <ShieldCheck className="size-3.5" />
            <span>Verify Pack</span>
          </button>
        )}

        {onInspect && (
          <button
            onClick={() => onInspect({ ...product, isFake })}
            className="inline-flex items-center justify-center rounded-full border border-border bg-card p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            title="Inspect realistic medicine box packaging & label"
          >
            <Maximize2 className="size-3.5" />
          </button>
        )}

        {qrUrl && (
          <a
            href={qrUrl}
            download={`${product.id}-qr.png`}
            className="inline-flex items-center justify-center rounded-full border border-border bg-card p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            title="Download printable QR Code PNG"
          >
            <Download className="size-3.5" />
          </a>
        )}
      </div>
    </div>
  );
}

export function MedicineQrGallery({
  products,
  onSelectProduct,
  title = "Verified Medicines & Scannable QR Codes",
  subtitle = "Consumers can point any smartphone camera at these QR codes or click 'Verify Pack' to test the cryptographic authenticity verification.",
  showTitle = true,
}: {
  products: Product[];
  onSelectProduct: (code: string) => void;
  title?: string;
  subtitle?: string;
  showTitle?: boolean;
}) {
  const [filter, setFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [inspectingMedicine, setInspectingMedicine] = useState<MedicinePackageData | null>(null);

  const FAKE_SAMPLE: MedicinePackageData = {
    id: "PH-FAKE-COUNTERFEIT-999",
    name: "Counterfeit Azithromycin (Simulated Threat)",
    batch: "FAKE-999",
    dosage: "500 mg",
    manufacturer: "Unknown Illicit Workshop",
    expDate: "2029-01-01",
    mfgDate: "2026-01-01",
    stage: 0,
    stageName: "Counterfeit",
    isFake: true,
  };

  const filtered = products.filter((p) => {
    // Stage filter
    if (filter !== "ALL" && String(p.stage) !== filter) return false;

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = p.name.toLowerCase().includes(q);
      const matchId = p.id.toLowerCase().includes(q);
      const matchBatch = p.batch.toLowerCase().includes(q);
      const matchMfg = p.manufacturer.toLowerCase().includes(q);
      return matchName || matchId || matchBatch || matchMfg;
    }

    return true;
  });

  const showFakeSample =
    (filter === "ALL" || filter === "FAKE") &&
    (!searchQuery.trim() ||
      FAKE_SAMPLE.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      FAKE_SAMPLE.id.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <section className="mt-8 rounded-3xl border border-border bg-card/60 p-6 sm:p-8 backdrop-blur-sm">
      {/* Header section */}
      {showTitle && (
        <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex size-6 items-center justify-center rounded-lg bg-primary/10 text-primary border border-primary/20">
                <Barcode className="size-3.5" />
              </span>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">
                Live Scannable Medicine Catalog
              </p>
            </div>
            <h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl text-foreground">
              {title}
            </h2>
            <p className="mt-1.5 text-xs sm:text-sm text-muted-foreground max-w-2xl">
              {subtitle}
            </p>
          </div>

          {/* Quick Search */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, lot, or ID..."
              className="w-full rounded-full border border-border bg-secondary/50 py-1.5 pl-8 pr-3 text-xs outline-none focus:border-primary transition-colors"
            />
          </div>
        </div>
      )}

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex flex-wrap items-center gap-1.5 rounded-full border border-border bg-secondary/50 p-1 text-xs">
          <button
            onClick={() => setFilter("ALL")}
            className={`rounded-full px-3 py-1 font-medium transition-all ${
              filter === "ALL"
                ? "bg-primary text-primary-foreground font-semibold shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            All Medicines ({products.length})
          </button>
          <button
            onClick={() => setFilter("0")}
            className={`rounded-full px-3 py-1 font-medium transition-all ${
              filter === "0"
                ? "bg-amber-500 text-white font-semibold shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Factory
          </button>
          <button
            onClick={() => setFilter("1")}
            className={`rounded-full px-3 py-1 font-medium transition-all ${
              filter === "1"
                ? "bg-blue-500 text-white font-semibold shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            In Transit
          </button>
          <button
            onClick={() => setFilter("2")}
            className={`rounded-full px-3 py-1 font-medium transition-all ${
              filter === "2"
                ? "bg-purple-500 text-white font-semibold shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            In Pharmacy
          </button>
          <button
            onClick={() => setFilter("3")}
            className={`rounded-full px-3 py-1 font-medium transition-all ${
              filter === "3"
                ? "bg-emerald-600 text-white font-semibold shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Sold
          </button>
          <button
            onClick={() => setFilter("FAKE")}
            className={`rounded-full px-3 py-1 font-medium transition-all ${
              filter === "FAKE"
                ? "bg-destructive text-destructive-foreground font-semibold shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Fake Threat Sample
          </button>
        </div>

        <span className="text-[11px] text-muted-foreground">
          Showing {filtered.length + (showFakeSample ? 1 : 0)} medicine package{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Grid of Medicine Cards with QR codes and IDs */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filtered.map((product) => (
          <MedicineQrCard
            key={product.id}
            product={product}
            onVerify={(code) => {
              onSelectProduct(code);
            }}
            onInspect={(med) => setInspectingMedicine(med)}
          />
        ))}

        {/* Counterfeit Pack Card for testing verification failure */}
        {showFakeSample && (
          <MedicineQrCard
            product={FAKE_SAMPLE}
            isFake={true}
            onVerify={(code) => {
              onSelectProduct(code);
            }}
            onInspect={(med) => setInspectingMedicine(med)}
          />
        )}
      </div>

      {filtered.length === 0 && !showFakeSample && (
        <div className="py-12 text-center text-muted-foreground">
          <p className="text-sm font-semibold">No medicines match your search filter</p>
          <p className="mt-1 text-xs">Try clearing the search query or selecting &ldquo;All Medicines&rdquo;.</p>
        </div>
      )}

      {/* Realistic Packaging Modal */}
      <MedicinePackageModal
        medicine={inspectingMedicine}
        onClose={() => setInspectingMedicine(null)}
        onVerify={(code) => {
          onSelectProduct(code);
        }}
      />
    </section>
  );
}
