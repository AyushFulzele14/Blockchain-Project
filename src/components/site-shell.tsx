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
    <div className="relative min-h-screen soft-glow">
      <header className="sticky top-0 z-20 border-b border-border bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
          <Link to="/" className="flex items-center gap-2.5">
            <span className="flex size-9 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
              <ShieldCheck className="size-5" />
            </span>
            <span className="leading-tight">
              <span className="block text-base font-bold tracking-tight">PharmaLedger</span>
              <span className="block text-[11px] font-medium text-muted-foreground">
                Chain of custody
              </span>
            </span>
          </Link>
          <nav className="flex items-center gap-1 rounded-full border border-border bg-card p-1 shadow-card">
            {nav.map(({ to, label, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                activeProps={{ className: "bg-primary-soft text-primary" }}
                className="flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              >
                <Icon className="size-4" />
                <span className="hidden sm:inline">{label}</span>
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <main className="relative z-10 mx-auto max-w-6xl px-6 py-14">{children}</main>
      <footer className="relative z-10 border-t border-border py-8">
        <p className="mx-auto max-w-6xl px-6 text-sm text-muted-foreground">
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
    <section className={`card-surface p-6 sm:p-7 ${className}`}>
      {title ? (
        <div className="mb-5 flex items-baseline justify-between gap-3">
          <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
          {hint ? <span className="text-xs font-medium text-muted-foreground">{hint}</span> : null}
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
