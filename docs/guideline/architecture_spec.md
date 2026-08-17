# Architecture Specification

## 1️⃣ 目標與範圍
- 確保專案遵循 **Clean Code** 與 **OOP** 原則，提升可維護性、可擴充性與測試覆蓋率。  
- 透過「層」結構（Domain→Infrastructure→Interface）區隔關注點，降低耦合。  
- 所有變更必須先經 `qa` 驗證，確認 lint、測試、Swagger 文檔等都無問題。

## 2️⃣ 代碼風格
| 風格 | 具體規範 | 參考檔案 |
|------|----------|-----------|
| **ESLint** | `npm run lint` 必須無 `error`；`warn` 總數應 <\u003c 5。 | `.eslintrc.js` |
| **Prettier** | `standard` 風格：雙引號、2 空格縮排、末尾逗號。 | `.prettierrc` |
| **TypeScript** | `strict`: true；`noImplicitAny`: true；使用 `readonly`、`readonlyArray` | `tsconfig.json` |

> **提醒**：所有自訂規則請在 `.eslintrc.js` 中 `extends` 上加入 `plugin:prettier/recommended`，確保 lint 與格式化同步。

## 3️⃣ 命名規則
- **檔名**：小寫 + `-`（如 `user-profile.module.ts`）。  
- **類別 / 介面**：`PascalCase`（`UserService`、`IUserRepository`）。  
- **變數 / 函式**：`camelCase`（`findUserById`）。  
- **常數**：`UPPER_SNAKE_CASE`（`MAX_RETRY_COUNT`）。  
- **Enum**：`PascalCase`（`UserRole`）  
- **Type / Interface**：`I[Name]` 或直接 `Name`，根據上下文。

## 4️⃣ 目錄結構 (功能為單位)

```
apps/api/
└─ src/
   ├─ modules/
   │   ├─ user/
   │   │   ├─ dao/          # Repository/DAO 層 (與 DB 交互)
   │   │   ├─ service/      # Service 層 (商業邏輯)
   │   │   ├─ controller/   # API 層 (NestJS Controller)
   │   │   ├─ dto/          # Data Transfer Object (輸入/輸出驗證)
   │   │   └─ interfaces/   # 本模組內部介面
   │   ├─ auth/             # 同上述模式
   │   └─ …                # 其他 feature modules
   └─ shared/
       ├─ utils/            # 公共工具
       ├─ errors/           # 自訂錯誤類別
       └─ constants/        # 常數與設定
```

```
apps/web/
└─ src/
   ├─ components/
   ├─ pages/
   └─ modules/
```

```
packages/common/
└─ src/
   ├─ utils/               # 兩側環境共用
   ├─ constants/           # 共用常數
   └─ shared/              # 共用型別、介面
```

## 5️⃣ 設計模式 (Clean Architecture + SOLID)
- **`Domain`**：純粹商業邏輯，無依賴於任何外部呼叫（DB、HTTP、檔案）。  
- **`Interface Adapter`**：`Controller/Service/DAO` 之間的適配器層，轉換資料結構。  
- **`Infrastructure`**：NestJS 模組、Prisma client、Redis、Docker 相關設定。  
- **依賴倒置原則**：高層模組依賴抽象，低層模組實現抽象。  
- **單一職責原則**：每個 class / function 只執行一項任務。  

## 6️⃣ 測試策略
| 測試層級 | 工具 | 目標 | 覆蓋率 |
|----------|------|------|--------|
| 單元測試  | Jest | Service、DAO、正則、工具 | ≥\u003c80% |
| 集成測試  | Jest + Supertest | Controller + Service + DAO 的串聯 | ≥\u003c60% |
| E2E 測試 | Playwright | UI + API 端到端 | ≥\u003c50% |

- **測試檔案**：與實作檔同層，文件名以 `.spec.ts` 結尾。  
- **Coverage**：`npm run test:coverage`，需至少 70% 以上。  
- **CI**：GitHub Actions 會自動跑 `npm test`、`npm run lint`。

## 7️⃣ Swagger API 文檔
- NestJS 內建 `@nestjs/swagger`。  
- 每個 `Controller` 必須帶 `@ApiTags('XXX')`、`@ApiOperation` 等描述。  
- API Docs 直接顯示於 `/api-docs`。

## 8️⃣ CI / CD
| 步驟 | 指令 |
|------|------|
| 開發環境啟動 | `npm run start:dev` |
| 進行移動測試 | `npm run test` |
| 🍰 Deploy | `npm run deploy`（使用 `turborepo` 與 `docker compose`） |

## 9️⃣ 版本控制
- 使用 `git` 的 `main`/`dev` 分支。  
- PR 必須經 `qa` 合併核准並通過 CI。  
- `git commit` 必須以「feat: / fix: / docs:」開頭，簡要說明。

## 🔑 主要參考
- `docs/guideline/architecture_spec.md`（此檔案）  
- `@docs/guideline/code-standards.md`（伴隨文件）  
- `apps/api/**/*.ts`、`apps/web/**/*.tsx`、`packages/common/**/*.ts`

> **備註**  
> 若有任何變更需重新走 **sa → code → qa → git** 流程，確保所有新增檔案都符合上述規範。