import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useWeb3 } from "@/hooks/use-web3";
import { DEFAULT_CONTRACT_ADDRESS, DEFAULT_RPC_URL } from "@/lib/web3";
import {
  Activity,
  CheckCircle2,
  Copy,
  ExternalLink,
  HelpCircle,
  Radio,
  RefreshCw,
  Terminal,
  Wifi,
  WifiOff,
} from "lucide-react";

export function NetworkStatusBadge() {
  const { status, config, loading, refreshStatus, updateConfig } = useWeb3();
  const [open, setOpen] = useState(false);
  const [rpcUrlInput, setRpcUrlInput] = useState(config.rpcUrl);
  const [contractAddressInput, setContractAddressInput] = useState(config.contractAddress);
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCmd(label);
    setTimeout(() => setCopiedCmd(null), 2000);
  };

  const handleSave = () => {
    updateConfig({
      rpcUrl: rpcUrlInput.trim() || DEFAULT_RPC_URL,
      contractAddress: contractAddressInput.trim() || DEFAULT_CONTRACT_ADDRESS,
    });
    refreshStatus();
  };

  const handleReset = () => {
    setRpcUrlInput(DEFAULT_RPC_URL);
    setContractAddressInput(DEFAULT_CONTRACT_ADDRESS);
    updateConfig({
      rpcUrl: DEFAULT_RPC_URL,
      contractAddress: DEFAULT_CONTRACT_ADDRESS,
      useMetaMask: false,
    });
    refreshStatus();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition-all shadow-sm ${
            status.connected
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20"
              : "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20"
          }`}
        >
          <span className="relative flex size-2">
            {status.connected ? (
              <>
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex size-2 rounded-full bg-emerald-500"></span>
              </>
            ) : (
              <span className="relative inline-flex size-2 rounded-full bg-amber-500"></span>
            )}
          </span>
          <span className="hidden md:inline">
            {status.connected ? "Hardhat Node (8545)" : "Simulated / Offline"}
          </span>
          <span className="md:hidden">{status.connected ? "Live Web3" : "Simulated"}</span>
          {status.connected && (
            <span className="rounded bg-emerald-500/20 px-1.5 py-0.2 font-mono text-[10px]">
              #{status.blockNumber}
            </span>
          )}
        </button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[540px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold">
            <Radio className="size-5 text-primary" />
            Blockchain Backend Connection
          </DialogTitle>
          <DialogDescription>
            Connect directly to the Hardhat Ethereum node running the <code>DrugTracker.sol</code>{" "}
            contract.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Status Card */}
          <div
            className={`rounded-xl border p-4 transition-all ${
              status.connected
                ? "border-emerald-500/30 bg-emerald-500/5"
                : "border-amber-500/30 bg-amber-500/5"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                {status.connected ? (
                  <Wifi className="size-5 text-emerald-500" />
                ) : (
                  <WifiOff className="size-5 text-amber-500" />
                )}
                <div>
                  <h4 className="text-sm font-semibold">
                    {status.connected ? "Smart Contract Connected" : "Local Hardhat Node Offline"}
                  </h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {status.connected
                      ? `Block #${status.blockNumber} · ${status.batchCount} on-chain batches recorded`
                      : "Using local simulated ledger. Start your Hardhat node to enable live Ethereum transactions."}
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => refreshStatus()}
                disabled={loading}
                className="h-8 gap-1 text-xs"
              >
                <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
                Check
              </Button>
            </div>

            {status.connected && status.account && (
              <div className="mt-3 border-t border-border/50 pt-2.5 flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Signer Account:</span>
                <span className="font-mono text-foreground font-medium">
                  {status.account.slice(0, 10)}…{status.account.slice(-8)}
                </span>
              </div>
            )}
          </div>

          {/* Quick Terminal Guide if offline */}
          {!status.connected && (
            <div className="rounded-xl border border-border/70 bg-secondary/40 p-3.5 text-xs">
              <div className="flex items-center gap-1.5 font-semibold text-foreground mb-2">
                <Terminal className="size-4 text-primary" />
                How to start your local backend:
              </div>
              <p className="text-muted-foreground mb-2">
                Open two terminals in this workspace and run:
              </p>
              <div className="space-y-1.5 font-mono">
                <div
                  onClick={() => copyToClipboard("npm run hardhat:node", "node")}
                  className="flex items-center justify-between rounded-md bg-background px-2.5 py-1.5 border border-border/60 hover:border-primary cursor-pointer transition-colors"
                >
                  <code>1. npm run hardhat:node</code>
                  <span className="text-[10px] text-muted-foreground">
                    {copiedCmd === "node" ? "Copied!" : "Click to copy"}
                  </span>
                </div>
                <div
                  onClick={() => copyToClipboard("npm run hardhat:deploy", "deploy")}
                  className="flex items-center justify-between rounded-md bg-background px-2.5 py-1.5 border border-border/60 hover:border-primary cursor-pointer transition-colors"
                >
                  <code>2. npm run hardhat:deploy</code>
                  <span className="text-[10px] text-muted-foreground">
                    {copiedCmd === "deploy" ? "Copied!" : "Click to copy"}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Network Parameters */}
          <div className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="rpc-url" className="text-xs font-medium">
                RPC Provider URL
              </Label>
              <Input
                id="rpc-url"
                value={rpcUrlInput}
                onChange={(e) => setRpcUrlInput(e.target.value)}
                placeholder="http://127.0.0.1:8545"
                className="font-mono text-xs h-9"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="contract-addr" className="text-xs font-medium">
                DrugTracker Contract Address
              </Label>
              <Input
                id="contract-addr"
                value={contractAddressInput}
                onChange={(e) => setContractAddressInput(e.target.value)}
                placeholder="0x5FbDB2315678afecb367f032d93F642f64180aa3"
                className="font-mono text-xs h-9"
              />
            </div>

            <div className="flex items-center justify-between pt-1">
              <div className="space-y-0.5">
                <Label htmlFor="metamask-toggle" className="text-xs font-medium">
                  Use Browser Wallet (MetaMask)
                </Label>
                <p className="text-[11px] text-muted-foreground">
                  Sign transactions with your injected Web3 wallet instead of local Hardhat signer
                </p>
              </div>
              <Switch
                id="metamask-toggle"
                checked={config.useMetaMask}
                onCheckedChange={(checked) => {
                  updateConfig({ useMetaMask: checked });
                  refreshStatus();
                }}
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 border-t pt-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReset}
            className="text-xs text-muted-foreground"
          >
            Reset to Defaults
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setOpen(false)} className="text-xs">
              Close
            </Button>
            <Button
              size="sm"
              onClick={() => {
                handleSave();
                setOpen(false);
              }}
              className="text-xs"
            >
              Save & Reconnect
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
