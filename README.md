# Cloak Treasury
Cloak Treasury is a private programmable treasury for Solana. It allows teams to schedule shielded disbursements, control when viewing keys are released, and give auditors selective access to private payment history.

The product is built around the Cloak SDK. Cloak is central to the app because the payment flow, shielded UTXO creation, private transaction execution, viewing key derivation, transaction scanning, and compliance reporting all depend on Cloak SDK methods.

---

## Live Links

Frontend: https://cloaktreasury.netlify.app/  
Backend health check: https://cloak-treasury.onrender.com/health  
GitHub repository: https://github.com/ezeudunicholas16-jpg/cloak-treasury

---

## Problem Being Solved

Treasury payments are sensitive. Companies, DAOs, grant teams, and payroll operators often need to send funds without exposing the full payment trail publicly before the right time.

Normal blockchain payments are transparent by default. This can reveal:

- Payroll amounts
- Supplier payment timing
- Grant recipient details
- Internal treasury movements
- Strategy-sensitive payment schedules

Cloak Treasury solves this by combining private payments with controlled audit access.

The goal is not just to hide payments forever. The goal is to give teams control over when and how financial data becomes visible.

---

## Who It Is For

Cloak Treasury is designed for:

- DAOs managing contributor or grant payments
- Companies making supplier or payroll disbursements
- Treasury teams that need private execution
- Auditors who need controlled access to payment history
- Compliance teams that need selective reporting
- Web3 teams that want private but accountable payment infrastructure

---

## Core Idea

The app follows this flow:

1. Create a shielded disbursement
2. Select token, recipients, amounts, and execution schedule
3. Choose when the viewing key can be released
4. Execute or schedule the private payment
5. Release the viewing key only after the selected condition is met
6. Auditor uses the viewing key to scan and decrypt the allowed transaction history

The key product idea is:

> Private execution first, selective audit later.

---

## How Cloak SDK Is Used

Cloak SDK is used throughout the payment and audit lifecycle.

### 1. Shielded UTXO Creation

When a disbursement is prepared, the app uses Cloak SDK to create UTXOs.

Used concepts:

```js
generateUtxoKeypair()
createZeroUtxo()
createUtxo()
````

These are used to prepare the private payment outputs.

---

### 2. Private Transaction Execution

When the user executes a disbursement in Live Mode, the app uses Cloak SDK’s transaction flow.

Used concept:

```js
transact()
```

This is the core private payment action. The app does not treat Cloak as an extra decoration. Cloak is the payment layer that performs the shielded transaction flow.

---

### 3. Viewing Key Derivation

For each disbursement, the app derives a viewing key from the private UTXO key material.

Used concept:

```js
getNkFromUtxoPrivateKey()
```

This viewing key controls what an auditor can later decrypt.

The app stores and displays a shortened key format such as:

```txt
nk:1q...
```

The full key is used internally for scanning and audit access.

---

### 4. Auditor Portal Scanning

The Auditor Portal uses the viewing key to scan private transaction history.

Used concept:

```js
scanTransactions()
```

The auditor does not need to understand the ZK or UTXO internals. They paste the released viewing key, and the app performs the scan.

---

### 5. Compliance Report Generation

After scanning, the app converts the result into a readable compliance report.

Used concept:

```js
toComplianceReport()
```

This produces audit-friendly information such as deposited amount, withdrawn amount, running balance, transaction count, fees, and transaction rows.

---

## Live Mode and Demo Mode

The app has two modes.

### Live Mode

Live Mode is the real devnet path.

Live Mode uses:

* Solana Devnet
* Solana wallet signing
* `@cloak.dev/sdk-devnet`
* Real wallet connection
* Real transaction validation
* Real recipient address validation
* Real balance checks where applicable

Live Mode does not silently fall back to demo behavior. If a live action fails, the app shows an error.

Examples:

* Wallet not connected
* Insufficient SOL
* Invalid recipient wallet
* Transaction rejected
* Cloak Devnet execution failure

### Demo Mode

Demo Mode mimics the full product flow without requiring real devnet execution.

Demo Mode is used so judges can test the full user journey even when test tokens or network conditions are unavailable.

Demo Mode clearly labels simulated transactions as demo transactions.

Demo Mode mimics:

* Disbursement creation
* Scheduled execution
* Viewing key release
* Governance approvals
* DAO approvals
* Auditor portal scanning
* Compliance report display

---

## Architecture

The app uses a split deployment architecture.

### Frontend

The frontend is deployed on Netlify.

Frontend URL:

```txt
https://cloaktreasury.netlify.app/
```

The frontend contains the main user interface:

* Overview dashboard
* Schedule page
* Disbursements page
* Viewing Keys page
* Auditor Portal
* Wallet connection UI
* Demo/Live mode switching

### Backend

The backend is deployed on Render.

Backend health URL:

```txt
https://cloak-treasury.onrender.com/health
```

The backend provides API support and health monitoring.

A successful backend response looks like:

```json
{
  "ok": true,
  "service": "cloak-treasury-api",
  "network": "solana-devnet"
}
```

### Environment Variable

Netlify uses:

```txt
VITE_API_URL=https://cloak-treasury.onrender.com
```

This allows the frontend to communicate with the backend.

---

## Main App Sections

## 1. Overview Dashboard

The Overview page gives a treasury summary.

It shows:

* Shielded balance
* Total disbursed
* Active schedules
* Viewing keys
* Recent disbursements
* Viewing key releases
* Cloak SDK activity log

The dashboard is meant to give a treasury operator a quick view of what is scheduled, locked, released, or pending governance.

### How to Use

1. Open the app
2. Go to Overview
3. Review treasury activity
4. Check recent disbursements
5. Check viewing key release status

### Cloak SDK Relevance

The dashboard displays results from Cloak-related actions such as UTXO creation, transaction execution, viewing key derivation, and audit readiness.

---

## 2. Schedule Disbursement

The Schedule page is where a user creates a private treasury payment.

### User Inputs

The user provides:

* Disbursement label
* Token
* Recipient wallet address
* Amount
* Execution date
* Execution time
* Viewing key recipient label
* Visibility scope
* Release trigger
* Key expiry setting

### Supported Tokens

The app supports token selection for:

* SOL
* USDC
* USDT

Each token must map to the correct Solana devnet mint. The app is designed to prevent accidentally treating one selected token as another.

### Recipient Wallets

Recipient addresses are validated using Solana public key validation:

```js
new PublicKey(address)
```

The app accepts normal Solana wallet addresses and does not treat recipients as viewing keys.

### Batch Disbursement

The app is designed to support multiple recipients.

Each recipient can have:

* Wallet address
* Amount
* Token

The app should respect the exact recipient and amount entered by the user.

Example:

```txt
Recipient 1: Wallet A receives 25 USDC
Recipient 2: Wallet B receives 50 USDC
Recipient 3: Wallet C receives 100 USDC
```

The payment rows are kept separate for audit and reporting.

### Execution Schedule

The execution schedule controls when the disbursement fires.

If the selected date/time is in the future:

```txt
status = scheduled
executed = false
released = false
```

The app shows a countdown until execution.

If the selected time has arrived, the app executes or simulates the transaction depending on the mode.

### Cloak SDK Relevance

When execution happens, the app uses Cloak SDK to prepare and execute the shielded transaction.

The intended flow is:

```js
generateUtxoKeypair()
createZeroUtxo()
createUtxo()
transact()
```

---

## 3. Viewing Key Release

Each disbursement can have a viewing key release rule.

The viewing key should not be available until the correct release condition is satisfied.

Supported release triggers:

* Immediate
* Time delay
* Custom time
* Block height
* Governance approval
* DAO approval

---

## 4. Immediate Release

Immediate release means the viewing key becomes available after the disbursement has executed.

Important:

Immediate does not mean the key is released before execution. It means:

```txt
execute payment first → release key immediately after execution
```

---

## 5. Time Delay Release

Time delay release means the viewing key unlocks after a selected delay.

Examples:

* 30 seconds demo
* 1 hour
* 24 hours
* 7 days
* 30 days
* 90 days

Correct logic:

```txt
unlockTime = executionTime + selectedDelay
```

The delay starts after execution, not after creation.

---

## 6. Custom Release Time

Custom release time allows the user to select an exact date and time for viewing key release.

The release time must be after the execution time.

Example:

```txt
Execution time: May 5, 10:00 AM
Custom release time: May 6, 10:00 AM
```

The key remains locked until the custom release time.

---

## 7. Block Height Release

Block height release uses the Solana network as the unlocking condition.

The app checks Solana Devnet block height or slot and releases the viewing key only when the selected height is reached.

Expected behavior:

```txt
currentBlockHeight >= releaseBlockHeight
```

If the release block has not been reached, the key remains locked.

### Cloak SDK Relevance

The viewing key is still a Cloak-derived key. The block height only controls when the key becomes available.

---

## 8. Governance Approval

Governance approval allows a group of registered wallets to approve viewing key release.

Supported options:

* 2/3 multisig approval
* 3/5 guardian consensus

### 2/3 Multisig Approval

This means:

```txt
3 guardian wallets are registered
2 approvals are required
```

Example:

```txt
Guardian 1: Approved
Guardian 2: Approved
Guardian 3: Pending

Result: Released
```

### 3/5 Guardian Consensus

This means:

```txt
5 guardian wallets are registered
3 approvals are required
```

Example:

```txt
G1 approved
G2 approved
G3 approved
G4 pending
G5 pending

Result: Released
```

### Wallet Registration

For governance release, each guardian wallet must be registered.

In Live Mode:

* The guardian connects a Solana wallet
* The wallet signs a registration message
* The app stores the wallet address and signature
* Duplicate wallets are rejected

In Demo Mode:

* The app mimics registration with demo signatures

### Voting

For voting:

* A registered wallet must connect
* The connected wallet must match one of the registered guardian wallets
* The wallet signs an approval message
* The approval is counted only after signing succeeds
* Each wallet can vote only once

### Cloak SDK Relevance

Governance does not replace Cloak. Governance controls when the Cloak viewing key is released.

Cloak handles privacy and audit scanning. Governance handles authorization.

---

## 9. DAO Approval

DAO approval is similar to governance approval but supports a user-defined number of voters.

The user selects the number of DAO members.

Rules:

* Minimum: 1 member
* Maximum: 50 members
* Required approvals: 60%

Formula:

```txt
requiredApprovals = Math.ceil(totalDaoMembers * 0.6)
```

Example:

```txt
DAO members: 50
Required approvals: 30
```

Each DAO member wallet must be registered and must sign before being counted as a valid participant.

During voting, only registered DAO wallets can approve the release.

---

## 10. Viewing Keys Page

The Viewing Keys page allows users to issue or manage viewing keys separately from disbursement creation.

### Issue New Viewing Key

A user can create a new viewing key request and attach it to an existing disbursement.

Inputs include:

* Key recipient / label
* Visibility scope
* Release trigger
* Attached disbursement
* Governance or DAO settings if selected
* Key expiry

### Use Case

Example:

A company makes a private supplier payment today but wants to give an external auditor access later.

Flow:

1. Select the completed disbursement
2. Choose audit visibility scope
3. Select release condition
4. Submit viewing key release request
5. Auditor receives the key only after the release condition is met

### Cloak SDK Relevance

The viewing key is derived using:

```js
getNkFromUtxoPrivateKey()
```

The key is later used with:

```js
scanTransactions()
```

and:

```js
toComplianceReport()
```

---

## 11. Governance Unlock Panel

The Governance Unlock panel handles approvals for pending release requests.

It shows:

* Selected pending release
* Required approvals
* Registered wallets
* Approval progress
* Wallet provider selector
* Approve / Reject actions

### Live Mode

In Live Mode:

1. User selects wallet provider
2. User connects wallet
3. App checks if the wallet is registered
4. Wallet signs approval message
5. Approval is counted
6. If threshold is reached, the key is released

### Demo Mode

Demo Mode mimics the same flow using simulated wallets and signatures.

---

## 12. Auditor Portal

The Auditor Portal is where an auditor uses a released viewing key.

### How to Use

1. Go to Auditor Portal
2. Paste the viewing key
3. Click scan/decrypt
4. App scans the transaction history
5. Compliance report is generated

### Access Rules

The portal should reject the key if:

* Disbursement has not executed
* Viewing key has not been released
* Viewing key has expired
* Viewing key is unknown
* Key does not match stored audit scope

### Cloak SDK Relevance

The Auditor Portal uses:

```js
scanTransactions()
toComplianceReport()
```

This is the compliance and audit part of the Cloak SDK integration.

---

## Visibility Scopes

The app supports different audit visibility scopes.

### Full Audit Trail

Shows:

* Amounts
* Addresses
* Timestamps
* Transaction rows

This is useful for complete audits.

### Amounts Only

Shows payment amounts but hides recipient identities.

This is useful when auditors need financial totals but not personal wallet details.

### Timestamps Only

Shows when payments happened but hides amounts.

This is useful for proving timing without exposing financial data.

### Aggregate Totals Only

Shows summary totals without individual transaction rows.

This is useful for high-level reporting.

---

## Key Expiry

Viewing keys can expire.

Supported expiry options:

* Never expires
* 30 days after release
* 90 days after release

If a key expires:

* Auditor Portal rejects it
* The app shows “Viewing key expired”
* The key is not used to scan transactions
* Dashboard can count it as expired or expiring soon

Expected logic:

```txt
if Date.now() > expiryTime:
  expired = true
```

---

## Wallet Support

The app is designed to support Solana wallets such as:

* Phantom
* Solflare
* Backpack
* Glow

Wallets are used for:

* Connecting treasury owner
* Signing live devnet transactions
* Registering governance guardians
* Registering DAO members
* Signing approval votes

In Live Mode, wallet signing is required for real actions.

In Demo Mode, wallet behavior is simulated.

---

## Full User Flow

### Flow A: Create a Scheduled Private Disbursement

1. Open the app
2. Select Demo Mode or Live Mode
3. Go to Schedule
4. Enter disbursement label
5. Select token
6. Add recipient wallet and amount
7. Select execution date and time
8. Select viewing key visibility scope
9. Select release trigger
10. Select key expiry
11. Click Execute Shielded Disbursement

If execution time is in the future:

```txt
Status: Scheduled
```

If execution time is now:

```txt
Status: Executed
```

---

### Flow B: Time-Delayed Audit Access

1. Create disbursement
2. Choose Time Delay release trigger
3. Select delay, such as 24 hours
4. Execute or schedule payment
5. Key remains locked
6. After delay, key is released
7. Auditor can scan transactions

---

### Flow C: Governance-Controlled Audit Access

1. Create disbursement
2. Select Governance release trigger
3. Choose 2/3 or 3/5 threshold
4. Register guardian wallets
5. Execute/schedule disbursement
6. Go to Viewing Keys page
7. Registered guardians vote
8. Once threshold is reached, key releases
9. Auditor uses the released key

---

### Flow D: DAO-Controlled Audit Access

1. Select DAO approval
2. Enter DAO member count
3. Register DAO wallets
4. Required approval count is calculated as 60%
5. DAO members vote
6. Key releases after threshold is reached

---

### Flow E: Auditor Review

1. Auditor receives released key
2. Auditor opens Auditor Portal
3. Auditor pastes key
4. App scans transactions
5. App generates compliance report
6. Auditor sees only the permitted scope

---

## Local Setup

### Requirements

* Node.js
* npm
* Solana wallet extension
* Git

### Install

```bash
npm install
```

### Run Frontend

```bash
npm run dev
```

### Run Backend

```bash
npm run server
```

### Build

```bash
npm run build
```

---

## Deployment Setup

### Netlify Frontend

Build command:

```bash
npm run build
```

Publish directory:

```txt
dist
```

Environment variable:

```txt
VITE_API_URL=https://cloak-treasury.onrender.com
```

### Render Backend

Root directory:

```txt
server
```

Build command:

```bash
npm install
```

Start command:

```bash
node index.js
```

Environment variables:

```txt
PORT=10000
RPC_URL=https://api.devnet.solana.com
CORS_ORIGIN=https://cloaktreasury.netlify.app
```

---

## Important Technical Notes

### Devnet SDK

The app uses:

```js
@cloak.dev/sdk-devnet
```

This is used for Cloak Devnet compatibility.

### Solana Devnet

The app uses:

```txt
https://api.devnet.solana.com
```

### No Silent Demo Fallback

Live Mode must not silently fall back to Demo Mode.

If Live Mode fails, the app should show a clear error.

### Labels

Disbursement labels are stored off-chain for UI and audit reference.

If Cloak/Solana does not support attaching labels directly to the private transaction, the label remains off-chain.

---

## What Makes This Useful

Cloak Treasury combines:

* Private payments
* Scheduled execution
* Viewing key control
* Governance-gated audit access
* DAO-based release approval
* Selective compliance reporting

This makes it useful for organizations that need both privacy and accountability.

---

## Judging Criteria Alignment

Integration Depth
Cloak is central to the app.

The product depends on Cloak SDK for:

* UTXO creation
* Shielded transaction execution
* Viewing key generation
* Private transaction scanning
* Compliance report generation

### Product Usefulness

The app solves a real treasury privacy problem for DAOs, companies, payroll teams, grant teams, and auditors.

### Technical Execution

The app includes:

* Live frontend
* Render backend
* Solana Devnet support
* Wallet integration
* Governance release logic
* DAO approval logic
* Time and block based release triggers

### User Experience

The app provides a complete workflow:

```txt
Schedule → Execute → Lock → Release → Audit
```

---



---

## Summary

Cloak Treasury is a private financial infrastructure app built around the Cloak SDK. It gives teams the ability to send private payments while controlling when transaction information becomes available to auditors.

It is not just a wallet UI. It is a programmable privacy and audit layer for treasury operations.

```
```
