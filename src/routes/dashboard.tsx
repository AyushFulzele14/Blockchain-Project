import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import { PackagePlus, Download, RotateCcw, ShieldCheck, ShieldAlert } from "lucide-react";
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

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Manufacturer Dashboard — PharmaLedger" },
      {
        name: "description",
        content:
          "Register pharmaceutical batches on-chain, generate printable QR labels, and review every verification event against your products.",
      },
      { property: "og:title", content: "Manufacturer Dashboard — PharmaLedger" },
      {
        property: "og:description",
        content: "Batch registration, QR label generation, and verification history in one console.",
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

function Dashboard() {
  const [ledger, setLedger] = useState<Ledger>({ products: [], blocks: [] });
  const [form, setForm] = useState<RegisterInput>(emptyForm);
  const [selected, setSelected] = useState<Product | null>(null);
  const [qr, setQr] = useState<string | null>(null);

  useEffect(() => {
    setLedger(loadLedger());
  }, []);

  useEffect(() => {
    if (!selected) {
      setQr(null);
      return;
    }
    let active = true;
    void QRCode.toDataURL(selected.id, {
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

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const { ledger: next, product } = registerProduct(ledger, form);
    setLedger(next);
    setSelected(product);
    setForm({ ...emptyForm, manufacturer: form.manufacturer });
  }

  return (
    <SiteShell>
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">Manufacturer</p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">Batch console</h1>
          <p className="mt-3 max-w-xl text-sm text-muted-foreground">
            Register a batch to mint its origin block, then print the QR label that pharmacies scan.
          </p>
        </div>
        <button
          onClick={() => {
            setLedger(resetLedger());
            setSelected(null);
          }}
          className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          <RotateCcw className="size-3.5" /> Reset demo data
        </button>
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Batches registered" value={ledger.products.length.toString()} />
        <Stat label="Blocks on chain" value={ledger.blocks.length.toString()} />
        <Stat label="Verifications" value={verifications.length.toString()} />
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:items-start">
        <Panel title="Register a product" hint="writes a REGISTER block">
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
              label="Batch number"
              value={form.batch}
              onChange={(v) => setForm({ ...form, batch: v })}
              placeholder="AZI-4471"
              required
            />
            <Input
              label="Manufacturer"
              value={form.manufacturer}
              onChange={(v) => setForm({ ...form, manufacturer: v })}
              required
            />
            <Input
              label="Strength"
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
              className="sm:col-span-2 inline-flex items-center justify-center gap-2 rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
            >
              <PackagePlus className="size-4" /> Register batch on chain
            </button>
          </form>
        </Panel>

        <Panel title="QR label" hint={selected ? `block #${selected.blockIndex}` : "select a batch"}>
          {selected ? (
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                {qr ? (
                  <img
                    src={qr}
                    alt={`QR code for serial ${selected.id}`}
                    className="size-32 rounded-2xl bg-card p-2 ring-1 ring-border"
                  />
                ) : (
                  <div className="size-32 animate-pulse rounded-2xl bg-secondary" />
                )}
                <div className="min-w-0">
                  <p className="text-sm font-semibold">{selected.name}</p>
                  <p className="mt-1 font-mono text-xs text-muted-foreground">
                    {selected.batch} · {selected.dosage}
                  </p>
                  <p className="mt-2 font-mono text-xs">{selected.id}</p>
                  <p className="mt-2 font-mono text-[11px] text-muted-foreground">
                    exp {selected.expDate}
                  </p>
                </div>
              </div>
              <div className="rounded-xl border border-border bg-surface-muted p-3">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  origin tx
                </p>
                <div className="mt-1.5">
                  <Hash value={selected.txHash} />
                </div>
              </div>
              {qr ? (
                <a
                  href={qr}
                  download={`${selected.id}.png`}
                  className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm transition-colors hover:bg-secondary"
                >
                  <Download className="size-4" /> Download label
                </a>
              ) : null}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Register a batch or pick one below to generate its scannable label.
            </p>
          )}
        </Panel>
      </div>

      <Panel className="mt-5" title="Registered batches" hint={`${ledger.products.length} total`}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                <th className="pb-2 pr-4">Serial</th>
                <th className="pb-2 pr-4">Product</th>
                <th className="pb-2 pr-4">Expiry</th>
                <th className="pb-2 pr-4">Origin tx</th>
                <th className="pb-2" />
              </tr>
            </thead>
            <tbody>
              {ledger.products.map((p) => (
                <tr key={p.id} className="border-b border-border/50 last:border-0">
                  <td className="py-3 pr-4 font-mono text-xs">{p.id}</td>
                  <td className="py-3 pr-4">{p.name}</td>
                  <td className="py-3 pr-4 font-mono text-xs text-muted-foreground">{p.expDate}</td>
                  <td className="py-3 pr-4 font-mono text-xs text-accent">{shortHash(p.txHash)}</td>
                  <td className="py-3 text-right">
                    <button
                      onClick={() => setSelected(p)}
                      className="rounded-full border border-border px-3 py-1.5 text-xs transition-colors hover:border-primary/50"
                    >
                      QR
                    </button>
                  </td>
                </tr>
              ))}
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
                  <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" />
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

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="card-surface p-5">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold tracking-tight">{value}</p>
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
