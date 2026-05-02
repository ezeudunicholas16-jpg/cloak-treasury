// Live mode first tries the Cloak browser wallet-signing path. If the browser
// SDK cannot run in this bundle, the backend treasury signer remains a demo
// fallback so the existing UI flow keeps working.
import { Buffer } from "buffer";
import { Connection, PublicKey } from "@solana/web3.js";

window.Buffer = window.Buffer || Buffer;
globalThis.Buffer = globalThis.Buffer || Buffer;

export const DEMO_MODE = false;

const API_BASE = "";
const DEVNET_RPC_URL = "https://api.devnet.solana.com";
const CLOAK_RELAY_URL = "https://api.cloak.ag";
let browserCloakSdkPromise;
let browserCloakSdkModule;

function bytesToDisplay(bytes, prefix = "nk:1q") {
  const hex = Array.from(bytes || new Uint8Array(8))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return prefix + hex.slice(0, 8) + "\u2026" + hex.slice(-6);
}

function demoKeypair() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  const hex = Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
  return { privateKey: BigInt("0x" + hex), publicKey: bytes };
}

async function getBrowserCloakSdk() {
  if (!browserCloakSdkPromise) browserCloakSdkPromise = import("@cloak.dev/sdk").then((sdk) => {
    browserCloakSdkModule = sdk;
    return sdk;
  });
  return browserCloakSdkPromise;
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
    throw new Error("Wallet has no devnet SOL for fees");
  }
}

function getUtxoMint(utxo, options = {}) {
  return utxo?.mint || utxo?.mintAddress || utxo?.assetMint || options.mint || null;
}

function demoScanResult() {
  return {
    transactions: [
      { txType: "deposit", gross: 124000, fee: 372, net: 123628, timestamp: Date.now() - 3600000, signature: "sig1abc\u2026", commitment: "cm1\u2026" },
      { txType: "withdraw", gross: 42500, fee: 127.5, net: 42372.5, timestamp: Date.now() - 86400000, signature: "sig2def\u2026", commitment: "cm2\u2026" },
      { txType: "send", gross: 200000, fee: 600, net: 199400, timestamp: Date.now() - 172800000, signature: "sig3ghi\u2026", commitment: "cm3\u2026" }
    ],
    summary: { totalDeposited: 366500, totalWithdrawn: 242500, runningBalance: 123628, txCount: 3 }
  };
}

async function postApi(path, body) {
  const response = await fetch(API_BASE + path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || `Backend request failed: ${path}`);
  }
  return payload;
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

export async function sdk_generateUtxoKeypair() {
  if (!DEMO_MODE) {
    try {
      const sdk = await getBrowserCloakSdk();
      return await sdk.generateUtxoKeypair();
    } catch (error) {
      console.warn("Browser Cloak generateUtxoKeypair unavailable; using DEMO_MODE fallback.", error);
    }
  }
  return demoKeypair();
}

export function sdk_getNkFromUtxoPrivateKey(privateKey) {
  if (!DEMO_MODE && browserCloakSdkModule?.getNkFromUtxoPrivateKey) {
    try {
      return browserCloakSdkModule.getNkFromUtxoPrivateKey(privateKey);
    } catch (error) {
      console.warn("Browser Cloak getNkFromUtxoPrivateKey unavailable; using DEMO_MODE fallback.", error);
    }
  }
  const hex = privateKey.toString(16).padStart(64, "0").slice(0, 32);
  const bytes = new Uint8Array(16);
  for (let i = 0; i < 16; i++) bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return bytes;
}

export function sdk_nkToDisplayString(nk) {
  return bytesToDisplay(nk);
}

export async function sdk_createZeroUtxo(mint) {
  if (!DEMO_MODE) {
    try {
      const sdk = await getBrowserCloakSdk();
      return await sdk.createZeroUtxo(new PublicKey(mint));
    } catch (error) {
      console.warn("Browser Cloak createZeroUtxo unavailable; using DEMO_MODE fallback.", error);
    }
  }
  return { amount: 0n, mint, commitment: "0x" + Math.random().toString(16).slice(2, 18) };
}

export async function sdk_createUtxo(amount, owner, mint) {
  if (!DEMO_MODE) {
    try {
      const sdk = await getBrowserCloakSdk();
      return await sdk.createUtxo(amount, owner, new PublicKey(mint));
    } catch (error) {
      console.warn("Browser Cloak createUtxo unavailable; using DEMO_MODE fallback.", error);
    }
  }
  const rnd = new Uint8Array(16);
  crypto.getRandomValues(rnd);
  const commitment = "0x" + Array.from(rnd).map((b) => b.toString(16).padStart(2, "0")).join("");
  return { amount, owner, mint, commitment };
}

export async function sdk_transact(params, options) {
  if (options?.demoMode) {
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

  if (!DEMO_MODE) {
    const output = params.outputUtxos?.[0] || {};
    const walletPublicKey = options?.walletPublicKey || options?.wallet?.publicKey?.toBase58?.() || options?.wallet?.publicKey || params.depositor || null;
    const walletSigner = options?.wallet?.signTransaction ? options.wallet : window.solana;
    try {
      if (!walletPublicKey || !walletSigner?.signTransaction) {
        throw new Error("Connect wallet first");
      }
      if (walletPublicKey && walletSigner?.signTransaction) {
        const walletName = options?.walletType || "Solana";
        console.log("Using " + walletName + " wallet signing");
        const sdk = await getBrowserCloakSdk();
        const connection = new Connection(DEVNET_RPC_URL, "confirmed");
        const walletKey = normalizeWalletPublicKey(walletPublicKey, options?.wallet);
        const depositorPublicKey = parsePublicKey(walletKey, "Connect wallet first");
        const mint = parsePublicKey(getUtxoMint(output, options), "Invalid token mint");
        const programId = parsePublicKey(options?.programId, "Invalid program ID");
        const amountLamports = BigInt(params.externalAmount ?? output.amount ?? 0);
        if (amountLamports <= 0n) {
          throw new Error("Invalid amount");
        }
        await assertWalletHasDevnetSol(connection, depositorPublicKey);
        const outputUtxo = output?.keypair ? output : await sdk.createUtxo(amountLamports, await sdk.generateUtxoKeypair(), mint);
        const zeroUtxo = await sdk.createZeroUtxo(mint);
        if (!outputUtxo) {
          throw new Error("Missing output UTXO");
        }
        if (!zeroUtxo) {
          throw new Error("Missing zero UTXO");
        }
        const nk = sdk.getNkFromUtxoPrivateKey(outputUtxo.keypair.privateKey);
        const wallet = options?.wallet?.signTransaction ? options.wallet : {
          publicKey: depositorPublicKey,
          signTransaction: walletSigner.signTransaction?.bind(walletSigner),
          signMessage: walletSigner.signMessage?.bind(walletSigner)
        };
        wallet.publicKey = depositorPublicKey;
        if (!wallet.signTransaction) {
          throw new Error("Connected wallet does not support transaction signing.");
        }
        console.log("Cloak transact inputs", {
          walletPublicKey: depositorPublicKey.toBase58(),
          mint: mint.toBase58(),
          programId: programId.toBase58(),
          amountLamports: amountLamports.toString(),
          hasZeroUtxo: !!zeroUtxo,
          hasOutputUtxo: !!outputUtxo
        });
        const signTransaction = async (transaction) => {
          console.log("Waiting for wallet approval");
          try {
            const signed = await wallet.signTransaction(transaction);
            console.log("Wallet approved");
            return signed;
          } catch (error) {
            throw new Error("Transaction rejected");
          }
        };
        const result = await sdk.transact(
          {
            inputUtxos: [zeroUtxo],
            outputUtxos: [outputUtxo],
            externalAmount: amountLamports,
            depositor: depositorPublicKey
          },
          {
            connection,
            programId,
            relayUrl: CLOAK_RELAY_URL,
            wallet,
            signTransaction,
            signMessage: wallet.signMessage,
            depositorPublicKey,
            walletPublicKey: depositorPublicKey,
            chainNoteViewingKeyNk: nk,
            enforceViewingKeyRegistration: false
          }
        );
        console.log("Transaction signature: " + result.signature);
        return {
          ...result,
          leafIndex: result.leafIndex ?? result.commitmentIndices?.[0],
          nk: Array.from(nk),
          nkDisplay: bytesToDisplay(nk),
          walletPublicKey: depositorPublicKey.toBase58(),
          outputUtxos: result.outputUtxos || [outputUtxo],
          commitment: result.outputUtxos?.[0]?.commitment || outputUtxo.commitment
        };
      }
    } catch (error) {
      if (walletPublicKey && walletSigner?.signTransaction) {
        console.warn((options?.walletType || "Solana") + " wallet signing failed; disbursement was not saved.", error);
        if (error && /reject|declin|cancel/i.test(error.message || "")) {
          throw new Error("Transaction rejected");
        }
        throw error;
      }
      console.warn("Live Cloak execution failed; DEMO_MODE fallback is disabled for this run.", error);
      if (error && /reject|declin|cancel/i.test(error.message || "")) {
        throw new Error("Transaction rejected");
      }
      throw error;
    }
  }

  await new Promise((resolve) => setTimeout(resolve, 1400));
  const signature = fakeSignature();
  return {
    signature,
    leafIndex: Math.floor(Math.random() * 10000) + 2000,
    root: "0x" + signature.slice(0, 16),
    outputUtxos: params.outputUtxos
  };
}

export async function sdk_scanTransactions(opts) {
  if (!DEMO_MODE) {
    try {
      return await postApi("/api/scan-transactions", {
        ...opts,
        viewingKeyNk: Array.from(opts.viewingKeyNk || [])
      });
    } catch (error) {
      console.warn("Live Cloak scan unavailable; using DEMO_MODE fallback.", error);
    }
  }

  await new Promise((resolve) => setTimeout(resolve, 700));
  return demoScanResult();
}

export async function sdk_toComplianceReport(scanResult) {
  if (!DEMO_MODE) {
    try {
      return await postApi("/api/compliance-report", { scanResult });
    } catch (error) {
      console.warn("Live Cloak compliance report unavailable; using DEMO_MODE fallback.", error);
    }
  }

  return demoComplianceReport(scanResult);
}
