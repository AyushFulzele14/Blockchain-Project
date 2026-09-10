// Simulated pharmaceutical supply-chain ledger.
// Data is kept in the browser (localStorage) so the demo works without a backend.

export type BlockKind = "REGISTER" | "VERIFY" | "TRANSFER";

export type Product = {
  id: string; // serial / QR payload
  name: string;
  batch: string;
  manufacturer: string;
  dosage: string;
  quantity: number;
  mfgDate: string;
  expDate: string;
  registeredAt: string;
  txHash: string;
  blockIndex: number;
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
};

export type Ledger = { products: Product[]; blocks: Block[] };

export type VerifyResult = {
  status: "authentic" | "counterfeit" | "expired";
  code: string;
  product?: Product;
  block: Block;
};

const STORAGE_KEY = "pharmachain.ledger.v1";

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

type SeedInput = Omit<Product, "txHash" | "blockIndex" | "registeredAt"> & { registeredAt: string };

const SEED_PRODUCTS: SeedInput[] = [
  {
    id: "PH-AMX-8842-0001",
    name: "Amoxicillin 500mg Capsules",
    batch: "AMX-8842",
    manufacturer: "Nordis Pharma Labs",
    dosage: "500 mg",
    quantity: 12000,
    mfgDate: "2026-02-11",
    expDate: "2028-02-11",
    registeredAt: "2026-02-11T09:14:00.000Z",
  },
  {
    id: "PH-INS-2210-0007",
    name: "Insulin Glargine Injection",
    batch: "INS-2210",
    manufacturer: "Veridia Biologics",
    dosage: "100 IU/mL",
    quantity: 4300,
    mfgDate: "2026-04-02",
    expDate: "2027-10-02",
    registeredAt: "2026-04-02T13:40:00.000Z",
  },
  {
    id: "PH-PCM-5519-0042",
    name: "Paracetamol 650mg Tablets",
    batch: "PCM-5519",
    manufacturer: "Nordis Pharma Labs",
    dosage: "650 mg",
    quantity: 88000,
    mfgDate: "2025-08-19",
    expDate: "2026-08-19",
    registeredAt: "2025-08-19T07:05:00.000Z",
  },
];

function buildSeed(): Ledger {
  const products: Product[] = [];
  const blocks: Block[] = [];
  let prevHash = GENESIS_HASH;

  SEED_PRODUCTS.forEach((seed, i) => {
    const txHash = pseudoHash(`${seed.id}|${seed.batch}|register`);
    const index = i + 1;
    const hash = pseudoHash(`${index}|${prevHash}|${txHash}`);
    products.push({ ...seed, txHash, blockIndex: index });
    blocks.push({
      index,
      kind: "REGISTER",
      timestamp: seed.registeredAt,
      prevHash,
      hash,
      txHash,
      productId: seed.id,
      summary: `Batch ${seed.batch} registered by ${seed.manufacturer}`,
      valid: true,
    });
    prevHash = hash;
  });

  // A couple of custody + verification events for a lived-in ledger.
  const extras: { kind: BlockKind; productId: string; summary: string; timestamp: string }[] = [
    {
      kind: "TRANSFER",
      productId: "PH-AMX-8842-0001",
      summary: "Custody transferred to Central Distribution Hub, Pune",
      timestamp: "2026-02-15T11:02:00.000Z",
    },
    {
      kind: "VERIFY",
      productId: "PH-INS-2210-0007",
      summary: "Verified at MedPlus Pharmacy #418",
      timestamp: "2026-04-21T16:27:00.000Z",
    },
  ];

  extras.forEach((e, i) => {
    const index = products.length + i + 1;
    const txHash = pseudoHash(`${e.productId}|${e.timestamp}|${e.kind}`);
    const hash = pseudoHash(`${index}|${prevHash}|${txHash}`);
    blocks.push({ ...e, index, prevHash, hash, txHash, valid: true });
    prevHash = hash;
  });

  return { products, blocks };
}

/* ---------- storage ---------- */

export function loadLedger(): Ledger {
  if (typeof window === "undefined") return { products: [], blocks: [] };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as Ledger;
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
    /* ignore quota errors in demo */
  }
}

export function resetLedger(): Ledger {
  const seed = buildSeed();
  saveLedger(seed);
  return seed;
}

/* ---------- mutations ---------- */

function nextBlock(
  ledger: Ledger,
  kind: BlockKind,
  productId: string,
  summary: string,
  valid = true,
): Block {
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

export function registerProduct(
  ledger: Ledger,
  input: RegisterInput,
): { ledger: Ledger; product: Product; block: Block } {
  const serialSuffix = String(ledger.products.length + 1).padStart(4, "0");
  const id = `PH-${input.batch.toUpperCase().replace(/[^A-Z0-9-]/g, "")}-${serialSuffix}`;
  const draft: Ledger = { products: [...ledger.products], blocks: [...ledger.blocks] };
  const block = nextBlock(
    draft,
    "REGISTER",
    id,
    `Batch ${input.batch} registered by ${input.manufacturer}`,
  );
  const product: Product = {
    ...input,
    id,
    registeredAt: block.timestamp,
    txHash: block.txHash,
    blockIndex: block.index,
  };
  const next: Ledger = {
    products: [product, ...ledger.products],
    blocks: [...ledger.blocks, block],
  };
  saveLedger(next);
  return { ledger: next, product, block };
}

export function verifyCode(ledger: Ledger, rawCode: string): { ledger: Ledger; result: VerifyResult } {
  const code = rawCode.trim().toUpperCase();
  const product = ledger.products.find((p) => p.id.toUpperCase() === code);
  const expired = product ? new Date(product.expDate).getTime() < Date.now() : false;
  const status: VerifyResult["status"] = !product ? "counterfeit" : expired ? "expired" : "authentic";

  const summary = !product
    ? `Verification failed — serial ${code} has no on-chain origin record`
    : expired
      ? `Verified ${product.batch} — genuine but past expiry (${product.expDate})`
      : `Verified ${product.batch} — authentic, chain of custody intact`;

  const block = nextBlock(ledger, "VERIFY", product?.id ?? code, summary, status !== "counterfeit");
  const next: Ledger = { products: ledger.products, blocks: [...ledger.blocks, block] };
  saveLedger(next);
  return { ledger: next, result: { status, code, product, block } };
}

export function historyFor(ledger: Ledger, productId: string): Block[] {
  return ledger.blocks.filter((b) => b.productId === productId).sort((a, b) => b.index - a.index);
}
