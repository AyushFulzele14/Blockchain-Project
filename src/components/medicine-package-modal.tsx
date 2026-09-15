import { useState, useEffect } from "react";
import QRCode from "qrcode";
import {
  X,
  ShieldCheck,
  ShieldAlert,
  Copy,
  Check,
  Download,
  Barcode,
  ExternalLink,
  Sparkles,
  Calendar,
  Building2,
  Package,
} from "lucide-react";

export type MedicinePackageData = {
  id: string;
  name: string;
  batch: string;
  dosage: string;
  manufacturer: string;
  expDate: string;
  mfgDate?: string;
  stage?: number;
  stageName?: string;
  quantity?: number;
  isFake?: boolean;
};

export function MedicinePackageModal({
  medicine,
  onClose,
  onVerify,
}: {
  medicine: MedicinePackageData | null;
  onClose: () => void;
  onVerify?: (id: string) => void;
}) {
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!medicine) return;
    let active = true;

    // Build the mobile-friendly verification URL so smartphone cameras can directly open the page
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const verifyUrl = `${origin}/verify?code=${encodeURIComponent(medicine.id)}`;

    void QRCode.toDataURL(verifyUrl, {
      margin: 1,
      width: 320,
      color: {
        dark: medicine.isFake ? "#991b1b" : "#022c22",
        light: "#ffffff",
      },
    }).then((url) => {
      if (active) setQrUrl(url);
    });

    return () => {
      active = false;
    };
  }, [medicine]);

  if (!medicine) return null;

  function copyId() {
    if (!medicine) return;
    void navigator.clipboard?.writeText(medicine.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-2xl overflow-hidden rounded-3xl border border-border bg-card shadow-2xl transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header Bar */}
        <div className="flex items-center justify-between border-b border-border/80 bg-secondary/40 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <span
              className={`flex size-8 items-center justify-center rounded-xl border ${
                medicine.isFake
                  ? "bg-destructive/10 text-destructive border-destructive/30"
                  : "bg-primary/10 text-primary border-primary/30"
              }`}
            >
              {medicine.isFake ? (
                <ShieldAlert className="size-4" />
              ) : (
                <ShieldCheck className="size-4" />
              )}
            </span>
            <div>
              <h3 className="text-sm font-bold text-foreground">
                Official Pharmaceutical Packaging Specification
              </h3>
              <p className="text-[11px] text-muted-foreground">
                Serialized 2D Datamatrix QR & Cryptographic Blockchain Serial ID
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Realistic Medicine Box Outer Container */}
        <div className="p-6">
          <div
            className={`relative overflow-hidden rounded-2xl border-2 p-6 transition-all ${
              medicine.isFake
                ? "border-destructive/60 bg-gradient-to-br from-destructive/5 via-card to-destructive/10 shadow-lg shadow-destructive/10"
                : "border-primary/40 bg-gradient-to-br from-card via-secondary/15 to-primary-soft/30 shadow-xl"
            }`}
          >
            {/* Holographic Authenticity Seal Indicator */}
            <div className="absolute right-4 top-4 flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              <Sparkles className="size-3 animate-spin" style={{ animationDuration: "6s" }} />
              <span>{medicine.isFake ? "TAMPERED / FAKE SEAL" : "Holographic Tamper Seal"}</span>
            </div>

            {/* Medicine Brand Title */}
            <div className="max-w-md">
              <span className="inline-flex items-center gap-1 rounded bg-secondary px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-widest text-primary">
                Rx Only · Oral Form
              </span>
              <h2 className="mt-2 text-2xl font-black tracking-tight text-foreground sm:text-3xl">
                {medicine.name}
              </h2>
              <p className="text-sm font-bold text-muted-foreground">{medicine.dosage}</p>
            </div>

            {/* Box Body: QR Code + Serial Info */}
            <div className="mt-6 grid gap-6 sm:grid-cols-[180px_1fr] sm:items-center">
              {/* QR Code Column */}
              <div className="flex flex-col items-center justify-center rounded-2xl border border-border bg-white p-3.5 shadow-sm">
                {qrUrl ? (
                  <img
                    src={qrUrl}
                    alt={`Scannable QR for ${medicine.id}`}
                    className="size-36 rounded-xl object-contain sm:size-40"
                  />
                ) : (
                  <div className="size-36 animate-pulse rounded-xl bg-secondary sm:size-40" />
                )}
                <span className="mt-2 text-center text-[10px] font-semibold text-slate-700">
                  Scan to verify on blockchain
                </span>
              </div>

              {/* Package Metadata & Cryptographic Details */}
              <div className="space-y-3 text-xs">
                {/* Pack Serial ID Highlight Box */}
                <div className="rounded-xl border border-primary/30 bg-primary/5 p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
                      Pack Serial ID (Unique)
                    </span>
                    <button
                      onClick={copyId}
                      className="inline-flex items-center gap-1 font-mono text-xs font-bold text-primary hover:underline"
                    >
                      {copied ? (
                        <>
                          <Check className="size-3 text-emerald-500" />
                          <span className="text-emerald-500">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="size-3" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                  <p className="mt-1 font-mono text-sm font-black tracking-wide text-foreground">
                    {medicine.id}
                  </p>
                </div>

                {/* Simulated Barcode Visual */}
                <div className="flex flex-col gap-1 rounded-xl border border-border/80 bg-background/80 p-2.5">
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground font-mono">
                    <span className="flex items-center gap-1">
                      <Barcode className="size-3.5" /> GS1-128 Matrix
                    </span>
                    <span>{medicine.batch}</span>
                  </div>
                  <div className="h-7 w-full rounded bg-foreground/10 flex items-center justify-between px-2 font-mono text-[9px] tracking-widest text-muted-foreground select-none overflow-hidden">
                    ||| | |||| | || ||||| | ||| || |||| | || |||| | |||
                  </div>
                </div>

                {/* Batch, Exp, Manufacturer Details */}
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="rounded-lg border border-border/60 bg-secondary/30 p-2">
                    <span className="text-[10px] uppercase text-muted-foreground block font-semibold">
                      Lot / Batch Number
                    </span>
                    <span className="font-mono font-bold text-foreground">{medicine.batch}</span>
                  </div>
                  <div className="rounded-lg border border-border/60 bg-secondary/30 p-2">
                    <span className="text-[10px] uppercase text-muted-foreground block font-semibold">
                      Expiration Date
                    </span>
                    <span className="font-semibold text-foreground">{medicine.expDate}</span>
                  </div>
                  <div className="col-span-2 rounded-lg border border-border/60 bg-secondary/30 p-2">
                    <span className="text-[10px] uppercase text-muted-foreground block font-semibold">
                      Manufacturing Facility
                    </span>
                    <span className="font-medium text-foreground">{medicine.manufacturer}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Action Row */}
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 pt-2">
            <div className="text-xs text-muted-foreground">
              Tip: Point any mobile smartphone camera at the QR code to open the verification link.
            </div>

            <div className="flex items-center gap-2">
              {qrUrl && (
                <a
                  href={qrUrl}
                  download={`${medicine.id}-packaging-label.png`}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-4 py-2 text-xs font-semibold text-foreground transition-colors hover:bg-secondary"
                >
                  <Download className="size-3.5" /> Download QR
                </a>
              )}
              {onVerify && (
                <button
                  onClick={() => {
                    onVerify(medicine.id);
                    onClose();
                  }}
                  className={`inline-flex items-center gap-2 rounded-full px-6 py-2 text-xs font-bold text-white shadow-md transition-all hover:opacity-90 ${
                    medicine.isFake
                      ? "bg-destructive hover:bg-destructive/90"
                      : "bg-primary hover:bg-primary/90"
                  }`}
                >
                  <ShieldCheck className="size-4" />
                  <span>Verify Pack Now</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
