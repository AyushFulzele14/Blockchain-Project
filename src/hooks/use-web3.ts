import { useEffect, useState, useCallback } from "react";
import {
  getWeb3Config,
  saveWeb3Config,
  checkBlockchainStatus,
  type Web3Config,
  type BlockchainStatus,
} from "@/lib/web3";

export function useWeb3() {
  const [config, setConfig] = useState<Web3Config>(getWeb3Config());
  const [status, setStatus] = useState<BlockchainStatus>({
    connected: false,
    blockNumber: 0,
    batchCount: 0,
  });
  const [loading, setLoading] = useState(true);

  const refreshStatus = useCallback(async (currentConfig?: Web3Config) => {
    setLoading(true);
    const res = await checkBlockchainStatus(currentConfig);
    setStatus(res);
    setLoading(false);
  }, []);

  useEffect(() => {
    refreshStatus(config);

    const handleConfigChange = (e: Event) => {
      const customEvent = e as CustomEvent<Web3Config>;
      setConfig(customEvent.detail);
      refreshStatus(customEvent.detail);
    };

    window.addEventListener("chaincare:config_changed", handleConfigChange);
    return () => {
      window.removeEventListener("chaincare:config_changed", handleConfigChange);
    };
  }, [config, refreshStatus]);

  const updateConfig = (updates: Partial<Web3Config>) => {
    const next = { ...config, ...updates };
    setConfig(next);
    saveWeb3Config(next);
  };

  return {
    config,
    status,
    loading,
    refreshStatus: () => refreshStatus(config),
    updateConfig,
  };
}
