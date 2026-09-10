import { Link, useRouterState } from "@tanstack/react-router";
import { useState, useEffect, type ReactNode } from "react";
import {
  Boxes,
  ScanLine,
  ShieldCheck,
  Blocks,
  Truck,
  Store,
  Lock,
  ChevronDown,
  UserCheck,
  Check,
  Sparkles,
} from "lucide-react";
import { NetworkStatusBadge } from "@/components/network-dialog";
import { useWeb3 } from "@/hooks/use-web3";
import {
  DEFAULT_PERSONAS,
  getActivePersona,
  setActivePersona,
  shortHash,
  type StakeholderPersona,
} from "@/lib/chain";

const navItems = [
  { to: "/verify", label: "Verify Pack", icon: ScanLine, roleTag: "Consumer" },
  { to: "/dashboard", label: "Manufacturer", icon: Boxes, roleTag: "Mint & QR" },
  { to: "/distributor", label: "Distributor", icon: Truck, roleTag: "Logistics" },
  { to: "/retailer", label: "Retailer", icon: Store, roleTag: "Pharmacy" },
  { to: "/admin", label: "Admin", icon: Lock, roleTag: "Gov" },
  { to: "/records", label: "Ledger", icon: Blocks, roleTag: "Explorer" },
] as const;

export function SiteShell({ children }: { children: ReactNode }) {
  const { status, config } = useWeb3();
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;

  const [activePersona, setActivePersonaState] = useState<StakeholderPersona>(getActivePersona());
  const [showPersonaMenu, setShowPersonaMenu] = useState(false);

  useEffect(() => {
    setActivePersonaState(getActivePersona());
    const handlePersonaChange = (e: Event) => {
      setActivePersonaState((e as CustomEvent).detail);
    };
    window.addEventListener("chaincare:persona_changed", handlePersonaChange);
    return () => window.removeEventListener("chaincare:persona_changed", handlePersonaChange);
  }, []);

  function selectPersona(p: StakeholderPersona) {
    setActivePersona(p);
    setActivePersonaState(p);
    setShowPersonaMenu(false);
  }

  return (
    <div className="relative min-h-screen soft-glow flex flex-col justify-between">
      <div>
        {/* Top Stakeholder Persona Bar */}
        <div className="border-b border-border/60 bg-secondary/40 px-4 py-1.5 text-xs">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="flex size-2 rounded-full bg-primary animate-pulse" />
              <span className="font-semibold text-muted-foreground uppercase text-[10px] tracking-wider">
                5-Stakeholder Architecture:
              </span>
              <span className="hidden sm:inline text-muted-foreground">
                Current Actor: <strong className="text-foreground">{activePersona.orgName}</strong>{" "}
                ({activePersona.badge})
              </span>
            </div>

            <div className="relative">
              <button
                onClick={() => setShowPersonaMenu(!showPersonaMenu)}
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 font-medium text-foreground hover:bg-secondary transition-colors shadow-sm"
              >
                <UserCheck className="size-3 text-primary" />
                <span className="text-[11px]">
                  Switch Persona:{" "}
                  <span className="font-bold text-primary">{activePersona.badge}</span>
                </span>
                <ChevronDown className="size-3 text-muted-foreground" />
              </button>

              {/* Persona Switcher Dropdown */}
              {showPersonaMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowPersonaMenu(false)} />
                  <div className="absolute right-0 top-full z-50 mt-1.5 w-72 rounded-2xl border border-border bg-card p-2 shadow-2xl">
                    <p className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-b border-border mb-1">
                      Select Demo Stakeholder Role
                    </p>
                    <div className="space-y-1">
                      {DEFAULT_PERSONAS.map((p) => {
                        const isCurrent = p.id === activePersona.id;
                        return (
                          <button
                            key={p.id}
                            onClick={() => selectPersona(p)}
                            className={`flex w-full items-start justify-between rounded-xl px-3 py-2 text-left text-xs transition-colors ${
                              isCurrent
                                ? "bg-primary-soft text-primary font-semibold"
                                : "hover:bg-secondary text-foreground"
                            }`}
                          >
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span>{p.name}</span>
                                <span className="rounded-full bg-border px-1.5 py-0.2 text-[9px] uppercase font-bold">
                                  {p.badge}
                                </span>
                              </div>
                              <p className="text-[11px] text-muted-foreground mt-0.5">
                                {p.orgName}
                              </p>
                              <p className="font-mono text-[10px] text-accent mt-0.5">
                                {shortHash(p.address, 4)}
                              </p>
                            </div>
                            {isCurrent && <Check className="size-4 shrink-0 text-primary mt-1" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Primary Navbar */}
        <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur-xl">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-3.5">
            <Link to="/" className="flex items-center gap-2.5">
              <span className="flex size-9 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
                <ShieldCheck className="size-5" />
              </span>
              <span className="leading-tight">
                <span className="block text-base font-bold tracking-tight">PharmaLedger</span>
                <span className="block text-[10px] font-medium text-muted-foreground tracking-wider uppercase">
                  5-Party Integrity Chain
                </span>
              </span>
            </Link>

            {/* Navigation Tabs */}
            <div className="flex items-center gap-2 sm:gap-3">
              <nav className="flex items-center gap-1 rounded-full border border-border bg-card p-1 shadow-card overflow-x-auto">
                {navItems.map(({ to, label, icon: Icon }) => {
                  const isActive = currentPath === to;
                  return (
                    <Link
                      key={to}
                      to={to}
                      className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                        isActive
                          ? "bg-primary text-primary-foreground font-semibold shadow-sm"
                          : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                      }`}
                    >
                      <Icon className="size-3.5" />
                      <span className="hidden md:inline">{label}</span>
                    </Link>
                  );
                })}
              </nav>

              <NetworkStatusBadge />
            </div>
          </div>
        </header>

        <main className="relative z-10 mx-auto max-w-7xl px-6 py-10">{children}</main>
      </div>

      {/* Footer */}
      <footer className="relative z-10 border-t border-border py-8 bg-card/40">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-6 text-xs text-muted-foreground">
          <div className="space-y-1">
            <p className="font-semibold text-foreground">
              PharmaLedger 5-Stakeholder Anti-Counterfeiting Platform
            </p>
            <p className="text-[11px]">
              Manufacturer · Distributor · Retailer · Consumer · Blockchain Administrator
            </p>
          </div>
          <div className="text-right">
            <p className="font-mono text-[11px]">
              {status.connected ? (
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                  ● Live Hardhat Network ({config.rpcUrl})
                </span>
              ) : (
                <span className="text-amber-600 dark:text-amber-400">
                  ○ High-Fidelity Simulation Ledger
                </span>
              )}
            </p>
            <p className="font-mono text-[10px] text-muted-foreground mt-0.5">
              Solidity 0.8.28 · DrugTracker.sol (RBAC Enabled)
            </p>
          </div>
        </div>
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
