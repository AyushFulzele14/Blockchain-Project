import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Boxes, ScanLine, ShieldCheck, Blocks } from "lucide-react";

const nav = [
  { to: "/verify", label: "Verify", icon: ScanLine },
  { to: "/dashboard", label: "Manufacturer", icon: Boxes },
  { to: "/records", label: "Ledger", icon: Blocks },
] as const;

export function SiteShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-screen">
      <div className="pointer-events-none absolute inset-0 grid-lines [mask-image:linear-gradient(to_bottom,black,transparent_70%)]" />
      <header className="relative z-10 border-b border-border/70 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4">
          <Link to="/" className="flex items-center gap-2.5">
            <span className="flex size-9 items-center justify-center rounded-md bg-primary/15 text-primary ring-1 ring-primary/30">
              <ShieldCheck className="size-5" />
            </span>
            <span className="leading-tight">
              <span className="block text-sm font-semibold tracking-tight">PharmaLedger</span>
              <span className="block font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                chain of custody
              </span>
            </span>
          </Link>
          <nav className="flex items-center gap-1">
            {nav.map(({ to, label, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                activeProps={{ className: "bg-secondary text-foreground" }}
                className="flex items-center gap-1.5 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                <Icon className="size-4" />
                <span className="hidden sm:inline">{label}</span>
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <main className="relative z-10 mx-auto max-w-6xl px-5 py-10">{children}</main>
      <footer className="relative z-10 border-t border-border/70 py-6">
        <p className="mx-auto max-w-6xl px-5 font-mono text-xs text-muted-foreground">
          Demo network · records are simulated and stored in this browser
        </p>
      </footer>
    </div>
  );
}

export function Panel({
  title,
  hint,
  children,
  className = "",
}: {
  title?: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-xl border border-border/80 bg-card/70 p-5 shadow-[0_1px_0_0_oklch(1_0_0_/_0.04)_inset] ${className}`}
    >
      {title ? (
        <div className="mb-4 flex items-baseline justify-between gap-3">
          <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
          {hint ? <span className="font-mono text-[11px] text-muted-foreground">{hint}</span> : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}

export function Hash({ value }: { value: string }) {
  return (
    <code className="break-all font-mono text-xs text-accent" title={value}>
      {value}
    </code>
  );
}
