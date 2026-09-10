import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ShieldAlert,
  ShieldCheck,
  UserPlus,
  UserX,
  Activity,
  Boxes,
  Truck,
  Store,
  Users,
  AlertTriangle,
  Loader2,
  CheckCircle2,
  Lock,
  Cpu,
} from "lucide-react";
import { SiteShell, Panel, Hash } from "@/components/site-shell";
import {
  loadLedger,
  registerStakeholderRecord,
  revokeStakeholderRecord,
  shortHash,
  type Ledger,
  type StakeholderRecord,
  type StakeholderRole,
  DEFAULT_PERSONAS,
  getActivePersona,
} from "@/lib/chain";
import { useWeb3 } from "@/hooks/use-web3";
import { registerStakeholderOnChain, revokeStakeholderOnChain } from "@/lib/web3";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Blockchain Administrator Portal — PharmaLedger" },
      {
        name: "description",
        content:
          "Manage blockchain network participants, authorize manufacturers, distributors, and retailers, and monitor system security.",
      },
      { property: "og:title", content: "Blockchain Administrator Portal — PharmaLedger" },
      {
        property: "og:description",
        content: "Network governance, stakeholder permissions, and tamper-prevention logs.",
      },
    ],
  }),
  component: AdminPage,
});

const ROLE_ICONS: Record<StakeholderRole, typeof Boxes> = {
  ADMIN: Lock,
  MANUFACTURER: Boxes,
  DISTRIBUTOR: Truck,
  RETAILER: Store,
  CONSUMER: Users,
};

const ROLE_BADGE_COLORS: Record<StakeholderRole, string> = {
  ADMIN: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30",
  MANUFACTURER: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30",
  DISTRIBUTOR: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30",
  RETAILER: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30",
  CONSUMER: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
};

function AdminPage() {
  const { status, config, refreshStatus } = useWeb3();
  const [ledger, setLedger] = useState<Ledger>({
    products: [],
    blocks: [],
    stakeholders: [],
    alerts: [],
  });
  const [activePersona, setActivePersonaState] = useState(getActivePersona());

  const [formName, setFormName] = useState("");
  const [formOrg, setFormOrg] = useState("");
  const [formAddress, setFormAddress] = useState("");
  const [formRole, setFormRole] = useState<StakeholderRole>("MANUFACTURER");
  const [submitting, setSubmitting] = useState(false);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);

  useEffect(() => {
    setLedger(loadLedger());
    setActivePersonaState(getActivePersona());

    const handlePersona = (e: Event) => {
      setActivePersonaState((e as CustomEvent).detail);
    };
    window.addEventListener("chaincare:persona_changed", handlePersona);
    return () => window.removeEventListener("chaincare:persona_changed", handlePersona);
  }, []);

  const totalBatches = ledger.products.length;
  const activeStakeholders = ledger.stakeholders.filter((s) => s.isActive);
  const mfgCount = activeStakeholders.filter((s) => s.role === "MANUFACTURER").length;
  const distCount = activeStakeholders.filter((s) => s.role === "DISTRIBUTOR").length;
  const retCount = activeStakeholders.filter((s) => s.role === "RETAILER").length;
  const totalAlerts = ledger.alerts.length;

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    if (!formAddress || !formName) return;
    setSubmitting(true);
    setStatusNotice(null);

    try {
      if (status.connected) {
        const roleIdx =
          formRole === "MANUFACTURER"
            ? 2
            : formRole === "DISTRIBUTOR"
              ? 3
              : formRole === "RETAILER"
                ? 4
                : 1;
        await registerStakeholderOnChain(formAddress, formName, roleIdx, config);
        await refreshStatus();
      }

      // Also register in local ledger state
      const { ledger: next } = registerStakeholderRecord(ledger, {
        address: formAddress,
        name: formName,
        orgName: formOrg || formName,
        role: formRole,
        isActive: true,
      });
      setLedger(next);

      setStatusNotice(`Stakeholder "${formName}" registered successfully with role ${formRole}!`);
      setFormName("");
      setFormOrg("");
      setFormAddress("");
    } catch (err: unknown) {
      alert(`Registration failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRevoke(address: string) {
    if (!confirm(`Are you sure you want to revoke permissions for ${address}?`)) return;

    try {
      if (status.connected) {
        await revokeStakeholderOnChain(address, config);
        await refreshStatus();
      }

      const { ledger: next } = revokeStakeholderRecord(ledger, address);
      setLedger(next);
      setStatusNotice(`Stakeholder address ${shortHash(address)} permissions revoked.`);
    } catch (err: unknown) {
      alert(`Revocation failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return (
    <SiteShell>
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex size-6 items-center justify-center rounded-lg bg-red-500/10 text-red-500 border border-red-500/20">
              <Lock className="size-3.5" />
            </span>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-red-500">
              Stakeholder #5 · Administrator Portal
            </p>
            {status.connected ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <span className="size-1.5 rounded-full bg-emerald-500"></span> Hardhat Governance
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-600 dark:text-amber-400 border border-amber-500/20">
                Simulation Governance
              </span>
            )}
          </div>
          <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">
            Network Administration
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
            Manage the blockchain network, authorize licensed manufacturers, distributors, and
            retailers, configure smart contract permissions, and monitor tamper alerts.
          </p>
        </div>

        {/* Current Active Persona Banner */}
        <div className="rounded-2xl border border-border bg-card p-3.5 shadow-card text-xs">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Activity className="size-3.5 text-primary" /> Active Operator
          </div>
          <p className="font-semibold text-foreground">{activePersona.name}</p>
          <p className="font-mono text-[11px] text-muted-foreground">
            {shortHash(activePersona.address, 6)}
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

      {/* Network Metrics Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={Users}
          label="Authorized Stakeholders"
          value={String(activeStakeholders.length)}
          subtitle={`${mfgCount} Mfg · ${distCount} Dist · ${retCount} Ret`}
          color="text-primary"
        />
        <StatCard
          icon={Boxes}
          label="Registered Batches"
          value={String(totalBatches)}
          subtitle="On-chain origin records"
          color="text-amber-500"
        />
        <StatCard
          icon={Cpu}
          label="Network Status"
          value={
            status.connected
              ? "Operational (Block #" + status.blockNumber + ")"
              : "Simulation Active"
          }
          subtitle="Consensus & smart contracts healthy"
          color="text-emerald-500"
        />
        <StatCard
          icon={AlertTriangle}
          label="Suspicious Alerts"
          value={String(totalAlerts)}
          subtitle={totalAlerts > 0 ? "Requires compliance review" : "No active threats detected"}
          color={totalAlerts > 0 ? "text-red-500" : "text-muted-foreground"}
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1.4fr]">
        {/* Register New Participant */}
        <Panel title="Authorize Network Participant" hint="Assign Stakeholder Permissions">
          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Participant Full Name
              </label>
              <input
                type="text"
                required
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="e.g. Dr. Julian Vance"
                className="mt-1.5 w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Organization / Facility Name
              </label>
              <input
                type="text"
                required
                value={formOrg}
                onChange={(e) => setFormOrg(e.target.value)}
                placeholder="e.g. Cardinal Health Distribution Center"
                className="mt-1.5 w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Assigned Stakeholder Role
              </label>
              <div className="mt-1.5 grid grid-cols-3 gap-2">
                {(["MANUFACTURER", "DISTRIBUTOR", "RETAILER"] as StakeholderRole[]).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setFormRole(r)}
                    className={`rounded-xl border py-2 text-xs font-semibold transition-all ${
                      formRole === r
                        ? "border-primary bg-primary-soft text-primary shadow-sm"
                        : "border-border bg-background text-muted-foreground hover:border-primary/50"
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Ethereum Wallet Address (0x...)
              </label>
              <input
                type="text"
                required
                value={formAddress}
                onChange={(e) => setFormAddress(e.target.value)}
                placeholder="0x70997970C51812dc3A010C7d01b50e0d17dc79C8"
                className="mt-1.5 w-full font-mono rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
              />
            </div>

            {/* Quick Demo Pre-fill options */}
            <div className="pt-1">
              <span className="text-[11px] font-medium text-muted-foreground">
                Quick test fill:{" "}
              </span>
              <button
                type="button"
                onClick={() => {
                  setFormName("Apex Global Logistics");
                  setFormOrg("Apex Logistics Hub #4");
                  setFormRole("DISTRIBUTOR");
                  setFormAddress(DEFAULT_PERSONAS[2]!.address);
                }}
                className="text-[11px] text-primary underline mr-2"
              >
                Distributor #2
              </button>
              <button
                type="button"
                onClick={() => {
                  setFormName("CVS Health Pharmacy #33");
                  setFormOrg("CVS Pharmacy Network");
                  setFormRole("RETAILER");
                  setFormAddress(DEFAULT_PERSONAS[3]!.address);
                }}
                className="text-[11px] text-primary underline"
              >
                Retailer #3
              </button>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> Recording on Blockchain...
                </>
              ) : (
                <>
                  <UserPlus className="size-4" /> Grant Role & Authorize on Chain
                </>
              )}
            </button>
          </form>
        </Panel>

        {/* Stakeholder Directory */}
        <Panel
          title="Authorized Network Stakeholders"
          hint={`${ledger.stakeholders.length} registered accounts`}
        >
          <div className="space-y-3">
            {ledger.stakeholders.map((s) => {
              const Icon = ROLE_ICONS[s.role] || Users;
              return (
                <div
                  key={s.address}
                  className={`flex items-start justify-between gap-3 rounded-2xl border p-4 transition-colors ${
                    s.isActive
                      ? "border-border bg-card hover:border-primary/40"
                      : "border-border/40 bg-secondary/30 opacity-60"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span
                      className={`flex size-10 shrink-0 items-center justify-center rounded-xl border ${
                        ROLE_BADGE_COLORS[s.role]
                      }`}
                    >
                      <Icon className="size-5" />
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold">{s.name}</p>
                        <span
                          className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                            ROLE_BADGE_COLORS[s.role]
                          }`}
                        >
                          {s.role}
                        </span>
                        {!s.isActive && (
                          <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-semibold text-destructive">
                            Revoked
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground">{s.orgName}</p>
                      <p className="mt-1 font-mono text-[11px] text-accent">{s.address}</p>
                    </div>
                  </div>

                  {s.role !== "ADMIN" && s.isActive && (
                    <button
                      onClick={() => handleRevoke(s.address)}
                      title="Revoke Permissions"
                      className="rounded-full border border-destructive/30 bg-destructive/10 p-2 text-destructive transition-colors hover:bg-destructive hover:text-destructive-foreground"
                    >
                      <UserX className="size-3.5" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </Panel>
      </div>

      {/* Suspicious Pack Alerts & Audit Log */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Panel title="Tamper & Counterfeit Reports" hint={`${ledger.alerts.length} reports logged`}>
          {ledger.alerts.length ? (
            <div className="space-y-3">
              {ledger.alerts.map((a) => (
                <div
                  key={a.id}
                  className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-xs"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5 font-semibold text-destructive">
                      <ShieldAlert className="size-4" /> {a.id} · Serial: {a.productId}
                    </span>
                    <span className="text-[11px] text-muted-foreground font-mono">
                      {new Date(a.reportedAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="mt-2 text-foreground">{a.reason}</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Reported by: {a.reportedBy}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
              <ShieldCheck className="size-8 text-emerald-500 mb-2" />
              <p className="text-sm font-medium">No counterfeit alerts reported</p>
              <p className="text-xs max-w-sm mt-1">
                Consumer and retailer verification scans have confirmed all inspected units against
                the blockchain origin registry.
              </p>
            </div>
          )}
        </Panel>

        <Panel title="Network Governance Audit Log" hint="Immutable events">
          <div className="space-y-3">
            {ledger.blocks
              .filter(
                (b) =>
                  b.kind === "STAKEHOLDER_REGISTER" ||
                  b.kind === "STAKEHOLDER_REVOKE" ||
                  b.kind === "FLAG_COUNTERFEIT",
              )
              .slice(0, 6)
              .map((b) => (
                <div key={b.index} className="flex gap-3 border-l-2 border-border pl-3.5 text-xs">
                  <div>
                    <p className="font-medium text-foreground">{b.summary}</p>
                    <p className="mt-1 font-mono text-[11px] text-muted-foreground">
                      Block #{b.index} · {new Date(b.timestamp).toLocaleTimeString()} · Tx{" "}
                      {shortHash(b.txHash)}
                    </p>
                  </div>
                </div>
              ))}
            {!ledger.blocks.some(
              (b) =>
                b.kind === "STAKEHOLDER_REGISTER" ||
                b.kind === "STAKEHOLDER_REVOKE" ||
                b.kind === "FLAG_COUNTERFEIT",
            ) && (
              <p className="text-xs text-muted-foreground py-4">
                Administrative events will appear here as permissions are granted or revoked.
              </p>
            )}
          </div>
        </Panel>
      </div>
    </SiteShell>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  subtitle,
  color = "text-primary",
}: {
  icon: typeof Boxes;
  label: string;
  value: string;
  subtitle: string;
  color?: string;
}) {
  return (
    <div className="card-surface p-5">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <Icon className={`size-4 ${color}`} />
      </div>
      <p className="mt-2 text-2xl font-semibold tracking-tight">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
    </div>
  );
}
