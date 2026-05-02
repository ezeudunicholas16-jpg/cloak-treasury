# Cloak Treasury
## Project Summary

Cloak Treasury is a private programmable treasury dashboard for teams, DAOs, startups, and institutions that need to send payments privately while still maintaining controlled auditability.

The core idea is simple:

**Send privately now. Reveal only when the right condition is met.**

Cloak Treasury lets a team create shielded disbursements, keep payment details hidden on-chain, and later release viewing keys through time delay, custom release time, governance approval, or DAO approval.

---

## Problem Being Solved

Public blockchains are transparent by default. This is powerful for verification, but it creates a serious problem for organizations handling sensitive payments.

Examples:

- A startup paying contractors may not want salaries visible immediately.
- A DAO treasury may not want vendor payments exposed before execution.
- A fund may need privacy while still proving activity to auditors later.
- A company may need compliance access without exposing all transaction data publicly.

Cloak Treasury solves this by separating:

1. **Private execution**
2. **Controlled visibility**
3. **Selective audit access**

---

## Who It Is For

- DAOs managing private treasury disbursements  
- Web3 startups paying vendors or contributors  
- Privacy-focused fintech teams  
- Grant programs  
- Internal finance teams  
- External auditors and compliance reviewers  

Example:

A DAO pays a vendor privately but allows auditors to view the transaction only after governance approval.

---

## How Cloak SDK Is Used

Cloak SDK powers the privacy layer of this product.

### Shielded Transaction Flow

```js
const owner = await generateUtxoKeypair()
const output = await createUtxo(amount, owner, USDC_MINT)

const result = await transact({
  inputUtxos,
  outputUtxos,
  externalAmount,
  depositor
})
````

This ensures transactions are **shielded and private on-chain**.

---

### Viewing Key Generation

```js
const nk = getNkFromUtxoPrivateKey(owner.privateKey)
```

This key allows selective decryption of transaction history.

---

### Audit & Decryption

```js
const scan = await scanTransactions({
  viewingKeyNk: nk
})

const report = toComplianceReport(scan)
```

Auditors can view transaction details **only after key release conditions are met**.

---

## Core Features

### 1. Shielded Disbursements

Users can create private payments with:

* Label
* Recipient
* Amount
* Token type
* Release trigger
* Schedule

Example:

```
Label: Vendor Payment April
Amount: 500 USDC
Release Trigger: Time delay
```

---

### 2. Viewing Key Controls

Release options:

* Immediate
* Time delay
* Custom time
* Governance approval
* DAO approval

Before release:

```
Viewing Key: Locked
```

After release:

```
Viewing Key: Available for audit
```

---

### 3. Governance Approval

Supports multi-sig style control:

* 2/3 approvals
* 3/5 approvals

Example:

```
Guardians: G1, G2, G3, G4, G5
Required: 3 approvals
```

---

### 4. DAO Approval

Custom DAO-based unlocking:

```
DAO Members: 50
Required: 60% → 30 approvals
```

Key unlocks only after threshold is met.

---

### 5. Auditor Portal

* Paste viewing key
* Scan transactions
* Decrypt history

Possible states:

* Key not released
* Unknown key
* Decrypted report

---

## Demo Mode vs Live Mode

### Demo Mode

Used when devnet tokens are unavailable.

* Simulates transactions
* No wallet signing required
* Full workflow still functional

---

### Live Mode

Designed for:

* Solana wallet connection
* Real transaction signing
* Cloak SDK execution

Flow:

```
Connect Wallet → Execute → Sign → Shield → Release Key → Audit
```

---

## Why This Matters

Cloak Treasury enables:

* Private execution
* Delayed transparency
* Selective auditing
* Governance-controlled visibility
* DAO-controlled disclosure

This is **programmable financial privacy**.

---

## Example Flows

### Time Delay

1. Create disbursement
2. Set 24h delay
3. Key locked
4. After 24h → key released
5. Auditor decrypts

---

### Governance

1. Create disbursement
2. Set 3/5 approval
3. Guardians approve
4. Key unlocks

---

### DAO

1. Set DAO size (e.g. 50)
2. Require 60% approval
3. Members vote
4. Key unlocks at threshold

---

## Tech Stack

* HTML / CSS / JavaScript
* Vite
* Node.js / Express
* Solana Web3.js
* Cloak SDK

---

## Project Structure

```
time lock/
├── index.html
├── cloakservice.js
├── package.json
├── package-lock.json
├── vite.config.js
├── README.md
├── server/
│   └── index.js
```

---

## Setup Instructions

### Install

```bash
npm install
```

---

### Run frontend

```bash
npm run dev
```

Open:

```
http://localhost:5173
```

---

### Run backend

```bash
npm run server
```

Backend:

```
http://localhost:3001
```

---

## Environment Variables

Create `server/.env`:

```env
RPC_URL=https://api.devnet.solana.com
PORT=3001
CORS_ORIGIN=http://localhost:5173
CLOAK_RELAY_URL=https://api.cloak.ag
TREASURY_PRIVATE_KEY=your_test_key
```

---

## Links

Frontend:

```
http://localhost:5173
```

Backend:

```
http://localhost:3001
```

---

## Program Info

Program ID:

```
zh1eLd6rSphLejbFfJEneUwzHRfMKxgzrgkfwA6qRkW
```

Network:

```
Solana Devnet
```

---

## Demo Video


## Limitations

* Devnet tokens were not always available
* Demo Mode used for reliability
* Live wallet signing partially implemented

---

## Future Improvements

* Full wallet adapter support
* Production deployment
* Enhanced DAO voting system
* Role-based audit access
* Exportable compliance reports

---

## Final Pitch

Cloak Treasury is a private programmable treasury.

It allows organizations to:

* Send payments privately
* Keep data hidden on-chain
* Reveal only when conditions are met

This is not just privacy.

This is **controlled, programmable transparency**.
