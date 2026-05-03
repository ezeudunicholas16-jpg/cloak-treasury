import { Buffer } from "buffer";
import { Connection, PublicKey } from "@solana/web3.js";
import {
  CLOAK_PROGRAM_ID as DEVNET_CLOAK_PROGRAM_ID,
  DEVNET_MOCK_USDC_MINT,
  NATIVE_SOL_MINT as DEVNET_NATIVE_SOL_MINT,
  createUtxo,
  createZeroUtxo,
  generateUtxoKeypair,
  getNkFromUtxoPrivateKey,
  scanTransactions,
  toComplianceReport,
  transact
} from "@cloak.dev/sdk-devnet";

window.Buffer = window.Buffer || Buffer;
globalThis.Buffer = globalThis.Buffer || Buffer;

export const DEMO_MODE = false;
export const DEVNET_RPC_URL = "https://api.devnet.solana.com";
export const CLOAK_DEVNET_RELAY_URL = "https://api.devnet.cloak.ag";
export const CLOAK_DEVNET_PROGRAM_ID = DEVNET_CLOAK_PROGRAM_ID.toBase58();
export const DEVNET_MOCK_USDC_MINT_ADDRESS = DEVNET_MOCK_USDC_MINT.toBase58();
export const DEVNET_NATIVE_SOL_MINT_ADDRESS = DEVNET_NATIVE_SOL_MINT.toBase58();

function bytesToDisplay(bytes, prefix = "nk:1q") {
  const hex = Array.from(bytes || new Uint8Array(8))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return prefix + hex.slice(0, 8) + "\u2026" + hex.slice(-6);
}

function isDemoOptions(options) {
  return !!options?.demoMode;
}

function demoKeypair() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  const hex = Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
  return { privateKey: BigInt("0x" + hex), publicKey: bytes };
}

function fakeSignature() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function parsePublicKey(value, errorMessage) {
  try {
    if (!value) throw new Error(errorMessage);
    return value instanceof PublicKey ? value : new PublicKey(value);
  } catch {
    throw new Error(errorMessage);
  }
}

function normalizeWalletPublicKey(walletPublicKey, wallet) {
  const publicKey = walletPublicKey || wallet?.publicKey?.toBase58?.() || wallet?.publicKey || null;
  if (!publicKey) throw new Error("Connect wallet first");
  return publicKey;
}

async function assertWalletHasDevnetSol(connection, publicKey) {
  const balanceLamports = await connection.getBalance(publicKey);
  if (!balanceLamports || balanceLamports <= 0) {
    throw new Error("Insufficient devnet SOL");
  }
}

function getUtxoMint(utxo, options = {}) {
  return utxo?.mint || utxo?.mintAddress || utxo?.assetMint || options.mint || DEVNET_MOCK_USDC_MINT_ADDRESS;
}

function demoScanResult() {
  return {
    transactions: [
      { txType: "deposit", gross: 124000, fee: 372, net: 123628, timestamp: Date.now() - 3600000, signature: "DEMO-sig1abc\u2026", commitment: "demo-cm1\u2026" },
      { txType: "withdraw", gross: 42500, fee: 127.5, net: 42372.5, timestamp: Date.now() - 86400000, signature: "DEMO-sig2def\u2026", commitment: "demo-cm2\u2026" },
      { txType: "send", gross: 200000, fee: 600, net: 199400, timestamp: Date.now() - 172800000, signature: "DEMO-sig3ghi\u2026", commitment: "demo-cm3\u2026" }
    ],
    summary: { totalDeposited: 366500, totalWithdrawn: 242500, runningBalance: 123628, txCount: 3 }
  };
}

function demoComplianceReport(scanResult) {
  let balance = 0;
  return {
    summary: scanResult.summary,
    transactions: scanResult.transactions.map((tx) => {
      balance += tx.txType === "deposit" ? tx.net : -Math.abs(tx.net);
      return { ...tx, runningBalance: Math.round(balance * 100) / 100 };
    })
  };
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

function normalizeLiveExecutionError(error) {
  const message = String(error?.message || error || "");
  if (/reject|declin|cancel/i.test(message)) return new Error("Transaction rejected");
  if (/insufficient devnet sol|no devnet sol|0 lamports|balance/i.test(message)) return new Error("Insufficient devnet SOL");
  if (/connect wallet/i.test(message)) return new Error("Connect wallet first");
  return new Error("Live Cloak Devnet execution failed. Switch to Demo Mode to simulate.");
}

export async function sdk_generateUtxoKeypair(options = {}) {
  if (isDemoOptions(options)) return demoKeypair();
  return generateUtxoKeypair();
}

export function sdk_getNkFromUtxoPrivateKey(privateKey, options = {}) {
  if (!isDemoOptions(options)) return getNkFromUtxoPrivateKey(privateKey);
  const hex = privateKey.toString(16).padStart(64, "0");
  const bytes = new Uint8Array(32);
  for (let i = 0; i < 32; i++) bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return bytes;
}

export function sdk_nkToDisplayString(nk) {
  return bytesToDisplay(nk);
}

export async function sdk_createZeroUtxo(mint, options = {}) {
  if (isDemoOptions(options)) {
    return { amount: 0n, mint, commitment: "demo-zero-" + Math.random().toString(16).slice(2, 18) };
  }
  return createZeroUtxo(parsePublicKey(mint || DEVNET_MOCK_USDC_MINT_ADDRESS, "Invalid token mint"));
}

export async function sdk_createUtxo(amount, owner, mint, options = {}) {
  if (isDemoOptions(options)) {
    const rnd = new Uint8Array(16);
    crypto.getRandomValues(rnd);
    const commitment = "demo-commitment-" + Array.from(rnd).map((b) => b.toString(16).padStart(2, "0")).join("");
    return { amount, owner, keypair: owner, mint, commitment };
  }
  return createUtxo(amount, owner, parsePublicKey(mint || DEVNET_MOCK_USDC_MINT_ADDRESS, "Invalid token mint"));
}

export async function sdk_transact(params, options = {}) {
  if (isDemoOptions(options)) {
    await new Promise((resolve) => setTimeout(resolve, 900));
    const signature = "DEMO-" + fakeSignature();
    return {
      signature,
      demoMode: true,
      leafIndex: Math.floor(Math.random() * 10000) + 2000,
      root: "demo-root-" + signature.slice(5, 17),
      outputUtxos: params.outputUtxos,
      commitment: params.outputUtxos?.[0]?.commitment || "demo-commitment-" + signature.slice(5, 13)
    };
  }

  const output = params.outputUtxos?.[0] || {};
  const walletPublicKey = options.walletPublicKey || options.wallet?.publicKey?.toBase58?.() || options.wallet?.publicKey || null;
  const walletSigner = options.wallet?.signTransaction ? options.wallet : null;

  try {
    if (!walletPublicKey || !walletSigner?.signTransaction) throw new Error("Connect wallet first");

    const connection = new Connection(DEVNET_RPC_URL, "confirmed");
    const walletKey = normalizeWalletPublicKey(walletPublicKey, options.wallet);
    const depositorPublicKey = parsePublicKey(walletKey, "Connect wallet first");
    const mint = parsePublicKey(getUtxoMint(output, options), "Invalid token mint");
    const programId = parsePublicKey(options.programId || CLOAK_DEVNET_PROGRAM_ID, "Invalid program ID");
    const amountLamports = BigInt(params.externalAmount ?? output.amount ?? 0);
    if (amountLamports <= 0n) throw new Error("Invalid amount");
    await assertWalletHasDevnetSol(connection, depositorPublicKey);

    const outputUtxo = output?.keypair ? output : await createUtxo(amountLamports, await generateUtxoKeypair(), mint);
    const zeroUtxo = params.inputUtxos?.[0]?.keypair ? params.inputUtxos[0] : await createZeroUtxo(mint);
    if (!outputUtxo) throw new Error("Missing output UTXO");
    if (!zeroUtxo) throw new Error("Missing zero UTXO");

    const nk = options.chainNoteViewingKeyNk || getNkFromUtxoPrivateKey(outputUtxo.keypair.privateKey);
    const wallet = {
      publicKey: depositorPublicKey,
      signTransaction: walletSigner.signTransaction.bind(walletSigner),
      signMessage: walletSigner.signMessage?.bind(walletSigner)
    };

    const signTransaction = async (transaction) => {
      try {
        return await wallet.signTransaction(transaction);
      } catch {
        throw new Error("Transaction rejected");
      }
    };

    const result = await transact(
      {
        inputUtxos: [zeroUtxo],
        outputUtxos: [outputUtxo],
        externalAmount: amountLamports,
        depositor: depositorPublicKey
      },
      {
        connection,
        programId,
        relayUrl: CLOAK_DEVNET_RELAY_URL,
        wallet,
        signTransaction,
        signMessage: wallet.signMessage,
        depositorPublicKey,
        walletPublicKey: depositorPublicKey,
        chainNoteViewingKeyNk: nk,
        enforceViewingKeyRegistration: false
      }
    );

    return {
      ...result,
      leafIndex: result.leafIndex ?? result.commitmentIndices?.[0],
      nk: Array.from(nk),
      nkDisplay: bytesToDisplay(nk),
      walletPublicKey: depositorPublicKey.toBase58(),
      outputUtxos: result.outputUtxos || [outputUtxo],
      commitment: String(result.outputUtxos?.[0]?.commitment || outputUtxo.commitment || "")
    };
  } catch (error) {
    throw normalizeLiveExecutionError(error);
  }
}

export async function sdk_scanTransactions(opts = {}) {
  if (isDemoOptions(opts)) {
    await new Promise((resolve) => setTimeout(resolve, 700));
    return demoScanResult();
  }

  const viewingKeyNk = Uint8Array.from(opts.viewingKeyNk || []);
  if (!viewingKeyNk.length) throw new Error("Unknown viewing key");

  return scanTransactions({
    connection: new Connection(DEVNET_RPC_URL, "confirmed"),
    programId: parsePublicKey(opts.programId || CLOAK_DEVNET_PROGRAM_ID, "Invalid program ID"),
    viewingKeyNk,
    limit: opts.limit,
    afterTimestamp: opts.afterTimestamp,
    beforeTimestamp: opts.beforeTimestamp,
    untilSignature: opts.untilSignature,
    walletPublicKey: opts.walletPublicKey
  });
}

export async function sdk_toComplianceReport(scanResult, options = {}) {
  if (isDemoOptions(options)) return demoComplianceReport(scanResult);
  return normalizeReportForUi(toComplianceReport(scanResult));
}
