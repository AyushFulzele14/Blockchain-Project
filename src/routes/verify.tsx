import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  ScanLine,
  ShieldCheck,
  ShieldAlert,
  Clock,
  Camera,
  CameraOff,
  Copy,
  Check,
} from "lucide-react";
import { SiteShell, Panel, Hash } from "@/components/site-shell";
import {
  formatTime,
  historyFor,
  loadLedger,
  verifyCode,
  type Block,
  type Ledger,
  type VerifyResult,
} from "@/lib/chain";

export const Route = createFileRoute("/verify")({
  head: () => ({
    meta: [
      { title: "Verify a Medicine Pack — PharmaLedger" },
      {
        name: "description",
        content:
          "Scan the pack QR code or enter its serial to check batch details, expiry, and the blockchain transaction hash behind it.",
      },
      { property: "og:title", content: "Verify a Medicine Pack — PharmaLedger" },
      {
        property: "og:description",
        content: "Instant authentic-or-counterfeit result with the on-chain transaction hash.",
      },
    ],
  }),
  component: VerifyPage,
});

function VerifyPage() {
  const [ledger, setLedger] = useState<Ledger>({ products: [], blocks: [] });
  const [code, setCode] = useState("");
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    setLedger(loadLedger());
  }, []);

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
      setScanError("Camera unavailable — type the serial printed under the QR code instead.");
    }
  }

  function submit(value: string) {
    const trimmed = value.trim();
    if (!trimmed) return;
    const { ledger: next, result: res } = verifyCode(ledger, trimmed);
    setLedger(next);
    setResult(res);
  }

  const samples = ledger.products.slice(0, 3);

  return (
    <SiteShell>
      <header className="mb-8">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">Verification</p>
        <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">
          Check a pack against the chain
        </h1>
        <p className="mt-3 max-w-xl text-sm text-muted-foreground">
          Point the camera at the pack QR code, or enter the serial printed beneath it. Every check
          appends a verification block.
        </p>
      </header>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:items-start">
        <Panel title="Scan or enter serial" hint="QR / manual">
          <div className="relative overflow-hidden rounded-2xl border border-border bg-surface-muted">
            <video
              ref={videoRef}
              muted
              playsInline
              className={`aspect-[4/3] w-full object-cover ${scanning ? "" : "hidden"}`}
            />
            {!scanning ? (
              <div className="flex aspect-[4/3] flex-col items-center justify-center gap-2 text-muted-foreground">
                <ScanLine className="size-8 text-primary/70" />
                <p className="max-w-[16rem] text-center text-xs">
                  Camera preview appears here once you start scanning.
                </p>
              </div>
            ) : null}
          </div>
          <button
            onClick={toggleCamera}
            className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-full border border-border px-5 py-2.5 text-sm font-medium transition-colors hover:bg-secondary"
          >
            {scanning ? <CameraOff className="size-4" /> : <Camera className="size-4" />}
            {scanning ? "Stop camera" : "Start camera"}
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
              placeholder="PH-AMX-8842-0001"
              className="min-w-0 flex-1 rounded-xl border border-input bg-background px-3 py-2.5 font-mono text-sm outline-none placeholder:text-muted-foreground/60 focus:border-primary"
            />
            <button
              type="submit"
              className="rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
            >
              Verify
            </button>
          </form>

          {samples.length ? (
            <div className="mt-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                try a registered serial
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {samples.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      setCode(p.id);
                      submit(p.id);
                    }}
                    className="rounded-full border border-border px-3 py-1.5 font-mono text-[11px] text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
                  >
                    {p.id}
                  </button>
                ))}
                <button
                  onClick={() => {
                    setCode("PH-FAKE-0000-9999");
                    submit("PH-FAKE-0000-9999");
                  }}
                  className="rounded-full border border-destructive/40 px-3 py-1.5 font-mono text-[11px] text-destructive transition-colors hover:bg-destructive/10"
                >
                  PH-FAKE-0000-9999
                </button>
              </div>
            </div>
          ) : null}
        </Panel>

        <div className="space-y-5">
          {result ? <ResultCard result={result} ledger={ledger} /> : <EmptyResult />}
        </div>
      </div>
    </SiteShell>
  );
}

function EmptyResult() {
  return (
    <Panel title="Result" hint="awaiting input">
      <p className="text-sm text-muted-foreground">
        Batch details, authenticity status, and the transaction hash will appear here after a check.
      </p>
    </Panel>
  );
}

function ResultCard({ result, ledger }: { result: VerifyResult; ledger: Ledger }) {
  const tone = {
    authentic: {
      icon: ShieldCheck,
      label: "Authentic",
      copy: "Serial matches its on-chain origin record.",
      cls: "border-primary bg-primary-soft text-primary",
    },
    expired: {
      icon: Clock,
      label: "Genuine · Expired",
      copy: "Origin record verified, but this batch is past its expiry date.",
      cls: "border-warning/50 bg-warning/10 text-warning",
    },
    counterfeit: {
      icon: ShieldAlert,
      label: "Counterfeit — do not dispense",
      copy: "No origin block exists for this serial on the network.",
      cls: "border-destructive/50 bg-destructive/10 text-destructive",
    },
  }[result.status];
  const Icon = tone.icon;
  const product = result.product;
  const history = product ? historyFor(ledger, product.id) : [];

  return (
    <>
      <Panel>
        <div className={`flex items-start gap-3 rounded-2xl border p-5 ${tone.cls}`}>
          <Icon className="mt-0.5 size-6 shrink-0" />
          <div>
            <p className="text-base font-semibold tracking-tight">{tone.label}</p>
            <p className="mt-1 text-sm opacity-80">{tone.copy}</p>
          </div>
        </div>

        <dl className="mt-5 grid gap-x-6 gap-y-3 sm:grid-cols-2">
          <Field label="Serial" value={result.code} mono />
          <Field label="Batch" value={product?.batch ?? "—"} mono />
          <Field label="Product" value={product?.name ?? "Unknown to the network"} />
          <Field label="Manufacturer" value={product?.manufacturer ?? "—"} />
          <Field label="Strength" value={product?.dosage ?? "—"} />
          <Field label="Units in batch" value={product ? product.quantity.toLocaleString() : "—"} />
          <Field label="Manufactured" value={product?.mfgDate ?? "—"} />
          <Field label="Expires" value={product?.expDate ?? "—"} />
        </dl>
      </Panel>

      <Panel title="Transaction proof" hint={`block #${result.block.index}`}>
        <div className="space-y-3">
          <HashRow label="Verification tx" value={result.block.txHash} />
          <HashRow label="Block hash" value={result.block.hash} />
          <HashRow label="Previous hash" value={result.block.prevHash} />
          {product ? <HashRow label="Origin tx" value={product.txHash} /> : null}
          <p className="font-mono text-xs text-muted-foreground">
            recorded {formatTime(result.block.timestamp)}
          </p>
        </div>
      </Panel>

      {history.length ? (
        <Panel title="Chain of custody" hint={`${history.length} events`}>
          <ol className="space-y-3">
            {history.map((b) => (
              <TimelineRow key={b.index} block={b} />
            ))}
          </ol>
        </Panel>
      ) : null}
    </>
  );
}

function TimelineRow({ block }: { block: Block }) {
  return (
    <li className="flex gap-3 border-l border-border pl-4">
      <div>
        <p className="text-sm">{block.summary}</p>
        <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
          #{block.index} · {block.kind} · {formatTime(block.timestamp)}
        </p>
      </div>
    </li>
  );
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <dt className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </dt>
      <dd className={`mt-1 text-sm ${mono ? "font-mono" : ""}`}>{value}</dd>
    </div>
  );
}

function HashRow({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="rounded-xl border border-border bg-surface-muted p-3">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        <button
          onClick={() => {
            void navigator.clipboard?.writeText(value);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1500);
          }}
          className="text-muted-foreground transition-colors hover:text-foreground"
          aria-label={`Copy ${label}`}
        >
          {copied ? <Check className="size-3.5 text-primary" /> : <Copy className="size-3.5" />}
        </button>
      </div>
      <div className="mt-1.5">
        <Hash value={value} />
      </div>
    </div>
  );
}
