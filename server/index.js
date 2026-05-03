import { fileURLToPath } from "node:url";
import path from "node:path";
import dotenv from "dotenv";
import express from "express";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, ".env") });
dotenv.config();

const app = express();
const port = Number(process.env.PORT || 3001);
const rpcUrl = process.env.RPC_URL || "https://api.devnet.solana.com";

app.use(express.json({ limit: "2mb" }));
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", process.env.CORS_ORIGIN || "http://localhost:5173");
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

const connection = new Connection(rpcUrl, "confirmed");
const DEFAULT_CLOAK_PROGRAM_ID = "Zc1kHfp4rajSMeASFDwFFgkHRjv7dFQuLheJoQus27h";
let cloakSdkPromise;

async function getCloakSdk() {
  if (!cloakSdkPromise) {
    cloakSdkPromise = import("@cloak.dev/sdk-devnet");
  }
  return cloakSdkPromise;
}

function parseSecretKey(value) {
  if (!value) {
    throw new Error("TREASURY_PRIVATE_KEY is required for live Cloak transactions.");
  }

  const trimmed = value.trim();
  if (trimmed.startsWith("[")) {
    return Uint8Array.from(JSON.parse(trimmed));
  }

  try {
    const bytes = Buffer.from(trimmed, "base64");
    if (bytes.length === 64) return Uint8Array.from(bytes);
  } catch {}

  throw new Error("TREASURY_PRIVATE_KEY must be a JSON array or base64-encoded 64-byte Solana secret key.");
}

function getTreasuryKeypair() {
  return Keypair.fromSecretKey(parseSecretKey(process.env.TREASURY_PRIVATE_KEY));
}

function toPublicKey(value, fallback) {
  return new PublicKey(value || fallback);
}

function toBigIntAmount(value) {
  if (typeof value === "bigint") return value;
  if (typeof value === "number") return BigInt(Math.round(value));
  if (typeof value === "string") return BigInt(value);
  throw new Error("amountLamports is required.");
}

function bytesToDisplay(bytes, prefix = "nk:1q") {
  const hex = Array.from(bytes || new Uint8Array(8))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return prefix + hex.slice(0, 8) + "\u2026" + hex.slice(-6);
}

function jsonSafe(value) {
  return JSON.parse(JSON.stringify(value, (_key, item) => {
    if (typeof item === "bigint") return item.toString();
    if (item instanceof PublicKey) return item.toBase58();
    if (item instanceof Uint8Array) return Array.from(item);
    return item;
  }));
}

function normalizeReportForUi(report) {
  const transactions = (report.transactions || []).map((tx) => {
    const gross = Number(tx.gross ?? tx.amount ?? 0);
    const net = Number(tx.net ?? tx.netAmount ?? gross);
    return {
      ...tx,
      txType: tx.txType || tx.tx_type || "transaction",
      gross,
      fee: Number(tx.fee ?? 0),
      net,
      runningBalance: Number(tx.runningBalance ?? 0),
      timestamp: Number(tx.timestamp ?? Date.now()),
      commitment: String(tx.commitment ?? ""),
      signature: tx.signature
    };
  });

  const summary = report.summary || {};
  return {
    ...report,
    summary: {
      ...summary,
      totalDeposited: Number(summary.totalDeposited ?? summary.totalDeposits ?? 0),
      totalWithdrawn: Number(summary.totalWithdrawn ?? summary.totalWithdrawals ?? 0),
      runningBalance: Number(summary.runningBalance ?? summary.finalBalance ?? summary.netChange ?? 0),
      txCount: Number(summary.txCount ?? summary.transactionCount ?? transactions.length)
    },
    transactions
  };
}

function asyncRoute(handler) {
  return async (req, res) => {
    try {
      res.json(await handler(req));
    } catch (error) {
      console.error(error);
      res.status(500).json({
        error: error instanceof Error ? error.message : "Unknown Cloak backend error"
      });
    }
  };
}

app.post("/api/create-disbursement", asyncRoute(async (req) => {
  const {
    createUtxo,
    createZeroUtxo,
    generateUtxoKeypair,
    getNkFromUtxoPrivateKey,
    transact
  } = await getCloakSdk();
  const signer = getTreasuryKeypair();
  const programId = toPublicKey(req.body.programId, DEFAULT_CLOAK_PROGRAM_ID);
  const mint = toPublicKey(req.body.mint);
  const amountLamports = toBigIntAmount(req.body.amountLamports);
  const walletPublicKey = toPublicKey(req.body.walletPublicKey, signer.publicKey);

  const owner = await generateUtxoKeypair();
  const nk = getNkFromUtxoPrivateKey(owner.privateKey);
  const zeroUtxo = await createZeroUtxo(mint);
  const outputUtxo = await createUtxo(amountLamports, owner, mint);

  const result = await transact(
    {
      inputUtxos: [zeroUtxo],
      outputUtxos: [outputUtxo],
      externalAmount: amountLamports,
      depositor: signer.publicKey
    },
    {
      connection,
      programId,
      depositorKeypair: signer,
      walletPublicKey,
      chainNoteViewingKeyNk: nk,
      enforceViewingKeyRegistration: false
    }
  );

  return jsonSafe({
    ...result,
    leafIndex: result.leafIndex ?? result.commitmentIndices?.[0],
    nk: Array.from(nk),
    nkDisplay: bytesToDisplay(nk),
    walletPublicKey: walletPublicKey.toBase58(),
    treasuryPublicKey: signer.publicKey.toBase58()
  });
}));

app.post("/api/scan-transactions", asyncRoute(async (req) => {
  const { scanTransactions } = await getCloakSdk();
  const programId = toPublicKey(req.body.programId, DEFAULT_CLOAK_PROGRAM_ID);
  const viewingKeyNk = Uint8Array.from(req.body.viewingKeyNk || []);
  if (!viewingKeyNk.length) throw new Error("viewingKeyNk is required.");

  const result = await scanTransactions({
    connection,
    programId,
    viewingKeyNk,
    limit: req.body.limit,
    afterTimestamp: req.body.afterTimestamp,
    beforeTimestamp: req.body.beforeTimestamp,
    untilSignature: req.body.untilSignature,
    walletPublicKey: req.body.walletPublicKey
  });

  return jsonSafe(result);
}));

app.post("/api/compliance-report", asyncRoute(async (req) => {
  const { toComplianceReport } = await getCloakSdk();
  const report = toComplianceReport(req.body.scanResult);
  return normalizeReportForUi(jsonSafe(report));
}));

app.get("/health", (req, res) => {
  res.json({
    ok: true,
    service: "cloak-treasury-api",
    network: "solana-devnet"
  });
});

app.listen(port, "0.0.0.0", () => {
  console.log(`Cloak backend running on port ${port}`);
});
