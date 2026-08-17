# MIMISA OS — Integrated PRD v2.0 (English Translation)

> **Translator's note:** 籌碼房 is rendered as **"Cage"** (the standard casino-industry term for this function — also confirmed by the source document's own DB table name `cage_assets`), and 賭廳 as **"Gaming Hall."** All other English terms follow the glosses already given in the source document (e.g., NN Chip, CC Chip, Roller, Buy-in, Cash-out).

## 1. Project Overview

### 1.1 Project Name

MIMISA Gaming Hall Cage Computerization and Account Management System (MIMISA OS)

### 1.2 Project Purpose

This project computerizes the gaming hall cage's currently manual, paper-based record-keeping, achieving full-process automation of buy-in / cash-out / rolling / commission / points settlement. The system is intended to achieve the following goals:

- Real-time tracking of the Cage's total assets (cash, NN chips, CC chips, customer deposit balances, in-play amounts, commission/points)
- Separately calculate House Rolling and Internal Rolling, automatically generating the basis data for month-end House settlement
- Real-time calculation of commission distribution across the Customer–Agent–Sub-Company hierarchy
- Apply an approval workflow to all transactions and retain audit logs
- Support head-office-level business decisions through consolidated cross-branch reporting
- Provide separate Operations Portal and Client Portal entry points, each optimized for its respective user roles

### 1.3 Terminology

| Term | Definition |
| --- | --- |
| NN Chip (Non-Negotiable Chip) | Non-redeemable chips purchased from the House (casino). Usable only at the gaming table. Rolling is calculated at time of buy-in |
| CC Chip (Cash Chip / Color Chip) | Redeemable cash chips paid out when a game is won |
| House Rolling | Rolling generated from NN chip transactions (purchase/exchange) with the House (casino). Basis for month-end House settlement |
| Internal Rolling | Rolling generated from a customer's actual gameplay. Basis for commission/points settlement |
| Roller | On-site staff responsible for exchanging customer chips and calculating rolling. Reports to an Agent |
| Buy-in | The act of a customer purchasing NN chips with cash or Deposit Balance |
| Cash-out | The act of a customer exchanging held chips (CC/NN) for cash |
| Deposit Balance | Cash a customer has placed on deposit at the Cage. Usable for buy-ins |
| In-Play Amount | The total chip amount currently in play at the table. Required for Cage asset tracking |
| Settlement Rate | The rate the Gaming Hall collects when the House wins (e.g., 50%) |
| FIFO | First In, First Out. When points are deducted, the earliest-accumulated points are deducted first |

## 2. System Architecture

### 2.1 System Composition Overview

The system provides two operating environments.

**Operations Portal**

- Users: Master, Branch Manager, Cage Staff, Floor Staff
- Access environment: Branch internal network, desktop / self-service terminal (iPad)
- Main functions: Cage asset management, game upload, approval processing, settlement, reporting

**Client Portal**

- Users: Agent, Sub-Company, Roller, general customer (Player)
- Access environment: Mobile web (responsive) + desktop web. External network access allowed
- Main functions: Account inquiry, balance confirmation, fund transfer, game records, commission/points inquiry, deposit/withdrawal requests, notification receipt

Each portal is fully separated, sharing a single DB and a single API server.

### 2.2 Recommended Technology Stack

To be chosen by the developer, but must satisfy the following requirements:

- **Frontend:** Web-based SPA. Operations Portal and Client Portal built separately. Compatible with self-service terminal (iPad) and desktop browsers. Responsive design required
- **Backend:** RESTful API or GraphQL. WebSocket support for real-time notifications
- **Database:** RDBMS required (to guarantee transactional integrity). All monetary calculations use integers (peso units) or DECIMAL(18,2). Floating point (float/double) is prohibited
- **Server:** Use cloud servers (Operations Portal accessed via internal-network VPN, Client Portal allows external access)
- **Security:** End-to-end SSL/TLS, DB encryption, RBAC access control

### 2.3 Deployment Environment

- Operations server: Cloud server (configured for internal-network access via VPN)
- Backup: 1x daily automatic full backup + real-time transaction log backup
- Cloud mirroring: Additional backup server `[TBD: specific mirroring plan needs discussion]`
- Server redundancy: Active-Standby configuration recommended (automatic failover)

### 2.4 System Availability Requirements

- Uptime target: 99.9% (downtime within 8.76 hours/year)
- Recovery Time Objective (RTO): within 30 minutes
- Recovery Point Objective (RPO): 0 (zero transaction data loss)

## 3. Account Structure and Permissions (RBAC)

### 3.1 Account Hierarchy

```
Master Account
 └─ Branch Manager Account — 1 per branch
     ├─ Cage Staff Account — permissions granted by Branch Manager
     ├─ Floor Staff Account — upload requests only
     ├─ Sub-Company Account
     │   └─ Agent Account
     │       ├─ Roller Account — 1 Agent : N Rollers
     │       └─ General Account (Player, customer)
     └─ Independent Agent Account (not under a Sub-Company)
         ├─ Roller Account
         └─ General Account
```

### 3.2 Detailed Permissions by Account Type

#### 3.2.1 Master Account

- **Data inquiry:** Consolidated data inquiry across all branches (MIMISA, etc.)
- **Filtering:** Rolling statistics filterable by branch, period, agent
- **Account management:** Create/deactivate Branch Manager accounts
- **Log access:** All audit logs
- **Modify/delete:** Data modification and deletion not permitted (integrity preservation)
- **Cage assets:** View total Cage asset status across all branches
- **Wallet holding:** None
- **Portal:** Operations Portal access

#### 3.2.2 Branch Manager Account

- **Data management:** Manages all accounts and transactions for that branch
- **Approval authority:** Final approval/rejection of game uploads, commission-withdrawal approval/rejection, final approval of account creation, fund-transfer approval/rejection
- **Manual adjustment:** Can manually adjust wallet balances (error correction, special approval). Must enter a reason when adjusting; automatically logged
- **Cage assets:** Real-time dashboard of that branch's total Cage assets
- **Subordinate account management:** Create/deactivate Sub-Company, Agent, Floor Staff, Cage Staff, and General accounts
- **Commission/points settings:** Set commission rate per game, set points accrual rate, set customer "Show/Hide" setting
- **Transfer-limit settings:** Set per-transaction and daily limits per account, exception approval for non-hierarchy transfers
- **Log access:** All logs for that branch
- **Wallet holding:** None
- **Portal:** Operations Portal access

#### 3.2.3 Cage Staff Account

- **Approval authority:** Can approve/reject uploads within the scope delegated by the Branch Manager
- **Upload:** Buy-in/Cash-out form entry, Inspector 2 role for game uploads
- **Customer deposit/withdrawal processing:** Confirm and process customer-initiated deposit/withdrawal requests
- **Inquiry:** Transaction inquiry for that branch
- **Wallet holding:** None
- **Note:** Branch Manager sets the scope of authority (e.g., approvable amount limits)
- **Portal:** Operations Portal access

#### 3.2.4 Floor Staff Account

- **Upload:** Game upload data entry and submission of approval requests (Inspector 1 role)
- **Approval authority:** None. Request only
- **Inquiry:** Can view only upload records for requests made by this account
- **Wallet holding:** None
- **Portal:** Operations Portal access

#### 3.2.5 Sub-Company Account

- **Subordinate management:** Inquiry into transaction details for its Agents and their subordinate customers
- **Commission:** Accrues win/loss-based commission (e.g., 5% of win/loss, set by Branch Manager)
- **Withdrawal:** May request commission withdrawal (requires Branch Manager approval)
- **Fund distribution:** May distribute operating funds to its Agents (requires Branch Manager approval)
- **Reports:** Monthly performance and summary reports for subordinate Agents
- **Modify/delete:** Not permitted
- **Wallet holding:** None (commission balance managed in a separate Commission Wallet)
- **Portal:** Client Portal access

#### 3.2.6 Agent Account

- **Dual role:** Can act as an Agent while also playing directly
- **Subordinate management:** Inquiry into buy-in/cash-out/rolling details for its customers
- **Commission:** Real-time accrual of commission per game type
    - Game A: Rolling commission (e.g., 1.4%)
    - Game B: Win/loss commission (e.g., 40%) `[disabled post-development — game option currently unused, reserved for extensibility]`
    - Game C: Rolling + win/loss can apply concurrently `[disabled post-development — game option currently unused, reserved for extensibility]`
    - Commission rates are set individually by the Branch Manager per Agent and per game
- **Withdrawal:** May request commission withdrawal (requires Branch Manager approval)
- **Points control:** Sets subordinate customers' points accrual rate (0 to base rate), "Show/Hide" setting
- **Reports:** Per-customer summary of rolling, buy-in, cash-out, commission
- **Wallet holding:** Real Money Wallet, NN Wallet, CC Wallet (when playing personally)
- **Portal:** Client Portal access

#### 3.2.7 Roller Account

- **Role:** Responsible for customer chip exchange, rolling calculation, and assisting with game upload data entry
- **Relationship:** 1 Roller : N Agents possible (one Roller may manage customers across multiple Agents)
- **Permissions:** Recorded in the "Exchange Staff (Roller)" field at game upload. No independent approval/withdrawal authority
- **Wallet holding:** None
- **Portal:** Client Portal access

#### 3.2.8 General Account (Player, customer)

- **Inquiry:** Own balance, transaction details
- **Commission/points:** Menu shown only when set to "Show" by the Agent or Branch Manager. Default is "Hide" (menu itself not shown)
- **Points usage:** Usable only for promotions (vouchers, accommodation, dining, etc.). Cannot be directly converted to Real Money/CC/NN wallet
- **Fund transfer:** May transfer Deposit Balance to other accounts within the same branch (requires Branch Manager approval)
- **Deposit/withdrawal requests:** May pre-submit requests for Deposit Balance deposit/withdrawal/buy-in
- **Password recovery:** May reset after self-authentication
- **Wallet holding:** Real Money Wallet, NN Wallet, CC Wallet
- **Portal:** Client Portal access

### 3.3 Account Creation Process

**New customer (Player) registration:**

1. The customer personally, or their Agent, requests account creation at the Cage
2. Cage Staff enters the information into the system (passport number or MIMISA Rewards Card number as Unique ID)
3. Links the registering Agent as the customer's account manager
4. Branch Manager gives final approval → account activated
5. Initial login information (temporary password) is delivered to the customer
    - Cage Staff hands the customer a printed slip (Account ID + temporary password) directly
    - Or sends it via registered mobile number by SMS (once the SMS gateway is integrated)
6. Customer logs into the Client Portal for the first time → forced password change + optional 2FA setup guidance

**Unique ID rules:**

- Primary: Passport number (country code + passport number)
- Alternative: MIMISA Rewards Card number
- Internal system ID: separately issued auto-increment ID or UUID

**Required information to collect:** Name (English/local language), passport number and nationality, date of birth, contact information (mobile phone), photo (passport copy or photograph taken), responsible Agent ID (if applicable)

### 3.4 Authentication and Security

**Operations Portal:**

- 2FA: Required at login for Master, Branch Manager, Sub-Company, Agent, Cage Staff, Floor Staff (Google Authenticator)
- Password reset: Performed after 2FA authentication
- Auto logout: After 10 minutes of inactivity
- IP restriction: IP whitelist for administrator accounts

**Client Portal:**

- General account (Player): 2FA not required (optional)
- Session timeout: After 15 minutes of inactivity
- Re-authentication for financial transactions: Transfer password required for transfer/withdrawal requests
- Device management: First-login device is recorded; notification sent when logging in from a new device

**General:** Account locked for 30 minutes after 5 failed login attempts; only 1 concurrent login session allowed; API rate limiting of 60 requests/minute

## 4. Wallet System

### 4.1 Wallet Structure

Accounts holding wallets: **General Account (Player)** and **Agent Account (Agent, when playing personally)**

| Wallet Type | Description | Inflow Path | Outflow Path |
| --- | --- | --- | --- |
| Real Money Wallet | Cash balance. Deducted at buy-in, increased at cash-out | Cash deposit (Deposit Balance), cash-out, transfer received | Buy-in, cash withdrawal, transfer sent |
| NN Wallet | NN chip holdings. Deducted when placed at the gaming table | Buy-in (NN chips received) | Game wager, returned to House |
| CC Wallet | CC chip holdings. Increased on game win | Game win | Cash-out (exchanged for cash), NN chip exchange |

### 4.2 Wallet Balance Change Rules

- All balance changes must be generated through a transaction record
- Manual adjustments may be made only by the Branch Manager, and a reason must be entered + is automatically logged
- Negative balances are not allowed (transaction rejected if balance is insufficient)
- All amounts are stored as integers (peso units) or DECIMAL(18,2). No rounding — recorded to the decimal point
- A hold (hold_amount) applies to transfer requests: prior to approval, the amount is shown as deducted from the balance but has not yet been passed to the recipient

### 4.3 Commission Wallet

For Agent and Sub-Company use only. Accrues automatically at game settlement, following the flow: withdrawal request → Branch Manager approval → cash payment.

| Item | Rule |
| --- | --- |
| Accrual point | Accrues immediately upon game upload approval |
| Withdrawal request | Agent/Sub-Company applies within the system |
| Withdrawal approval | Requires Branch Manager approval |
| Withdrawal completion | Commission balance deducted at approval + electronic settlement receipt (Invoice) automatically generated and sent |

## 5. Cage Total Asset Management System

### 5.1 Components of Cage Assets

The Cage's total assets are tracked in real time as the sum of the following items. **Every transaction must affect one or more of these asset items, and debits/credits must remain balanced (double-entry bookkeeping principle).**

| Item | Description | Sign |
| --- | --- | --- |
| Company Cash | Cash in the Cage vault | + |
| NN Chips Held | Inventory of NN chips purchased/exchanged from the House | + |
| CC Chips Held | Inventory of CC chips collected back from customers | + |
| Total Customer Deposit Balances | Total cash on deposit by customers (liability) | + (for asset-tracking purposes) |
| In-Play Amount | Total chip amount currently in play at the table | + |
| Unpaid Commission/Points Balance | Cash value of commission and points not yet paid (liability) | – (expense) |

**Branch total operating capital = Company Cash + NN Chips + CC Chips + Customer Deposit Balances + In-Play Amount**

### 5.2 Asset Change Scenario Mapping

Asset item changes by major transaction type:

**Scenario 1: Purchasing NN chips from the House** — Company Cash –X, NN Chips Held +X, House Rolling +X. Total capital change: 0

**Scenario 2: Customer cash buy-in** — Company Cash +X, NN Chips Held –X, In-Play Amount +X. Total capital change: +X

**Scenario 3: Customer Deposit Balance buy-in** — Deposit Balance –X, Company Cash +X, NN Chips Held –X, In-Play Amount +X. Total capital change: 0

**Scenario 4: End of game — chip return** — In-Play Amount –(buy-in amount), NN Chips +(NN returned), CC Chips +(CC returned), Internal Rolling +(buy-in amount – NN returned). Total capital change: –(customer win) or +(House win)

**Scenario 5: Customer cash-out** — Deposit Balance/CC Chips –X, Company Cash –X. Total capital change: –X

**Scenario 6: House CC chip → NN chip exchange** — CC Chips –X, NN Chips +X, House Rolling +X. Total capital change: 0

**Scenario 7: Mid-game CC → NN exchange** — CC Chips +X, NN Chips –X, Internal Rolling +X. Total capital change: 0

**Scenario 8: Commission payment** — Company Cash –X, Unpaid Commission –X (liability decrease). Total capital change: –X

**Scenario 9: Month-end House settlement** — NN Chips –(full amount returned), Company Cash +(amount returned), +(House Win × Settlement Rate), House Rolling reset

### 5.3 Asset Integrity Verification

The system automatically verifies the following after processing each transaction:

1. **Asset balance check:** Total debits = Total credits
2. **Negative-value check:** All asset items ≥ 0
3. **House Rolling consistency:** House Rolling – cumulative NN chip returns = cumulative Internal Rolling (as of month-end)
4. **Customer Deposit Balance consistency:** Sum of individual customer Deposit Balances = Cage's total Customer Deposit Balance

On verification failure: the transaction is rolled back + the Branch Manager is notified in real time + an error is logged

## 6. Rolling Calculation Logic

### 6.1 The Two Types of Rolling

**House Rolling**

- **Calculation basis:** Applies the MIMISA casino rolling calculation method
- **Calculation point:** Calculated in real time when NN chips are purchased; deducted when NN chips are returned
- **Formula:** House Rolling = Σ(NN chip purchase/exchange amounts) – Σ(NN chip return amounts)
- **Purpose:** Basis for month-end House settlement

**Internal Rolling**

- **Calculation basis:** Based on the customer's actual gameplay
- **Calculation point:** Recorded at buy-in; deducted for the portion of NN chips returned
- **Formula:** Internal Rolling per game = Buy-in amount – NN chip return amount
- **Cumulative formula:** Customer Internal Rolling = Σ(Internal Rolling per game) + Σ(mid-game CC→NN exchange amounts)
- **Purpose:** Basis for commission and points settlement

### 6.2 Step-by-Step Rolling Calculation Flow

**Step 1 — At buy-in:** Internal Rolling += buy-in amount, In-Play Amount += buy-in amount

**Step 2 — Mid-game CC→NN exchange:** Internal Rolling += exchange amount (In-Play Amount unchanged — only the chip type changes)

**Step 3 — End of game:** When NN chips are returned, Internal Rolling -= NN chips returned. Final game rolling = buy-in amount + CC→NN exchange amount – NN chips returned

### 6.3 Validation Example `[TBD: subject to change pending reconfirmation of the MIMISA process]`

**Customer A, first game:** Buy-in of 10,000,000 NN chips → returns 4,000,000 NN + 3,000,000 CC. Internal Rolling = 6,000,000. House Win = 3,000,000.

**Customer A, second game:** Deposit Balance buy-in of 7,000,000 NN + mid-game CC→NN of 10,000,000 → returns 6,000,000 CC (NN returned = 0). Internal Rolling = 17,000,000. Cumulative Internal Rolling = 23,000,000.

## 7. Game Upload Process

### 7.1 Game Number Issuance Rules `[TBD: subject to change pending confirmation of the MIMISA table-number format]`

**Format:** YYYYMMDD-TTT-GG-NNNN

| Segment | Description | Example |
| --- | --- | --- |
| YYYYMMDD | Game start date | 20260317 |
| TTT | Table number (3 digits, zero-padded) | 005 |
| GG | Game type code | BA (Baccarat), BJ (Blackjack), RO (Roulette) |
| NNNN | Sequential number for that table on that day (4 digits) | 0012 |

**Example:** 20260317-005-BA-0012

**Issuance point:** Automatically generated by the system before the game starts. Manual entry is allowed but duplicates must be validated

### 7.2 Required Fields for Game Upload

| Field Name | Data Type | Required | Description |
| --- | --- | --- | --- |
| game_number | VARCHAR(20) | Required | Auto-generated or manually entered |
| roller_account_id | FK | Required | Exchange staff (Roller) account |
| player_account_id | FK | Required | Player account (Player or Agent) |
| inspector_1_id | FK | Required | Inspector 1 (Floor Manager/Supervisor) |
| inspector_2_id | FK | Required | Inspector 2 (Cage Staff) |
| chip_quantity | DECIMAL(18,2) | Required | Quantity of NN chips exchanged (peso units) |
| game_type | ENUM | Required | Game type (A/B/C, etc.) |
| table_number | VARCHAR(10) | Required | Table number |
| upload_timestamp | DATETIME | Automatic | Upload timestamp |
| uploaded_by | FK | Automatic | Account responsible for the upload |

### 7.3 Upload Workflow

```
1. Floor Staff/Roller enters data at a self-service terminal or PC
   ↓
2. Validation 1: Check for missing required fields → immediate warning if missing, submission blocked
   ↓
3. Validation 2: Check for duplicate game number → warning if duplicate, upload blocked
   ↓
4. Validation 3: Confirm player account status (active), confirm Roller validity
   ↓
5. Upload request submitted → Status: "Pending Approval"
   ↓
6. Reviewed by authorized Cage Staff or Branch Manager
   ↓
7-A. Approved → Status: "Approval Complete"
     → Rolling amount, commission, and points automatically calculated and accrued
     → Cage asset items automatically updated
     → Transaction record created
     → "Success" notification sent to approver + upload content summary

7-B. Rejected → Status: "Rejected"
     → Rejection reason must be entered
     → "Rejected" notification sent to requester + reason
```

**Important rules:**

- Data not approved by the Branch Manager is not reflected in the system
- Game results (win/loss, balance change) are not entered manually as a separate step — settlement is based on uploaded data and transactions

### 7.4 End-of-Game Upload

At the end of a game, results are recorded on a separate form:

| Field Name | Data Type | Required | Description |
| --- | --- | --- | --- |
| game_number | FK | Required | Corresponding game number |
| returned_nn_chips | DECIMAL(18,2) | Required | Amount of NN chips returned |
| returned_cc_chips | DECIMAL(18,2) | Required | Amount of CC chips returned |
| mid_game_exchanges | JSON | Optional | Details of mid-game CC→NN exchanges |
| result_type | ENUM | Auto-calculated | WIN / LOSE / DRAW |
| win_lose_amount | DECIMAL(18,2) | Auto-calculated | House-basis WIN/LOSE amount |
| rolling_amount | DECIMAL(18,2) | Auto-calculated | Internal Rolling for that game |

### 7.5 Buy-in / Cash-out Upload Form

| Field Name | Data Type | Required | Description |
| --- | --- | --- | --- |
| account_id | FK | Required | Customer account |
| customer_name | VARCHAR | Auto-filled | Automatically loaded from account |
| transaction_type | ENUM | Required | BUY_IN, CASH_OUT, DEPOSIT, WITHDRAWAL, ACCOUNT_TRANSFER |
| amount | DECIMAL(18,2) | Required | Transaction amount |
| payment_method | ENUM | Required | CASH, DEPOSIT_BALANCE (using Deposit Balance) |
| signature | BLOB | Required | Electronic signature (touch input) |
| transaction_date | DATETIME | Automatic | Transaction date/time |
| processed_by | FK | Automatic | Cage Staff member responsible for processing |

## 8. Commission Settlement Logic

### 8.1 Commission Types and Settings

| Commission Type | Calculation Basis | Example Application |
| --- | --- | --- |
| Rolling commission | Internal Rolling amount × commission rate | Game A: Rolling × 1.4% |
| Win/loss commission | House WIN/LOSE × commission rate | Game B: WIN/LOSE × 40% |
| Hybrid commission | Rolling + win/loss applied simultaneously | Game C: per game configuration |

### 8.2 Commission Configuration Table

The Branch Manager can individually configure by the following combination of fields:

```
commission_config {
  config_id (PK)
  branch_id (FK)
  game_type (ENUM)
  account_id (FK) — Agent or Sub-Company
  commission_type (ENUM: ROLLING / WINLOSE / HYBRID)
  rolling_rate (DECIMAL 5,4) — e.g., 0.0140 = 1.4%
  winlose_rate (DECIMAL 5,4) — e.g., 0.4000 = 40%
  effective_from (DATE)
  effective_to (DATE, nullable)
  created_by (FK)
  created_at (DATETIME)
}
```

### 8.3 Commission Calculation Flow

**Rolling commission calculation (in real time at game upload approval):**

```
Commission amount = Internal Rolling for that game × rolling_rate
Agent Commission Wallet += Commission amount
```

**Win/loss commission calculation:**

```
When the House WINS:
  Commission amount = WIN amount × winlose_rate
  Agent Commission Wallet += Commission amount

When the House LOSES:
  Commission amount = LOSE amount × winlose_rate × (–1)
  Agent Commission Wallet -= Commission amount
  (Commission Wallet may go negative — offset against a future WIN)
```

### 8.4 Sub-Company Commission

```
Sub-Company Commission = Total WIN/LOSE of subordinate Agents × Sub-Company win/loss rate (e.g., 5%)
```

### 8.5 Commission Withdrawal Process

```
1. Agent/Sub-Company submits a withdrawal request (requested amount ≤ Commission Wallet balance)
   ↓
2. System automatically generates an electronic settlement receipt (Invoice)
   ↓
3. Approval-request notification sent to Branch Manager
   ↓
4-A. Approved → Commission Wallet deducted, Invoice finalized, cash payment recorded
4-B. Rejected → rejection reason entered, requester notified
```

**Invoice must include:** Recipient account information, settlement period, detailed breakdown of rolling/win-loss per game, commission rate and calculation basis, total commission amount, requested withdrawal amount, approver signature and approval date/time

## 9. MIMISA Points System

### 9.1 Points Accrual Rules

| Item | Rule |
| --- | --- |
| Accrual eligibility | Only General Accounts (Player) accrue points |
| Accrual basis | 0.1% of Internal Rolling amount (managed as an independent rate if the commission rate changes) |
| Accrual point | Immediately upon game upload approval |
| Decimal handling | Recorded to the decimal point, no rounding |
| Visibility | Shown to the customer only when set to "Show" by the Agent/Branch Manager. Default = Hidden |

**Accrual example:** Internal Rolling 6,000,000 × 0.001 = 6,000 points accrued

### 9.2 Points Validity Period and Expiration

| Item | Rule |
| --- | --- |
| Validity period | 2 months from date of accrual |
| Expiration notice | Sent 7 days before expiration, to customers set to "Show" and their responsible Agent |
| Expiration processing | Automatically processed at 00:00 the day after the validity period ends (batch job) |

### 9.3 Points Usage Rules

- Eligible uses: promotions only (vouchers, accommodation, dining, etc.)
- Cannot be directly converted to Real Money/CC/NN wallet
- Deduction principle: FIFO (earliest-accrued points deducted first)
- All points usage details are recorded in the transaction list

### 9.4 Agent Control Over Points

Agents can control points for their subordinate customers: accrual rate adjustment (0%–base rate of 0.1%), visibility control ("Show"/"Hide" — when set to "Hide," the customer does not know points exist, as the menu is not shown), and points usage approval (usable after Agent approval, an optional setting)

## 10. Fund Transfer

### 10.1 Fund Transfer Type Definitions

| Transfer Type | Sender | Recipient | Approval Required | Description |
| --- | --- | --- | --- | --- |
| Customer → Customer | Player | Player | Branch Manager | Deposit Balance transfer between customers within the same branch |
| Agent → Customer | Agent | Player (subordinate) | Branch Manager | Agent providing financial support to its customer |
| Customer → Agent | Player | Agent (superior) | Branch Manager | Customer returning funds to Agent |
| Agent → Agent | Agent | Agent | Branch Manager | Transfer between Agents within the same branch |
| Sub-Company → Agent | Sub-Company | Agent (subordinate) | Branch Manager | Sub-Company distributing funds to its Agent |

### 10.2 Transfer Restriction Rules

| Rule | Content |
| --- | --- |
| Transfer recipients | Accounts within the same branch only. Cross-branch transfers not allowed |
| Transfer limits | Branch Manager sets per-transaction and daily limits for each account |
| Minimum amount | 1,000 pesos (configurable) |
| Balance check | Sender's Real Money Wallet balance ≥ transfer amount. Rejected if insufficient |
| Transfer relationship | Basic rule: only direct superior/subordinate relationships allowed. Branch Manager may grant exception approval for non-hierarchy transfers |
| Transfer fee | Free by default. Branch Manager may set a fee rate (future extension) |
| Transfer authentication | Transfer password required |

### 10.3 Transfer Request Process

```
Step 1: Sender goes to [Fund Transfer] in the Client Portal
  ↓
Step 2: Selects recipient (dropdown list of direct superior/subordinate accounts, or search by account ID/name)
  ↓
Step 3: Enters transfer amount (current balance, per-transaction limit, and remaining daily limit displayed)
  ↓
Step 4: Enters transfer password
  ↓
Step 5: Confirmation screen (recipient name/account ID, transfer amount, projected balance after transfer)
  ↓
Step 6: Submits transfer request → Status: "Pending Approval"
  → Transfer amount immediately held (hold_amount) against sender's balance
  ↓
Step 7: Approval-request notification sent to Branch Manager
  ↓
Step 8-A: Approved
  → Hold released → sender's balance deduction confirmed
  → Recipient's Real Money Wallet += transfer amount
  → Completion notification sent to both parties + electronic receipt generated
  → 2 transaction records created (1 sent + 1 received)

Step 8-B: Rejected
  → Hold released → sender's balance restored
  → Rejection notification sent to sender (with reason)
```

## 11. Customer Self-Service Features

### 11.1 Customer Home Screen

Designed mobile-first. Real Money balance/NN chips/CC chips at the top, [Deposit Request][Withdrawal Request] buttons. [Fund Transfer][Game Records][Transaction Details][My Info] menu in the middle. Summary of the most recent 10 transactions at the bottom. Points/Commission shown only when set to "Show" (removed from the DOM otherwise).

### 11.2 Deposit Request (Customer → Cage)

Customer taps [Deposit Request] → enters amount → submits request ("Deposit Pending") → Cage Staff notified → customer visits/delivers cash → Cage Staff enters amount received (warning + reason required if it doesn't match) → Branch Manager approves → Real Money reflected + electronic receipt

### 11.3 Withdrawal Request (Customer → Cage)

Customer taps [Withdrawal Request] → enters amount (within balance) → submits request (balance held) → Cage Staff prepares cash → customer visits/collects/signs → processing complete (hold released, balance deducted) + receipt. If not collected within 24 hours, automatically cancelled (hold released, balance restored).

### 11.4 Buy-in Request (Optional)

Customer pre-requests a purchase of NN chips from Deposit Balance before the game starts. Direct buy-in at the existing Cage window remains available.

### 11.5 Electronic Receipt Inquiry

All completed transactions can be viewed on screen: receipt number, transaction date/time, type, amount, balance before/after, processing staff, approver, and electronic signature are displayed. Cannot be printed/downloaded (for security).

## 12. Month-End House Settlement `[TBD: MIMISA settlement procedure, period, etc. need confirmation]`

Determine settlement period (1st to last day of the month) → full return of NN chips → verify House Rolling (final House Rolling == cumulative Internal Rolling) → WIN/LOSE settlement → net profit calculation → prepare for new month (repurchase NN chips, reset rolling counters)

Settlement report automatically generated: total House/Internal Rolling, WIN/LOSE (by customer), total commission (by Agent/Sub-Company), points, net profit, summary of Cage asset changes

## 13. Notification System

### 13.1 Operations Portal Notifications

| Event | Recipient |
| --- | --- |
| Upload approval request | Branch Manager / authorized Cage Staff |
| Upload approved/rejected | Upload requester |
| Commission withdrawal request | Branch Manager |
| Commission withdrawal approved/rejected | Withdrawal requester |
| Points expiring in 7 days | Customer (if set to "Show") + responsible Agent |
| Account lockout / asset integrity failure | Branch Manager + Master |
| Manual wallet adjustment | Master |

### 13.2 Client Portal Notifications

| Event | Recipient |
| --- | --- |
| Deposit/withdrawal completed | Customer (+ optional SMS) |
| Withdrawal request auto-cancelled (24h) | Customer |
| Transfer received/sent/rejected | Relevant customer |
| Buy-in/cash-out/game result | Customer |
| Commission accrued (if visibility "Show") | Customer |

### 13.3 SMS Integration (Optional)

Integration with Philippine telecom carrier gateways (Globe, Smart), sending of financial event notifications, opt-in settings, logging.

## 14. Log Management

| Log Type | Recorded Items | Retention |
| --- | --- | --- |
| Access log | Account ID, login/logout, IP, device | 3 years |
| Activity log | Account ID, action performed, target record, timestamp | 3 years |
| Upload/approval log | Uploader/approver, content, result | 5 years |
| Settlement log | Basis for commission/points calculation | 5 years |
| Manual adjustment log | Adjuster, target, before/after values, reason | Permanent |
| Asset change log | Transaction ID, change by asset item | 5 years |

Log access rights: Master (all), Branch Manager (that branch), Sub-Company (its own Agents' game records), Agent (its own customers' records), others (own records only)

## 15. Dashboards and Reports

### 15.1 Master Dashboard

Total Cage assets across all branches, rolling statistics by branch, WIN/LOSE trend charts, pending-approval count, Agent performance ranking, customer count

### 15.2 Branch Manager Dashboard

Real-time Cage asset status board (WebSocket / 5-second polling), House vs. Internal Rolling comparison, pending-approval count, Agent/Sub-Company performance summary, current-day game status, approval log timeline

### 15.3 Agent Dashboard

This month's earnings card (accrued commission / withdrawable), list of subordinate customers and their rolling, per-customer quick actions ([Transfer][Game Records][Rolling]), personal game details

### 15.4 Report Filters

Period (day/week/month/custom), account (by Agent/by customer), game type (A/B/C), transaction type, approval status. **Cannot be downloaded** (on-screen inquiry only, for security reasons).

## 16. Database Schema

### 16.1 Table List

**T01. branches:** branch_id(PK), branch_name, branch_code(UNIQUE), status, timestamps

**T02. accounts:** account_id(PK), branch_id(FK), account_type(ENUM), parent_id(FK), unique_external_id(UNIQUE), username(UNIQUE), password_hash, transfer_password_hash, full_name, nationality, date_of_birth, phone, photo_path, totp_secret, status(ENUM), approved_by(FK), failed_login_count, locked_until, timestamps

**T03. wallets:** wallet_id(PK), account_id(FK), wallet_type(ENUM), balance(DECIMAL(18,2)), UNIQUE(account_id, wallet_type)

**T04. cage_assets:** asset_id(PK), branch_id(FK), asset_type(ENUM), amount(DECIMAL(18,2))

**T05. games:** game_id(PK), game_number(UNIQUE), branch_id(FK), game_type, table_number, player/roller/inspector FKs, buyin_amount, buyin_source, returned_nn/cc, mid_game_exchange, internal_rolling, house_win_lose, game_status, upload_status, uploaded_by, approved_by, reject_reason, timestamps

**T06. transactions:** transaction_id(PK), branch_id(FK), account_id(FK), transaction_type(ENUM), amount, wallet_type, balance_before/after, reference_id/type, signature_data, approval_status, counterpart_account_id(FK), hold_status(ENUM), hold_amount, processed_by(FK), memo, timestamps

**T07. rolling_records:** rolling_id(PK), branch_id(FK), game_id(FK), player/agent FKs, rolling_type(ENUM), rolling_amount, game_type, period_month

**T08. commissions:** commission_id(PK), branch_id(FK), game_id(FK), beneficiary_id(FK), beneficiary_type, commission_type, base_amount, commission_rate, commission_amount, period_month

**T09. commission_configs:** config_id(PK), branch_id(FK), game_type, account_id(FK), commission_type, rolling_rate, winlose_rate, effective_from/to, created_by(FK)

**T10. points:** point_id(PK), account_id(FK), game_id(FK), earned/used/remaining_amount(DECIMAL(18,4)), valid_until, expiry_notified, status(ENUM)

**T11. point_visibility:** visibility_id(PK), player_account_id(FK, UNIQUE), controlled_by(FK), point_visible(BOOLEAN), earn_rate_override(DECIMAL(5,4))

**T12. approval_logs:** approval_id(PK), target_type(ENUM), target_id, action(ENUM), acted_by(FK), comment, acted_at

**T13. house_rolling_ledger:** ledger_id(PK), branch_id(FK), period_month, transaction_type(ENUM), amount, cumulative_total, reference_id, memo

**T14. house_settlements:** settlement_id(PK), branch_id(FK), period_month, house/internal_rolling_total, nn_returned_total, total_win_lose, settlement_rate/amount, commission/point_total, net_profit, settled_by(FK)

**T15. activity_logs:** log_id(PK, BIGINT), account_id(FK), action_type, target_entity, target_id, ip_address, user_agent, detail(JSON)

**T16. manual_adjustments:** adjustment_id(PK), branch_id(FK), target_account_id(FK), wallet_type, amount_before/after/adjustment, reason(NOT NULL), adjusted_by(FK)

**T17. notifications:** notification_id(PK), recipient_id(FK), event_type(ENUM), title, body, reference_type/id, is_read(BOOLEAN)

**T18. deposit_withdrawal_requests:** request_id(PK), branch_id(FK), account_id(FK), request_type(ENUM), requested/actual/hold_amount, status(ENUM), processed_by, approved_by, discrepancy_reason, expires_at

**T19. device_registry:** device_id(PK), account_id(FK), device_fingerprint, device_name, first/last_seen_at, ip_address, is_trusted

**T20. transfer_limits:** limit_id(PK), branch_id(FK), account_id(FK, nullable), per_transaction_limit, daily_limit, allow_non_hierarchy(BOOLEAN), created_by(FK)

### 16.2 Table Relationship Summary

branches 1─N accounts, cage_assets, games, transactions, house_rolling_ledger, house_settlements. accounts 1─N accounts(parent_id), wallets, transactions, games, commissions, points. accounts 1─1 point_visibility. games 1─N transactions, rolling_records, commissions, points. transactions 1─N approval_logs.

## 17. API Endpoints

### 17.1 Operations Portal API

**Authentication:** POST /api/auth/login, /logout, /refresh, /password-reset

**Accounts:** POST/GET/PUT /api/accounts, PATCH /:id/status, POST /:id/approve

**Games:** POST/GET /api/games, PUT /:id/complete, POST /:id/exchange, /:id/approve, /:id/reject

**Transactions:** POST/GET /api/transactions, POST /:id/approve, /:id/reject

**Commission:** GET /api/commissions, POST /withdraw-request, /withdraw/:id/approve, /reject, GET /invoice/:id

**Commission config:** GET/POST/PUT /api/commission-configs

**Points:** GET /api/points, POST /use, PUT /point-visibility/:player_id

**Cage assets:** GET /api/cage-assets, POST /manual-adjust

**House:** GET /api/house-rolling, POST /nn-purchase, /nn-return, /cc-exchange, POST/GET /api/house-settlements

**Reports:** GET /api/reports/rolling, /commission, /points, /cage-summary, /agent-performance

**Notifications:** GET/PATCH /api/notifications

**Logs:** GET /api/logs/activity, /approval, /manual-adjustments

### 17.2 Client Portal API

**Self-service:** GET /api/me, /me/wallets, /me/transactions, /me/games, /me/points, /me/commissions, /me/receipts/:id, PUT /me/password

**Customer-initiated:** POST /api/me/deposit-request, /withdrawal-request, /buyin-request, DELETE /me/withdrawal-request/:id

**Transfers:** POST/GET /api/transfers, POST /:id/approve, /reject, GET/PUT /api/transfer-limits

**Agent:** GET /api/agents/me/customers, /:id/wallets, /:id/games, /:id/rolling, PUT /:id/point-visibility, GET /me/commissions, POST /me/commission-withdraw

**Sub-Company:** GET /api/sub-companies/me/agents, /:id/performance, POST /me/fund-distribute, GET /me/commissions, POST /me/commission-withdraw

## 18. UI/UX Screen Composition

### 18.1 Operations Portal Screens (S01~S23)

S01 Login, S02 Master Dashboard, S03 Branch Manager Dashboard, S04 Cage Asset Status Board, S05~S07 Sub-Company/Agent/Customer Dashboards, S08 Game Upload Form, S09 End-of-Game Form, S10 Buy-in/Cash-out Form, S11 Approval Management, S12 Transaction Inquiry, S13~S15 Rolling/Commission/Points Reports, S16 Account Management, S17 Commission Settings, S18 Points Settings, S19 Commission Withdrawal, S20 House Rolling Ledger, S21 Month-End Settlement, S22 Notification Center, S23 Log Inquiry

### 18.2 Client Portal Screens (CS01~CS19)

CS01 Customer Transaction Details, CS02 Game Records, CS03 Points Details, CS04 Commission Details, CS05 Fund Transfer, CS06 Deposit Request, CS07 Withdrawal Request, CS08 Buy-in Request, CS09 Electronic Receipt, CS10 Agent Home, CS11 Customer Management, CS12 Agent Commission, CS13 Agent Withdrawal, CS14 Sub-Company Home, CS15 Agent Performance, CS16 Fund Distribution, CS17 Sub-Company Withdrawal, CS18 Notification Center, CS19 My Info/Password Change

## 19. Non-Functional Requirements

### 19.1 Performance

Page load within 2 seconds, transaction processing within 500ms, minimum 50 concurrent connections, dashboard real-time updates within 5 seconds

### 19.2 Security

End-to-end SSL/TLS HTTPS, DB encryption (PII only via AES-256; amounts/dates stored in plaintext), password/transfer password via bcrypt/argon2, RBAC enforced at the API layer, IP restriction, CSRF/XSS/SQL Injection protection

### 19.3 Backup and Recovery

- Daily full backup: 3:00 AM daily
- Transaction logs: real-time backup (WAL/binlog)
- Additional cloud mirror server `[TBD: specific mirroring plan needs discussion]`
- Backup retention: minimum 90 days `[TBD: retention period to be reset after cost confirmation]`
- Recovery testing: monthly

### 19.4 Audit Trail

All data changes are automatically recorded in activity_logs, including before/after values, who made the change, timestamp, and IP. Logs cannot be deleted (append-only). Manual adjustments are permanently stored in manual_adjustments.

## 20. Batch Jobs

| Job Name | Schedule | Description |
| --- | --- | --- |
| Points expiration processing | Daily 00:00 | Expired points → EXPIRED |
| Points expiration notice | Daily 09:00 | Notify of points expiring within 7 days |
| Asset integrity verification | Hourly | Cross-validation of Cage assets |
| Session cleanup | Every 5 minutes | Expire unused sessions (Operations: 10 min / Client: 15 min) |
| DB backup | Daily 03:00 | Execute full backup |
| Withdrawal request expiration | Hourly | Auto-cancel withdrawal requests not collected within 24 hours, release hold |

---

**Items pending confirmation (to be resolved later):**

- `[TBD]` §6.3 Validation Example: subject to change after MIMISA process reconfirmation
- `[TBD]` §7.1 Game Number: subject to confirmation of MIMISA table-number format
- `[TBD]` §12 Settlement Procedure: MIMISA settlement procedure and period to be confirmed
- `[TBD]` §19.3 Backup: cloud-mirroring specific plan to be discussed
- `[TBD]` §19.3 Backup retention: period to be reset after cost confirmation