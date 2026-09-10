// Simulated pharmaceutical supply-chain ledger.
// Data is kept in the browser (localStorage) so the demo works without a backend.

export type StakeholderRole = "ADMIN" | "MANUFACTURER" | "DISTRIBUTOR" | "RETAILER" | "CONSUMER";

export type StakeholderPersona = {
  id: string;
  name: string;
  orgName: string;
  role: StakeholderRole;
  address: string;
  badge: string;
  description: string;
};

export const DEFAULT_PERSONAS: StakeholderPersona[] = [
  {
    id: "admin-genesis",
    name: "Dr. Evelyn Vance",
    orgName: "PharmaLedger Network Oversight",
    role: "ADMIN",
    address: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
    badge: "Admin",
    description: "Manages network participants, user permissions, and compliance monitoring.",
  },
  {
    id: "mfg-nordis",
    name: "Marcus Sterling",
    orgName: "Nordis Pharma Labs",
    role: "MANUFACTURER",
    address: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
    badge: "Manufacturer",
    description: "Registers genuine medicine batches on-chain and generates unique QR labels.",
  },
  {
    id: "dist-apex",
    name: "Rachel Kim",
    orgName: "Apex Logistics & Distribution Hub",
    role: "DISTRIBUTOR",
    address: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
    badge: "Distributor",
    description: "Verifies factory origin, maintains cold chain, and records transit movement.",
  },
  {
    id: "ret-medplus",
    name: "Tariq Al-Mansoor",
    orgName: "MedPlus Central Pharmacy #104",
    role: "RETAILER",
    address: "0x90F79bf6EB9c4245fb460459561039a15723019f",
    badge: "Retailer",
    description: "Authenticates packages before stocking shelves and dispenses to patients.",
  },
  {
    id: "cons-alice",
    name: "Alice Johnson",
    orgName: "Verified Patient / Consumer",
    role: "CONSUMER",
    address: "0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65",
    badge: "Consumer",
    description: "Scans package QR code to confirm medicine authenticity before taking doses.",
  },
];

const ACTIVE_PERSONA_KEY = "chaincare.active_persona.v1";

export function getActivePersona(): StakeholderPersona {
  if (typeof window === "undefined") return DEFAULT_PERSONAS[1]!; // Default to Manufacturer
  try {
    const raw = localStorage.getItem(ACTIVE_PERSONA_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.role) return parsed;
    }
  } catch {
    /* fallback */
  }
  return DEFAULT_PERSONAS[1]!; // Manufacturer default
}

export function setActivePersona(persona: StakeholderPersona): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(ACTIVE_PERSONA_KEY, JSON.stringify(persona));
  window.dispatchEvent(new CustomEvent("chaincare:persona_changed", { detail: persona }));
}

export type BlockKind =
  | "REGISTER"
  | "VERIFY"
  | "TRANSFER"
  | "DISPATCH"
  | "RECEIVE"
  | "DISPENSE"
  | "FLAG_COUNTERFEIT"
  | "STAKEHOLDER_REGISTER"
  | "STAKEHOLDER_REVOKE";

export type StageIndex = 0 | 1 | 2 | 3;
export const STAGE_NAMES = ["Manufactured", "Shipped", "Delivered", "Sold"] as const;

export type Product = {
  id: string; // serial / QR payload
  name: string;
  batch: string;
  manufacturer: string;
  manufacturerAddress: string;
  distributor?: string | undefined;
  distributorAddress?: string | undefined;
  retailer?: string | undefined;
  retailerAddress?: string | undefined;
  dosage: string;
  quantity: number;
  mfgDate: string;
  expDate: string;
  registeredAt: string;
  txHash: string;
  blockIndex: number;
  stage: StageIndex;
  stageName: string;
  transitNotes?: string | undefined;
  pharmacyNotes?: string | undefined;
};

export type Block = {
  index: number;
  kind: BlockKind;
  timestamp: string;
  prevHash: string;
  hash: string;
  txHash: string;
  productId: string;
  summary: string;
  valid: boolean;
  actorName: string;
  actorRole: StakeholderRole;
  actorAddress: string;
};

export type StakeholderRecord = {
  id: string;
  address: string;
  name: string;
  orgName: string;
  role: StakeholderRole;
  isActive: boolean;
  registeredAt: string;
};

export type CounterfeitAlert = {
  id: string;
  productId: string;
  reportedBy: string;
  reportedAt: string;
  reason: string;
  resolved: boolean;
};

export type Ledger = {
  products: Product[];
  blocks: Block[];
  stakeholders: StakeholderRecord[];
  alerts: CounterfeitAlert[];
};

export type VerifyResult = {
  status: "authentic" | "counterfeit" | "expired";
  code: string;
  product?: Product | undefined;
  block: Block;
};

const STORAGE_KEY = "pharmachain.ledger.v2";

/* ---------- pseudo hashing (deterministic, demo only) ---------- */

function mix(seed: number): number {
  let t = (seed += 0x6d2b79f5);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return (t ^ (t >>> 14)) >>> 0;
}

export function pseudoHash(input: string, prefix = "0x"): string {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  let out = "";
  let s = h;
  while (out.length < 64) {
    s = mix(s);
    out += s.toString(16).padStart(8, "0");
  }
  return prefix + out.slice(0, 64);
}

export function shortHash(hash: string, size = 6): string {
  if (!hash) return "—";
  return `${hash.slice(0, size + 2)}…${hash.slice(-size)}`;
}

export function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/* ---------- seed ledger ---------- */

const GENESIS_HASH = "0x" + "0".repeat(64);

const SEED_STAKEHOLDERS: StakeholderRecord[] = [
  {
    id: "stk-1",
    address: DEFAULT_PERSONAS[0]!.address,
    name: DEFAULT_PERSONAS[0]!.name,
    orgName: DEFAULT_PERSONAS[0]!.orgName,
    role: "ADMIN",
    isActive: true,
    registeredAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "stk-2",
    address: DEFAULT_PERSONAS[1]!.address,
    name: DEFAULT_PERSONAS[1]!.name,
    orgName: DEFAULT_PERSONAS[1]!.orgName,
    role: "MANUFACTURER",
    isActive: true,
    registeredAt: "2026-01-05T09:00:00.000Z",
  },
  {
    id: "stk-3",
    address: DEFAULT_PERSONAS[2]!.address,
    name: DEFAULT_PERSONAS[2]!.name,
    orgName: DEFAULT_PERSONAS[2]!.orgName,
    role: "DISTRIBUTOR",
    isActive: true,
    registeredAt: "2026-01-10T11:00:00.000Z",
  },
  {
    id: "stk-4",
    address: DEFAULT_PERSONAS[3]!.address,
    name: DEFAULT_PERSONAS[3]!.name,
    orgName: DEFAULT_PERSONAS[3]!.orgName,
    role: "RETAILER",
    isActive: true,
    registeredAt: "2026-01-15T14:30:00.000Z",
  },
];

function buildSeed(): Ledger {
  const products: Product[] = [];
  const blocks: Block[] = [];
  let prevHash = GENESIS_HASH;

  // Initial products across supply chain stages
  const initialData: Array<{
    id: string;
    name: string;
    batch: string;
    dosage: string;
    quantity: number;
    mfgDate: string;
    expDate: string;
    stage: StageIndex;
    distributor?: string | undefined;
    distributorAddress?: string | undefined;
    retailer?: string | undefined;
    retailerAddress?: string | undefined;
    transitNotes?: string | undefined;
    pharmacyNotes?: string | undefined;
  }> = [
    {
      id: "PH-AMX-8842-0001",
      name: "Amoxicillin 500mg Capsules",
      batch: "AMX-8842",
      dosage: "500 mg",
      quantity: 12000,
      mfgDate: "2026-02-11",
      expDate: "2028-02-11",
      stage: 3, // Sold
      distributor: "Apex Logistics & Distribution Hub",
      distributorAddress: DEFAULT_PERSONAS[2]!.address,
      retailer: "MedPlus Central Pharmacy #104",
      retailerAddress: DEFAULT_PERSONAS[3]!.address,
      transitNotes: "Cold chain verified (4°C - 8°C). Dispatched via refrigerated fleet #22.",
      pharmacyNotes: "Dispensed via Rx #884920 to customer.",
    },
    {
      id: "PH-INS-2210-0007",
      name: "Insulin Glargine Injection",
      batch: "INS-2210",
      dosage: "100 IU/mL",
      quantity: 4300,
      mfgDate: "2026-04-02",
      expDate: "2027-10-02",
      stage: 2, // Delivered / In Pharmacy Stock
      distributor: "Apex Logistics & Distribution Hub",
      distributorAddress: DEFAULT_PERSONAS[2]!.address,
      retailer: "MedPlus Central Pharmacy #104",
      retailerAddress: DEFAULT_PERSONAS[3]!.address,
      transitNotes: "Temperature sensor logs attached. No breach.",
      pharmacyNotes: "Inventory intake verified. Stocked in main pharmacy refrigerator.",
    },
    {
      id: "PH-PCM-5519-0042",
      name: "Paracetamol 650mg Tablets",
      batch: "PCM-5519",
      dosage: "650 mg",
      quantity: 88000,
      mfgDate: "2026-06-19",
      expDate: "2028-06-19",
      stage: 1, // Shipped (In Transit)
      distributor: "Apex Logistics & Distribution Hub",
      distributorAddress: DEFAULT_PERSONAS[2]!.address,
      transitNotes:
        "Package scanned and accepted at distribution central hub. In transit to pharmacy.",
    },
    {
      id: "PH-AZI-9011-0089",
      name: "Azithromycin 250mg Tablets",
      batch: "AZI-9011",
      dosage: "250 mg",
      quantity: 15000,
      mfgDate: "2026-08-01",
      expDate: "2028-08-01",
      stage: 0, // Manufactured
    },
  ];

  initialData.forEach((p, idx) => {
    const mfgTime = "2026-02-11T09:14:00.000Z";
    const regTx = pseudoHash(`${p.id}|${p.batch}|register`);
    const regIndex = blocks.length + 1;
    const regHash = pseudoHash(`${regIndex}|${prevHash}|${regTx}`);

    blocks.push({
      index: regIndex,
      kind: "REGISTER",
      timestamp: mfgTime,
      prevHash,
      hash: regHash,
      txHash: regTx,
      productId: p.id,
      summary: `Batch ${p.batch} ("${p.name}") registered on-chain by Manufacturer (Nordis Pharma)`,
      valid: true,
      actorName: DEFAULT_PERSONAS[1]!.name,
      actorRole: "MANUFACTURER",
      actorAddress: DEFAULT_PERSONAS[1]!.address,
    });
    prevHash = regHash;

    // Add stage progression blocks based on stage
    if (p.stage >= 1) {
      const shipIndex = blocks.length + 1;
      const shipTx = pseudoHash(`${p.id}|ship|${shipIndex}`);
      const shipHash = pseudoHash(`${shipIndex}|${prevHash}|${shipTx}`);
      blocks.push({
        index: shipIndex,
        kind: "DISPATCH",
        timestamp: "2026-02-15T11:02:00.000Z",
        prevHash,
        hash: shipHash,
        txHash: shipTx,
        productId: p.id,
        summary: `Distributor (Apex Logistics) verified origin and advanced custody to SHIPPED. ${p.transitNotes || ""}`,
        valid: true,
        actorName: DEFAULT_PERSONAS[2]!.name,
        actorRole: "DISTRIBUTOR",
        actorAddress: DEFAULT_PERSONAS[2]!.address,
      });
      prevHash = shipHash;
    }

    if (p.stage >= 2) {
      const recIndex = blocks.length + 1;
      const recTx = pseudoHash(`${p.id}|receive|${recIndex}`);
      const recHash = pseudoHash(`${recIndex}|${prevHash}|${recTx}`);
      blocks.push({
        index: recIndex,
        kind: "RECEIVE",
        timestamp: "2026-02-20T14:15:00.000Z",
        prevHash,
        hash: recHash,
        txHash: recTx,
        productId: p.id,
        summary: `Retailer (MedPlus Pharmacy) verified sealed shipment and advanced custody to DELIVERED.`,
        valid: true,
        actorName: DEFAULT_PERSONAS[3]!.name,
        actorRole: "RETAILER",
        actorAddress: DEFAULT_PERSONAS[3]!.address,
      });
      prevHash = recHash;
    }

    if (p.stage >= 3) {
      const soldIndex = blocks.length + 1;
      const soldTx = pseudoHash(`${p.id}|sold|${soldIndex}`);
      const soldHash = pseudoHash(`${soldIndex}|${prevHash}|${soldTx}`);
      blocks.push({
        index: soldIndex,
        kind: "DISPENSE",
        timestamp: "2026-03-01T16:45:00.000Z",
        prevHash,
        hash: soldHash,
        txHash: soldTx,
        productId: p.id,
        summary: `Retailer (MedPlus Pharmacy) dispensed package to customer. Marked as SOLD.`,
        valid: true,
        actorName: DEFAULT_PERSONAS[3]!.name,
        actorRole: "RETAILER",
        actorAddress: DEFAULT_PERSONAS[3]!.address,
      });
      prevHash = soldHash;
    }

    products.push({
      id: p.id,
      name: p.name,
      batch: p.batch,
      manufacturer: "Nordis Pharma Labs",
      manufacturerAddress: DEFAULT_PERSONAS[1]!.address,
      distributor: p.distributor,
      distributorAddress: p.distributorAddress,
      retailer: p.retailer,
      retailerAddress: p.retailerAddress,
      dosage: p.dosage,
      quantity: p.quantity,
      mfgDate: p.mfgDate,
      expDate: p.expDate,
      registeredAt: mfgTime,
      txHash: regTx,
      blockIndex: regIndex,
      stage: p.stage,
      stageName: STAGE_NAMES[p.stage],
      transitNotes: p.transitNotes,
      pharmacyNotes: p.pharmacyNotes,
    });
  });

  // Seed sample verification checks
  const verifyBlockIndex = blocks.length + 1;
  const verifyTx = pseudoHash(`verify|sample|${verifyBlockIndex}`);
  const verifyHash = pseudoHash(`${verifyBlockIndex}|${prevHash}|${verifyTx}`);
  blocks.push({
    index: verifyBlockIndex,
    kind: "VERIFY",
    timestamp: "2026-03-05T18:22:00.000Z",
    prevHash,
    hash: verifyHash,
    txHash: verifyTx,
    productId: "PH-AMX-8842-0001",
    summary: `Customer (Alice Johnson) scanned QR code. Result: AUTHENTIC, all 4 supply chain seals valid.`,
    valid: true,
    actorName: DEFAULT_PERSONAS[4]!.name,
    actorRole: "CONSUMER",
    actorAddress: DEFAULT_PERSONAS[4]!.address,
  });

  return {
    products,
    blocks,
    stakeholders: SEED_STAKEHOLDERS,
    alerts: [
      {
        id: "alert-1",
        productId: "PH-FAKE-9999-0000",
        reportedBy: "Customer Scan (Chicago, IL)",
        reportedAt: "2026-03-08T10:15:00.000Z",
        reason: "Serial not found in smart contract registry. Packaging showed blurred hologram.",
        resolved: false,
      },
    ],
  };
}

/* ---------- storage ---------- */

export function loadLedger(): Ledger {
  if (typeof window === "undefined")
    return { products: [], blocks: [], stakeholders: [], alerts: [] };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Ledger;
      if (parsed.stakeholders && parsed.products) return parsed;
    }
  } catch {
    /* fall through to seed */
  }
  const seed = buildSeed();
  saveLedger(seed);
  return seed;
}

export function saveLedger(ledger: Ledger): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ledger));
  } catch {
    /* ignore */
  }
}

export function resetLedger(): Ledger {
  const seed = buildSeed();
  saveLedger(seed);
  return seed;
}

/* ---------- ledger mutations ---------- */

function nextBlock(
  ledger: Ledger,
  kind: BlockKind,
  productId: string,
  summary: string,
  valid = true,
  actor?: StakeholderPersona,
): Block {
  const persona = actor ?? getActivePersona();
  const index = ledger.blocks.length + 1;
  const prevHash = ledger.blocks[ledger.blocks.length - 1]?.hash ?? GENESIS_HASH;
  const timestamp = new Date().toISOString();
  const txHash = pseudoHash(`${productId}|${timestamp}|${kind}|${index}`);
  return {
    index,
    kind,
    timestamp,
    prevHash,
    hash: pseudoHash(`${index}|${prevHash}|${txHash}`),
    txHash,
    productId,
    summary,
    valid,
    actorName: persona.name,
    actorRole: persona.role,
    actorAddress: persona.address,
  };
}

export type RegisterInput = {
  name: string;
  batch: string;
  manufacturer: string;
  dosage: string;
  quantity: number;
  mfgDate: string;
  expDate: string;
};

// 1. Manufacturer: Register Product Batch
export function registerProduct(
  ledger: Ledger,
  input: RegisterInput,
  actor?: StakeholderPersona,
): { ledger: Ledger; product: Product; block: Block } {
  const persona = actor ?? getActivePersona();
  const serialSuffix = String(ledger.products.length + 1).padStart(4, "0");
  const id = `PH-${input.batch.toUpperCase().replace(/[^A-Z0-9-]/g, "")}-${serialSuffix}`;
  const draft: Ledger = {
    products: [...ledger.products],
    blocks: [...ledger.blocks],
    stakeholders: [...ledger.stakeholders],
    alerts: [...ledger.alerts],
  };

  const block = nextBlock(
    draft,
    "REGISTER",
    id,
    `Batch ${input.batch} ("${input.name}") registered on-chain by Manufacturer (${persona.orgName})`,
    true,
    persona,
  );

  const product: Product = {
    ...input,
    id,
    manufacturerAddress: persona.address,
    registeredAt: block.timestamp,
    txHash: block.txHash,
    blockIndex: block.index,
    stage: 0,
    stageName: STAGE_NAMES[0],
  };

  const next: Ledger = {
    ...ledger,
    products: [product, ...ledger.products],
    blocks: [...ledger.blocks, block],
  };
  saveLedger(next);
  return { ledger: next, product, block };
}

// 2. Distributor: Dispatch Batch
export function dispatchBatch(
  ledger: Ledger,
  productId: string,
  transitNotes: string,
  actor?: StakeholderPersona,
): { ledger: Ledger; product: Product; block: Block } {
  const persona = actor ?? getActivePersona();
  const index = ledger.products.findIndex((p) => p.id === productId);
  if (index === -1) throw new Error("Product not found");
  const current = ledger.products[index]!;

  const block = nextBlock(
    ledger,
    "DISPATCH",
    productId,
    `Distributor (${persona.orgName}) verified batch origin and advanced status to SHIPPED. ${transitNotes}`,
    true,
    persona,
  );

  const updatedProduct: Product = {
    ...current,
    stage: 1,
    stageName: STAGE_NAMES[1],
    distributor: persona.orgName,
    distributorAddress: persona.address,
    transitNotes,
  };

  const updatedProducts = [...ledger.products];
  updatedProducts[index] = updatedProduct;

  const next: Ledger = {
    ...ledger,
    products: updatedProducts,
    blocks: [...ledger.blocks, block],
  };
  saveLedger(next);
  return { ledger: next, product: updatedProduct, block };
}

// 3. Retailer: Receive Shipment into Pharmacy Inventory
export function receiveBatch(
  ledger: Ledger,
  productId: string,
  pharmacyNotes: string,
  actor?: StakeholderPersona,
): { ledger: Ledger; product: Product; block: Block } {
  const persona = actor ?? getActivePersona();
  const index = ledger.products.findIndex((p) => p.id === productId);
  if (index === -1) throw new Error("Product not found");
  const current = ledger.products[index]!;

  const block = nextBlock(
    ledger,
    "RECEIVE",
    productId,
    `Retailer (${persona.orgName}) verified authenticity and accepted batch into store inventory as DELIVERED. ${pharmacyNotes}`,
    true,
    persona,
  );

  const updatedProduct: Product = {
    ...current,
    stage: 2,
    stageName: STAGE_NAMES[2],
    retailer: persona.orgName,
    retailerAddress: persona.address,
    pharmacyNotes,
  };

  const updatedProducts = [...ledger.products];
  updatedProducts[index] = updatedProduct;

  const next: Ledger = {
    ...ledger,
    products: updatedProducts,
    blocks: [...ledger.blocks, block],
  };
  saveLedger(next);
  return { ledger: next, product: updatedProduct, block };
}

// 4. Retailer: Dispense to Customer (Mark Sold)
export function dispenseBatch(
  ledger: Ledger,
  productId: string,
  actor?: StakeholderPersona,
): { ledger: Ledger; product: Product; block: Block } {
  const persona = actor ?? getActivePersona();
  const index = ledger.products.findIndex((p) => p.id === productId);
  if (index === -1) throw new Error("Product not found");
  const current = ledger.products[index]!;

  const block = nextBlock(
    ledger,
    "DISPENSE",
    productId,
    `Retailer (${persona.orgName}) completed point-of-sale dispense to customer. Status: SOLD.`,
    true,
    persona,
  );

  const updatedProduct: Product = {
    ...current,
    stage: 3,
    stageName: STAGE_NAMES[3],
  };

  const updatedProducts = [...ledger.products];
  updatedProducts[index] = updatedProduct;

  const next: Ledger = {
    ...ledger,
    products: updatedProducts,
    blocks: [...ledger.blocks, block],
  };
  saveLedger(next);
  return { ledger: next, product: updatedProduct, block };
}

// 5. Consumer: Verify Product
export function verifyCode(
  ledger: Ledger,
  rawCode: string,
  actor?: StakeholderPersona,
): { ledger: Ledger; result: VerifyResult } {
  const persona = actor ?? getActivePersona();
  const code = rawCode.trim().toUpperCase();
  const product = ledger.products.find((p) => p.id.toUpperCase() === code);
  const expired = product ? new Date(product.expDate).getTime() < Date.now() : false;
  const status: VerifyResult["status"] = !product
    ? "counterfeit"
    : expired
      ? "expired"
      : "authentic";

  const summary = !product
    ? `Consumer scan FAILED: Identifier "${code}" has no cryptographic origin record on the network.`
    : expired
      ? `Consumer scan: Batch ${product.batch} is genuine but past expiry date (${product.expDate}).`
      : `Consumer scan: Batch ${product.batch} is 100% AUTHENTIC. Complete supply chain history verified.`;

  const block = nextBlock(
    ledger,
    "VERIFY",
    product?.id ?? code,
    summary,
    status !== "counterfeit",
    persona,
  );

  const next: Ledger = {
    ...ledger,
    blocks: [...ledger.blocks, block],
  };
  saveLedger(next);
  return { ledger: next, result: { status, code, product, block } };
}

// Consumer: Report Counterfeit Pack
export function reportCounterfeit(
  ledger: Ledger,
  productId: string,
  reason: string,
  reporterNotes?: string,
  actor?: StakeholderPersona,
): { ledger: Ledger; alert: CounterfeitAlert; block: Block } {
  const persona = actor ?? getActivePersona();
  const alertId = `ALERT-${Date.now().toString().slice(-6)}`;
  const alert: CounterfeitAlert = {
    id: alertId,
    productId,
    reportedBy: `${persona.name} (${persona.role})`,
    reportedAt: new Date().toISOString(),
    reason: `${reason}${reporterNotes ? ` — ${reporterNotes}` : ""}`,
    resolved: false,
  };

  const block = nextBlock(
    ledger,
    "FLAG_COUNTERFEIT",
    productId,
    `SUSPICIOUS ALERT: Pack "${productId}" flagged by ${persona.name}. Reason: ${reason}`,
    false,
    persona,
  );

  const next: Ledger = {
    ...ledger,
    alerts: [alert, ...ledger.alerts],
    blocks: [...ledger.blocks, block],
  };
  saveLedger(next);
  return { ledger: next, alert, block };
}

// Administrator: Stakeholder Management
export function registerStakeholderRecord(
  ledger: Ledger,
  record: Omit<StakeholderRecord, "id" | "registeredAt">,
  actor?: StakeholderPersona,
): { ledger: Ledger; record: StakeholderRecord; block: Block } {
  const persona = actor ?? getActivePersona();
  const id = `stk-${Date.now().toString().slice(-5)}`;
  const newRecord: StakeholderRecord = {
    ...record,
    id,
    registeredAt: new Date().toISOString(),
  };

  const block = nextBlock(
    ledger,
    "STAKEHOLDER_REGISTER",
    record.address,
    `Administrator registered new ${record.role}: "${record.name}" (${record.orgName}) with address ${record.address}`,
    true,
    persona,
  );

  const next: Ledger = {
    ...ledger,
    stakeholders: [newRecord, ...ledger.stakeholders],
    blocks: [...ledger.blocks, block],
  };
  saveLedger(next);
  return { ledger: next, record: newRecord, block };
}

export function revokeStakeholderRecord(
  ledger: Ledger,
  address: string,
  actor?: StakeholderPersona,
): { ledger: Ledger; block: Block } {
  const persona = actor ?? getActivePersona();
  const updatedStakeholders = ledger.stakeholders.map((s) =>
    s.address.toLowerCase() === address.toLowerCase() ? { ...s, isActive: false } : s,
  );

  const block = nextBlock(
    ledger,
    "STAKEHOLDER_REVOKE",
    address,
    `Administrator revoked permissions for stakeholder address ${address}`,
    true,
    persona,
  );

  const next: Ledger = {
    ...ledger,
    stakeholders: updatedStakeholders,
    blocks: [...ledger.blocks, block],
  };
  saveLedger(next);
  return { ledger: next, block };
}

export function historyFor(ledger: Ledger, productId: string): Block[] {
  return ledger.blocks.filter((b) => b.productId === productId).sort((a, b) => b.index - a.index);
}
