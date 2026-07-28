# MIDORI JUNKET OS — 統合 PRD v2.0 (繁體中文版) (1)

## 1. 項目概述

### 1.1 項目名稱

MIDORI 賭廳籌碼房電算化及帳戶管理系統 (JUNKET OS)

### 1.2 項目目的

將現有手工記錄方式的賭廳籌碼房營運電算化，實現買入/兌現/滾碼/佣金/積分結算全流程自動化。本系統達成以下目標：

- 即時追蹤籌碼房總資產（現金、NN籌碼、CC籌碼、客戶預存金、遊戲中金額、佣金/積分）
- 區分計算莊家滾碼與內部滾碼，自動生成月末莊家結算依據數據
- 即時計算客戶-代理-副公司層級結構的佣金分配
- 對所有交易適用審批工作流並保存審計日誌
- 透過分店間統合報表支援總部層面的經營決策
- 分離提供營運入口與客戶入口，為各角色提供最佳化介面

### 1.3 術語定義

| 術語 | 定義 |
| --- | --- |
| NN籌碼 (Non-Negotiable Chip) | 從莊家（賭場）購買的不可兌換籌碼。僅可在遊戲桌使用。買入時計算滾碼 |
| CC籌碼 (Cash Chip / Color Chip) | 遊戲勝利時支付的可兌換現金籌碼 |
| 莊家滾碼 | 與莊家（賭場）的NN籌碼交易（購買/交換）中產生的滾碼。月末莊家結算的基準 |
| 內部滾碼 | 按客戶實際遊戲進行產生的滾碼。佣金/積分結算的基準 |
| 滾碼員 (Roller) | 負責客戶籌碼交換並計算滾碼的現場人員。隸屬代理 |
| 買入 (Buy-in) | 客戶以現金或預存金購買NN籌碼的行為 |
| 兌現 (Cash-out) | 客戶將持有籌碼(CC/NN)兌換為現金的行為 |
| 預存金 | 客戶存放在籌碼房的現金。買入時可使用 |
| 遊戲中金額 | 目前在桌上進行中的籌碼總額。籌碼房資產追蹤必需 |
| 結算率 | 莊家WIN時賭廳收取的比率（例：50%） |
| FIFO | 先進先出。積分扣減時從最早累積的開始扣減 |

## 2. 系統架構

### 2.1 系統構成概述

本系統提供兩種使用環境。

**營運入口 (Operations Portal)**

- 使用者：主管、分店管理員、籌碼房職員、樓面職員
- 存取環境：分店內部網路、桌面/自助終端(iPad)
- 主要功能：籌碼房資產管理、遊戲上傳、審批處理、結算、報表

**客戶入口 (Client Portal)**

- 使用者：代理、副公司、滾碼員、一般客戶(Player)
- 存取環境：行動網頁(響應式) + 桌面網頁。允許外部網路存取
- 主要功能：帳戶查詢、餘額確認、資金轉帳、遊戲紀錄、佣金/積分查詢、存取款申請、通知接收

各入口完全分離，共享單一DB及單一API伺服器。

### 2.2 技術棧建議

由開發者自行選擇，但須滿足以下要求：

- **前端：** 基於Web的SPA。營運入口與客戶入口分離構建。相容自助終端(iPad)及桌面瀏覽器。響應式必需
- **後端：** RESTful API或GraphQL。支援WebSocket用於即時通知
- **資料庫：** RDBMS必需（保證交易完整性）。所有金額運算使用整數（披索單位）或DECIMAL(18,2)。禁止使用浮點數(float/double)
- **伺服器：** 使用雲端伺服器（營運入口透過內部網路VPN存取，客戶入口允許外部存取）
- **安全：** 全段SSL/TLS、DB加密、RBAC存取控制

### 2.3 部署環境

- 營運伺服器：雲端伺服器（透過VPN進行內部網路存取配置）
- 備份：每日1次自動完整備份 + 交易日誌即時備份
- 雲端鏡像：增設備份伺服器 `[待確認：具體鏡像方案需討論]`
- 伺服器雙重化：建議Active-Standby配置（故障時自動切換）

### 2.4 系統可用性要求

- 運行率目標：99.9%（年停機8.76小時以內）
- 故障恢復目標(RTO)：30分鐘以內
- 數據損失容許範圍(RPO)：0（交易數據零損失）

## 3. 帳戶結構及權限 (RBAC)

### 3.1 帳戶層級結構

```
主管帳戶 (Master)
 └─ 分店管理員帳戶 (Branch Manager) — 每分店1個
     ├─ 籌碼房職員帳戶 (Cage Staff) — 分店管理員授予權限
     ├─ 樓面職員帳戶 (Floor Staff) — 僅可上傳請求
     ├─ 副公司帳戶 (Sub-Company)
     │   └─ 代理帳戶 (Agent)
     │       ├─ 滾碼員帳戶 (Roller) — 1代理：N滾碼員
     │       └─ 一般帳戶 (Player, 客戶)
     └─ 獨立代理帳戶（無副公司直屬分店）
         ├─ 滾碼員帳戶
         └─ 一般帳戶
```

### 3.2 各帳戶類型詳細權限

#### 3.2.1 主管帳戶 (Master)

- **數據查詢：** 全分店（Midori等）統合數據查詢
- **篩選：** 按分店、期間、代理的滾碼統計
- **帳戶管理：** 分店管理員帳戶創建/停用
- **日誌查閱：** 全部審計日誌
- **修改/刪除：** 數據修改及刪除不可（維持完整性）
- **籌碼房資產：** 全分店籌碼房總資產現況查詢
- **錢包持有：** 無
- **入口：** 營運入口存取

#### 3.2.2 分店管理員帳戶 (Branch Manager)

- **數據管理：** 該分店所有帳戶及交易管理
- **審批權限：** 遊戲上傳最終審批/駁回、手續費提款審批/駁回、帳戶創建最終審批、資金轉帳審批/駁回
- **手動調整：** 可手動調整錢包餘額（錯誤修正、特別審批）。調整時必須輸入原因，自動記錄日誌
- **籌碼房資產：** 該分店籌碼房總資產即時儀表板
- **下級帳戶管理：** 副公司、代理、樓面職員、籌碼房職員、一般帳戶的創建/停用
- **佣金/積分設定：** 各遊戲佣金率設定、積分累積率設定、客戶「顯示/隱藏」設定
- **轉帳限額設定：** 各帳戶單次限額及每日限額設定、非關係轉帳例外審批
- **日誌查閱：** 該分店全部日誌
- **錢包持有：** 無
- **入口：** 營運入口存取

#### 3.2.3 籌碼房職員帳戶 (Cage Staff)

- **審批權限：** 在分店管理員委託範圍內可審批/駁回上傳
- **上傳：** Buy-in/Cash-out表單輸入、遊戲上傳檢查員2角色
- **客戶存取款處理：** 確認及處理客戶發起的存款/取款請求
- **查詢：** 該分店交易查詢
- **錢包持有：** 無
- **備註：** 分店管理員設定權限範圍（可審批金額限額等）
- **入口：** 營運入口存取

#### 3.2.4 樓面職員帳戶 (Floor Staff)

- **上傳：** 遊戲上傳數據輸入及審批請求提交（檢查員1角色）
- **審批權限：** 無。僅可請求
- **查詢：** 僅可查詢本人請求的上傳紀錄
- **錢包持有：** 無
- **入口：** 營運入口存取

#### 3.2.5 副公司帳戶 (Sub-Company)

- **下級管理：** 所屬代理及其下級客戶的交易明細查詢
- **佣金：** 勝負制手續費累積（例：勝負5%，分店管理員設定）
- **提款：** 可請求手續費提款（需分店管理員審批）
- **資金分配：** 可向所屬代理分配營運資金（需分店管理員審批）
- **報表：** 下級代理月度業績、匯總報表
- **修改/刪除：** 不可
- **錢包持有：** 無（佣金餘額以獨立Commission Wallet管理）
- **入口：** 客戶入口存取

#### 3.2.6 代理帳戶 (Agent)

- **雙重角色：** 作為代理同時可直接進行遊戲
- **下級管理：** 所屬客戶的買入/兌現/滾碼明細查詢
- **佣金：** 各遊戲佣金即時累積
    - A遊戲：滾碼佣金（例：1.4%）
    - B遊戲：勝負佣金（例：40%）`[開發後停用 — 目前未使用遊戲選項，為擴展性保留]`
    - C遊戲：滾碼 + 勝負可並行 `[開發後停用 — 目前未使用遊戲選項，為擴展性保留]`
    - 佣金率由分店管理員按代理、遊戲個別設定
- **提款：** 可請求手續費提款（需分店管理員審批）
- **積分控制：** 下級客戶積分累積率設定（0~基本率）、「顯示/隱藏」設定
- **報表：** 客戶別滾碼、買入、兌現、佣金摘要
- **錢包持有：** Real Money錢包、NN錢包、CC錢包（本人遊戲時）
- **入口：** 客戶入口存取

#### 3.2.7 滾碼員帳戶 (Roller)

- **角色：** 負責客戶籌碼交換、滾碼計算、遊戲上傳數據輸入輔助
- **關係：** 1滾碼員：N代理可能（一位滾碼員管理多位代理的客戶）
- **權限：** 遊戲上傳時記錄於「交換員（滾碼員）」欄位。無獨立審批/提款權限
- **錢包持有：** 無
- **入口：** 客戶入口存取

#### 3.2.8 一般帳戶 (Player, 客戶)

- **查詢：** 本人餘額、交易明細
- **佣金/積分：** 僅在代理或分店管理員設為「顯示」時顯示選單。預設為「隱藏」（選單本身不顯示）
- **積分使用：** 僅可用於促銷（兌換券、住宿、餐飲等）。不可直接轉換為Real Money/CC/NN錢包
- **資金轉帳：** 可向同分店內其他帳戶轉帳預存金（需分店管理員審批）
- **存取款申請：** 可預先申請預存金存款/取款/買入
- **密碼找回：** 本人認證後可重設
- **錢包持有：** Real Money錢包、NN錢包、CC錢包
- **入口：** 客戶入口存取

### 3.3 帳戶創建流程

**新客戶(Player)註冊：**

1. 客戶本人或代理向籌碼房請求創建帳戶
2. 籌碼房職員在系統中輸入資訊（護照號碼或Midori獎勵卡號碼作為Unique ID）
3. 連結登記代理等客戶管理員
4. 分店管理員最終審批 → 帳戶啟用
5. 向客戶傳達初始登入資訊（臨時密碼）
    - 籌碼房職員將列印的憑條（帳戶ID + 臨時密碼）直接交給客戶
    - 或透過已登記手機號碼發送SMS（SMS閘道整合時）
6. 客戶首次登入客戶入口 → 強制變更密碼 + 選擇性2FA設定指引

**Unique ID規則：**

- Primary：護照號碼（國籍碼 + 護照號碼）
- Alternative：Midori獎勵卡號碼
- 系統內部ID：另行發放auto-increment或UUID

**必要收集資訊：** 姓名（英文/當地語言）、護照號碼及國籍、出生日期、聯絡方式（手機）、照片（護照副本或拍攝）、負責代理ID（如適用）

### 3.4 認證及安全

**營運入口：**

- 2FA：主管、分店管理員、副公司、代理、籌碼房職員、樓面職員 — 登入時必需（Google Authenticator）
- 密碼重設：2FA認證後重設
- 自動登出：10分鐘未使用時
- IP限制：管理員帳戶IP白名單

**客戶入口：**

- 一般帳戶(Player)：2FA不適用（選擇事項）
- 會話逾時：15分鐘未使用時
- 金融交易再認證：轉帳/取款申請時必須輸入轉帳密碼
- 設備管理：記錄首次登入設備，新設備登入時通知

**通用：** 登入5次失敗時鎖定30分鐘、僅允許1個同時登入會話、API Rate Limiting每分鐘60次

## 4. 錢包系統

### 4.1 錢包結構

持有錢包的帳戶：**一般帳戶(Player)** 及 **代理帳戶(Agent, 本人遊戲時)**

| 錢包類型 | 說明 | 入金路徑 | 出金路徑 |
| --- | --- | --- | --- |
| Real Money錢包 | 現金餘額。買入時扣減，兌現時增加 | 現金存入（預存金）、兌現、轉帳接收 | 買入、現金提取、轉帳發送 |
| NN錢包 | NN籌碼持有量。遊戲桌投入時扣減 | 買入（NN籌碼接收） | 遊戲投入、莊家退還 |
| CC錢包 | CC籌碼持有量。遊戲勝利時增加 | 遊戲勝利 | 兌現（現金交換）、NN籌碼交換 |
|  |  |  |  |

### 4.2 錢包餘額變動規則

- 所有餘額變動必須透過交易記錄產生
- 手動調整僅分店管理員可進行，必須輸入原因 + 自動記錄日誌
- 不允許負數餘額（餘額不足時拒絕交易）
- 所有金額以整數（披索單位）或DECIMAL(18,2)儲存。不進行四捨五入記錄至小數點
- 轉帳申請時適用凍結(hold_amount)：審批前在餘額中顯示扣減但未傳遞給接收方

### 4.3 佣金錢包 (Commission Wallet)

代理及副公司專用。遊戲結算時自動累積，遵循提款申請 → 分店管理員審批 → 現金支付流程。

| 項目 | 規則 |
| --- | --- |
| 累積時點 | 遊戲上傳審批完成時即時累積 |
| 提款申請 | 代理/副公司在系統中申請 |
| 提款審批 | 需分店管理員審批 |
| 提款完成 | 審批時佣金餘額扣減 + 自動生成及發送電子結算收據(Invoice) |

## 5. 籌碼房總資產管理體系

### 5.1 籌碼房資產構成要素

籌碼房總資產以下列項目之和即時追蹤。**所有交易必須影響這些資產項目中的一項以上，借方/貸方必須保持平衡（複式簿記原則）。**

| 項目 | 說明 | 符號 |
| --- | --- | --- |
| 公司現金 | 籌碼房金庫內現金 | + |
| NN籌碼持有 | 從莊家購買/交換的NN籌碼庫存 | + |
| CC籌碼持有 | 從客戶回收的CC籌碼庫存 | + |
| 客戶預存金總額 | 客戶們存放的現金合計（負債） | +（資產追蹤用） |
| 遊戲中金額 | 目前在桌上進行中的籌碼總額 | + |
| 佣金/積分未支付餘額 | 尚未支付的佣金及積分的現金價值（負債） | –（費用） |

**分店營運總資本 = 公司現金 + NN籌碼 + CC籌碼 + 客戶預存金 + 遊戲中金額**

### 5.2 資產變動情景映射

主要交易別資產項目變動：

**情景1：從莊家購買NN籌碼** — 公司現金 –X, NN籌碼持有 +X, 莊家滾碼 +X。總資本變動：0

**情景2：客戶現金買入** — 公司現金 +X, NN籌碼持有 –X, 遊戲中金額 +X。總資本變動：+X

**情景3：客戶預存金買入** — 客戶預存金 –X, 公司現金 +X, NN籌碼持有 –X, 遊戲中金額 +X。總資本變動：0

**情景4：遊戲結束 — 籌碼退還** — 遊戲中金額 –(買入額), NN籌碼 +(退還NN), CC籌碼 +(退還CC), 內部滾碼 +(買入額 – 退還NN)。總資本變動：–(客戶WIN) 或 +(莊家WIN)

**情景5：客戶兌現** — 客戶預存金/CC籌碼 –X, 公司現金 –X。總資本變動：–X

**情景6：莊家CC籌碼→NN籌碼交換** — CC籌碼 –X, NN籌碼 +X, 莊家滾碼 +X。總資本變動：0

**情景7：遊戲中CC→NN交換** — CC籌碼 +X, NN籌碼 –X, 內部滾碼 +X。總資本變動：0

**情景8：佣金支付** — 公司現金 –X, 佣金未支付 –X（負債減少）。總資本變動：–X

**情景9：月末莊家結算** — NN籌碼 –(全量退還), 公司現金 +(退還額), +(莊家WIN × 結算率), 莊家滾碼重置

### 5.3 資產完整性驗證

系統在每筆交易處理後自動驗證：

1. **資產平衡檢查：** 借方合計 = 貸方合計
2. **負數檢查：** 所有資產項目 ≥ 0
3. **莊家滾碼一致性：** 莊家滾碼 – NN籌碼退還累計 = 內部滾碼累計（月末基準）
4. **客戶預存金一致性：** 個別客戶預存金合計 = 籌碼房客戶預存金總額

驗證失敗時：該交易回滾 + 即時通知分店管理員 + 錯誤日誌記錄

## 6. 滾碼計算邏輯

### 6.1 滾碼的兩種類型

**莊家滾碼 (House Rolling)**

- **計算基準：** 適用Midori賭場滾碼計算方式
- **計算時點：** NN籌碼購買時即時計算滾碼，NN籌碼退還時扣減
- **公式：** 莊家滾碼 = Σ(NN籌碼購買/交換金額) – Σ(NN籌碼退還金額)
- **用途：** 月末莊家結算基準

**內部滾碼 (Internal Rolling)**

- **計算基準：** 按客戶實際遊戲進行
- **計算時點：** 買入時記錄滾碼，NN籌碼退還部分扣減
- **公式：** 遊戲別內部滾碼 = 買入金額 – 退還NN籌碼金額
- **累計公式：** 客戶內部滾碼 = Σ(各遊戲內部滾碼) + Σ(遊戲中CC→NN交換金額)
- **用途：** 佣金、積分結算基準

### 6.2 滾碼計算逐步流程

**Step 1 — 買入時點：** 內部滾碼 += 買入金額，遊戲中金額 += 買入金額

**Step 2 — 遊戲中CC→NN交換：** 內部滾碼 += 交換金額（遊戲中金額不變 — 僅籌碼種類變更）

**Step 3 — 遊戲結束：** 退還NN籌碼時內部滾碼 -= 退還NN籌碼。最終遊戲滾碼 = 買入額 + CC→NN交換額 – 退還NN籌碼

### 6.3 驗證範例 `[待確認：Midori流程再確認後變更需要]`

**客戶A第一場遊戲：** 買入10,000,000 NN籌碼 → 退還4,000,000 NN + 3,000,000 CC。內部滾碼 = 6,000,000。莊家WIN = 3,000,000。

**客戶A第二場遊戲：** 預存金買入7,000,000 NN + 遊戲中CC→NN 10,000,000 → 退還6,000,000 CC(NN退還0)。內部滾碼 = 17,000,000。累計內部滾碼 = 23,000,000。

## 7. 遊戲上傳流程

### 7.1 遊戲編號發行規則 `[待確認：Midori桌號格式確認後需變更]`

**格式：** YYYYMMDD-TTT-GG-NNNN

| 區段 | 說明 | 範例 |
| --- | --- | --- |
| YYYYMMDD | 遊戲開始日期 | 20260317 |
| TTT | 桌號（3位數，0填充） | 005 |
| GG | 遊戲類型代碼 | BA（百家樂）、BJ（21點）、RO（輪盤） |
| NNNN | 該桌該日連續編號（4位數） | 0012 |

**範例：** 20260317-005-BA-0012

**發行時點：** 遊戲開始前由系統自動生成。允許手動輸入但必須驗證重複

### 7.2 遊戲上傳必填項目

| 欄位名 | 數據類型 | 必填 | 說明 |
| --- | --- | --- | --- |
| game_number | VARCHAR(20) | 必填 | 自動生成或手動輸入 |
| roller_account_id | FK | 必填 | 交換員（滾碼員）帳戶 |
| player_account_id | FK | 必填 | 玩家帳戶（Player或Agent） |
| inspector_1_id | FK | 必填 | 檢查員1（樓面經理/主管） |
| inspector_2_id | FK | 必填 | 檢查員2（籌碼房職員） |
| chip_quantity | DECIMAL(18,2) | 必填 | 交換的NN籌碼數量（披索單位） |
| game_type | ENUM | 必填 | 遊戲類型（A/B/C等） |
| table_number | VARCHAR(10) | 必填 | 桌號 |
| upload_timestamp | DATETIME | 自動 | 上傳時間 |
| uploaded_by | FK | 自動 | 上傳負責人帳戶 |

### 7.3 上傳工作流

```
1. 樓面職員/滾碼員在自助終端或PC輸入數據
   ↓
2. 第1次驗證：必填項目遺漏檢查 → 遺漏時即時警告，阻止提交
   ↓
3. 第2次驗證：遊戲編號重複檢查 → 重複時警告，阻止上傳
   ↓
4. 第3次驗證：玩家帳戶狀態確認（是否啟用）、滾碼員有效性確認
   ↓
5. 上傳請求提交 → 狀態：「待審批」
   ↓
6. 籌碼房職員（有權限）或分店管理員審查
   ↓
7-A. 審批 → 狀態：「審批完成」
     → 自動計算及累積滾碼額、佣金、積分
     → 自動更新籌碼房資產項目
     → 創建交易記錄
     → 向審批者發送「成功」通知 + 上傳內容摘要

7-B. 駁回 → 狀態：「駁回」
     → 必須輸入駁回原因
     → 向請求者發送「駁回」通知 + 原因
```

**重要規則：**

- 分店管理員未審批的數據不反映到系統中
- 遊戲結果（勝/負、餘額變化）不另行手動輸入 — 以上傳數據和交易為基準結算

### 7.4 遊戲結束上傳

遊戲結束時以另行表單記錄結果：

| 欄位名 | 數據類型 | 必填 | 說明 |
| --- | --- | --- | --- |
| game_number | FK | 必填 | 對應遊戲編號 |
| returned_nn_chips | DECIMAL(18,2) | 必填 | 退還NN籌碼金額 |
| returned_cc_chips | DECIMAL(18,2) | 必填 | 退還CC籌碼金額 |
| mid_game_exchanges | JSON | 選填 | 遊戲中CC→NN交換明細 |
| result_type | ENUM | 自動計算 | WIN / LOSE / DRAW |
| win_lose_amount | DECIMAL(18,2) | 自動計算 | 莊家基準WIN/LOSE金額 |
| rolling_amount | DECIMAL(18,2) | 自動計算 | 該遊戲內部滾碼 |

### 7.5 Buy-in / Cash-out上傳表單

| 欄位名 | 數據類型 | 必填 | 說明 |
| --- | --- | --- | --- |
| account_id | FK | 必填 | 客戶帳戶 |
| customer_name | VARCHAR | 自動填入 | 從帳戶自動載入 |
| transaction_type | ENUM | 必填 | BUY_IN, CASH_OUT, DEPOSIT, WITHDRAWAL, ACCOUNT_TRANSFER |
| amount | DECIMAL(18,2) | 必填 | 交易金額 |
| payment_method | ENUM | 必填 | CASH, DEPOSIT_BALANCE（使用預存金） |
| signature | BLOB | 必填 | 電子簽名（觸控輸入） |
| transaction_date | DATETIME | 自動 | 交易日時 |
| processed_by | FK | 自動 | 處理負責籌碼房職員 |

## 8. 佣金結算邏輯

### 8.1 佣金類型及設定

| 佣金類型 | 計算基準 | 適用範例 |
| --- | --- | --- |
| 滾碼佣金 | 內部滾碼金額 × 佣金率 | A遊戲：滾碼 × 1.4% |
| 勝負佣金 | 莊家WIN/LOSE × 佣金率 | B遊戲：WIN/LOSE × 40% |
| 混合佣金 | 滾碼 + 勝負同時適用 | C遊戲：依遊戲設定 |

### 8.2 佣金設定表

分店管理員可按以下組合個別設定：

```
commission_config {
  config_id (PK)
  branch_id (FK)
  game_type (ENUM)
  account_id (FK) — 代理或副公司
  commission_type (ENUM: ROLLING / WINLOSE / HYBRID)
  rolling_rate (DECIMAL 5,4) — 例：0.0140 = 1.4%
  winlose_rate (DECIMAL 5,4) — 例：0.4000 = 40%
  effective_from (DATE)
  effective_to (DATE, nullable)
  created_by (FK)
  created_at (DATETIME)
}
```

### 8.3 佣金計算流程

**滾碼佣金計算（遊戲上傳審批時即時）：**

```
佣金金額 = 該遊戲內部滾碼 × rolling_rate
代理佣金錢包 += 佣金金額
```

**勝負佣金計算：**

```
莊家WIN時：
  佣金金額 = WIN金額 × winlose_rate
  代理佣金錢包 += 佣金金額

莊家LOSE時：
  佣金金額 = LOSE金額 × winlose_rate × (–1)
  代理佣金錢包 -= 佣金金額
  （佣金錢包可能為負 — 在下次WIN中抵消）
```

### 8.4 副公司佣金

```
副公司佣金 = 所屬代理總WIN/LOSE × 副公司勝負率（例：5%）
```

### 8.5 手續費提款流程

```
1. 代理/副公司提交提款申請（申請金額 ≤ 佣金錢包餘額）
   ↓
2. 系統自動生成電子結算收據(Invoice)
   ↓
3. 向分店管理員發送審批請求通知
   ↓
4-A. 審批 → 佣金錢包扣減、Invoice確定、現金支付記錄
4-B. 駁回 → 填寫駁回原因、通知申請者
```

**Invoice必含項目：** 收款人帳戶資訊、結算期間、各遊戲滾碼/勝負詳細明細、佣金率及計算依據、總佣金金額、提款申請金額、審批者簽名及審批日時

## 9. MIDORI積分系統

### 9.1 積分累積規則

| 項目 | 規則 |
| --- | --- |
| 累積對象 | 僅一般帳戶(Player)累積 |
| 累積基準 | 內部滾碼金額的0.1%（佣金率變動時以獨立比率管理） |
| 累積時點 | 遊戲上傳審批完成時即時 |
| 小數處理 | 記錄至小數點，不四捨五入 |
| 可見性 | 僅在代理/分店管理員設為「顯示」時向客戶顯示。預設 = 隱藏 |

**累積範例：** 內部滾碼 6,000,000 × 0.001 = 6,000積分累積

### 9.2 積分有效期及失效

| 項目 | 規則 |
| --- | --- |
| 有效期 | 累積日起2個月 |
| 失效通知 | 失效前7天，向「顯示」設定帳戶的客戶及負責代理通知 |
| 失效處理 | 有效期滿翌日00:00自動失效處理（批次作業） |

### 9.3 積分使用規則

- 可使用對象：僅限促銷（兌換券、住宿、餐飲等）
- 不可直接轉換為Real Money/CC/NN錢包
- 扣減原則：FIFO（從累積日最早的積分開始扣減）
- 所有積分使用明細記錄於交易清單

### 9.4 積分代理控制

代理可控制所屬客戶的積分：累積率調整（0%~基本率0.1%範圍內）、可見性控制（「顯示」/「隱藏」）、「隱藏」設定時客戶不知積分存在（選單不顯示）、積分使用審批（代理審批後可使用，選擇設定）

## 10. 資金轉帳 (Fund Transfer)

### 10.1 資金轉帳類型定義

| 轉帳類型 | 發送方 | 接收方 | 需審批 | 說明 |
| --- | --- | --- | --- | --- |
| 客戶→客戶 | Player | Player | 分店管理員 | 同分店內客戶間預存金轉帳 |
| 代理→客戶 | Agent | Player(下級) | 分店管理員 | 代理向所屬客戶資金支援 |
| 客戶→代理 | Player | Agent(上級) | 分店管理員 | 客戶向代理資金退還 |
| 代理→代理 | Agent | Agent | 分店管理員 | 同分店內代理間轉帳 |
| 副公司→代理 | Sub-Company | Agent(下級) | 分店管理員 | 副公司向所屬代理資金分配 |

### 10.2 轉帳限制規則

| 規則 | 內容 |
| --- | --- |
| 轉帳對象 | 僅同分店內帳戶可轉。跨分店轉帳不可 |
| 轉帳限額 | 分店管理員設定各帳戶單次限額及每日限額 |
| 最低金額 | 1,000披索（可設定） |
| 餘額檢查 | 發送方Real Money錢包餘額 ≥ 轉帳金額。不足時拒絕 |
| 轉帳對象關係 | 基本：僅允許直屬上下級關係。分店管理員可例外審批非關係轉帳 |
| 轉帳手續費 | 基本免費。分店管理員可設定手續費率（未來擴展） |
| 轉帳認證 | 必須輸入轉帳密碼 |

### 10.3 轉帳申請流程

```
Step 1：發送方在客戶入口進入[資金轉帳]
  ↓
Step 2：選擇接收方（直屬上下級帳戶清單下拉或帳戶ID/姓名搜尋）
  ↓
Step 3：輸入轉帳金額（顯示當前餘額、單次限額及每日剩餘限額）
  ↓
Step 4：輸入轉帳密碼
  ↓
Step 5：確認畫面（接收方姓名/帳戶ID、轉帳金額、轉帳後預計餘額）
  ↓
Step 6：提交轉帳申請 → 狀態：「待審批」
  → 從發送方餘額即時凍結轉帳金額(hold_amount)
  ↓
Step 7：向分店管理員發送審批請求通知
  ↓
Step 8-A：審批
  → 解除凍結 → 確定扣減發送方餘額
  → 接收方Real Money錢包 += 轉帳金額
  → 向雙方發送完成通知 + 生成電子收據
  → 創建2筆交易記錄（發送1筆 + 接收1筆）

Step 8-B：駁回
  → 解除凍結 → 恢復發送方餘額
  → 向發送方發送駁回通知（含原因）
```

## 11. 客戶自助服務功能

### 11.1 客戶首頁

行動環境基準設計。上方Real Money餘額/NN籌碼/CC籌碼，[存款申請][取款申請]按鈕。中間[資金轉帳][遊戲紀錄][交易明細][我的資訊]選單。下方最近10筆交易摘要。積分/佣金僅在「顯示」設定時顯示（從DOM移除）。

### 11.2 存款申請（客戶 → 籌碼房）

客戶[存款申請] → 輸入金額 → 提交申請（「存款待處理」）→ 籌碼房職員通知 → 客戶到訪/現金交付 → 籌碼房職員輸入收取金額（不符時警告+填寫原因）→ 分店管理員審批 → Real Money反映 + 電子收據

### 11.3 取款申請（客戶 → 籌碼房）

客戶[取款申請] → 輸入金額（餘額以內）→ 提交申請（餘額凍結）→ 籌碼房職員準備現金 → 客戶到訪/領取/簽名 → 處理完成（解凍、餘額扣減）+ 收據。24小時未領取時自動取消（解凍、餘額恢復）。

### 11.4 買入申請（選擇性）

客戶在遊戲開始前預先申請從預存金買入NN籌碼。現有籌碼房窗口直接買入仍可繼續。

### 11.5 電子收據查詢

所有完成的交易可在畫面查詢。收據編號、交易日時、類型、金額、交易前/後餘額、處理負責人、審批者、電子簽名顯示。不可列印/下載（安全）。

## 12. 月末莊家結算 `[待確認：Midori結算程序、期間等需確認]`

確定結算期間（月1日~末日）→ NN籌碼全量退還 → 莊家滾碼驗證（莊家最終滾碼 == 內部滾碼累計）→ WIN/LOSE結算 → 淨利潤計算 → 新月準備（NN籌碼再購買、滾碼計數器重置）

結算報表自動生成：總莊家/內部滾碼、WIN/LOSE（客戶別）、佣金總額（代理/副公司別）、積分、淨利潤、籌碼房資產變動摘要

## 13. 通知系統

### 13.1 營運入口通知

| 事件 | 接收對象 |
| --- | --- |
| 上傳審批請求 | 分店管理員/有權限籌碼房職員 |
| 上傳審批/駁回 | 上傳請求者 |
| 手續費提款請求 | 分店管理員 |
| 手續費提款審批/駁回 | 提款請求者 |
| 積分失效前7天 | 客戶（「顯示」設定時）+ 負責代理 |
| 帳戶鎖定/資產完整性失敗 | 分店管理員 + 主管 |
| 手動錢包調整 | 主管 |

### 13.2 客戶入口通知

| 事件 | 接收對象 |
| --- | --- |
| 存款/取款完成 | 客戶本人（+ SMS選擇） |
| 取款申請自動取消(24h) | 客戶本人 |
| 轉帳接收/發送/駁回 | 相關客戶 |
| 買入/兌現/遊戲結果 | 客戶本人 |
| 佣金累積（可見性「顯示」） | 客戶本人 |

### 13.3 SMS整合（選擇）

菲律賓電信商（Globe、Smart）閘道整合、金融事件發送、opt-in設定、日誌記錄。

## 14. 日誌管理

| 日誌類型 | 記錄項目 | 保存 |
| --- | --- | --- |
| 存取日誌 | 帳戶ID、登入/登出、IP、設備 | 3年 |
| 活動日誌 | 帳戶ID、執行操作、目標記錄、時間 | 3年 |
| 上傳/審批日誌 | 上傳者/審批者、內容、結果 | 5年 |
| 結算日誌 | 佣金/積分計算依據 | 5年 |
| 手動調整日誌 | 調整者、目標、前/後值、原因 | 永久 |
| 資產變動日誌 | 交易ID、資產項目別變動 | 5年 |

日誌查閱權限：主管（全部）、分店管理員（該分店）、副公司（所屬遊戲紀錄）、代理（所屬客戶紀錄）、其他（僅本人）

## 15. 儀表板及報表

### 15.1 主管儀表板

全分店籌碼房總資產、分店別滾碼統計、WIN/LOSE趨勢圖表、待審批件數、代理業績排名、客戶數

### 15.2 分店管理員儀表板

籌碼房資產現況板（即時、WebSocket/5秒輪詢）、莊家/內部滾碼比較、待審批件數、代理/副公司業績摘要、當日遊戲現況、審批日誌時間軸

### 15.3 代理儀表板

本月收益卡（佣金累計/可提款）、所屬客戶清單及滾碼、客戶別快速操作（[轉帳][遊戲紀錄][滾碼]）、本人遊戲明細

### 15.4 報表篩選

期間（日/週/月/自訂）、帳戶（代理別/客戶別）、遊戲類型（A/B/C）、交易類型、審批狀態。**不可下載**（安全考量僅限畫面查詢）。

## 16. 資料庫綱要

### 16.1 資料表清單

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

### 16.2 資料表關係摘要

branches 1─N accounts, cage_assets, games, transactions, house_rolling_ledger, house_settlements。accounts 1─N accounts(parent_id), wallets, transactions, games, commissions, points。accounts 1─1 point_visibility。games 1─N transactions, rolling_records, commissions, points。transactions 1─N approval_logs。

## 17. API端點

### 17.1 營運入口API

**認證：** POST /api/auth/login, /logout, /refresh, /password-reset

**帳戶：** POST/GET/PUT /api/accounts, PATCH /:id/status, POST /:id/approve

**遊戲：** POST/GET /api/games, PUT /:id/complete, POST /:id/exchange, /:id/approve, /:id/reject

**交易：** POST/GET /api/transactions, POST /:id/approve, /:id/reject

**佣金：** GET /api/commissions, POST /withdraw-request, /withdraw/:id/approve, /reject, GET /invoice/:id

**佣金設定：** GET/POST/PUT /api/commission-configs

**積分：** GET /api/points, POST /use, PUT /point-visibility/:player_id

**籌碼房資產：** GET /api/cage-assets, POST /manual-adjust

**莊家：** GET /api/house-rolling, POST /nn-purchase, /nn-return, /cc-exchange, POST/GET /api/house-settlements

**報表：** GET /api/reports/rolling, /commission, /points, /cage-summary, /agent-performance

**通知：** GET/PATCH /api/notifications

**日誌：** GET /api/logs/activity, /approval, /manual-adjustments

### 17.2 客戶入口API

**自助服務：** GET /api/me, /me/wallets, /me/transactions, /me/games, /me/points, /me/commissions, /me/receipts/:id, PUT /me/password

**客戶發起：** POST /api/me/deposit-request, /withdrawal-request, /buyin-request, DELETE /me/withdrawal-request/:id

**轉帳：** POST/GET /api/transfers, POST /:id/approve, /reject, GET/PUT /api/transfer-limits

**代理：** GET /api/agents/me/customers, /:id/wallets, /:id/games, /:id/rolling, PUT /:id/point-visibility, GET /me/commissions, POST /me/commission-withdraw

**副公司：** GET /api/sub-companies/me/agents, /:id/performance, POST /me/fund-distribute, GET /me/commissions, POST /me/commission-withdraw

## 18. UI/UX畫面構成

### 18.1 營運入口畫面 (S01~S23)

S01登入、S02主管儀表板、S03分店管理員儀表板、S04籌碼房資產現況板、S05~S07副公司/代理/客戶儀表板、S08遊戲上傳表單、S09遊戲結束表單、S10 Buy-in/Cash-out表單、S11審批管理、S12交易查詢、S13~S15滾碼/佣金/積分報表、S16帳戶管理、S17佣金設定、S18積分設定、S19手續費提款、S20莊家滾碼帳簿、S21月末結算、S22通知中心、S23日誌查詢

### 18.2 客戶入口畫面 (CS01~CS19)

CS01客戶交易明細、CS02遊戲紀錄、CS03積分詳情、CS04佣金詳情、CS05資金轉帳、CS06存款申請、CS07取款申請、CS08買入申請、CS09電子收據、CS10代理首頁、CS11客戶管理、CS12代理佣金、CS13代理提款、CS14副公司首頁、CS15代理業績、CS16資金分配、CS17副公司提款、CS18通知中心、CS19我的資訊/密碼變更

## 19. 非功能需求

### 19.1 效能

頁面載入2秒以內、交易處理500ms以內、同時連線最少50人、儀表板即時更新5秒以內

### 19.2 安全

全段SSL/TLS HTTPS、DB加密（僅PII AES-256，金額/日期為明文）、密碼/轉帳密碼bcrypt/argon2、RBAC API層級強制、IP限制、CSRF/XSS/SQL Injection防禦

### 19.3 備份及恢復

- 每日完整備份：每日凌晨3時
- 交易日誌：即時備份（WAL/binlog）
- 雲端鏡像伺服器增設 `[待確認：具體鏡像方案需討論]`
- 備份保存：最少90天 `[待確認：確認費用後重設保存期間]`
- 恢復測試：每月1次

### 19.4 審計追蹤

所有數據變更自動記錄於activity_logs。包含變更前/後值、變更者、時間、IP。日誌不可刪除（append-only）。手動調整永久保存於manual_adjustments。

## 20. 批次作業

| 作業名 | 執行週期 | 說明 |
| --- | --- | --- |
| 積分失效處理 | 每日00:00 | 到期積分 → EXPIRED |
| 積分失效通知 | 每日09:00 | 7日內即將到期通知 |
| 資產完整性驗證 | 每小時 | 籌碼房資產交叉驗證 |
| 會話清理 | 每5分鐘 | 未使用會話過期（營運10分鐘/客戶15分鐘） |
| DB備份 | 每日03:00 | 完整備份執行 |
| 取款申請過期 | 每小時 | 24小時未領取取款申請自動取消、凍結解除 |

---

**待確認事項（後續需確認）：**

- `[待確認]` 6.3 驗證範例：Midori流程再確認後變更
- `[待確認]` 7.1 遊戲編號：Midori桌號格式確認
- `[待確認]` 12.1 結算程序：Midori結算程序、期間確認
- `[待確認]` 19.3 備份：雲端鏡像具體方案討論
- `[待確認]` 19.3 備份保存：確認費用後期間重設