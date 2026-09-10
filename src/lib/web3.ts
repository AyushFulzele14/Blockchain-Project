import { ethers } from "ethers";
import { DEFAULT_PERSONAS, type StakeholderRole } from "./chain";

// Default settings for local Hardhat node & Ignition deployment
export const DEFAULT_RPC_URL = "http://127.0.0.1:8545";
export const DEFAULT_CONTRACT_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
const CONFIG_KEY = "chaincare.web3.config.v1";

export const STAGE_NAMES = ["Manufactured", "Shipped", "Delivered", "Sold"] as const;
export type StageIndex = 0 | 1 | 2 | 3;

export const ROLE_NAMES = ["None", "Admin", "Manufacturer", "Distributor", "Retailer"] as const;
export type RoleIndex = 0 | 1 | 2 | 3 | 4;

export const DRUG_TRACKER_ABI = [
  { inputs: [], stateMutability: "nonpayable", type: "constructor" },
  {
    anonymous: false,
    inputs: [
      { indexed: false, internalType: "uint256", name: "batchId", type: "uint256" },
      { indexed: false, internalType: "string", name: "drugName", type: "string" },
      { indexed: true, internalType: "address", name: "manufacturer", type: "address" },
    ],
    name: "BatchCreated",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: false, internalType: "uint256", name: "batchId", type: "uint256" },
      { indexed: false, internalType: "enum DrugTracker.Stage", name: "stage", type: "uint8" },
      { indexed: true, internalType: "address", name: "handler", type: "address" },
      { indexed: false, internalType: "string", name: "notes", type: "string" },
    ],
    name: "CustodyLogged",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: false, internalType: "uint256", name: "batchId", type: "uint256" },
      { indexed: false, internalType: "enum DrugTracker.Stage", name: "newStage", type: "uint8" },
    ],
    name: "StageUpdated",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "address", name: "account", type: "address" },
      { indexed: false, internalType: "string", name: "name", type: "string" },
      { indexed: false, internalType: "enum DrugTracker.Role", name: "role", type: "uint8" },
    ],
    name: "StakeholderRegistered",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [{ indexed: true, internalType: "address", name: "account", type: "address" }],
    name: "StakeholderRevoked",
    type: "event",
  },
  {
    inputs: [],
    name: "admin",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "_batchId", type: "uint256" }],
    name: "advanceStage",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "_batchId", type: "uint256" },
      { internalType: "string", name: "_notes", type: "string" },
    ],
    name: "advanceStageWithNotes",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "batchCount",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    name: "batches",
    outputs: [
      { internalType: "string", name: "drugName", type: "string" },
      { internalType: "address", name: "manufacturer", type: "address" },
      { internalType: "address", name: "distributor", type: "address" },
      { internalType: "address", name: "retailer", type: "address" },
      { internalType: "enum DrugTracker.Stage", name: "stage", type: "uint8" },
      { internalType: "uint256", name: "lastUpdated", type: "uint256" },
      { internalType: "string", name: "details", type: "string" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "string", name: "_drugName", type: "string" }],
    name: "createBatch",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "string", name: "_drugName", type: "string" },
      { internalType: "string", name: "_details", type: "string" },
    ],
    name: "createBatchWithDetails",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "_batchId", type: "uint256" }],
    name: "getBatch",
    outputs: [
      { internalType: "string", name: "drugName", type: "string" },
      { internalType: "address", name: "manufacturer", type: "address" },
      { internalType: "enum DrugTracker.Stage", name: "stage", type: "uint8" },
      { internalType: "uint256", name: "lastUpdated", type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "_batchId", type: "uint256" }],
    name: "getBatchExtended",
    outputs: [
      { internalType: "string", name: "drugName", type: "string" },
      { internalType: "address", name: "manufacturer", type: "address" },
      { internalType: "address", name: "distributor", type: "address" },
      { internalType: "address", name: "retailer", type: "address" },
      { internalType: "enum DrugTracker.Stage", name: "stage", type: "uint8" },
      { internalType: "uint256", name: "lastUpdated", type: "uint256" },
      { internalType: "string", name: "details", type: "string" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "_account", type: "address" }],
    name: "getStakeholder",
    outputs: [
      { internalType: "string", name: "name", type: "string" },
      { internalType: "enum DrugTracker.Role", name: "role", type: "uint8" },
      { internalType: "bool", name: "isActive", type: "bool" },
      { internalType: "uint256", name: "registeredAt", type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "owner",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "_account", type: "address" },
      { internalType: "string", name: "_name", type: "string" },
      { internalType: "enum DrugTracker.Role", name: "_role", type: "uint8" },
    ],
    name: "registerStakeholder",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "_account", type: "address" }],
    name: "revokeStakeholder",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "", type: "address" }],
    name: "stakeholders",
    outputs: [
      { internalType: "string", name: "name", type: "string" },
      { internalType: "enum DrugTracker.Role", name: "role", type: "uint8" },
      { internalType: "bool", name: "isActive", type: "bool" },
      { internalType: "uint256", name: "registeredAt", type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },
] as const;

export type Web3Config = {
  rpcUrl: string;
  contractAddress: string;
  useMetaMask: boolean;
  selectedAccountIndex?: number;
};

export type OnChainBatch = {
  batchId: number;
  drugName: string;
  manufacturer: string;
  distributor?: string | undefined;
  retailer?: string | undefined;
  stage: number;
  stageName: string;
  lastUpdated: number;
  lastUpdatedFormatted: string;
  details?: string | undefined;
};

export type OnChainEventRecord = {
  kind: "BATCH_CREATED" | "STAGE_UPDATED" | "CUSTODY_LOGGED" | "STAKEHOLDER_REGISTERED";
  batchId?: number | undefined;
  drugName?: string | undefined;
  manufacturer?: string | undefined;
  handler?: string | undefined;
  newStage?: number | undefined;
  stageName?: string | undefined;
  txHash: string;
  blockNumber: number;
  timestamp: string;
  summary: string;
};

export type BlockchainStatus = {
  connected: boolean;
  blockNumber: number;
  batchCount: number;
  account?: string | undefined;
  error?: string | undefined;
};

export function getWeb3Config(): Web3Config {
  if (typeof window === "undefined") {
    return {
      rpcUrl: DEFAULT_RPC_URL,
      contractAddress: DEFAULT_CONTRACT_ADDRESS,
      useMetaMask: false,
      selectedAccountIndex: 0,
    };
  }
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    /* ignore fallback */
  }
  return {
    rpcUrl: DEFAULT_RPC_URL,
    contractAddress: DEFAULT_CONTRACT_ADDRESS,
    useMetaMask: false,
    selectedAccountIndex: 0,
  };
}

export function saveWeb3Config(config: Web3Config): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
  window.dispatchEvent(new CustomEvent("chaincare:config_changed", { detail: config }));
}

export function getProvider(customConfig?: Web3Config): ethers.Provider {
  const config = customConfig ?? getWeb3Config();
  if (
    config.useMetaMask &&
    typeof window !== "undefined" &&
    (window as unknown as { ethereum?: ethers.Eip1193Provider }).ethereum
  ) {
    return new ethers.BrowserProvider(
      (window as unknown as { ethereum: ethers.Eip1193Provider }).ethereum!,
    );
  }
  return new ethers.JsonRpcProvider(config.rpcUrl);
}

export async function getSigner(customConfig?: Web3Config): Promise<ethers.Signer> {
  const config = customConfig ?? getWeb3Config();
  if (
    config.useMetaMask &&
    typeof window !== "undefined" &&
    (window as unknown as { ethereum?: ethers.Eip1193Provider }).ethereum
  ) {
    const browserProvider = new ethers.BrowserProvider(
      (window as unknown as { ethereum: ethers.Eip1193Provider }).ethereum!,
    );
    return await browserProvider.getSigner();
  }
  const jsonRpcProvider = new ethers.JsonRpcProvider(config.rpcUrl);
  const accountIndex = config.selectedAccountIndex ?? 0;
  return await jsonRpcProvider.getSigner(accountIndex);
}

// Typed wrapper around the DrugTracker contract
type DrugTrackerContractMethods = {
  createBatch(drugName: string): Promise<ethers.ContractTransactionResponse>;
  createBatchWithDetails(
    drugName: string,
    details: string,
  ): Promise<ethers.ContractTransactionResponse>;
  advanceStage(batchId: number | bigint): Promise<ethers.ContractTransactionResponse>;
  advanceStageWithNotes(
    batchId: number | bigint,
    notes: string,
  ): Promise<ethers.ContractTransactionResponse>;
  getBatch(batchId: number | bigint): Promise<[string, string, bigint, bigint]>;
  getBatchExtended(
    batchId: number | bigint,
  ): Promise<[string, string, string, string, bigint, bigint, string]>;
  registerStakeholder(
    account: string,
    name: string,
    role: number,
  ): Promise<ethers.ContractTransactionResponse>;
  revokeStakeholder(account: string): Promise<ethers.ContractTransactionResponse>;
  getStakeholder(account: string): Promise<[string, bigint, boolean, bigint]>;
  batchCount(): Promise<bigint>;
  admin(): Promise<string>;
  owner(): Promise<string>;
  filters: {
    BatchCreated(): ethers.DeferredTopicFilter;
    StageUpdated(): ethers.DeferredTopicFilter;
    CustodyLogged(): ethers.DeferredTopicFilter;
    StakeholderRegistered(): ethers.DeferredTopicFilter;
  };
};

export function getReadOnlyContract(
  customConfig?: Web3Config,
): ethers.Contract & DrugTrackerContractMethods {
  const config = customConfig ?? getWeb3Config();
  const provider = getProvider(config);
  return new ethers.Contract(
    config.contractAddress,
    DRUG_TRACKER_ABI,
    provider,
  ) as unknown as ethers.Contract & DrugTrackerContractMethods;
}

export async function getWritableContract(
  customConfig?: Web3Config,
): Promise<ethers.Contract & DrugTrackerContractMethods> {
  const config = customConfig ?? getWeb3Config();
  const signer = await getSigner(config);
  return new ethers.Contract(
    config.contractAddress,
    DRUG_TRACKER_ABI,
    signer,
  ) as unknown as ethers.Contract & DrugTrackerContractMethods;
}

export async function checkBlockchainStatus(customConfig?: Web3Config): Promise<BlockchainStatus> {
  try {
    const config = customConfig ?? getWeb3Config();
    const provider = getProvider(config);
    const blockNumber = await provider.getBlockNumber();
    const contract = getReadOnlyContract(config);
    const countBigInt = await contract.batchCount();
    let account: string | undefined = undefined;
    try {
      const signer = await getSigner(config);
      account = await signer.getAddress();
    } catch {
      /* signer optional */
    }
    return {
      connected: true,
      blockNumber,
      batchCount: Number(countBigInt),
      account,
    };
  } catch (err: unknown) {
    return {
      connected: false,
      blockNumber: 0,
      batchCount: 0,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

// 1. Manufacturer: Mint batch on chain
export async function createBatchOnChain(
  drugName: string,
  detailsOrConfig?: string | Web3Config,
  customConfig?: Web3Config,
): Promise<{ txHash: string; batchId: number; blockNumber: number }> {
  let details = "";
  let config = customConfig;
  if (typeof detailsOrConfig === "object" && detailsOrConfig !== null) {
    config = detailsOrConfig;
  } else if (typeof detailsOrConfig === "string") {
    details = detailsOrConfig;
  }
  const contract = await getWritableContract(config);
  let tx: ethers.ContractTransactionResponse;
  try {
    tx = await contract.createBatchWithDetails(drugName, details);
  } catch {
    tx = await contract.createBatch(drugName);
  }
  const receipt = await tx.wait();

  if (!receipt) {
    throw new Error("Transaction failed or was not mined.");
  }

  let batchId = 0;
  for (const log of receipt.logs) {
    try {
      const parsed = contract.interface.parseLog({ topics: [...log.topics], data: log.data });
      if (parsed && parsed.name === "BatchCreated") {
        batchId = Number(parsed.args[0]);
        break;
      }
    } catch {
      // ignore
    }
  }

  if (!batchId) {
    const total = await contract.batchCount();
    batchId = Number(total);
  }

  return {
    txHash: receipt.hash,
    batchId,
    blockNumber: receipt.blockNumber,
  };
}

// 2. Supply chain: Advance custody stage
export async function advanceStageOnChain(
  batchId: number,
  notesOrConfig?: string | Web3Config,
  customConfig?: Web3Config,
): Promise<{ txHash: string; newStage: number; stageName: string; blockNumber: number }> {
  let notes = "";
  let config = customConfig;
  if (typeof notesOrConfig === "object" && notesOrConfig !== null) {
    config = notesOrConfig;
  } else if (typeof notesOrConfig === "string") {
    notes = notesOrConfig;
  }
  const contract = await getWritableContract(config);
  let tx: ethers.ContractTransactionResponse;
  try {
    if (notes) {
      tx = await contract.advanceStageWithNotes(batchId, notes);
    } else {
      tx = await contract.advanceStage(batchId);
    }
  } catch {
    tx = await contract.advanceStage(batchId);
  }

  const receipt = await tx.wait();

  if (!receipt) {
    throw new Error("Transaction failed or was not mined.");
  }

  let newStage = 0;
  for (const log of receipt.logs) {
    try {
      const parsed = contract.interface.parseLog({ topics: [...log.topics], data: log.data });
      if (parsed && parsed.name === "StageUpdated") {
        newStage = Number(parsed.args[1]);
        break;
      }
    } catch {
      // ignore
    }
  }

  return {
    txHash: receipt.hash,
    newStage,
    stageName: STAGE_NAMES[newStage as StageIndex] ?? `Stage ${newStage}`,
    blockNumber: receipt.blockNumber,
  };
}

// 3. Administrator: Register stakeholder on chain
export async function registerStakeholderOnChain(
  account: string,
  name: string,
  role: number,
  customConfig?: Web3Config,
): Promise<{ txHash: string; blockNumber: number }> {
  const contract = await getWritableContract(customConfig);
  const tx = await contract.registerStakeholder(account, name, role);
  const receipt = await tx.wait();
  if (!receipt) throw new Error("Transaction failed");
  return { txHash: receipt.hash, blockNumber: receipt.blockNumber };
}

// 4. Administrator: Revoke stakeholder on chain
export async function revokeStakeholderOnChain(
  account: string,
  customConfig?: Web3Config,
): Promise<{ txHash: string; blockNumber: number }> {
  const contract = await getWritableContract(customConfig);
  const tx = await contract.revokeStakeholder(account);
  const receipt = await tx.wait();
  if (!receipt) throw new Error("Transaction failed");
  return { txHash: receipt.hash, blockNumber: receipt.blockNumber };
}

export async function getStakeholderOnChain(
  account: string,
  customConfig?: Web3Config,
): Promise<{ name: string; role: RoleIndex; roleName: string; isActive: boolean } | null> {
  try {
    const contract = getReadOnlyContract(customConfig);
    const result = await contract.getStakeholder(account);
    const roleIdx = Number(result[1]) as RoleIndex;
    return {
      name: result[0],
      role: roleIdx,
      roleName: ROLE_NAMES[roleIdx] ?? "None",
      isActive: result[2],
    };
  } catch {
    return null;
  }
}

export async function getBatchOnChain(
  batchId: number,
  customConfig?: Web3Config,
): Promise<OnChainBatch | null> {
  try {
    const contract = getReadOnlyContract(customConfig);
    const totalCount = await contract.batchCount();
    if (batchId < 1 || batchId > Number(totalCount)) {
      return null;
    }

    // Try getBatchExtended first
    try {
      const ext = await contract.getBatchExtended(batchId);
      const drugName = ext[0];
      const manufacturer = ext[1];
      const distributor = ext[2] !== ethers.ZeroAddress ? ext[2] : undefined;
      const retailer = ext[3] !== ethers.ZeroAddress ? ext[3] : undefined;
      const stageIndex = Number(ext[4]);
      const lastUpdated = Number(ext[5]);
      const details = ext[6];

      return {
        batchId,
        drugName,
        manufacturer,
        distributor,
        retailer,
        stage: stageIndex,
        stageName: STAGE_NAMES[stageIndex as StageIndex] ?? `Stage ${stageIndex}`,
        lastUpdated,
        lastUpdatedFormatted: new Date(lastUpdated * 1000).toLocaleString(),
        details,
      };
    } catch {
      // Fallback to basic getBatch
      const result = await contract.getBatch(batchId);
      const drugName = result[0];
      const manufacturer = result[1];
      const stageIndex = Number(result[2]);
      const lastUpdated = Number(result[3]);

      if (!drugName && manufacturer === ethers.ZeroAddress) {
        return null;
      }

      return {
        batchId,
        drugName,
        manufacturer,
        stage: stageIndex,
        stageName: STAGE_NAMES[stageIndex as StageIndex] ?? `Stage ${stageIndex}`,
        lastUpdated,
        lastUpdatedFormatted: new Date(lastUpdated * 1000).toLocaleString(),
      };
    }
  } catch {
    return null;
  }
}

export async function getAllBatchesOnChain(customConfig?: Web3Config): Promise<OnChainBatch[]> {
  try {
    const contract = getReadOnlyContract(customConfig);
    const totalBigInt = await contract.batchCount();
    const count = Number(totalBigInt);
    const batches: OnChainBatch[] = [];

    for (let i = 1; i <= count; i++) {
      try {
        const item = await getBatchOnChain(i, customConfig);
        if (item) batches.push(item);
      } catch {
        /* continue */
      }
    }
    return batches;
  } catch {
    return [];
  }
}

export async function getOnChainEvents(customConfig?: Web3Config): Promise<OnChainEventRecord[]> {
  try {
    const config = customConfig ?? getWeb3Config();
    const contract = getReadOnlyContract(config);
    const provider = getProvider(config);

    const filterCreated = contract.filters.BatchCreated();
    const filterUpdated = contract.filters.StageUpdated();

    const [createdLogs, updatedLogs] = await Promise.all([
      contract.queryFilter(filterCreated, 0, "latest"),
      contract.queryFilter(filterUpdated, 0, "latest"),
    ]);

    const records: OnChainEventRecord[] = [];
    const blockTimestamps = new Map<number, string>();

    async function getBlockTime(blockNum: number): Promise<string> {
      if (blockTimestamps.has(blockNum)) return blockTimestamps.get(blockNum)!;
      try {
        const blk = await provider.getBlock(blockNum);
        const iso = blk ? new Date(blk.timestamp * 1000).toISOString() : new Date().toISOString();
        blockTimestamps.set(blockNum, iso);
        return iso;
      } catch {
        return new Date().toISOString();
      }
    }

    for (const log of createdLogs) {
      try {
        const parsed = contract.interface.parseLog({ topics: [...log.topics], data: log.data });
        if (parsed) {
          const batchId = Number(parsed.args[0]);
          const drugName = String(parsed.args[1]);
          const manufacturer = String(parsed.args[2]);
          const timestamp = await getBlockTime(log.blockNumber);
          records.push({
            kind: "BATCH_CREATED",
            batchId,
            drugName,
            manufacturer,
            txHash: log.transactionHash,
            blockNumber: log.blockNumber,
            timestamp,
            summary: `Batch #${batchId} ("${drugName}") registered by Manufacturer ${manufacturer.slice(0, 8)}…${manufacturer.slice(-6)}`,
          });
        }
      } catch {
        /* skip */
      }
    }

    for (const log of updatedLogs) {
      try {
        const parsed = contract.interface.parseLog({ topics: [...log.topics], data: log.data });
        if (parsed) {
          const batchId = Number(parsed.args[0]);
          const newStage = Number(parsed.args[1]);
          const stageName = STAGE_NAMES[newStage as StageIndex] ?? `Stage ${newStage}`;
          const timestamp = await getBlockTime(log.blockNumber);
          records.push({
            kind: "STAGE_UPDATED",
            batchId,
            newStage,
            stageName,
            txHash: log.transactionHash,
            blockNumber: log.blockNumber,
            timestamp,
            summary: `Batch #${batchId} stage advanced to ${stageName} (Stage ${newStage})`,
          });
        }
      } catch {
        /* skip */
      }
    }

    records.sort((a, b) => b.blockNumber - a.blockNumber);
    return records;
  } catch {
    return [];
  }
}
